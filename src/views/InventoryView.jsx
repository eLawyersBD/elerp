import { useState, useMemo, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { authService } from '../services/authService';
import { serviceModuleService } from '../services/serviceModuleService';
import { accountingService } from '../services/accountingService';

/* ── ABC Classification thresholds (% of cumulative value) ── */
const abcClass = (pct) => {
  if (pct <= 70) return 'A';
  if (pct <= 90) return 'B';
  return 'C';
};

const ABC_COLOR = { A: '#ef4444', B: '#f59e0b', C: '#22c55e' };
const ABC_BG    = { A: 'rgba(239,68,68,0.1)', B: 'rgba(245,158,11,0.1)', C: 'rgba(34,197,94,0.1)' };

const WAREHOUSES = [
  { id: 'wh-1', name: 'Main Depot (Dhaka)', location: 'Tejgaon Industrial Area' },
  { id: 'wh-2', name: 'North Hub (Uttara)', location: 'Uttara Sector 4' },
  { id: 'wh-3', name: 'West Transit (Mirpur)', location: 'Mirpur-10 Depot' }
];

const STOCK_STATUSES = [
  { id: 'instock', label: 'In Stock', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { id: 'lowstock', label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 'outstock', label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { id: 'overstocked', label: 'Overstocked', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { id: 'expiring', label: 'Expiring Soon', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  { id: 'discontinued', label: 'Discontinued', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  { id: 'damaged', label: 'Damaged / Quarantine', color: '#b91c1c', bg: 'rgba(185,28,28,0.1)' }
];

const getProductWarehouseQty = (product, warehouseId) => {
  const map = product.warehouseQtyMap || { 'wh-1': product.qty, 'wh-2': 0, 'wh-3': 0 };
  return map[warehouseId] || 0;
};

const getDetailedStockStatus = (product) => {
  if (product.status === 'discontinued') return STOCK_STATUSES.find(s => s.id === 'discontinued');
  if (product.status === 'damaged') return STOCK_STATUSES.find(s => s.id === 'damaged');
  if (product.qty === 0) return STOCK_STATUSES.find(s => s.id === 'outstock');
  if (product.qty <= product.minStock) return STOCK_STATUSES.find(s => s.id === 'lowstock');
  if (product.qty > product.minStock * 4) return STOCK_STATUSES.find(s => s.id === 'overstocked');
  
  if (product.expiryDate) {
    const daysLeft = Math.ceil((new Date(product.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0 && daysLeft <= 30) {
      return STOCK_STATUSES.find(s => s.id === 'expiring');
    }
  }
  
  return STOCK_STATUSES.find(s => s.id === 'instock');
};

const calculateProductValuation = (product, movementsList, method) => {
  if (method === 'avco') {
    return { unitCost: product.price, totalValue: product.qty * product.price };
  }
  
  const prodMoves = [...movementsList]
    .filter(m => m.productId === product.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let batches = [];
  let netMovementsQty = 0;
  prodMoves.forEach(m => {
    netMovementsQty += m.qty;
  });
  
  let startingQty = Math.max(0, product.qty - netMovementsQty);
  if (startingQty > 0) {
    batches.push({ qty: startingQty, price: product.price, date: '2026-06-01T00:00:00Z' });
  }

  prodMoves.forEach(m => {
    if (m.qty > 0) {
      batches.push({ qty: m.qty, price: m.unitPrice || product.price, date: m.date });
    }
  });

  let totalDeducted = 0;
  prodMoves.forEach(m => {
    if (m.qty < 0) {
      totalDeducted += Math.abs(m.qty);
    }
  });

  let activeBatches = batches.map(b => ({ ...b }));
  
  if (method === 'fifo') {
    let deduct = totalDeducted;
    for (let i = 0; i < activeBatches.length && deduct > 0; i++) {
      const take = Math.min(activeBatches[i].qty, deduct);
      activeBatches[i].qty -= take;
      deduct -= take;
    }
  } else if (method === 'lifo') {
    let deduct = totalDeducted;
    for (let i = activeBatches.length - 1; i >= 0 && deduct > 0; i--) {
      const take = Math.min(activeBatches[i].qty, deduct);
      activeBatches[i].qty -= take;
      deduct -= take;
    }
  }

  let remainingValue = 0;
  let remainingCount = 0;
  activeBatches.forEach(b => {
    if (b.qty > 0) {
      remainingValue += b.qty * b.price;
      remainingCount += b.qty;
    }
  });

  if (remainingCount === 0 || remainingCount !== product.qty) {
    return { unitCost: product.price, totalValue: product.qty * product.price };
  }

  return {
    unitCost: Number((remainingValue / product.qty).toFixed(2)),
    totalValue: remainingValue
  };
};

const CAT_COLORS = {
  Calibration:  { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)'  },
  Installation: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)'  },
  Repair:       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)'   },
  Maintenance:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)'  },
  Training:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)'  },
};
const getCatCfg = (cat) => CAT_COLORS[cat] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' };

function InventoryView({ 
  products, 
  categories, 
  suppliers, 
  onSaveProduct, 
  onDeleteProduct, 
  onClearAllInventory,
  onRefresh,
  currentUser 
}) {
  const WAREHOUSES = useMemo(() => {
    try {
      const stored = localStorage.getItem('erp_warehouses');
      return stored ? JSON.parse(stored) : [
        { id: 'wh-1', name: 'Main Store — Dhaka', code: 'WH-DKA-1', branchId: 'br-1', isActive: true },
        { id: 'wh-2', name: 'Safety Godown — Dhaka', code: 'WH-DKA-2', branchId: 'br-1', isActive: true },
        { id: 'wh-3', name: 'CTG Port Depot', code: 'WH-CTG-1', branchId: 'br-2', isActive: true }
      ];
    } catch {
      return [
        { id: 'wh-1', name: 'Main Store — Dhaka', code: 'WH-DKA-1', branchId: 'br-1', isActive: true },
        { id: 'wh-2', name: 'Safety Godown — Dhaka', code: 'WH-DKA-2', branchId: 'br-1', isActive: true },
        { id: 'wh-3', name: 'CTG Port Depot', code: 'WH-CTG-1', branchId: 'br-2', isActive: true }
      ];
    }
  }, []);

  const [searchTerm, setSearchTerm]           = useState('');
  const [inventoryTabMode, setInventoryTabMode] = useState('physical'); // physical | services
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ code: '', name: '', baseFee: '', category: 'Service Income', description: '', slaHours: 24, vatRate: 15 });
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('');

  const [coa, setCoa] = useState([]);

  // Load Chart of Accounts from localStorage
  const loadCOA = () => {
    try {
      const val = localStorage.getItem('erp_coa');
      if (val && val !== 'null') {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          setCoa(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('[InventoryView] loadCOA error:', e);
    }
    setCoa([]);
  };

  useEffect(() => {
    loadCOA();
  }, [isServiceFormOpen]);

  // Filter accounts under 4030 Service Income
  const serviceAccounts = useMemo(() => {
    const filtered = coa.filter(a => a.code === '4030' || a.parentCode === '4030');
    if (filtered.length > 0) return filtered;
    return [{ id: 'acc-4030', code: '4030', name: 'Service Income', type: 'revenue', classification: 'revenue' }];
  }, [coa]);

  const [selectedParentCode, setSelectedParentCode] = useState('4030');

  // Filter parent revenue accounts (top-level accounts, e.g. parentCode === null and type === 'revenue')
  const parentRevenueAccounts = useMemo(() => {
    const filtered = coa.filter(a => a.type === 'revenue' && !a.parentCode);
    if (filtered.length > 0) return filtered;
    return [
      { id: 'acc-4010', code: '4010', name: 'Sales Revenue - Domestic', type: 'revenue' },
      { id: 'acc-4020', code: '4020', name: 'Sales Revenue - Export', type: 'revenue' },
      { id: 'acc-4030', code: '4030', name: 'Service Income', type: 'revenue' },
      { id: 'acc-4040', code: '4040', name: 'Other Income', type: 'revenue' }
    ];
  }, [coa]);

  // Filter sub-accounts under the selected parent code
  const subRevenueAccounts = useMemo(() => {
    return coa.filter(a => a.parentCode === selectedParentCode);
  }, [coa, selectedParentCode]);

  // Helper to generate next incremental child code under parentCode in the COA tree
  const getNextAccountCode = (parentCode, currentCoa) => {
    if (!parentCode) return '';
    const children = currentCoa.filter(a => a.parentCode === parentCode);
    if (children.length > 0) {
      const sorted = [...children].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      const lastChild = sorted[sorted.length - 1];
      const lastCode = lastChild.code;
      const match = lastCode.match(/^(.*?)(0*\d+)$/);
      if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = parseInt(numStr, 10) + 1;
        const paddedNextNum = String(nextNum).padStart(numStr.length, '0');
        return prefix + paddedNextNum;
      }
      return lastCode + '1';
    } else {
      if (/^\d+$/.test(parentCode)) {
        return parentCode + '01';
      }
      return parentCode + '-01';
    }
  };

  // Helper to automatically generate unique service code from service name
  const generateServiceCode = (name) => {
    if (!name) {
      let randomNum = Math.floor(Math.random() * 90000) + 10000;
      let code = `SRV-${randomNum}`;
      while (serviceCatalog.some(s => s.code === code || s.sku === code)) {
        randomNum = Math.floor(Math.random() * 90000) + 10000;
        code = `SRV-${randomNum}`;
      }
      return code;
    }
    const words = name.trim().split(/\s+/);
    let abbreviation = words
      .map(w => w[0])
      .join('')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    
    if (abbreviation.length < 3 && words[0]) {
      abbreviation = words[0].substring(0, Math.min(4, words[0].length)).toUpperCase();
    }
    
    let baseCode = `SRV-${abbreviation}`;
    let finalCode = baseCode;
    let counter = 1;
    while (serviceCatalog.some(s => s.code === finalCode || s.sku === finalCode)) {
      finalCode = `${baseCode}${counter}`;
      counter++;
    }
    return finalCode;
  };

  // Helper to automatically generate unique SKU code based on category
  const generateDefaultSku = (categoryName) => {
    const prefix = categoryName ? categoryName.trim().substring(0, 3).toUpperCase() : 'PRO';
    let randomNum = Math.floor(Math.random() * 90000) + 10000;
    let code = `${prefix}-${randomNum}`;
    while (products.some(p => p.sku === code || p.id === code)) {
      randomNum = Math.floor(Math.random() * 90000) + 10000;
      code = `${prefix}-${randomNum}`;
    }
    return code;
  };

  const [productCategories, setProductCategories] = useState(() => {
    const stored = localStorage.getItem('erp_product_categories');
    if (stored) return JSON.parse(stored);
    localStorage.setItem('erp_product_categories', JSON.stringify(categories));
    return categories;
  });

  const [serviceCategories, setServiceCategories] = useState(() => {
    const stored = localStorage.getItem('erp_service_categories');
    if (stored) return JSON.parse(stored);
    const defaults = ['Calibration', 'Installation', 'Repair', 'Maintenance', 'Training'];
    localStorage.setItem('erp_service_categories', JSON.stringify(defaults));
    return defaults;
  });

  const handleAddProductCategory = () => {
    const newCat = prompt("Enter new product category name:");
    if (newCat && newCat.trim()) {
      const trimmed = newCat.trim();
      const existingName = productCategories.some(c => (typeof c === 'object' ? c.name : c).toLowerCase() === trimmed.toLowerCase());
      if (existingName) {
        alert("Category already exists!");
        return;
      }
      const newCatObj = { id: `cat-${Date.now()}`, name: trimmed, code: trimmed.substring(0, 4).toUpperCase(), isActive: true };
      const updated = [...productCategories, newCatObj];
      setProductCategories(updated);
      localStorage.setItem('erp_product_categories', JSON.stringify(updated));
      setFormFields(prev => ({ ...prev, category: trimmed }));
    }
  };

  const handleAddServiceAccount = async () => {
    const parentAcc = parentRevenueAccounts.find(p => p.code === selectedParentCode);
    const newAccName = prompt(`Enter new Account Name under ${parentAcc ? parentAcc.name : selectedParentCode}:`);
    if (newAccName && newAccName.trim()) {
      const trimmed = newAccName.trim();
      
      // Load current COA from localStorage to ensure we have latest codes
      let currentCoa = [];
      try {
        const stored = localStorage.getItem('erp_coa');
        if (stored) currentCoa = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
      if (currentCoa.length === 0) currentCoa = coa;

      if (currentCoa.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) {
        alert("Account name already exists!");
        return;
      }

      const nextCode = getNextAccountCode(selectedParentCode, currentCoa);
      const newAccObj = {
        id: `acc-${nextCode}`,
        code: nextCode,
        name: trimmed,
        type: 'revenue',
        classification: 'revenue',
        balance: 0,
        isSystem: false,
        parentCode: selectedParentCode,
        status: 'Active',
        costCenterAllowed: true,
        departmentAllowed: true,
        projectAllowed: true,
        reconciliationRequired: false
      };

      try {
        await accountingService.createChartOfAccount(newAccObj);
        alert(`Account "${trimmed}" with code "${nextCode}" registered successfully!`);
        loadCOA();
        setServiceForm(prev => ({ ...prev, category: trimmed }));
      } catch (err) {
        alert("Error registering account: " + err.message);
      }
    }
  };

  useEffect(() => {
    if (inventoryTabMode === 'services') {
      serviceModuleService.getServiceCatalog().then(data => {
        setServiceCatalog(data || []);
      });
    }
  }, [inventoryTabMode]);

  useEffect(() => {
    const openAddProduct = localStorage.getItem('inventory_open_add_product');
    if (openAddProduct) {
      setIsAddFormOpen(true);
      setInventoryTabMode('physical');
      localStorage.removeItem('inventory_open_add_product');
    }
    const openAddService = localStorage.getItem('inventory_open_add_service');
    if (openAddService) {
      setServiceForm({ code: '', name: '', baseFee: '', category: 'Service Income', description: '', slaHours: 24, vatRate: 15 });
      setEditingService(null);
      setIsServiceFormOpen(true);
      setInventoryTabMode('services');
      localStorage.removeItem('inventory_open_add_service');
    }
  }, []);

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      serviceModuleService.saveCatalogService({
        ...serviceForm,
        baseFee: Number(serviceForm.baseFee),
        slaHours: Number(serviceForm.slaHours || 24),
        vatRate: Number(serviceForm.vatRate !== undefined ? serviceForm.vatRate : 15),
        id: editingService ? editingService.id : undefined
      });
    } catch (err) {
      // Duplicate code or name error from service layer
      alert(err.message);
      return; // Stay on form so user can correct the value
    }
    alert('Service catalog item saved successfully.');
    setIsServiceFormOpen(false);
    setEditingService(null);
    setIsServiceCodeManuallyEdited(false);
    setServiceForm({ code: '', name: '', baseFee: '', category: 'Service Income', description: '', slaHours: 24, vatRate: 15 });
    const cat = await serviceModuleService.getServiceCatalog();
    setServiceCatalog(cat || []);
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Are you sure you want to delete this service catalog offering?')) {
      serviceModuleService.deleteCatalogService(id);
      alert('Service catalog item deleted.');
      const cat = await serviceModuleService.getServiceCatalog();
      setServiceCatalog(cat || []);
    }
  };
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedSupplier, setSelectedSupplier]   = useState('');
  const [selectedStatus, setSelectedStatus]       = useState('');
  const [minQty, setMinQty]                       = useState('');
  const [maxQty, setMaxQty]                       = useState('');
  const [minCost, setMinCost]                     = useState('');
  const [maxCost, setMaxCost]                     = useState('');
  const [valuationMethod, setValuationMethod]     = useState('avco'); // avco | fifo | lifo
  const [barcodeSearch, setBarcodeSearch]         = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [detailProduct, setDetailProduct]         = useState(null);
  const [detailService, setDetailService]         = useState(null);
  
  // Bulk Modal actions
  const [isBulkAdjustModalOpen, setIsBulkAdjustModalOpen] = useState(false);
  const [bulkAdjustQty, setBulkAdjustQty]                 = useState('');
  const [bulkAdjustReason, setBulkAdjustReason]           = useState('');
  const [bulkAdjustType, setBulkAdjustType]               = useState('in');

  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen]     = useState(false);
  const [bulkMoveWarehouse, setBulkMoveWarehouse]         = useState('wh-1');

  // Stock Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen]     = useState(false);
  const [transferProduct, setTransferProduct]             = useState(null);
  const [transferFromWh, setTransferFromWh]               = useState('wh-1');
  const [transferToWh, setTransferToWh]                   = useState('wh-2');
  const [transferQty, setTransferQty]                     = useState('');

  const [viewTab, setViewTab]                  = useState('table'); // table | abc | reorder | ledger | warehouses
  
  // Quick Adjust Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct]     = useState(null);
  const [adjustType, setAdjustType]               = useState('in');
  const [adjustQty, setAdjustQty]                 = useState('');
  const [adjustReason, setAdjustReason]           = useState('');
  const [loading, setLoading]                     = useState(false);

  // Add / Edit Form
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);
  const [isServiceCodeManuallyEdited, setIsServiceCodeManuallyEdited] = useState(false);
  const [formFields, setFormFields] = useState({
    name: '', sku: '', category: (typeof productCategories[0] === 'object' ? productCategories[0]?.name : productCategories[0]) || '', qty: 0,
    unit: 'pcs', price: '', minStock: 5, location: '', supplierId: suppliers[0]?.id || ''
  });

  // Reorder modal
  const [reorderProduct, setReorderProduct] = useState(null);
  const [reorderQty, setReorderQty]         = useState('');

  // Stock movements ledger state
  const [movements, setMovements] = useState([]);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerType, setLedgerType] = useState('all');
  const [ledgerFromDate, setLedgerFromDate] = useState('');
  const [ledgerToDate, setLedgerToDate] = useState('');

  // Persistent reorder requests state
  const [reorderRequests, setReorderRequests] = useState([]);

  // Fetch initial ledger and reorder logs
  const reloadLogs = async () => {
    try {
      const [moves, reqs] = await Promise.all([
        inventoryService.getStockMovements(),
        inventoryService.getReorderRequests()
      ]);
      setMovements(moves || []);
      setReorderRequests(reqs || []);
    } catch (err) {
      console.error('[InventoryView] Error loading logs', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reloadLogs();
  }, [products]);

  const fmt = (val) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(val);

  /* ── Derived KPIs ── */
  const kpis = useMemo(() => {
    const totalValue = products.reduce((sum, p) => {
      const val = calculateProductValuation(p, movements, valuationMethod);
      return sum + val.totalValue;
    }, 0);
    const totalItems = products.length;
    const inStock = products.filter(p => p.qty > p.minStock && p.status !== 'discontinued' && p.status !== 'damaged').length;
    const lowStock = products.filter(p => p.qty > 0 && p.qty <= p.minStock && p.status !== 'discontinued' && p.status !== 'damaged').length;
    const outOfStock = products.filter(p => p.qty === 0 && p.status !== 'discontinued').length;
    const itemsToReorder = products.filter(p => p.qty <= p.minStock && p.status !== 'discontinued' && p.status !== 'damaged').length;
    const avgTurnover = products.length ? (products.reduce((s, p) => s + p.qty, 0) / products.length).toFixed(1) : 0;
    return { totalValue, totalItems, inStock, lowStock, outOfStock, itemsToReorder, avgTurnover };
  }, [products, movements, valuationMethod]);

  /* ── ABC Analysis ── */
  const abcData = useMemo(() => {
    const sorted = [...products]
      .map(p => {
        const val = calculateProductValuation(p, movements, valuationMethod);
        return { ...p, value: val.totalValue, unitCost: val.unitCost };
      })
      .sort((a, b) => b.value - a.value);
    const totalVal = sorted.reduce((s, p) => s + p.value, 0);
    const result = [];
    let cum = 0;
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      cum += p.value;
      const cumPct = totalVal > 0 ? (cum / totalVal) * 100 : 100;
      const cls = abcClass(cumPct - (p.value / totalVal) * 100);
      result.push({ ...p, cumPct: cumPct.toFixed(1), abc: cls, valuePct: totalVal > 0 ? ((p.value / totalVal) * 100).toFixed(1) : '0' });
    }
    return result;
  }, [products, movements, valuationMethod]);

  /* ── Low-stock items for reorder tab ── */
  const reorderItems = useMemo(() =>
    products.filter(p => p.qty <= p.minStock && p.status !== 'discontinued' && p.status !== 'damaged').sort((a, b) => a.qty - b.qty),
    [products]
  );

  const filteredProducts = useMemo(() => products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBarcode = !barcodeSearch.trim() || 
      product.sku.toLowerCase() === barcodeSearch.toLowerCase().trim() ||
      (product.barcode || '').toLowerCase() === barcodeSearch.toLowerCase().trim();

    const matchesCategory = selectedCategory === '' || product.category === selectedCategory;

    let matchesWarehouse = true;
    if (selectedWarehouse !== '') {
      const warehouseQty = getProductWarehouseQty(product, selectedWarehouse);
      matchesWarehouse = warehouseQty > 0;
    }

    const matchesSupplier = selectedSupplier === '' || product.supplierId === selectedSupplier;

    const statusObj = getDetailedStockStatus(product);
    const matchesStatus = selectedStatus === '' || statusObj.id === selectedStatus;

    const matchesMinQty = minQty === '' || product.qty >= Number(minQty);
    const matchesMaxQty = maxQty === '' || product.qty <= Number(maxQty);

    const valuation = calculateProductValuation(product, movements, valuationMethod);
    const matchesMinCost = minCost === '' || valuation.unitCost >= Number(minCost);
    const matchesMaxCost = maxCost === '' || valuation.unitCost <= Number(maxCost);

    return matchesSearch && matchesBarcode && matchesCategory && matchesWarehouse && matchesSupplier && matchesStatus && matchesMinQty && matchesMaxQty && matchesMinCost && matchesMaxCost;
  }), [products, searchTerm, barcodeSearch, selectedCategory, selectedWarehouse, selectedSupplier, selectedStatus, minQty, maxQty, minCost, maxCost, valuationMethod, movements]);

  const getStockStatus = (product) => {
    const statusObj = getDetailedStockStatus(product);
    return { label: statusObj.label, cls: statusObj.id };
  };

  /* ── Handlers ── */
  const handleOpenAdjustModal = (product) => {
    if (!authService.hasPermission(currentUser, 'adjustments:write')) {
      alert('Permission Denied: You do not have permission to execute manual adjustments!');
      return;
    }
    setSelectedProduct(product);
    setAdjustType('in'); setAdjustQty(''); setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty || isNaN(adjustQty) || Number(adjustQty) <= 0) return;
    setLoading(true);
    try {
      const delta = adjustType === 'in' ? Number(adjustQty) : -Number(adjustQty);

      await inventoryService.adjustStock(selectedProduct.id, delta, adjustReason, currentUser);
      alert(`Successfully posted adjustment for "${selectedProduct.name}".`);
      onRefresh();
      setIsAdjustModalOpen(false);
    } catch (err) {
      alert(err.message || 'Adjustment failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    if (!authService.hasPermission(currentUser, 'inventory:write')) {
      alert('Permission Denied: You do not have permission to add new products!'); return;
    }
    setEditingProduct(null);
    setIsSkuManuallyEdited(false);
    const defaultCategory = (typeof productCategories[0] === 'object' ? productCategories[0]?.name : productCategories[0]) || '';
    const initialSku = generateDefaultSku(defaultCategory);
    setFormFields({
      name: '', sku: initialSku, category: defaultCategory, qty: 0,
      unit: 'pcs', price: '', minStock: 5, location: '', supplierId: suppliers[0]?.id || '', warehouseId: 'wh-1',
      expiryDate: '', status: 'active', barcode: '', warrantyMonths: 12
    });
    setIsAddFormOpen(true);
  };

  const handleOpenEdit = (product) => {
    if (!authService.hasPermission(currentUser, 'inventory:write')) {
      alert('Permission Denied: You do not have permission to modify products!'); return;
    }
    setEditingProduct(product);
    setIsSkuManuallyEdited(true); // Existing product, keep SKU fixed
    setFormFields({
      ...product,
      price: product.price.toString(),
      warehouseId: product.warehouseId || 'wh-1',
      expiryDate: product.expiryDate || '',
      status: product.status || 'active',
      barcode: product.barcode || '',
      warrantyMonths: product.warrantyMonths !== undefined ? product.warrantyMonths : 12
    });
    setIsAddFormOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const qtyVal = editingProduct ? editingProduct.qty : Number(formFields.qty);
    
    let qtyMap = formFields.warehouseQtyMap;
    if (!editingProduct) {
      qtyMap = { 'wh-1': 0, 'wh-2': 0, 'wh-3': 0 };
      qtyMap[formFields.warehouseId || 'wh-1'] = qtyVal;
    }

    onSaveProduct({
      ...formFields,
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      qty: qtyVal,
      price: Number(formFields.price),
      minStock: Number(formFields.minStock),
      warehouseQtyMap: qtyMap,
      warrantyMonths: Number(formFields.warrantyMonths !== undefined ? formFields.warrantyMonths : 0)
    }, editingProduct);
    setIsAddFormOpen(false);
  };

  const handleSendReorder = async (p) => {
    const qty = Number(reorderQty) || Math.max(p.minStock * 2, 10);
    setLoading(true);
    try {
      await inventoryService.postReorderRequest({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        qty,
        unit: p.unit,
        supplierId: p.supplierId,
        supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'Default Supplier'
      }, currentUser);
      alert(`✅ Reorder Request Saved & Sent!\n\nItem: ${p.name}\nQuantity: ${qty} ${p.unit}`);
      setReorderProduct(null);
      setReorderQty('');
      await reloadLogs();
    } catch (err) {
      alert('Error creating reorder: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReorder = async () => {
    if (selectedProductIds.length === 0) return;
    setLoading(true);
    let successCount = 0;
    try {
      for (const id of selectedProductIds) {
        const p = products.find(prod => prod.id === id);
        if (p) {
          const qty = Math.max(p.minStock * 3, 10);
          await inventoryService.postReorderRequest({
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            qty,
            unit: p.unit,
            supplierId: p.supplierId,
            supplierName: suppliers.find(s => s.id === p.supplierId)?.name || 'Default Supplier'
          }, currentUser);
          successCount++;
        }
      }
      alert(`Successfully sent reorder requests for ${successCount} items.`);
      setSelectedProductIds([]);
      reloadLogs();
    } catch (err) {
      alert('Bulk reorder encountered an error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdjustSubmit = async (e) => {
    e.preventDefault();
    if (selectedProductIds.length === 0 || !bulkAdjustQty || isNaN(bulkAdjustQty) || Number(bulkAdjustQty) <= 0) return;
    setLoading(true);
    try {
      const delta = bulkAdjustType === 'in' ? Number(bulkAdjustQty) : -Number(bulkAdjustQty);
      for (const id of selectedProductIds) {
        const p = products.find(prod => prod.id === id);
        if (p) {
          if (delta < 0 && p.qty + delta < 0) {
            continue;
          }
          await inventoryService.adjustStock(p.id, delta, bulkAdjustReason || 'Bulk adjustment', currentUser);
        }
      }
      alert('Bulk stock adjustment processed successfully.');
      setIsBulkAdjustModalOpen(false);
      setSelectedProductIds([]);
      onRefresh();
    } catch (err) {
      alert('Error during bulk adjustment: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMoveSubmit = async (e) => {
    e.preventDefault();
    if (selectedProductIds.length === 0) return;
    setLoading(true);
    try {
      for (const id of selectedProductIds) {
        const p = products.find(prod => prod.id === id);
        if (p) {
          const newMap = { 'wh-1': 0, 'wh-2': 0, 'wh-3': 0 };
          newMap[bulkMoveWarehouse] = p.qty;
          const whName = WAREHOUSES.find(w => w.id === bulkMoveWarehouse)?.name || '';
          
          await onSaveProduct({
            ...p,
            location: `Warehouse: ${whName}`,
            warehouseQtyMap: newMap
          }, p);
        }
      }
      alert('Successfully moved selected items to target warehouse.');
      setIsBulkMoveModalOpen(false);
      setSelectedProductIds([]);
      onRefresh();
    } catch (err) {
      alert('Bulk move failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete/archive all ${selectedProductIds.length} selected items?`)) return;
    setLoading(true);
    try {
      for (const id of selectedProductIds) {
        await onDeleteProduct(id);
      }
      alert('Selected items deleted.');
      setSelectedProductIds([]);
    } catch (err) {
      alert('Bulk delete error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!transferProduct || !transferQty || isNaN(transferQty) || Number(transferQty) <= 0) return;
    if (transferFromWh === transferToWh) {
      alert('Source and destination warehouses cannot be the same!');
      return;
    }
    const qtyToMove = Number(transferQty);
    const fromQty = getProductWarehouseQty(transferProduct, transferFromWh);
    
    if (fromQty < qtyToMove) {
      alert(`Insufficient stock in source warehouse! Available: ${fromQty} ${transferProduct.unit}`);
      return;
    }
    
    setLoading(true);
    try {
      const map = transferProduct.warehouseQtyMap || { 'wh-1': transferProduct.qty, 'wh-2': 0, 'wh-3': 0 };
      const newMap = {
        ...map,
        [transferFromWh]: (map[transferFromWh] || 0) - qtyToMove,
        [transferToWh]: (map[transferToWh] || 0) + qtyToMove
      };
      
      const fromWhName = WAREHOUSES.find(w => w.id === transferFromWh)?.name || '';
      const toWhName = WAREHOUSES.find(w => w.id === transferToWh)?.name || '';
      
      await onSaveProduct({
        ...transferProduct,
        warehouseQtyMap: newMap
      }, transferProduct);
      
      const newMovement = {
        id: `move-${Date.now()}`,
        productId: transferProduct.id,
        qty: 0,
        unitPrice: transferProduct.price,
        type: 'transfer',
        refNo: `TRF-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        description: `Transferred ${qtyToMove} units of ${transferProduct.name} from ${fromWhName} to ${toWhName}`
      };
      
      const savedMoves = localStorage.getItem('erp_movements');
      const movesList = savedMoves ? JSON.parse(savedMoves) : [];
      localStorage.setItem('erp_movements', JSON.stringify([newMovement, ...movesList]));
      
      await inventoryService.adjustStock(transferProduct.id, 0, `Transfer ${qtyToMove} units from ${fromWhName} to ${toWhName}`, currentUser);
      
      alert(`Successfully transferred ${qtyToMove} ${transferProduct.unit} of "${transferProduct.name}".`);
      setIsTransferModalOpen(false);
      setTransferProduct(null);
      setTransferQty('');
      onRefresh();
      reloadLogs();
    } catch (err) {
      alert('Transfer failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const printBarcodeLabel = (product) => {
    alert(`🖨️ Printing Barcode Label...\n\nProduct: ${product.name}\nSKU/Code: ${product.sku}\nFormat: CODE128\nValuation Cost: BDT ${product.price}\n\nSent to network label printer.`);
  };

  const downloadValuationPDF = () => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF is not loaded.');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // border box
    doc.rect(5, 5, 200, 287);
    
    // Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('ACCOUNTICA', 105, 18, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('House 42, Road 11, Banani, Dhaka, Bangladesh', 105, 23, { align: 'center' });
    doc.text('BIN: 001234567-0101 | info@erpforu.com', 105, 27, { align: 'center' });
    
    doc.setDrawColor(37, 99, 235);
    doc.line(10, 31, 200, 31);
    
    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text('INVENTORY VALUATION SHEET', 105, 41, { align: 'center' });

    // Summary Card
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 47, 190, 20, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Report Date: ${new Date().toISOString().substring(0, 10)}`, 12, 53);
    doc.text(`Total SKU Lines: ${kpis.totalItems}`, 12, 59);
    doc.text(`Low/Out Stock Alerts: ${kpis.lowStock + kpis.outOfStock} items`, 110, 53);
    doc.text(`Avg On-Hand Qty: ${kpis.avgTurnover} units`, 110, 59);

    // Table Header
    let tableY = 74;
    doc.setFillColor(241, 245, 249);
    doc.rect(10, tableY, 190, 8, 'F');
    doc.rect(10, tableY, 190, 8);
    
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('SL', 12, tableY + 5.5);
    doc.text('SKU', 20, tableY + 5.5);
    doc.text('Product Name', 45, tableY + 5.5);
    doc.text('Category', 95, tableY + 5.5);
    doc.text('Qty', 130, tableY + 5.5, { align: 'right' });
    doc.text('Cost BDT', 155, tableY + 5.5, { align: 'right' });
    doc.text('Value BDT', 185, tableY + 5.5, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    let y = tableY + 8;
    
    // Sort products by highest stock value
    const sortedProducts = [...products].sort((a, b) => (b.qty * b.price) - (a.qty * a.price));

    sortedProducts.forEach((item, idx) => {
      // Check if page overflow
      if (y > 270) {
        doc.addPage();
        doc.rect(5, 5, 200, 287);
        y = 15;
        // Table Header again
        doc.setFillColor(241, 245, 249);
        doc.rect(10, y, 190, 8, 'F');
        doc.rect(10, y, 190, 8);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('SL', 12, y + 5.5);
        doc.text('SKU', 20, y + 5.5);
        doc.text('Product Name', 45, y + 5.5);
        doc.text('Category', 95, y + 5.5);
        doc.text('Qty', 130, y + 5.5, { align: 'right' });
        doc.text('Cost BDT', 155, y + 5.5, { align: 'right' });
        doc.text('Value BDT', 185, y + 5.5, { align: 'right' });
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        y += 8;
      }

      doc.rect(10, y, 190, 8);
      doc.text(String(idx + 1), 12, y + 5.5);
      doc.text(item.sku, 20, y + 5.5);
      
      let pName = item.name;
      if (pName.length > 25) pName = pName.substring(0, 23) + '..';
      doc.text(pName, 45, y + 5.5);
      
      let cat = item.category || 'N/A';
      if (cat.length > 18) cat = cat.substring(0, 16) + '..';
      doc.text(cat, 95, y + 5.5);
      
      doc.text(`${item.qty} ${item.unit}`, 130, y + 5.5, { align: 'right' });
      doc.text(Number(item.price).toLocaleString(), 155, y + 5.5, { align: 'right' });
      doc.text(Number(item.qty * item.price).toLocaleString(), 185, y + 5.5, { align: 'right' });
      y += 8;
    });

    // Valuation sum block
    if (y > 260) {
      doc.addPage();
      doc.rect(5, 5, 200, 287);
      y = 15;
    }
    
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y, 190, 10, 'F');
    doc.rect(10, y, 190, 10);
    doc.setFont('Helvetica', 'bold');
    doc.text('Total Inventory Capital Valuation (AVCO):', 12, y + 6.5);
    doc.text(Number(kpis.totalValue).toLocaleString() + ' BDT', 185, y + 6.5, { align: 'right' });

    y += 25;
    doc.setLineWidth(0.3);
    doc.setDrawColor(148, 163, 184);
    doc.line(20, y, 65, y);
    doc.line(140, y, 185, y);
    doc.setFontSize(8);
    doc.text('Warehouse Auditor Signature', 42, y + 4, { align: 'center' });
    doc.text('Authorized Seal & Sign', 162, y + 4, { align: 'center' });

    doc.save(`Inventory_Valuation_Report_${new Date().toISOString().substring(0,10)}.pdf`);
  };

  /* ── Inline Styles ── */
  const cardStyle = () => ({
    background: 'var(--card-bg, #ffffff)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: 0,
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'default',
    boxShadow: 'var(--shadow-sm)',
    position: 'relative',
  });

  const tabStyle = (active) => ({
    padding: '0.6rem 1.35rem', borderRadius: 8,
    border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: active ? 700 : 600,
    background: active ? 'var(--accent-color)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.18s',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    whiteSpace: 'nowrap',
  });

  // Compute a simple health score (0-100)
  const healthScore = useMemo(() => {
    if (!kpis.totalItems) return 100;
    const healthyPct = (kpis.inStock / kpis.totalItems) * 100;
    const lowPenalty = (kpis.lowStock / kpis.totalItems) * 30;
    const outPenalty = (kpis.outOfStock / kpis.totalItems) * 60;
    return Math.max(0, Math.round(healthyPct - lowPenalty - outPenalty));
  }, [kpis]);

  const renderHeaderAndTabs = () => (
    <>
      {/* ── PREMIUM INVENTORY HEADER ── */}
      <div style={{
        marginBottom: '1.5rem',
        borderRadius: 24,
        background: 'linear-gradient(135deg, #022c22 0%, #064e3b 45%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 12px 35px -5px rgba(2,44,34,0.3)',
        transition: 'all 0.3s ease'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -50, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(34,197,94,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 280, width: 120, height: 120, borderRadius: '50%', background: 'rgba(37,99,235,0.06)' }} />

        {/* Identity row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem 1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>📦</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.4px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Inventory Management System</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: 3, fontWeight: 500 }}>Real-time Stock Levels · Multi-Warehouse Matrices · ABC Intelligence · Reorders</div>
            </div>
          </div>
          {/* Status pills + Health */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'In Stock', val: kpis.inStock, color: '#22c55e' },
              { label: 'Low Stock', val: kpis.lowStock, color: '#f59e0b' },
              { label: 'Out of Stock', val: kpis.outOfStock, color: '#ef4444' },
              { label: 'Total SKUs', val: kpis.totalItems, color: '#3b82f6' },
            ].map(p => (
              <div key={p.label} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.color}35`, borderRadius: 12, padding: '0.35rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)' }}>
                <span style={{ color: p.color, fontWeight: 800, fontSize: '0.95rem' }}>{p.val}</span>
                <span style={{ opacity: 0.8, fontWeight: 600 }}>{p.label}</span>
              </div>
            ))}
            {/* Health score */}
            <div style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${healthScore > 70 ? '#22c55e' : healthScore > 40 ? '#f59e0b' : '#ef4444'}50`, borderRadius: 14, padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(4px)' }}>
              <div>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Health Score</div>
                <div style={{ fontWeight: 955, fontSize: '1.15rem', color: healthScore > 70 ? '#22c55e' : healthScore > 40 ? '#f59e0b' : '#ef4444' }}>{healthScore}/100</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `conic-gradient(${healthScore > 70 ? '#22c55e' : healthScore > 40 ? '#f59e0b' : '#ef4444'} ${healthScore * 3.6}deg, rgba(255,255,255,0.15) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(15,23,42,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>{healthScore > 70 ? '✓' : healthScore > 40 ? '!' : '✕'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert strip */}
        {(kpis.outOfStock > 0 || kpis.lowStock > 0) && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.6rem 2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em' }}>⚡ Alerts Dashboard:</span>
            {kpis.outOfStock > 0 && <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 700 }}>🚨 {kpis.outOfStock} item{kpis.outOfStock > 1 ? 's' : ''} completely out of stock</span>}
            {kpis.lowStock > 0 && <span style={{ fontSize: '0.75rem', color: '#fde68a', fontWeight: 700 }}>⚠️ {kpis.lowStock} item{kpis.lowStock > 1 ? 's' : ''} below minimum threshold</span>}
            {kpis.itemsToReorder > 0 && (
              <span 
                style={{ fontSize: '0.75rem', color: '#a5f3fc', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'underline' }} 
                onClick={() => setViewTab('reorder')}
              >
                🔄 {kpis.itemsToReorder} reorder{kpis.itemsToReorder > 1 ? 's' : ''} required → View Reorder Tab
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── HIGH LEVEL NAVIGATION TAB SWITCHER ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '0.35rem', borderRadius: 12, border: '1px solid var(--border-color)', width: 'fit-content' }}>
        <button
          type="button"
          style={{
            padding: '0.55rem 1.4rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: inventoryTabMode === 'physical' ? 700 : 600,
            background: inventoryTabMode === 'physical' ? 'var(--accent-color)' : 'transparent', color: inventoryTabMode === 'physical' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setInventoryTabMode('physical')}
        >
          📦 Physical Products (Stock)
        </button>
        <button
          type="button"
          style={{
            padding: '0.55rem 1.4rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: inventoryTabMode === 'services' ? 700 : 600,
            background: inventoryTabMode === 'services' ? 'var(--accent-color)' : 'transparent', color: inventoryTabMode === 'services' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setInventoryTabMode('services')}
        >
          🛠️ Service Offerings Catalog
        </button>
      </div>
    </>
  );

  if (inventoryTabMode === 'services') {
    // ── Service KPIs ──
    const filteredServiceList = serviceCatalog.filter(s => {
      const matchesSearch =
        (s.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = !serviceCategoryFilter || (s.category || '') === serviceCategoryFilter;
      return matchesSearch && matchesCat;
    });
    const totalServices = serviceCatalog.length;
    const avgBaseFee = totalServices > 0 ? Math.round(serviceCatalog.reduce((s, x) => s + (Number(x.baseFee) || 0), 0) / totalServices) : 0;
    const activeCategories = [...new Set(serviceCatalog.map(s => s.category).filter(Boolean))].length;
    const fastestSla = totalServices > 0 ? Math.min(...serviceCatalog.map(s => Number(s.slaHours) || 24)) : 0;



    const serviceInitials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

    return (
      <div style={{ position: 'relative' }}>
        {renderHeaderAndTabs()}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── Service KPI Row ── */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Total Services',    value: totalServices,                  icon: '🛠️', color: '#6366f1', display: v => `${v}` },
              { label: 'Avg Base Fee',      value: avgBaseFee,                     icon: '💰', color: '#10b981', display: v => `৳${v.toLocaleString()}` },
              { label: 'Active Categories', value: activeCategories,               icon: '🗂️', color: '#f59e0b', display: v => `${v}` },
              { label: 'Fastest SLA',       value: fastestSla,                     icon: '⚡', color: '#ec4899', display: v => `${v}h` },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${k.color}20`; e.currentTarget.style.borderColor = `${k.color}40`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <div style={{ height: 4, background: `linear-gradient(90deg, ${k.color}, ${k.color}70)` }} />
                <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: 4 }}>{k.icon}</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: k.color, lineHeight: 1.1, letterSpacing: '-0.5px' }}>{k.display(k.value)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.65rem', flex: 1, flexWrap: 'wrap', minWidth: 250 }}>
              <input
                type="text"
                placeholder="🔍 Search by code, name, or account..."
                className="search-input"
                style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 160, fontSize: '0.82rem' }}
                value={serviceCategoryFilter}
                onChange={e => setServiceCategoryFilter(e.target.value)}
              >
                <option value="">All Accounts</option>
                {serviceAccounts.map(acc => (
                  <option key={acc.code} value={acc.name}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => {
                setEditingService(null);
                setIsServiceCodeManuallyEdited(false);
                const defaultCode = generateServiceCode('');
                setServiceForm({ code: defaultCode, name: '', baseFee: '', category: 'Service Income', description: '', slaHours: 24, vatRate: 15 });
                setIsServiceFormOpen(true);
              }}>➕ Add Service</button>
            </div>
          </div>

          {/* ── TABLE VIEW ── */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service Code</th>
                    <th>Service Name</th>
                    <th>Account Name</th>
                    <th>SLA Target</th>
                    <th>VAT Rate</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Base Fee</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServiceList.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No service packages found.</td></tr>
                  )}
                  {filteredServiceList.map(s => {
                    const catCfg = getCatCfg(s.category);
                    return (
                      <tr 
                         key={s.id}
                        onClick={() => setDetailService(s)}
                        style={{ 
                          cursor: 'pointer',
                          background: detailService?.id === s.id ? 'rgba(37,99,235,0.05)' : 'transparent',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <td style={{ whiteSpace: 'nowrap' }}><span className="sku-badge">{s.code}</span></td>
                        <td title={s.name} style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</td>
                        <td>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: catCfg.bg, color: catCfg.color, border: `1px solid ${catCfg.border}`, whiteSpace: 'nowrap' }}>
                            {s.category || 'Service Income'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(236,72,153,0.08)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.2)', whiteSpace: 'nowrap' }}>
                            ⏱️ {s.slaHours || 24}h
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(37,99,235,0.08)', color: 'var(--accent-color)', border: '1px solid var(--accent-border)', whiteSpace: 'nowrap' }}>
                            📊 {s.vatRate !== undefined ? s.vatRate : 15}%
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: s.baseFee > 50000 ? '#16a34a' : 'var(--text-primary)', fontSize: '0.7rem' }}>{fmt(s.baseFee)}</td>
                        <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'center' }}>
                            <button 
                              title="Edit Service" 
                              onClick={() => {
                                setEditingService(s);
                                setIsServiceCodeManuallyEdited(true); // Existing service, keep code fixed
                                // Find parent account for selected category (if category is child account)
                                const matchedAcc = coa.find(a => a.name === s.category);
                                if (matchedAcc && matchedAcc.parentCode) {
                                  setSelectedParentCode(matchedAcc.parentCode);
                                } else if (matchedAcc) {
                                  setSelectedParentCode(matchedAcc.code);
                                } else {
                                  setSelectedParentCode('4030');
                                }
                                setServiceForm({ code: s.code || '', name: s.name || '', baseFee: s.baseFee || '', category: s.category || 'Service Income', description: s.description || '', slaHours: s.slaHours !== undefined ? s.slaHours : 24, vatRate: s.vatRate !== undefined ? s.vatRate : 15 });
                                setIsServiceFormOpen(true);
                              }} 
                              style={{ background: 'rgba(217, 119, 6, 0.08)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.2)', padding: '6px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217, 119, 6, 0.18)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(217, 119, 6, 0.08)'; }}
                            >✏️</button>
                            
                            <button 
                              title="Delete Service" 
                              onClick={() => handleDeleteService(s.id)} 
                              style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.2)', padding: '6px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.18)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)'; }}
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          {/* ── SERVICE FORM MODAL ── */}
          {isServiceFormOpen && (
            <div
              style={{
                display: 'flex',
                zIndex: 850,
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(10px)',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                overflowY: 'auto'
              }}
              onClick={() => setIsServiceFormOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: '720px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderRadius: '20px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 30px 60px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 2rem)',
                  margin: 'auto'
                }}
              >
                {/* Modal Header */}
                <div style={{
                  padding: '1.5rem 1.75rem',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #14b8a6 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>🛠️</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
                        {editingService ? 'Edit Service Offering' : 'Register New Service Offering'}
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>
                        {editingService ? `Updating details for: ${editingService.name}` : 'Define service specifications, base pricing, tax rate and SLA guidelines'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsServiceFormOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      width: '36px', height: '36px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer',
                      transition: 'all 0.2s', position: 'relative', flexShrink: 0
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >&times;</button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* SECTION 1: Service Core Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>🛠️</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Core Specifications</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                      </div>

                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        {/* Service Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            Service Name <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text" required
                            placeholder="e.g. Laser Precision Alignment"
                            className="form-control"
                            style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                            value={serviceForm.name}
                            onChange={e => {
                              const val = e.target.value;
                              if (!isServiceCodeManuallyEdited && !editingService) {
                                setServiceForm({ ...serviceForm, name: val, code: generateServiceCode(val) });
                              } else {
                                setServiceForm({ ...serviceForm, name: val });
                              }
                            }}
                          />
                        </div>

                        {/* Service Code */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Service Code <span style={{ color: '#ef4444' }}>*</span></span>
                          </label>
                          <input
                            type="text" required
                            placeholder="e.g. SRV-TOTAL-CAL"
                            className="form-control"
                            style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                            value={serviceForm.code}
                            onChange={e => {
                              setIsServiceCodeManuallyEdited(true);
                              setServiceForm({ ...serviceForm, code: e.target.value.toUpperCase() });
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Pricing & SLA Parameters */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>৳</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Pricing & SLA Parameters</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                      </div>

                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        {/* Base Fee */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            Base Fee (BDT) <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="number" required min="0"
                            placeholder="Standard Rate"
                            className="form-control"
                            style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                            value={serviceForm.baseFee}
                            onChange={e => setServiceForm({ ...serviceForm, baseFee: e.target.value })}
                          />
                        </div>

                        {/* VAT Rate */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>VAT Rate (%)</label>
                          <select
                            className="form-control"
                            style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                            value={serviceForm.vatRate}
                            onChange={e => setServiceForm({ ...serviceForm, vatRate: e.target.value })}
                          >
                            <option value="0">0% — Exempt</option>
                            <option value="5">5% — Standard Service</option>
                            <option value="7.5">7.5% — Consulting</option>
                            <option value="10">10% — Equipment Leasing</option>
                            <option value="15">15% — Full Rate VAT</option>
                          </select>
                        </div>

                        {/* SLA Target */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SLA Target (Hours)</label>
                          <input
                            type="number" min="1"
                            placeholder="e.g. 24"
                            className="form-control"
                            style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                            value={serviceForm.slaHours}
                            onChange={e => setServiceForm({ ...serviceForm, slaHours: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: Accounting Linkages */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>🏦</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Financial & General Ledger Mapping</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                      </div>

                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                        {/* Parent Account */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Account Name</label>
                          <select
                            className="form-control"
                            style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                            value={selectedParentCode}
                            onChange={e => {
                              const pCode = e.target.value;
                              setSelectedParentCode(pCode);
                              const children = coa.filter(a => a.parentCode === pCode);
                              setServiceForm(prev => ({
                                ...prev,
                                category: children.length > 0 ? children[0].name : (coa.find(p => p.code === pCode)?.name || 'Service Income')
                              }));
                            }}
                          >
                            {parentRevenueAccounts.map(acc => (
                              <option key={acc.code} value={acc.code}>{acc.code} — {acc.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Sub-Account */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Sub-Account Name</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                              className="form-control"
                              style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                              onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                              onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                              value={serviceForm.category}
                              onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}
                              disabled={subRevenueAccounts.length === 0}
                            >
                              {subRevenueAccounts.length === 0 ? (
                                <option value="">No Sub-Accounts (Default to Parent)</option>
                              ) : (
                                subRevenueAccounts.map(acc => (
                                  <option key={acc.code} value={acc.name}>{acc.code} — {acc.name}</option>
                                ))
                              )}
                            </select>
                            <button
                              type="button"
                              onClick={handleAddServiceAccount}
                              title="Add New Sub-Account"
                              style={{
                                padding: '0.7rem 1.1rem',
                                borderRadius: '10px',
                                border: '1.5px solid var(--border-color)',
                                background: 'rgba(16, 185, 129, 0.08)',
                                color: '#10b981',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'}
                            >＋</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Service Description</label>
                      <textarea
                        rows={3}
                        placeholder="Define service scope, calibration metrics, or checklist steps..."
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={serviceForm.description}
                        onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Form Footer */}
                  <div className="form-actions" style={{
                    padding: '1.25rem 1.75rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '0 0 20px 20px'
                  }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      onClick={() => setIsServiceFormOpen(false)}
                    >Cancel</button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', cursor: 'pointer' }}
                    >💾 Save Offering</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ── Slide-over Service Detail Drawer ── */}
        {detailService && (
          <>
            <div onClick={() => setDetailService(null)} style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
            <div style={{
              position: 'fixed', right: 0, top: 0, bottom: 0, width: '460px',
              background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
              zIndex: 900, boxShadow: '-10px 0 35px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column',
              transform: detailService ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Drawer Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
                <div>
                  <span className="sku-badge" style={{ marginBottom: 4 }}>{detailService.code}</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{detailService.name}</h3>
                </div>
                <button onClick={() => setDetailService(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              {/* Drawer Content */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Description */}
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Service Description</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{detailService.description || 'No description provided.'}</p>
                </div>

                {/* Badges/Category */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Account Name</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: getCatCfg(detailService.category).bg, color: getCatCfg(detailService.category).color, border: `1px solid ${getCatCfg(detailService.category).border}`, whiteSpace: 'nowrap' }}>
                      {detailService.category || 'Service Income'}
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>SLA Target</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(236,72,153,0.08)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.2)', whiteSpace: 'nowrap' }}>
                      ⏱️ {detailService.slaHours || 24}h
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>VAT Rate</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(37,99,235,0.08)', color: 'var(--accent-color)', border: '1px solid var(--accent-border)', whiteSpace: 'nowrap' }}>
                      📊 {detailService.vatRate !== undefined ? detailService.vatRate : 15}%
                    </span>
                  </div>
                </div>

                {/* Pricing details */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Standard Fee Structure</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Base Service Fee (Excl. VAT):</span>
                      <strong>{fmt(detailService.baseFee)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Estimated VAT:</span>
                      <strong>{fmt((detailService.baseFee * (detailService.vatRate !== undefined ? detailService.vatRate : 15)) / 100)}</strong>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 700 }}>Total Estimated Cost (Gross):</span>
                      <strong style={{ color: getCatCfg(detailService.category).color || 'var(--success)' }}>
                        {fmt(detailService.baseFee + (detailService.baseFee * (detailService.vatRate !== undefined ? detailService.vatRate : 15)) / 100)}
                      </strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Drawer Footer */}
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    if (window.confirm('Delete this service catalog offering?')) {
                      handleDeleteService(detailService.id);
                      setDetailService(null);
                    }
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
                >🗑️ Delete Offering</button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    setEditingService(detailService);
                    setServiceForm({
                      code: detailService.code || '', name: detailService.name || '', baseFee: detailService.baseFee || '',
                      category: detailService.category || 'Calibration', description: detailService.description || '',
                      slaHours: detailService.slaHours !== undefined ? detailService.slaHours : 24,
                      vatRate: detailService.vatRate !== undefined ? detailService.vatRate : 15
                    });
                    setIsServiceFormOpen(true);
                    setDetailService(null);
                  }}
                >✏️ Edit Offering</button>
              </div>

            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {renderHeaderAndTabs()}
      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Stock Value',  value: fmt(kpis.totalValue),   icon: '💰', color: '#2563eb' },
          { label: 'Total SKUs',         value: kpis.totalItems,        icon: '📦', color: '#7c3aed' },
          { label: 'In Stock Items',     value: kpis.inStock,           icon: '✅', color: '#16a34a' },
          { label: 'Low Stock Alerts',   value: kpis.lowStock,          icon: '⚠️', color: '#d97706' },
          { label: 'Out of Stock',       value: kpis.outOfStock,        icon: '🚨', color: '#dc2626' },
          { label: 'Items to Reorder',   value: kpis.itemsToReorder,    icon: '🔄', color: '#db2777' },
        ].map(k => (
          <div key={k.label} style={cardStyle()}
            onMouseEnter={e => { 
              e.currentTarget.style.transform = 'translateY(-4px)'; 
              e.currentTarget.style.boxShadow = `0 12px 28px ${k.color}15`; 
              e.currentTarget.style.borderColor = `${k.color}40`;
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.transform = 'none'; 
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; 
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            {/* Accent top bar */}
            <div style={{ height: 4, background: `linear-gradient(90deg, ${k.color}, ${k.color}80)`, borderRadius: '16px 16px 0 0' }} />
            <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Icon circle */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: 4 }}>{k.icon}</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: k.color, lineHeight: 1.1, letterSpacing: '-0.5px' }}>{k.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      {/* ── Tab Bar ── */}
      <div className="scrollable-tab-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: 12, padding: '0.3rem', width: 'fit-content', border: '1px solid var(--border-color)' }}>
          <button style={tabStyle(viewTab === 'table')}  onClick={() => setViewTab('table')}>📋 Products</button>
          <button style={tabStyle(viewTab === 'abc')}    onClick={() => setViewTab('abc')}>🎯 ABC Analysis</button>
          <button style={tabStyle(viewTab === 'reorder')} onClick={() => setViewTab('reorder')}>
            🔄 Reorder {reorderItems.length > 0 && <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: '0.6rem', fontWeight: 800 }}>{reorderItems.length}</span>}
          </button>
          <button style={tabStyle(viewTab === 'ledger')} onClick={() => setViewTab('ledger')}>📒 Stock Ledger</button>
          <button style={tabStyle(viewTab === 'warehouses')} onClick={() => setViewTab('warehouses')}>🏭 Warehouses</button>
        </div>
      </div>

      {/* ── PRODUCTS TABLE TAB ── */}
      {viewTab === 'table' && (
        <>
          {/* Filter Panel */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Section label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>🔍 Filter & Search</span>
            </div>

            {/* Row 1: Search */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
              <div className="search-input-wrapper" style={{ margin: 0, width: '100%' }}>
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="Search SKU, name, location..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              
              <div className="search-input-wrapper" style={{ margin: 0, width: '100%' }}>
                <span className="search-icon">🏷️</span>
                <input type="text" placeholder="Scan or type barcode/SKU..." value={barcodeSearch}
                  onChange={e => setBarcodeSearch(e.target.value)} className="search-input" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>

              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="select-filter" style={{ margin: 0, width: '100%' }}>
                <option value="">All Categories</option>
                {productCategories.map(cat => {
                  const catName = typeof cat === 'object' ? cat.name : cat;
                  return <option key={catName} value={catName}>{catName}</option>;
                })}
              </select>

              <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="select-filter" style={{ margin: 0, width: '100%' }}>
                <option value="">All Warehouses</option>
                {WAREHOUSES.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
              </select>
            </div>

            {/* Row 2: Advanced Ranges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
              <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="select-filter" style={{ margin: 0, width: '100%' }}>
                <option value="">All Suppliers</option>
                {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
              </select>

              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="select-filter" style={{ margin: 0, width: '100%' }}>
                <option value="">All Statuses</option>
                {STOCK_STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
              </select>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="number" placeholder="Min Qty" value={minQty} onChange={e => setMinQty(e.target.value)} className="form-control" style={{ padding: '0.5rem 0.6rem', fontSize: '0.82rem', borderRadius: 10, flex: 1, border: '1.5px solid var(--border-color)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>—</span>
                <input type="number" placeholder="Max Qty" value={maxQty} onChange={e => setMaxQty(e.target.value)} className="form-control" style={{ padding: '0.5rem 0.6rem', fontSize: '0.82rem', borderRadius: 10, flex: 1, border: '1.5px solid var(--border-color)' }} />
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="number" placeholder="Min Cost" value={minCost} onChange={e => setMinCost(e.target.value)} className="form-control" style={{ padding: '0.5rem 0.6rem', fontSize: '0.82rem', borderRadius: 10, flex: 1, border: '1.5px solid var(--border-color)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>—</span>
                <input type="number" placeholder="Max Cost" value={maxCost} onChange={e => setMaxCost(e.target.value)} className="form-control" style={{ padding: '0.5rem 0.6rem', fontSize: '0.82rem', borderRadius: 10, flex: 1, border: '1.5px solid var(--border-color)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>📊 Valuation:</span>
                <select value={valuationMethod} onChange={e => setValuationMethod(e.target.value)} className="select-filter" style={{ margin: 0, flex: 1, padding: '0.5rem 0.6rem' }}>
                  <option value="avco">AVCO (Avg)</option>
                  <option value="fifo">FIFO</option>
                  <option value="lifo">LIFO</option>
                </select>
              </div>
            </div>

            {/* Actions row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                {(searchTerm || barcodeSearch || selectedCategory || selectedWarehouse || selectedSupplier || selectedStatus || minQty || maxQty || minCost || maxCost) && (
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSearchTerm(''); setBarcodeSearch(''); setSelectedCategory(''); setSelectedWarehouse(''); setSelectedSupplier(''); setSelectedStatus(''); setMinQty(''); setMaxQty(''); setMinCost(''); setMaxCost(''); }} style={{ color: '#dc2626', fontWeight: 700, borderColor: 'rgba(220,38,38,0.2)' }}>
                    ✕ Reset Filters
                  </button>
                )}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.75rem', fontWeight: 600 }}>
                  {filteredProducts.length} of {products.length} items
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={onClearAllInventory} style={{ fontSize: '0.82rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>🗑️ Clear All Inventory</button>
                <button className="btn btn-secondary" onClick={downloadValuationPDF} style={{ fontSize: '0.82rem' }}>📥 Export PDF</button>
                <button className="btn btn-primary" onClick={handleOpenAdd} style={{ fontSize: '0.82rem', fontWeight: 700 }}>➕ Register New Item</button>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds(filteredProducts.map(p => p.id));
                        } else {
                          setSelectedProductIds([]);
                        }
                      }}
                      style={{ transform: 'scale(1.15)', cursor: 'pointer' }}
                    />
                  </th>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Qty / Status</th>
                  <th>Unit Cost ({valuationMethod.toUpperCase()})</th>
                  <th>Stock Value</th>
                  <th>Min Limit</th>
                  <th>Location</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const valuation = calculateProductValuation(product, movements, valuationMethod);
                  const status = getStockStatus(product);
                  const stockValue = valuation.totalValue;
                  const isSelected = selectedProductIds.includes(product.id);
                  
                  return (
                      <tr 
                        key={product.id} 
                        onClick={() => setDetailProduct(product)} 
                        style={{ 
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(37,99,235,0.05)' : 'transparent',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds(prev => [...prev, product.id]);
                              } else {
                                setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                              }
                            }}
                            style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}><span className="sku-badge">{product.sku}</span></td>
                        <td title={product.name} style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</td>
                        <td>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(37,99,235,0.08)', color: 'var(--accent-color)', border: '1px solid rgba(37,99,235,0.15)', whiteSpace: 'nowrap' }}>
                            {product.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.78rem' }}>{product.qty}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{product.unit}</span>
                            </div>
                            {/* Mini stock level bar */}
                            <div style={{ width: 72, height: 5, borderRadius: 3, background: 'var(--border-color)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                borderRadius: 3,
                                width: `${Math.min((product.qty / Math.max(product.minStock * 3, 1)) * 100, 100)}%`,
                                background: product.qty === 0 ? '#ef4444' : product.qty <= product.minStock ? '#f59e0b' : '#22c55e',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                            <span className={`status-pill ${status.cls}`}>{status.label}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500, fontSize: '0.7rem' }}>{fmt(valuation.unitCost)}</td>
                        <td style={{ fontWeight: 800, color: stockValue > 50000 ? '#16a34a' : 'var(--text-primary)', fontSize: '0.7rem' }}>{fmt(stockValue)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{product.minStock} {product.unit}</td>
                        <td><span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>📍 {product.location || '—'}</span></td>
                        <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'center' }}>
                            <button 
                              title="Stock Adjustment" 
                              onClick={() => handleOpenAdjustModal(product)} 
                              style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '4px 8px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, transition: 'all 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.08)'}
                            >⚡ Adjust</button>
                            
                            <button 
                              title="Details / History" 
                              onClick={() => setDetailProduct(product)} 
                              style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '6px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'}
                            >👁️</button>
                            
                            <button 
                              title="Edit Item" 
                              onClick={() => handleOpenEdit(product)} 
                              style={{ background: 'rgba(217, 119, 6, 0.08)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.2)', padding: '6px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(217, 119, 6, 0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(217, 119, 6, 0.08)'}
                            >✏️</button>
                            
                            <button 
                              title="Transfer Stock" 
                              onClick={() => { setTransferProduct(product); setTransferFromWh('wh-1'); setTransferToWh('wh-2'); setTransferQty(''); setIsTransferModalOpen(true); }} 
                              style={{ background: 'rgba(13, 148, 136, 0.08)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)', padding: '6px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(13, 148, 136, 0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(13, 148, 136, 0.08)'}
                            >✈️</button>
                            
                            <button 
                              title="Delete Item" 
                              onClick={() => {
                                if (window.confirm('Delete this product? It will post a journal write-off of current inventory value.')) onDeleteProduct(product.id);
                              }} 
                              style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.2)', padding: '6px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)'}
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontWeight: 600 }}>No products match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

{viewTab === 'abc' && (
        <div>
          <div style={{ background: 'var(--card-bg, var(--bg-secondary))', border: '1px solid var(--border-color)', borderRadius: 20, padding: '1.75rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🎯</span> ABC Inventory Classification
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Classify inventory items based on financial value density: <strong>Class A</strong> (Top 70% value, weekly audits), <strong>Class B</strong> (Next 20%, monthly cycles), and <strong>Class C</strong> (Bottom 10%, quarterly cycles).
                </p>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, background: 'var(--bg-tertiary)', padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                Valuation Basis: <strong style={{ color: 'var(--accent-color)' }}>{valuationMethod.toUpperCase()}</strong>
              </div>
            </div>

            {/* Visual value distribution bar */}
            {(() => {
              const totalVal = abcData.reduce((s, p) => s + p.value, 0);
              const aVal = abcData.filter(p => p.abc === 'A').reduce((s, p) => s + p.value, 0);
              const bVal = abcData.filter(p => p.abc === 'B').reduce((s, p) => s + p.value, 0);
              const cVal = abcData.filter(p => p.abc === 'C').reduce((s, p) => s + p.value, 0);
              const aPct = totalVal > 0 ? (aVal / totalVal) * 100 : 0;
              const bPct = totalVal > 0 ? (bVal / totalVal) * 100 : 0;
              const cPct = totalVal > 0 ? (cVal / totalVal) * 100 : 0;
              return (
                <div style={{ marginBottom: '1.75rem', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Portfolio Financial Distribution</span>
                    <span>Total Stock Capital: {fmt(totalVal)}</span>
                  </div>
                  <div style={{ height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', background: 'var(--border-color)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: `${aPct}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)', height: '100%', transition: 'width 0.6s ease' }} title={`Class A: ${aPct.toFixed(1)}%`} />
                    <div style={{ width: `${bPct}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', height: '100%', transition: 'width 0.6s ease' }} title={`Class B: ${bPct.toFixed(1)}%`} />
                    <div style={{ width: `${cPct}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', height: '100%', transition: 'width 0.6s ease' }} title={`Class C: ${cPct.toFixed(1)}%`} />
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: 10, fontSize: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>🔴 Class A: {aPct.toFixed(1)}% ({fmt(aVal)})</span>
                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>🟡 Class B: {bPct.toFixed(1)}% ({fmt(bVal)})</span>
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>🟢 Class C: {cPct.toFixed(1)}% ({fmt(cVal)})</span>
                  </div>
                </div>
              );
            })()}

            {/* Summary bands */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {['A', 'B', 'C'].map(cls => {
                const group = abcData.filter(p => p.abc === cls);
                const groupVal = group.reduce((s, p) => s + p.value, 0);
                const totalVal = abcData.reduce((s, p) => s + p.value, 0);
                const pct = totalVal > 0 ? ((groupVal / totalVal) * 100).toFixed(1) : '0';
                const icons = { A: '🔴', B: '🟡', C: '🟢' };
                const descs = { A: 'Critical focus. Tightly monitor, log transactions, and execute weekly cycle-counts.', B: 'Important assets. Review monthly, evaluate suppliers, and run demand forecasting.', C: 'Low-value items. Maintain simple controls, quarterly reviews, and prevent dead stock.' };
                const linearGradients = {
                  A: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)',
                  B: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)',
                  C: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)'
                };
                return (
                  <div 
                    key={cls} 
                    style={{ 
                      flex: 1, 
                      minWidth: 220, 
                      background: linearGradients[cls], 
                      border: `1.5px solid ${ABC_COLOR[cls]}35`, 
                      borderRadius: 16, 
                      padding: '1.25rem 1.4rem', 
                      position: 'relative', 
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                  >
                    <div style={{ position: 'absolute', top: 12, right: 16, fontSize: '2.5rem', opacity: 0.12, fontWeight: 900, color: ABC_COLOR[cls] }}>{cls}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '1.1rem' }}>{icons[cls]}</span>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: ABC_COLOR[cls] }}>Class {cls}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: '4px 0' }}>{fmt(groupVal)}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: ABC_COLOR[cls], marginTop: 2 }}>{group.length} SKU{group.length > 1 ? 's' : ''} · {pct}% of portfolio</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>{descs[cls]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ABC Class</th>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ textAlign: 'right' }}>Stock Value</th>
                  <th>Value Share %</th>
                  <th>Cumulative Share %</th>
                </tr>
              </thead>
              <tbody>
                {abcData.map(product => (
                  <tr key={product.id}>
                    <td>
                      <span style={{ background: ABC_BG[product.abc], color: ABC_COLOR[product.abc], border: `1px solid ${ABC_COLOR[product.abc]}35`, borderRadius: 8, padding: '4px 12px', fontWeight: 800, fontSize: '0.7rem' }}>
                        Class {product.abc}
                      </span>
                    </td>
                    <td><span className="sku-badge">{product.sku}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</td>
                    <td>{product.category}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{product.qty} {product.unit}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(product.unitCost)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(product.value)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                          <div style={{ width: `${product.valuePct}%`, height: '100%', background: ABC_COLOR[product.abc], borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, width: 38, textAlign: 'right' }}>{product.valuePct}%</span>
                      </div>
                    </td>
                    <td>
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                          <div style={{ width: `${product.cumPct}%`, height: '100%', background: 'var(--accent-color)', borderRadius: 3, opacity: 0.7 }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, width: 38, textAlign: 'right', color: 'var(--accent-color)' }}>{product.cumPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REORDER WIZARD TAB ── */}
      {viewTab === 'reorder' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 20, padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 2px 5px rgba(245,158,11,0.2))' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#d97706', marginBottom: 3 }}>{reorderItems.length} items require replenishment</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>These products have dropped to or below their pre-configured minimum safety threshold. Use the replenishment wizard below to trigger Purchase Requests.</div>
            </div>
          </div>

          {reorderItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 20 }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Inventory Fully Replenished</div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>All system items are currently stocked safely above minimum safety stock limits.</p>
            </div>
          ) : (
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.15rem' }}>
              {reorderItems.map(p => {
                const supplier = suppliers.find(s => s.id === p.supplierId);
                const deficit  = p.minStock - p.qty;
                const suggestedQty = Math.max(p.minStock * 3, 10);
                const isSelected = reorderProduct?.id === p.id;
                const isOutOfStock = p.qty === 0;
                
                return (
                  <div 
                    key={p.id} 
                    style={{ 
                      background: 'var(--card-bg, var(--bg-secondary))', 
                      border: isSelected ? '2px solid var(--accent-color)' : `1px solid ${isOutOfStock ? 'rgba(239,68,68,0.2)' : 'var(--border-color)'}`, 
                      borderRadius: 16, 
                      padding: '1.5rem', 
                      boxShadow: isSelected ? '0 10px 25px -5px rgba(37,99,235,0.15)' : 'var(--shadow-sm)',
                      transition: 'all 0.25s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span className="sku-badge">{p.sku}</span>
                          <span className={`status-pill ${isOutOfStock ? 'outstock' : 'lowstock'}`}>
                            {isOutOfStock ? '⚠️ Out of Stock' : 'Low Stock Alert'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>Stock Level: <strong style={{ color: isOutOfStock ? '#ef4444' : 'var(--text-primary)' }}>{p.qty}</strong> / {p.minStock} {p.unit}</span>
                          <span style={{ color: 'var(--border-color)' }}>|</span>
                          <span>Deficit Limit: <strong style={{ color: '#ef4444' }}>{deficit} {p.unit}</strong></span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, background: 'var(--bg-tertiary)', padding: '0.4rem 0.6rem', borderRadius: 8, display: 'inline-block' }}>
                          🏢 Supplier: <strong>{supplier?.name || 'Unassigned'}</strong> · 📞 {supplier?.phone || 'No contact'}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', justifyContent: 'flex-end', minWidth: 200, flexShrink: 0 }}>
                        {isSelected ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div>
                              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Restock Quantity ({p.unit})</div>
                              <input 
                                type="number" 
                                min="1" 
                                value={reorderQty} 
                                onChange={e => setReorderQty(e.target.value)}
                                style={{ width: 85, padding: '5px 8px', border: '1.5px solid var(--accent-color)', borderRadius: 8, background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: 800, outline: 'none', textAlign: 'center', fontSize: '0.85rem' }} 
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <button 
                                onClick={() => handleSendReorder(p)} 
                                style={{ padding: '6px 12px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s' }}
                              >Post RFQ</button>
                              <button 
                                onClick={() => setReorderProduct(null)} 
                                style={{ padding: '4px 12px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem' }}
                              >Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => { setReorderProduct(p); setReorderQty(String(suggestedQty)); }} 
                            style={{ 
                              padding: '0.7rem 1.25rem', 
                              background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.15) 100%)', 
                              color: '#d97706', 
                              border: '1.5px solid rgba(245,158,11,0.3)', 
                              borderRadius: 10, 
                              cursor: 'pointer', 
                              fontWeight: 800, 
                              fontSize: '0.8rem',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#d97706'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#d97706'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.15) 100%)'; e.currentTarget.style.color = '#d97706'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; }}
                          >
                            <span>🔄</span> Reorder {suggestedQty} {p.unit}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Stock level bar */}
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min((p.qty / Math.max(p.minStock * 3, 1)) * 100, 100)}%`, height: '100%', background: p.qty === 0 ? '#ef4444' : '#f59e0b', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Reorder Requests List */}
          <div className="card" style={{ marginTop: '2.5rem', padding: '1.75rem', borderRadius: 20, boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <span>📋</span> Chronological Reorder Requests Log
            </h3>
            {reorderRequests.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-tertiary)', borderRadius: 12 }}>
                No reorder requests have been logged yet for the current lifecycle.
              </div>
            ) : (
              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '1.75rem', borderLeft: '2px solid var(--border-color)', margin: '0.5rem 0' }}>
                  {reorderRequests.map((req, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      {/* Timeline Dot */}
                      <div style={{
                        position: 'absolute', left: '-2.2rem', top: '16px',
                        width: 12, height: 12, borderRadius: '50%',
                        background: req.status === 'pending' ? '#f59e0b' : '#10b981',
                        border: '3px solid var(--card-bg, #fff)',
                        boxShadow: '0 0 0 2px var(--border-color)'
                      }} />
                      {/* Card block */}
                      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '1.1rem 1.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span className="sku-badge" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>{req.sku}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>📅 {req.date}</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{req.productName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                            Restock: <strong style={{ color: 'var(--accent-color)' }}>{req.qty} {req.unit}</strong> · Supplier: <strong>{req.supplierName}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: 800, 
                            padding: '3px 10px', 
                            borderRadius: 20, 
                            textTransform: 'uppercase',
                            background: req.status === 'pending' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', 
                            color: req.status === 'pending' ? '#d97706' : '#10b981',
                            border: `1px solid ${req.status === 'pending' ? '#f59e0b' : '#10b981'}30`,
                            letterSpacing: '0.04em'
                          }}>{req.status}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>By: {req.requestedBy}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STOCK LEDGER TAB ── */}
      {viewTab === 'ledger' && (() => {
        const filteredMovements = movements.filter(m => {
          if (ledgerType !== 'all' && m.type !== ledgerType) return false;
          if (ledgerFromDate && m.date.substring(0, 10) < ledgerFromDate) return false;
          if (ledgerToDate && m.date.substring(0, 10) > ledgerToDate) return false;
          if (ledgerSearch.trim()) {
            const q = ledgerSearch.toLowerCase();
            const prod = products.find(p => p.id === m.productId);
            const prodName = prod ? prod.name.toLowerCase() : '';
            const sku = prod ? prod.sku.toLowerCase() : '';
            return m.refNo.toLowerCase().includes(q) || sku.includes(q) || prodName.includes(q);
          }
          return true;
        });

        return (
          <div>
            {/* Filters */}
            <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search SKU, Product, or Ref No..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                />
              </div>
              <div style={{ width: '150px' }}>
                <select className="form-control" value={ledgerType} onChange={e => setLedgerType(e.target.value)}>
                  <option value="all">All Movements</option>
                  <option value="purchase">Purchases (Ins)</option>
                  <option value="sale">Sales (Outs)</option>
                  <option value="adjustment">Adjustments</option>
                  <option value="transfer">Transfers</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>FROM</span>
                <input type="date" className="form-control" style={{ width: '130px' }} value={ledgerFromDate} onChange={e => setLedgerFromDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>TO</span>
                <input type="date" className="form-control" style={{ width: '130px' }} value={ledgerToDate} onChange={e => setLedgerToDate(e.target.value)} />
              </div>
              {(ledgerSearch || ledgerType !== 'all' || ledgerFromDate || ledgerToDate) && (
                <button onClick={() => { setLedgerSearch(''); setLedgerType('all'); setLedgerFromDate(''); setLedgerToDate(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✕ Clear</button>
              )}
            </div>

            <div className="table-container">
              {filteredMovements.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📒</div>
                  <div>No stock movements found matching current filters.</div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Qty Shift</th>
                      <th style={{ textAlign: 'right' }}>Cost Basis</th>
                      <th>Ref Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((move, index) => {
                      const prod = products.find(p => p.id === move.productId);
                      const isQtyPositive = Number(move.qty) > 0;
                      return (
                        <tr key={index}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {new Date(move.date).toLocaleString('en-BD')}
                          </td>
                          <td><span className="sku-badge">{prod?.sku || 'N/A'}</span></td>
                          <td title={prod?.name || 'Deleted Product'} style={{ fontWeight: 600, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod?.name || 'Deleted Product'}</td>
                          <td>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 800, 
                              padding: '2px 8px', 
                              borderRadius: 20, 
                              textTransform: 'uppercase',
                              background: move.type === 'purchase' ? 'rgba(34,197,94,0.1)' : move.type === 'sale' ? 'rgba(37,99,235,0.1)' : move.type === 'transfer' ? 'rgba(99,102,241,0.1)' : 'rgba(239,68,68,0.1)',
                              color: move.type === 'purchase' ? '#16a34a' : move.type === 'sale' ? '#2563eb' : move.type === 'transfer' ? '#4f46e5' : '#ef4444'
                            }}>
                              {move.type}
                            </span>
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            fontWeight: 700, 
                            color: isQtyPositive ? '#16a34a' : move.type === 'transfer' ? 'var(--text-primary)' : '#ef4444' 
                          }}>
                            {move.type === 'transfer' ? '—' : (isQtyPositive ? '+' : '') + move.qty} {prod?.unit || 'pcs'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                            {move.unitPrice != null && !isNaN(move.unitPrice) ? fmt(move.unitPrice) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-color)' }}>
                            {move.refNo}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── WAREHOUSE MATRIX TAB ── */}
      {viewTab === 'warehouses' && (
        <div>
          {/* Warehouse summary header */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.05))', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 16, padding: '1rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>Network Summary</div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{WAREHOUSES.length} Active Warehouses · {products.length} Total SKUs</div>
            </div>
            <div style={{ height: 36, width: 1, background: 'var(--border-color)' }} />
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>Total Network Value</div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#22c55e' }}>{fmt(kpis.totalValue)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {WAREHOUSES.map((wh, whIdx) => {
              const whProducts = products.filter(p => getProductWarehouseQty(p, wh.id) > 0);
              const totalVal = whProducts.reduce((sum, p) => {
                const qty = getProductWarehouseQty(p, wh.id);
                const val = calculateProductValuation(p, movements, valuationMethod);
                return sum + qty * val.unitCost;
              }, 0);
              const networkSharePct = kpis.totalValue > 0 ? ((totalVal / kpis.totalValue) * 100).toFixed(1) : '0';
              const whColors = ['#3b82f6', '#8b5cf6', '#10b981'];
              const wColor = whColors[whIdx % whColors.length];

              // Top 3 products in this warehouse
              const topProducts = whProducts
                .sort((a, b) => getProductWarehouseQty(b, wh.id) * b.price - getProductWarehouseQty(a, wh.id) * a.price)
                .slice(0, 3);
              
              return (
                <div key={wh.id} style={{ background: 'var(--card-bg, #fff)', border: `1px solid ${wColor}20`, borderRadius: 16, overflow: 'hidden', boxShadow: `0 2px 12px ${wColor}10` }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${wColor}, ${wColor}80)` }} />
                  <div style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: wColor }}>{wh.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>📍 {wh.location}</div>
                      </div>
                      <div style={{ background: `${wColor}12`, border: `1px solid ${wColor}25`, borderRadius: 10, padding: '0.25rem 0.6rem', fontSize: '0.65rem', fontWeight: 800, color: wColor }}>{networkSharePct}% of network</div>
                    </div>

                    {/* SKU occupancy bar */}
                    <div style={{ marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>SKU Occupancy</span>
                        <span>{whProducts.length} / {products.length} SKUs</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--border-color)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(whProducts.length / Math.max(products.length, 1)) * 100}%`, background: `linear-gradient(90deg, ${wColor}, ${wColor}aa)`, borderRadius: 3 }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{whProducts.length}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>SKUs Stored</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', color: '#22c55e' }}>{fmt(totalVal)}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Value ({valuationMethod.toUpperCase()})</div>
                      </div>
                    </div>

                    {/* Top items */}
                    {topProducts.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 5 }}>Top Items</div>
                        {topProducts.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 3 }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{p.name}</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: wColor, flexShrink: 0 }}>{getProductWarehouseQty(p, wh.id)} {p.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button style={{ width: '100%', padding: '0.5rem', borderRadius: 10, border: `1.5px solid ${wColor}30`, background: `${wColor}08`, color: wColor, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'inherit', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${wColor}18`; e.currentTarget.style.borderColor = wColor; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${wColor}08`; e.currentTarget.style.borderColor = `${wColor}30`; }}
                      onClick={() => { setTransferProduct(null); setTransferFromWh(wh.id); setTransferToWh(wh.id === 'wh-1' ? 'wh-2' : 'wh-1'); setTransferQty(''); setIsTransferModalOpen(true); }}>
                      ✈️ Transfer Stock Out
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1.25rem 0' }}>📋 Multi-Warehouse Master Inventory Matrix</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th style={{ textAlign: 'right' }}>Main Depot (Dhaka)</th>
                    <th style={{ textAlign: 'right' }}>North Hub (Uttara)</th>
                    <th style={{ textAlign: 'right' }}>West Transit (Mirpur)</th>
                    <th style={{ textAlign: 'right' }}>Total On Hand</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const q1 = getProductWarehouseQty(p, 'wh-1');
                    const q2 = getProductWarehouseQty(p, 'wh-2');
                    const q3 = getProductWarehouseQty(p, 'wh-3');
                    return (
                      <tr key={p.id}>
                        <td><span className="sku-badge">{p.sku}</span></td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ textAlign: 'right', fontWeight: q1 > 0 ? 700 : 400, color: q1 > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{q1} {p.unit}</td>
                        <td style={{ textAlign: 'right', fontWeight: q2 > 0 ? 700 : 400, color: q2 > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{q2} {p.unit}</td>
                        <td style={{ textAlign: 'right', fontWeight: q3 > 0 ? 700 : 400, color: q3 > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{q3} {p.unit}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: p.qty === 0 ? 'var(--danger)' : 'var(--success)' }}>{p.qty} {p.unit}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setTransferProduct(p); setTransferFromWh('wh-1'); setTransferToWh('wh-2'); setTransferQty(''); setIsTransferModalOpen(true); }}>
                            ✈️ Transfer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Stock Adjust Modal ── */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Manual Stock Adjustment</h3>
              <button className="modal-close" onClick={() => setIsAdjustModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="modal-form-content">
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
                <strong>Product:</strong> {selectedProduct.name} (SKU: {selectedProduct.sku})<br />
                <strong>Current Stock:</strong> {selectedProduct.qty} {selectedProduct.unit}<br />
                <strong>Current cost:</strong> {fmt(selectedProduct.price)}
              </div>
              <div>
                <label className="form-label">Adjustment Type</label>
                <div className="tx-type-toggle" style={{ marginBottom: 0 }}>
                  <button type="button" className={`tx-type-btn ${adjustType === 'in' ? 'active in' : ''}`} onClick={() => setAdjustType('in')}>📈 Stock In</button>
                  <button type="button" className={`tx-type-btn ${adjustType === 'out' ? 'active out' : ''}`} onClick={() => setAdjustType('out')}>📉 Stock Out</button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Qty ({selectedProduct.unit})</label>
                <input type="number" min="1" required className="form-control" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason / Note *</label>
                <input type="text" required placeholder="e.g. Broken packaging, variance correction" className="form-control" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
              </div>
              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Posting...' : 'Apply Adjustment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Actions Floating Selector Toolbar ── */}
      {selectedProductIds.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--accent-border)',
          borderRadius: 24, padding: '0.85rem 1.75rem', zIndex: 600,
          boxShadow: '0 12px 30px rgba(37, 99, 235, 0.18), var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
            ⚡ {selectedProductIds.length} items selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleBulkReorder}>🔄 Bulk Reorder</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setBulkAdjustQty(''); setBulkAdjustReason(''); setBulkAdjustType('in'); setIsBulkAdjustModalOpen(true); }}>⚡ Bulk Adjust</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setBulkMoveWarehouse('wh-1'); setIsBulkMoveModalOpen(true); }}>✈️ Bulk Move</button>
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>🗑️ Bulk Delete</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProductIds([])} style={{ border: 'none' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Bulk Adjustment Dialog Modal ── */}
      {isBulkAdjustModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 850 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Bulk Quantity Adjustment ({selectedProductIds.length} items)</h3>
              <button className="modal-close" onClick={() => setIsBulkAdjustModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleBulkAdjustSubmit} className="modal-form-content">
              <div>
                <label className="form-label">Adjustment Type</label>
                <div className="tx-type-toggle" style={{ marginBottom: 0 }}>
                  <button type="button" className={`tx-type-btn ${bulkAdjustType === 'in' ? 'active in' : ''}`} onClick={() => setBulkAdjustType('in')}>📈 Bulk Add</button>
                  <button type="button" className={`tx-type-btn ${bulkAdjustType === 'out' ? 'active out' : ''}`} onClick={() => setBulkAdjustType('out')}>📉 Bulk Deduct</button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Quantity per item</label>
                <input type="number" min="1" required className="form-control" value={bulkAdjustQty} onChange={e => setBulkAdjustQty(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason / Reference Note</label>
                <input type="text" required placeholder="e.g. Audit correction" className="form-control" value={bulkAdjustReason} onChange={e => setBulkAdjustReason(e.target.value)} />
              </div>
              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsBulkAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Applying...' : 'Apply Bulk Adjust'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Warehouse Move Modal ── */}
      {isBulkMoveModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 850 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Bulk Relocation ({selectedProductIds.length} items)</h3>
              <button className="modal-close" onClick={() => setIsBulkMoveModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleBulkMoveSubmit} className="modal-form-content">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Warehouse</label>
                <select className="form-control" value={bulkMoveWarehouse} onChange={e => setBulkMoveWarehouse(e.target.value)}>
                  {WAREHOUSES.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                </select>
              </div>
              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsBulkMoveModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Moving...' : 'Relocate Stock'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Stock Transfer Modal ── */}
      {isTransferModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 850 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🏭 Warehouse Stock Transfer</h3>
              <button className="modal-close" onClick={() => setIsTransferModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleExecuteTransfer} className="modal-form-content">
              <div className="form-group">
                <label className="form-label">Select Product to Transfer</label>
                <select 
                  className="form-control" 
                  value={transferProduct ? transferProduct.id : ''} 
                  onChange={e => setTransferProduct(products.find(p => p.id === e.target.value))}
                  disabled={!!transferProduct}
                >
                  <option value="">— Select Product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                </select>
              </div>

              {transferProduct && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.8rem' }}>
                  <strong>Product:</strong> {transferProduct.name}<br />
                  <strong>Current stocks:</strong><br />
                  - Main Depot: {getProductWarehouseQty(transferProduct, 'wh-1')} {transferProduct.unit}<br />
                  - North Hub: {getProductWarehouseQty(transferProduct, 'wh-2')} {transferProduct.unit}<br />
                  - West Transit: {getProductWarehouseQty(transferProduct, 'wh-3')} {transferProduct.unit}
                </div>
              )}

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">From Warehouse</label>
                  <select className="form-control" value={transferFromWh} onChange={e => setTransferFromWh(e.target.value)}>
                    {WAREHOUSES.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Warehouse</label>
                  <select className="form-control" value={transferToWh} onChange={e => setTransferToWh(e.target.value)}>
                    {WAREHOUSES.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity to Transfer</label>
                <input type="number" min="1" required className="form-control" value={transferQty} onChange={e => setTransferQty(e.target.value)} />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Transferring...' : 'Execute Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ── Slide-over Detail Drawer ── */}
      {detailProduct && (
        <>
          <div onClick={() => setDetailProduct(null)} style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '460px',
            background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
            zIndex: 900, boxShadow: '-10px 0 35px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column',
            transform: detailProduct ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
              <div>
                <span className="sku-badge" style={{ marginBottom: 4 }}>{detailProduct.sku}</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{detailProduct.name}</h3>
              </div>
              <button onClick={() => setDetailProduct(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            {/* Drawer Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Product Info Block */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Item Description</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{detailProduct.description || 'No description provided.'}</p>
              </div>

              {/* Status and Location */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Status</h4>
                  <span className={`status-pill ${getStockStatus(detailProduct).cls}`}>{getStockStatus(detailProduct).label}</span>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Shelf Location</h4>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>📍 {detailProduct.location || 'N/A'}</span>
                </div>
              </div>

              {/* Valuation details */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Engine Valuation Comparison</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>AVCO Cost (Avg):</span>
                    <strong>{fmt(detailProduct.price)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>FIFO Cost:</span>
                    <strong>{fmt(calculateProductValuation(detailProduct, movements, 'fifo').unitCost)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>LIFO Cost:</span>
                    <strong>{fmt(calculateProductValuation(detailProduct, movements, 'lifo').unitCost)}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 700 }}>Total Value ({valuationMethod.toUpperCase()}):</span>
                    <strong style={{ color: 'var(--success)' }}>{fmt(calculateProductValuation(detailProduct, movements, valuationMethod).totalValue)}</strong>
                  </div>
                </div>
              </div>

              {/* Multi-Warehouse Stock Breakdown */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Warehouse Breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {WAREHOUSES.map(wh => {
                    const qty = getProductWarehouseQty(detailProduct, wh.id);
                    return (
                      <div key={wh.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: qty > 0 ? 'rgba(37,99,235,0.05)' : 'transparent', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }}>
                        <span>{wh.name}</span>
                        <strong style={{ color: qty > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{qty} {detailProduct.unit}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stock Movement Audit Log */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Stock Movement Ledger (Audit)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '250px', overflowY: 'auto' }}>
                  {movements.filter(m => m.productId === detailProduct.id).length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                      No stock movement audit records found.
                    </div>
                  ) : (
                    movements.filter(m => m.productId === detailProduct.id).map((m, idx) => (
                      <div key={idx} style={{ padding: '0.65rem', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-tertiary)', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                          <span style={{ color: m.qty > 0 ? 'var(--success)' : m.qty < 0 ? 'var(--danger)' : 'var(--accent-color)' }}>
                            {m.type.toUpperCase()} ({m.qty > 0 ? '+' : ''}{m.qty} {detailProduct.unit})
                          </span>
                          <span>{m.refNo}</span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>{m.description || `Cost basis: BDT ${m.unitPrice}`}</p>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(m.date).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setTransferProduct(detailProduct); setIsTransferModalOpen(true); }}>✈️ Transfer</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => printBarcodeLabel(detailProduct)}>🏷️ Label</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { handleOpenEdit(detailProduct); setDetailProduct(null); }}>✏️ Edit</button>
            </div>

          </div>
        </>
      )}

      {/* ── Add / Edit Form Modal ── */}
      {isAddFormOpen && (
        <div
          style={{
            display: 'flex',
            zIndex: 850,
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            overflowY: 'auto'
          }}
          onClick={() => setIsAddFormOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '820px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
              overflow: 'hidden',
              animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 2rem)',
              margin: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 1.75rem',
              background: 'linear-gradient(135deg, #1e40af 0%, #4f46e5 50%, #7c3aed 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>📦</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
                    {editingProduct ? 'Edit Inventory Item' : 'Register New Inventory Item'}
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>
                    {editingProduct ? `Updating: ${editingProduct.name}` : 'Define product characteristics and initial stock levels'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddFormOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer',
                  transition: 'all 0.2s', position: 'relative', flexShrink: 0
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
              >&times;</button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Live Stock Value Preview */}
                {!editingProduct && formFields.price && Number(formFields.qty) > 0 && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.08) 100%)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '14px', padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    animation: 'slideUp 0.3s ease'
                  }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>💰</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Estimated Initial Stock Value</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6366f1', letterSpacing: '-0.5px' }}>
                        ৳ {Number(Number(formFields.price) * Number(formFields.qty)).toLocaleString('en-BD')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <div>{formFields.qty} {formFields.unit} ×</div>
                      <div>৳ {Number(formFields.price).toLocaleString('en-BD')} / unit</div>
                    </div>
                  </div>
                )}

                {/* SECTION 1: Product Identity */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>🏷️</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Product Identity</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {/* Product Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Product Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text" required
                        placeholder="e.g. Samsung Galaxy A54 128GB"
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                        onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.name}
                        onChange={e => setFormFields({...formFields, name: e.target.value})}
                      />
                    </div>

                    {/* SKU Code */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>SKU Code <span style={{ color: '#ef4444' }}>*</span></span>
                        {!editingProduct && (
                          <button
                            type="button"
                            onClick={() => {
                              const code = generateDefaultSku(formFields.category);
                              setFormFields({...formFields, sku: code});
                              setIsSkuManuallyEdited(false);
                            }}
                            style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
                          >⚡ Auto-generate</button>
                        )}
                      </label>
                      <input
                        type="text" required
                        disabled={!!editingProduct}
                        placeholder="e.g. ELEC-12345"
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', cursor: editingProduct ? 'not-allowed' : 'text', opacity: editingProduct ? 0.65 : 1, width: '100%', boxSizing: 'border-box' }}
                        onFocus={(e) => { if (!editingProduct) { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; } }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.sku}
                        onChange={e => {
                          setIsSkuManuallyEdited(true);
                          setFormFields({...formFields, sku: e.target.value.toUpperCase()});
                        }}
                      />
                    </div>

                    {/* Category */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Category</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          className="form-control"
                          style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                          onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                          value={formFields.category}
                          onChange={e => {
                            const newCat = e.target.value;
                            let newFields = { ...formFields, category: newCat };
                            if (!isSkuManuallyEdited && !editingProduct) {
                              newFields.sku = generateDefaultSku(newCat);
                            }
                            setFormFields(newFields);
                          }}
                        >
                          {productCategories.map(cat => {
                            const catName = typeof cat === 'object' ? cat.name : cat;
                            return <option key={catName} value={catName}>{catName}</option>;
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddProductCategory}
                          title="Add New Category"
                          style={{
                            padding: '0.7rem 1.1rem',
                            borderRadius: '10px',
                            border: '1.5px solid var(--border-color)',
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: '#6366f1',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'}
                        >
                          ＋
                        </button>
                      </div>
                    </div>

                    {/* Supplier */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Primary Supplier</label>
                      <select
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.supplierId}
                        onChange={e => setFormFields({...formFields, supplierId: e.target.value})}
                      >
                        {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Description <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>(optional)</span>
                    </label>
                    <textarea
                      placeholder="Specifications, usage notes, warranty info..."
                      className="form-control"
                      rows={2}
                      style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                      value={formFields.description || ''}
                      onChange={e => setFormFields({...formFields, description: e.target.value})}
                    />
                  </div>
                </div>

                {/* SECTION 2: Stock & Pricing */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>💹</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Stock & Pricing</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem' }}>
                    {/* Unit Cost */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Unit Cost (BDT) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, pointerEvents: 'none' }}>৳</span>
                        <input
                          type="number" required min="0" step="0.01" placeholder="0.00"
                          className="form-control"
                          style={{ padding: '0.7rem 1rem 0.7rem 1.9rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' }}
                          onFocus={(e) => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                          value={formFields.price}
                          onChange={e => setFormFields({...formFields, price: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Initial Qty */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Initial Qty <span style={{ color: '#ef4444' }}>*</span>
                        {editingProduct && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(use Stock Adjust)</span>}
                      </label>
                      <input
                        type="number" required min="0"
                        disabled={!!editingProduct}
                        placeholder="0"
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', cursor: editingProduct ? 'not-allowed' : 'text', opacity: editingProduct ? 0.65 : 1 }}
                        onFocus={(e) => { if (!editingProduct) { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; } }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.qty}
                        onChange={e => setFormFields({...formFields, qty: e.target.value})}
                      />
                    </div>

                    {/* Unit */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Unit <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#22c55e'; e.target.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.unit}
                        onChange={e => setFormFields({...formFields, unit: e.target.value})}
                      >
                        {['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'carton', 'dozen', 'set', 'roll', 'sheet', 'meter', 'pair', 'unit'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>

                    {/* Min Stock */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Min Stock Level <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="number" required min="0" placeholder="5"
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.minStock}
                        onChange={e => setFormFields({...formFields, minStock: e.target.value})}
                      />
                    </div>
                  </div>

                  {Number(formFields.minStock) > 0 && (
                    <div style={{ marginTop: '0.65rem', padding: '0.6rem 0.9rem', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: '0.75rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⚠️ A reorder alert will trigger when stock drops to or below <strong style={{ margin: '0 3px' }}>{formFields.minStock}</strong> {formFields.unit}
                    </div>
                  )}
                </div>

                {/* SECTION 3: Storage & Advanced */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>🏭</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Storage & Advanced</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem' }}>
                    {/* Shelf Location */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>📍 Shelf / Location</label>
                      <input
                        type="text" placeholder="e.g. Rack A-3, Zone B"
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.location}
                        onChange={e => setFormFields({...formFields, location: e.target.value})}
                      />
                    </div>

                    {/* Barcode */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🏷️ Barcode / EAN</label>
                      <input
                        type="text" placeholder="e.g. 7350001234567"
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.barcode || ''}
                        onChange={e => setFormFields({...formFields, barcode: e.target.value})}
                      />
                    </div>

                    {/* Initial Warehouse (new only) */}
                    {!editingProduct && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🏭 Initial Warehouse</label>
                        <select
                          className="form-control"
                          style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                          onFocus={(e) => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.12)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                          value={formFields.warehouseId}
                          onChange={e => setFormFields({...formFields, warehouseId: e.target.value})}
                        >
                          {WAREHOUSES.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Expiry Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>📅 Expiry Date <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opt.)</span></label>
                      <input
                        type="date"
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.expiryDate || ''}
                        onChange={e => setFormFields({...formFields, expiryDate: e.target.value})}
                      />
                    </div>

                    {/* Warranty Period */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🛠️ Warranty (Months)</label>
                      <input
                        type="number" min="0" placeholder="e.g. 12"
                        className="form-control"
                        style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        value={formFields.warrantyMonths === undefined ? '' : formFields.warrantyMonths}
                        onChange={e => setFormFields({...formFields, warrantyMonths: e.target.value === '' ? '' : Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>Item Lifecycle Status</label>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {[
                        { value: 'active',       label: '✅ Active',               color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.35)' },
                        { value: 'discontinued', label: '⛔ Discontinued',          color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' },
                        { value: 'damaged',      label: '⚠️ Damaged / Quarantine', color: '#b91c1c', bg: 'rgba(185,28,28,0.1)',   border: 'rgba(185,28,28,0.3)' },
                      ].map(opt => {
                        const isActive = (formFields.status || 'active') === opt.value;
                        return (
                          <button key={opt.value} type="button"
                            onClick={() => setFormFields({...formFields, status: opt.value})}
                            style={{
                              padding: '0.5rem 1rem', borderRadius: 10,
                              border: `1.5px solid ${isActive ? opt.border : 'var(--border-color)'}`,
                              background: isActive ? opt.bg : 'transparent',
                              color: isActive ? opt.color : 'var(--text-muted)',
                              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                              transition: 'all 0.18s',
                              transform: isActive ? 'scale(1.04)' : 'scale(1)',
                              boxShadow: isActive ? `0 2px 8px ${opt.bg}` : 'none'
                            }}
                          >{opt.label}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{
                padding: '1.1rem 1.75rem',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  <span style={{ color: '#ef4444' }}>*</span> Required fields
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddFormOpen(false)} style={{ borderRadius: '10px', fontWeight: 600, padding: '0.65rem 1.35rem' }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      fontWeight: 700, padding: '0.65rem 1.75rem', borderRadius: '10px', fontSize: '0.9rem',
                      background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
                      border: 'none', boxShadow: '0 4px 15px rgba(99,102,241,0.35)', color: '#ffffff',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(99,102,241,0.45)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99,102,241,0.35)'; }}
                  >
                    <span>{editingProduct ? '💾' : '✅'}</span>
                    {editingProduct ? 'Save Changes' : 'Register Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryView;
