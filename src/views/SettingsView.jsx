import { useState, useEffect } from 'react';
import { defaultSettings, defaultVatRates, defaultRoles, defaultBranches, defaultWarehouses, defaultChartOfAccounts } from '../database/seedData';
import { USER_SEEDS } from '../utils/userSeeds';

const SEED_EMPLOYEES = [
  {
    employeeCode: "EL001",
    fullNameEnglish: "Shofiqul Islam",
    fullNameBangla: "",
    designation: "Partner",
    department: "Partner",
    mobileNumber: "01335230184",
    emailAddress: "shofiq@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL002",
    fullNameEnglish: "Zohir Uddin",
    fullNameBangla: "",
    designation: "Partner",
    department: "Partner",
    mobileNumber: "01335230185",
    emailAddress: "zohir@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL003",
    fullNameEnglish: "Ekramul Islam Khandaker",
    fullNameBangla: "",
    designation: "Managing Partner",
    department: "Managing Partner",
    mobileNumber: "01335230170",
    emailAddress: "ekram@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL004",
    fullNameEnglish: "Md. Anamul Haque",
    fullNameBangla: "",
    designation: "Partner",
    department: "Partner",
    mobileNumber: "01335230171",
    emailAddress: "anamul@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL005",
    fullNameEnglish: "Advocate Muzammel Haque",
    fullNameBangla: "",
    designation: "Partner",
    department: "Partner",
    mobileNumber: "01313583838",
    emailAddress: "info@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL006",
    fullNameEnglish: "Fardausi Akter",
    fullNameBangla: "",
    designation: "Partner",
    department: "Partner",
    mobileNumber: "01313583838",
    emailAddress: "info@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL007",
    fullNameEnglish: "Kamrul Hasan",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230173",
    emailAddress: "kamrul@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL008",
    fullNameEnglish: "Md. Abu Hanif",
    fullNameBangla: "",
    designation: "CEO",
    department: "CEO",
    mobileNumber: "01313583838",
    emailAddress: "info@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL009",
    fullNameEnglish: "Muhammad Abdul Kader ACCA",
    fullNameBangla: "",
    designation: "Senior Consultant",
    department: "Senior Consultant",
    mobileNumber: "01335230172",
    emailAddress: "rafat@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL010",
    fullNameEnglish: "Minhazul Islam",
    fullNameBangla: "",
    designation: "Senior Executive",
    department: "Senior Executive",
    mobileNumber: "01335230174",
    emailAddress: "minhaz@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL011",
    fullNameEnglish: "Emamul Islam Sayed",
    fullNameBangla: "",
    designation: "Senior Executive",
    department: "Senior Executive",
    mobileNumber: "01335230176",
    emailAddress: "sayed@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL012",
    fullNameEnglish: "Kamrul Hasan Sumon",
    fullNameBangla: "",
    designation: "Senior Executive",
    department: "Senior Executive",
    mobileNumber: "01335230175",
    emailAddress: "sumon@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL013",
    fullNameEnglish: "Advocate Md. Delower Hossain (Ovi)",
    fullNameBangla: "",
    designation: "Advocate & Income Tax Adviser",
    department: "Advocate & Income Tax Adviser",
    mobileNumber: "01335230183",
    emailAddress: "delower@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL014",
    fullNameEnglish: "Rafi Rahman ACCA",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230182",
    emailAddress: "rafi@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL015",
    fullNameEnglish: "Advocate Md. Delower Hossain (Ovi)",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230183",
    emailAddress: "delower@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL016",
    fullNameEnglish: "Kamal Khan",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230180",
    emailAddress: "kamal@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL017",
    fullNameEnglish: "Harunur Rashid",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230181",
    emailAddress: "harun@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL018",
    fullNameEnglish: "Nahid Zaman Siddiqui Manna",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230179",
    emailAddress: "nahid@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL019",
    fullNameEnglish: "Mahmudul Hasan Mukul",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230177",
    emailAddress: "mukul@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL020",
    fullNameEnglish: "Mobin Khan",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01313583838",
    emailAddress: "info@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL021",
    fullNameEnglish: "Al-Amin",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230178",
    emailAddress: "alamin@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL022",
    fullNameEnglish: "Md. Ridwanul Arefin Riyad",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230187",
    emailAddress: "riyad@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  },
  {
    employeeCode: "EL023",
    fullNameEnglish: "Omar Faruk",
    fullNameBangla: "",
    designation: "Business Consultant",
    department: "Business Consultant",
    mobileNumber: "01335230188",
    emailAddress: "faruk@elawyersbd.com",
    grossSalary: 0,
    status: "Active"
  }
];
import { authService } from '../services/authService';
import { syncQueueService } from '../services/syncQueueService';
import { vatService } from '../services/vatService';
import { taxService } from '../services/taxService';
import {
  findExactDuplicate,
  findNamePhoneDuplicate,
  skuDuplicateMessage,
  productNameWarning,
  customerDuplicateMessage,
  supplierDuplicateMessage,
} from '../utils/duplicateChecker';

const getSettings = () => {
  try {
    const s = localStorage.getItem('erp_settings');
    return s ? JSON.parse(s) : defaultSettings;
  } catch { return defaultSettings; }
};

const saveSettings = (s) => localStorage.setItem('erp_settings', JSON.stringify(s));

export default function SettingsView({
  currentUser,
  isMobile,
  products = [],
  customers = [],
  suppliers = [],
  onSaveProduct,
  onSaveCustomer,
  onSaveSupplier,
  onRefresh
}) {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings]   = useState(getSettings());
  const [saved, setSaved]         = useState(false);

  // Custom VAT rates state
  const [vatRates, setVatRates]   = useState(() => vatService.getVatRates());

  // Custom Tax rates state
  const [taxRates, setTaxRates]   = useState(() => taxService.getTaxRates());

  // Chart of Accounts list state for mapping default accounts
  const [coaAccounts, setCoaAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_coa');
      return stored ? JSON.parse(stored) : defaultChartOfAccounts;
    } catch {
      return defaultChartOfAccounts;
    }
  });

  // Database Connection and Sync state
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [syncQueue, setSyncQueue] = useState(() => syncQueueService.getQueue());
  const [syncMsg, setSyncMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // User list state
  const [usersList, setUsersList] = useState(() => authService.getUsers());
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'sales',
    branchId: 'br-1',
    status: 'active'
  });
  const [userError, setUserError] = useState('');
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState('');
  
  // User search query state
  const [userQuery, setUserQuery] = useState('');

  // Branches & Warehouses persistent states
  const [branches, setBranches] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_branches');
      return stored ? JSON.parse(stored) : defaultBranches;
    } catch {
      return defaultBranches;
    }
  });

  const [warehouses, setWarehouses] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_warehouses');
      return stored ? JSON.parse(stored) : defaultWarehouses;
    } catch {
      return defaultWarehouses;
    }
  });

  // Branch Modal States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '', phone: '', isActive: true });

  // Warehouse Modal States
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', branchId: '', isActive: true });

  // Backup Dry-Run Modal State
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupSummary, setBackupSummary] = useState(null);
  const [backupData, setBackupData] = useState(null);
  const [backupConfirmChecked, setBackupConfirmChecked] = useState(false);

  // ── Data Migration States ──
  const [migrationType, setMigrationType] = useState('products'); // products | customers | suppliers
  const [validatedData, setValidatedData] = useState([]); // rows: { data: {}, status: { valid, error, warning, isDuplicate } }
  const [importStatus, setImportStatus] = useState(null); // { total, imported, skipped }
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isExecutingImport, setIsExecutingImport] = useState(false);
  const [productOverwriteConflict, setProductOverwriteConflict] = useState(false); // Overwrite SKU conflicts if true

  // ── Data Migration Helpers ──
  const handleDownloadTemplate = (type) => {
    let headers = '';
    if (type === 'products') {
      headers = 'sku,name,category,qty,unit,price,minStock,location,supplierId,description,purchasePrice,warrantyMonths\n';
      headers += 'OF-PAPR-A4,A4 Printing Paper (80gsm),Office Supplies,50,pcs,450.00,10,A-12,,High quality print paper,380.00,12\n';
      headers += 'COMP-MOU-01,Wireless Optical Mouse,Electronics,20,pcs,1200.00,5,B-04,,Ergonomic wireless mouse,950.00,6';
    } else if (type === 'customers') {
      headers = 'code,name,contact,phone,email,address,vatNo,tin,creditLimit,paymentTermDays\n';
      headers += 'CST-001,Abul Khair Group,Engr. Hasan,+8801819223344,hasan@abulkhair.com,Chattogram,123456789,987654321,1000000.00,30\n';
      headers += 'CST-002,Bashundhara Paper,Kamal Hossain,+8801711223344,kamal@bashundhara.com,Dhaka,987654321,123456789,500000.00,45';
    } else if (type === 'suppliers') {
      headers = 'code,name,contact,phone,email,address,vatNo,tin,creditLimit,paymentTermDays\n';
      headers += 'SUP-001,Apex Electronics Ltd,Mr. Rahim,+8801711223344,rahim@apex.com,Dhaka,123456789,,800000.00,30\n';
      headers += 'SUP-002,Chittagong Shipyard,Mr. Anwar,+8801515998877,anwar@shipyard.com,Chattogram,,,600000.00,60';
    }

    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `migration_template_${type}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadXLSXLibrary = () => {
    return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error('SheetJS loaded but XLSX object not available'));
      };
      script.onerror = () => reject(new Error('Failed to load SheetJS from CDN'));
      document.head.appendChild(script);
    });
  };

  const parseCSVContent = (text) => {
    const lines = [];
    let row = [''];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  };

  const validateRows = (rows, type) => {
    if (!rows || rows.length === 0) return [];
    const headers = rows[0].map(h => h ? h.toString().trim().toLowerCase() : '');
    const validated = [];
    const seenInFile = new Set();

    for (let idx = 1; idx < rows.length; idx++) {
      const originalRow = rows[idx];
      if (originalRow.length === 0 || (originalRow.length === 1 && !originalRow[0])) continue;

      const item = {};
      headers.forEach((header, hIdx) => {
        if (header) {
          item[header] = originalRow[hIdx] !== undefined ? originalRow[hIdx].toString().trim() : '';
        }
      });

      let status = { valid: true, error: '', warning: '', isDuplicate: false };

      if (type === 'products') {
        if (!item.sku || !item.name) {
          status.valid = false;
          status.error = 'Missing SKU or Product Name';
        } else {
          if (seenInFile.has(item.sku)) {
            status.valid = false;
            status.error = `SKU "${item.sku}" is duplicated inside the upload file.`;
          } else {
            seenInFile.add(item.sku);
            const dup = findExactDuplicate(products, 'sku', item.sku);
            if (dup) {
              status.isDuplicate = true;
              if (productOverwriteConflict) {
                status.warning = `SKU already exists. Overwrite "${dup.name}" details.`;
              } else {
                status.valid = false;
                status.error = `SKU conflict with existing product: "${dup.name}".`;
              }
            } else {
              const nameDup = findExactDuplicate(products, 'name', item.name);
              if (nameDup) {
                status.warning = `A similar product name already exists: "${nameDup.name}".`;
              }
            }
          }
        }
      } else if (type === 'customers' || type === 'suppliers') {
        const listToCompare = type === 'customers' ? customers : suppliers;
        if (!item.name || !item.phone) {
          status.valid = false;
          status.error = 'Missing Contact Name or Mobile Number';
        } else {
          const phoneNormalized = item.phone.replace(/\D/g, '');
          const comboKey = `${item.name.toLowerCase().trim()}_${phoneNormalized}`;
          if (seenInFile.has(comboKey)) {
            status.valid = false;
            status.error = `Duplicate entry inside the upload file.`;
          } else {
            seenInFile.add(comboKey);
            const dup = findNamePhoneDuplicate(listToCompare, item.name, item.phone);
            if (dup) {
              status.valid = false;
              status.isDuplicate = true;
              status.error = `Duplicate combo: already exists as Code: ${dup.code}.`;
            }
          }
        }
      }

      validated.push({ data: item, status });
    }
    return validated;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingFile(true);
    setImportStatus(null);
    setValidatedData([]);

    try {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result;
          const rows = parseCSVContent(text);
          const validated = validateRows(rows, migrationType);
          setValidatedData(validated);
          setIsProcessingFile(false);
        };
        reader.onerror = () => {
          alert('Failed to read CSV file.');
          setIsProcessingFile(false);
        };
        reader.readAsText(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const XLSX = await loadXLSXLibrary();
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const validated = validateRows(rows, migrationType);
          setValidatedData(validated);
          setIsProcessingFile(false);
        };
        reader.onerror = () => {
          alert('Failed to read Excel file.');
          setIsProcessingFile(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert('Unsupported format. Please upload a .csv or .xlsx/.xls file.');
        setIsProcessingFile(false);
      }
    } catch (err) {
      alert(`Error reading file: ${err.message}`);
      setIsProcessingFile(false);
    }
  };

  const handleExecuteImport = async () => {
    if (validatedData.length === 0) return;
    const validRows = validatedData.filter(r => r.status.valid);
    if (validRows.length === 0) {
      alert('No valid rows to import. Correct validation errors.');
      return;
    }

    setIsExecutingImport(true);
    let imported = 0;
    let skipped = 0;

    try {
      for (const row of validRows) {
        const item = row.data;
        if (migrationType === 'products') {
          const existing = products.find(p => p.sku === item.sku);
          const id = existing ? existing.id : `prod-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          await onSaveProduct({
            id,
            sku: item.sku,
            name: item.name,
            category: item.category || 'Office Supplies',
            qty: Number(item.qty || 0),
            unit: item.unit || 'pcs',
            price: Number(item.price || 0),
            minStock: Number(item.minstock || item.minStock || 5),
            location: item.location || '',
            supplierId: item.supplierid || item.supplierId || '',
            description: item.description || '',
            warehouseQtyMap: existing ? (existing.warehouseQtyMap || {}) : { 'wh-1': Number(item.qty || 0) },
            isActive: true,
            purchasePrice: Number(item.purchaseprice || item.purchasePrice || 0),
            warrantyMonths: Number(item.warrantymonths || item.warrantyMonths || 12)
          }, !!existing);
          imported++;
        } else if (migrationType === 'customers') {
          const id = `cust-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const code = item.code || `CST-${String(Date.now()).slice(-4)}`;
          await onSaveCustomer({
            id,
            code,
            name: item.name,
            contact: item.contact || '',
            phone: item.phone,
            email: item.email || '',
            address: item.address || '',
            vatNo: item.vatno || item.vatNo || '',
            tin: item.tin || '',
            accountId: null,
            currentBalance: 0,
            creditLimit: Number(item.creditlimit || item.creditLimit || 500000),
            paymentTermDays: Number(item.paymenttermdays || item.paymentTermDays || 30),
            isActive: true
          }, false);
          imported++;
        } else if (migrationType === 'suppliers') {
          const id = `sup-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const code = item.code || `SUP-${String(Date.now()).slice(-4)}`;
          await onSaveSupplier({
            id,
            code,
            name: item.name,
            contact: item.contact || '',
            phone: item.phone,
            email: item.email || '',
            address: item.address || '',
            vatNo: item.vatno || item.vatNo || '',
            tin: item.tin || '',
            accountId: null,
            currentBalance: 0,
            creditLimit: Number(item.creditlimit || item.creditLimit || 500000),
            paymentTermDays: Number(item.paymenttermdays || item.paymentTermDays || 30),
            isActive: true
          }, false);
          imported++;
        }
      }

      skipped = validatedData.length - imported;
      setImportStatus({ total: validatedData.length, imported, skipped });
      setValidatedData([]);

      const fileInput = document.getElementById('migration-file-input');
      if (fileInput) fileInput.value = '';

      if (onRefresh) onRefresh();
      alert(`🎉 Migration Successful!\nImported: ${imported} records.\nSkipped/Failed: ${skipped} records.`);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsExecutingImport(false);
    }
  };

  // Recalculate validation when conflict mode changes
  useEffect(() => {
    if (validatedData.length > 0) {
      // Re-run validation on the currently parsed row list to update skip/overwrite states instantly
      // We reconstruct key-value arrays from validatedData to match input format of validateRows
      const keys = Object.keys(validatedData[0].data);
      const rows = [
        keys,
        ...validatedData.map(v => keys.map(k => v.data[k]))
      ];
      setValidatedData(validateRows(rows, migrationType));
    }
  }, [productOverwriteConflict]);

  // Employee Directory States
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('');
  const [selectedDetailedEmp, setSelectedDetailedEmp] = useState(null);

  useEffect(() => {
    const checkOnline = async () => {
      try {
        const res = await fetch('/api/db-status');
        if (res.ok) {
          const data = await res.json();
          setOnlineStatus(data.connected);
        } else {
          setOnlineStatus(false);
        }
      } catch {
        setOnlineStatus(false);
      }
    };
    checkOnline();
    const interval = setInterval(checkOnline, 15000);
    return () => clearInterval(interval);
  }, []);

  // Update sync queue state when tab changes
  useEffect(() => {
    if (activeTab === 'database') {
      setSyncQueue(syncQueueService.getQueue());
    }
  }, [activeTab]);

  // States for onboarding account requests
  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_employees_v8');
      if (saved) return JSON.parse(saved);
      localStorage.setItem('erp_employees_v8', JSON.stringify(SEED_EMPLOYEES));
      return SEED_EMPLOYEES;
    } catch {
      return SEED_EMPLOYEES;
    }
  });
  const [userIdRequests, setUserIdRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [taggingMap, setTaggingMap] = useState({}); // mapping from requestId to taggedEmployeeCode

  // Load user credentials, employees list, and user requests when tab is accessed
  useEffect(() => {
    const fetchUsersAndRequests = async () => {
      // 1. Fetch Users
      try {
        const res = await fetch('/api/user-credentials');
        if (res.ok) {
          const data = await res.json();
          const transformed = data.map(u => ({
            uid: u.employeeCode,
            displayName: u.fullName,
            email: u.email,
            role: u.role,
            branchId: 'br-1',
            status: u.status,
            avatarColor: u.avatarColor || '#3b82f6'
          }));
          setUsersList(transformed);
          authService.saveUsersList(transformed);
        }
      } catch (err) {
        console.warn('[SettingsView] Failed to fetch users from MySQL, using localStorage fallback', err);
      }

      // 2. Fetch Employees
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (err) {
        console.warn('[SettingsView] Failed to fetch employees from MySQL, using localStorage fallback', err);
        const saved = localStorage.getItem('erp_employees_v8');
        if (saved) setEmployees(JSON.parse(saved));
      }

       // 3. Fetch User ID requests
      setRequestsLoading(true);
      try {
        authService.checkGoogleRequestExpiry();
        const res = await fetch('/api/user-id-requests');
        if (res.ok) {
          const data = await res.json();
          setUserIdRequests(data);
        }
      } catch (err) {
        console.warn('[SettingsView] Failed to fetch user requests from MySQL, using localStorage fallback', err);
        const saved = localStorage.getItem('erp_user_id_requests');
        if (saved) setUserIdRequests(JSON.parse(saved));
      } finally {
        setRequestsLoading(false);
      }
    };

    if (activeTab === 'users') {
      fetchUsersAndRequests();
    }
  }, [activeTab]);

  const handleApproveRequest = async (request, employeeCode) => {
    if (!employeeCode) {
      alert('Please select an employee to tag with this request.');
      return;
    }

    try {
      // 1. Try MySQL backend
      const res = await fetch('/api/user-id-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, taggedEmployeeCode: employeeCode })
      });

      if (res.ok) {
        alert('Request approved successfully! User credentials created.');
        
        // Refresh users list and requests
        const resUsers = await fetch('/api/user-credentials');
        if (resUsers.ok) {
          const data = await resUsers.json();
          const transformed = data.map(u => ({
            uid: u.employeeCode,
            displayName: u.fullName,
            email: u.email,
            role: u.role,
            branchId: 'br-1',
            status: u.status,
            avatarColor: u.avatarColor || '#3b82f6'
          }));
          setUsersList(transformed);
          authService.saveUsersList(transformed);
        }

        const resReqs = await fetch('/api/user-id-requests');
        if (resReqs.ok) {
          setUserIdRequests(await resReqs.json());
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve request.');
      }
    } catch (err) {
      console.warn('[SettingsView] Failed to approve via MySQL backend, trying local fallback:', err.message);
      
      // If error is a validation error from backend (like already exists), show it
      if (err.message && (err.message.includes('already exist') || err.message.includes('Approved'))) {
        alert(err.message);
        return;
      }

      // 2. Offline fallback (localStorage)
      try {
        const users = authService.getUsers();
        if (users.some(u => u.uid === employeeCode)) {
          alert(`User credentials already exist for employee code ${employeeCode}.`);
          return;
        }
        if (users.some(u => u.email?.trim().toLowerCase() === request.email.trim().toLowerCase())) {
          alert('User credentials with this email already exist.');
          return;
        }

        const selectedEmp = employees.find(e => e.employeeCode === employeeCode);
        const name = selectedEmp ? selectedEmp.fullNameEnglish : request.fullName;

        const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newUser = {
          uid: employeeCode,
          displayName: name,
          email: request.email,
          password: '123456', // default temp password
          role: 'employee',
          branchId: 'br-1',
          status: 'active',
          avatarColor: randomColor,
          mustChangePassword: true
        };

        await authService.saveUser(newUser, currentUser);
        setUsersList(authService.getUsers());

        // Update request status in localStorage
        const requestsStr = localStorage.getItem('erp_user_id_requests') || '[]';
        const requests = JSON.parse(requestsStr);
        const updatedRequests = requests.map(r => 
          r.id === request.id ? { ...r, status: 'Approved', taggedEmployeeCode: employeeCode } : r
        );
        localStorage.setItem('erp_user_id_requests', JSON.stringify(updatedRequests));
        setUserIdRequests(updatedRequests);

        alert('Request approved successfully in offline mode! User credentials created.');
      } catch (lsErr) {
        alert('An error occurred during local offline approval.');
      }
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;

    try {
      // 1. Try MySQL backend
      const res = await fetch('/api/user-id-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId })
      });

      if (res.ok) {
        alert('Request rejected.');
        const resReqs = await fetch('/api/user-id-requests');
        if (resReqs.ok) {
          setUserIdRequests(await resReqs.json());
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject request.');
      }
    } catch (err) {
      console.warn('[SettingsView] Failed to reject via MySQL, trying local fallback:', err.message);
      
      // 2. Offline fallback
      try {
        const requestsStr = localStorage.getItem('erp_user_id_requests') || '[]';
        const requests = JSON.parse(requestsStr);
        const updatedRequests = requests.map(r => 
          r.id === requestId ? { ...r, status: 'Rejected' } : r
        );
        localStorage.setItem('erp_user_id_requests', JSON.stringify(updatedRequests));
        setUserIdRequests(updatedRequests);
        alert('Request rejected in offline mode.');
      } catch (lsErr) {
        alert('An error occurred during local offline rejection.');
      }
    }
  };


  const handleSave = () => {
    saveSettings(settings);
    vatService.saveVatRates(vatRates);
    taxService.saveTaxRates(taxRates);
    localStorage.setItem('erp_branches', JSON.stringify(branches));
    localStorage.setItem('erp_warehouses', JSON.stringify(warehouses));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (section, key, value) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  };

  const handleExportBackup = () => {
    const backup = {};
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('erp_') || k.startsWith('atcl_')) {
        backup[k] = localStorage.getItem(k);
      }
    });
    
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erp_for_u_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        
        // Analyze parsed backup data
        const requiredKeys = ['erp_products', 'erp_settings', 'erp_users'];
        const hasSomeKeys = requiredKeys.some(k => k in parsed);
        
        const getCount = (key) => {
          try {
            const val = parsed[key];
            if (!val) return 0;
            const parsedVal = typeof val === 'string' ? JSON.parse(val) : val;
            return Array.isArray(parsedVal) ? parsedVal.length : (typeof parsedVal === 'object' ? Object.keys(parsedVal).length : 0);
          } catch {
            return 0;
          }
        };

        const summaryObj = {
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(2) + ' KB',
          productsCount: getCount('erp_products'),
          usersCount: getCount('erp_users'),
          vouchersCount: getCount('erp_vouchers'),
          invoicesCount: getCount('erp_invoices') + getCount('erp_sales_invoices'),
          coaCount: getCount('erp_coa'),
          isValid: hasSomeKeys,
          validationError: hasSomeKeys ? '' : 'File structure is invalid. Critical collections are missing.'
        };

        setBackupSummary(summaryObj);
        setBackupData(parsed);
        setBackupConfirmChecked(false);
        setBackupModalOpen(true);
      } catch (err) {
        alert('Failed to parse backup file. Please make sure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear input
  };

  const handleResetSystem = () => {
    if (window.confirm('🔴 DANGER ZONE: This will completely erase all current invoices, journal entries, products, suppliers, customers, and user accounts, resetting the system back to the initial demo state. Are you absolutely sure?')) {
      const confirmText = window.prompt('Type "RESET" to confirm permanent deletion:');
      if (confirmText === 'RESET') {
        const keysToClear = Object.keys(localStorage).filter(k => k.startsWith('erp_') || k.startsWith('atcl_'));
        keysToClear.forEach(k => localStorage.removeItem(k));
        alert('System data cleared. The system will now reload and re-seed defaults.');
        window.location.reload();
      } else {
        alert('Reset aborted.');
      }
    }
  };

  const tabs = [
    { id: 'company',    label: '🏢 Company',       perm: 'settings:write' },
    { id: 'fiscal',     label: '📅 Fiscal Year',   perm: 'settings:write' },
    { id: 'invoice',    label: '🧾 Invoice',        perm: 'settings:write' },
    { id: 'accounting', label: '⚖️ Accounting',    perm: 'settings:write' },
    { id: 'vat',        label: '🧾 VAT Rates',      perm: 'settings:read' },
    { id: 'tax',        label: '🧾 Tax Rates',      perm: 'settings:read' },
    { id: 'users',      label: '👥 Users & Roles',  perm: 'settings:read' },
    { id: 'branches',   label: '🏭 Branches',       perm: 'settings:read' },
    { id: 'employee',   label: '👨‍💼 Employees',      perm: 'settings:read' },
    { id: 'database',   label: '⚡ Database & Sync', perm: 'settings:write' },
    { id: 'backup',     label: '💾 Backup & Reset', perm: 'settings:write' },
    { id: 'migration',  label: '🔄 Data Migration', perm: 'settings:write' },
  ];

  const isAdmin = authService.can(currentUser, 'settings', 'write');
  const isWriteAdmin = isAdmin && !currentUser?.isPendingGoogleUser;
  const visibleTabs = tabs.filter(t => t.perm === 'settings:read' || isAdmin);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚙️ Settings</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isWriteAdmin && activeTab === 'backup' && (
            <button onClick={handleResetSystem} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
              🚨 Reset System
            </button>
          )}
          {isWriteAdmin && (
            <button onClick={handleSave} className="btn btn-primary">
              {saved ? '✅ Saved!' : '💾 Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="scrollable-tab-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 12, width: isMobile ? 'max-content' : 'auto', minWidth: '100%' }}>
          {visibleTabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: '0 0 auto', padding: '0.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)', fontWeight: 600,
                background: activeTab === t.id ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === t.id ? 'var(--accent-color)' : 'var(--text-muted)',
                boxShadow: activeTab === t.id ? 'var(--shadow-sm)' : 'none',
                whiteSpace: 'nowrap',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Company Info ── */}
      {activeTab === 'company' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🏢 Company Information</h3>
          
          {/* Logo Uploader */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1.5rem' }}>
            <div style={{
              width: 100, height: 100, borderRadius: 12, border: '2px dashed var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-tertiary)',
              position: 'relative'
            }}>
              {settings.company?.logo ? (
                <img src={settings.company.logo} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>No Logo</span>
              )}
            </div>
            {isWriteAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-block', margin: 0, padding: '0.4rem 0.8rem', textAlign: 'center' }}>
                  📤 Upload Logo
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024) {
                      alert('Logo size must be under 1MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      set('company', 'logo', event.target.result);
                    };
                    reader.readAsDataURL(file);
                  }} style={{ display: 'none' }} />
                </label>
                {settings.company?.logo && (
                  <button type="button" onClick={() => set('company', 'logo', null)} className="btn btn-danger btn-sm" style={{ padding: '0.4rem 0.8rem' }}>
                    🗑️ Remove Logo
                  </button>
                )}
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Max size 1MB (PNG, JPG)</span>
              </div>
            )}
          </div>

          <div className="form-row">
            {[
              { key: 'name',         label: 'Company Name' },
              { key: 'legalName',    label: 'Legal / Registered Name' },
              { key: 'tin',          label: 'TIN Number', placeholder: 'e.g. 123-456-789-0001' },
              { key: 'bin',          label: 'BIN (VAT Reg. No.)', placeholder: 'e.g. 000123456-0201' },
              { key: 'phone',        label: 'Phone' },
              { key: 'email',        label: 'Email' },
              { key: 'website',      label: 'Website' },
              { key: 'currencySymbol', label: 'Currency Symbol' },
            ].map(f => {
              const val = settings.company?.[f.key] || '';
              let isValid = true;
              let errorMsg = '';
              
              if (val) {
                if (f.key === 'email') {
                  isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                  errorMsg = 'Invalid email address format';
                } else if (f.key === 'website') {
                  isValid = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(val);
                  errorMsg = 'Invalid website format';
                } else if (f.key === 'tin') {
                  const clean = val.replace(/[-\s]/g, '');
                  isValid = /^\d{12}$/.test(clean);
                  errorMsg = 'TIN must be a 12-digit number';
                } else if (f.key === 'bin') {
                  const clean = val.replace(/[-\s]/g, '');
                  isValid = /^\d{9,13}$/.test(clean);
                  errorMsg = 'BIN must be 9 to 13 digits';
                }
              }

              return (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-control" value={val} readOnly={!isWriteAdmin} placeholder={f.placeholder}
                    style={{ borderColor: !isValid ? '#ef4444' : '' }}
                    onChange={e => set('company', f.key, e.target.value)} />
                  {!isValid && (
                    <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)', marginTop: '4px', display: 'block' }}>
                      ⚠️ {errorMsg}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Address</label>
            <textarea className="form-control" rows={2} value={settings.company?.address || ''} readOnly={!isWriteAdmin}
              onChange={e => set('company', 'address', e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Fiscal Year ── */}
      {activeTab === 'fiscal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>📅 Fiscal Year Settings</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fiscal Year Start</label>
                <input type="date" className="form-control" value={settings.fiscal?.yearStart || ''} readOnly={!isWriteAdmin}
                  onChange={e => {
                    if (window.confirm('⚠️ WARNING: Changing the fiscal year start date requires re-mapping all running journal entries and auditing ledger periods. Are you sure you want to proceed?')) {
                      set('fiscal', 'yearStart', e.target.value);
                    }
                  }} />
              </div>
              <div className="form-group">
                <label className="form-label">Fiscal Year End</label>
                <input type="date" className="form-control" value={settings.fiscal?.yearEnd || ''} readOnly={!isWriteAdmin}
                  onChange={e => {
                    if (window.confirm('⚠️ WARNING: Changing the fiscal year end date requires re-mapping all running journal entries and auditing ledger periods. Are you sure you want to proceed?')) {
                      set('fiscal', 'yearEnd', e.target.value);
                    }
                  }} />
              </div>
            </div>
            <div className="card" style={{ background: 'var(--bg-tertiary)', border: 'none', marginTop: '1rem', padding: '0.75rem 1rem' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: 0 }}>
                📌 Bangladesh fiscal year runs <strong>July 1 → June 30</strong>. Changing the fiscal year requires re-mapping all journal entries. Contact your accountant before changing.
              </p>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🔒 Closed & Locked Periods</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Locking ledger periods prevents any user from posting, editing, or deleting invoices and journal vouchers before the locked date.
            </p>

            {isWriteAdmin && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 8, marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>Select Month to Lock</label>
                  <input
                    type="month"
                    className="form-control"
                    id="lock-period-select-input"
                    defaultValue={new Date().toISOString().substring(0, 7)}
                    style={{ background: 'var(--bg-secondary)', padding: '0.4rem 0.8rem', fontSize: 'var(--font-size-sm)', width: '180px' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const selectEl = document.getElementById('lock-period-select-input');
                    const period = selectEl?.value;
                    if (!period) return;
                    
                    const lockedList = settings.fiscal?.lockedPeriods || [];
                    if (lockedList.includes(period)) {
                      alert('This ledger period is already locked.');
                      return;
                    }

                    if (window.confirm(`Are you sure you want to CLOSE and LOCK all accounts for the period "${period}"? This prevents any past transaction edits for this month.`)) {
                      const updatedList = [...lockedList, period].sort();
                      set('fiscal', 'lockedPeriods', updatedList);
                      alert(`Period ${period} successfully closed and locked! Click "Save Changes" at the top to write to persistent database.`);
                    }
                  }}
                  style={{ padding: '0.45rem 1rem', fontSize: 'var(--font-size-sm)' }}
                >
                  🔒 Lock & Close Period
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(!settings.fiscal?.lockedPeriods || settings.fiscal.lockedPeriods.length === 0) ? (
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                  No closed/locked periods. All historical ledger dates are currently open for edits.
                </div>
              ) : (
                settings.fiscal.lockedPeriods.map(p => (
                  <div key={p} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px',
                    fontSize: 'var(--font-size-sm)', fontWeight: 600
                  }}>
                    <span style={{ color: '#ef4444' }}>🔒 {p} (Locked)</span>
                    {isWriteAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`⚠️ WARNING: Unlocking the period "${p}" allows users to backdate or edit journal vouchers for this month. Do you wish to proceed?`)) {
                            const updated = settings.fiscal.lockedPeriods.filter(x => x !== p);
                            set('fiscal', 'lockedPeriods', updated);
                          }
                        }}
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                          fontWeight: 700, padding: '0 4px', fontSize: 'var(--font-size-sm)'
                        }}
                        title="Unlock Period"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Numbering ── */}
      {activeTab === 'invoice' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🧾 Invoice Numbering Format</h3>
          <div className="form-row">
            {[
              { key: 'salesPrefix',    label: 'Sales Invoice Prefix',    hint: 'e.g. ERP-S-' },
              { key: 'purchasePrefix', label: 'Purchase Invoice Prefix',  hint: 'e.g. ERP-P-' },
              { key: 'receiptPrefix',  label: 'Receipt Voucher Prefix',   hint: 'e.g. ERP-R-' },
              { key: 'paymentPrefix',  label: 'Payment Voucher Prefix',   hint: 'e.g. ERP-PV-' },
              { key: 'journalPrefix',  label: 'Journal Voucher Prefix',   hint: 'e.g. JV-' },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                 <input className="form-control" placeholder={f.hint} value={settings.invoice?.[f.key] || ''} readOnly={!isWriteAdmin}
                  onChange={e => set('invoice', f.key, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="card" style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)', marginTop: '0.5rem' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent-color)', fontWeight: 600 }}>
              Preview: <strong>{settings.invoice?.salesPrefix || 'ERP-S-'}0001</strong> · <strong>{settings.invoice?.purchasePrefix || 'ERP-P-'}0001</strong>
            </p>
          </div>
        </div>
      )}

      {/* ── Accounting Defaults ── */}
      {activeTab === 'accounting' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>⚖️ Accounting Defaults</h3>
          <div className="form-group">
            <label className="form-label">Allow Negative Stock</label>
            <select className="form-control" value={settings.accounting?.allowNegativeStock ? 'yes' : 'no'} disabled={!isWriteAdmin}
              onChange={e => set('accounting', 'allowNegativeStock', e.target.value === 'yes')}>
              <option value="no">No — Block sales if stock is insufficient</option>
              <option value="yes">Yes — Allow overselling (backorder mode)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Purchase Order Approval Required</label>
            <select className="form-control" value={settings.accounting?.requireApprovalOnPO ? 'yes' : 'no'} disabled={!isWriteAdmin}
              onChange={e => set('accounting', 'requireApprovalOnPO', e.target.value === 'yes')}>
              <option value="no">No — Auto-approve all POs</option>
              <option value="yes">Yes — Manager must approve before GRN</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Default VAT Rate</label>
            <select className="form-control" value={settings.accounting?.defaultVatRate || 'vat-std'} disabled={!isWriteAdmin}
              onChange={e => set('accounting', 'defaultVatRate', e.target.value)}>
              {vatRates.map(v => <option key={v.id} value={v.id}>{v.name} ({v.rate}%)</option>)}
            </select>
          </div>

          <h4 style={{ margin: '1.5rem 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--accent-color)' }}>
            📋 Standard Ledger Account Mappings
          </h4>

          <div className="form-row">
            {[
              { key: 'defaultCashAccount',        label: 'Default Cash Account',        fallback: 'acc-1010' },
              { key: 'defaultBankAccount',        label: 'Default Bank Account',        fallback: 'acc-1020' },
              { key: 'defaultReceivablesAccount',   label: 'Default Receivables (A/R)',   fallback: 'acc-1100' },
              { key: 'defaultPayablesAccount',      label: 'Default Payables (A/P)',      fallback: 'acc-2010' },
              { key: 'defaultInventoryAccount',     label: 'Default Inventory Account',   fallback: 'acc-1200' },
            ].map(mapping => {
              const sortedCoa = [...coaAccounts].sort((a, b) => a.code.localeCompare(b.code));
              return (
                <div key={mapping.key} className="form-group">
                  <label className="form-label">{mapping.label}</label>
                  <select
                    className="form-control"
                    value={settings.accounting?.[mapping.key] || mapping.fallback}
                    disabled={!isWriteAdmin}
                    onChange={e => set('accounting', mapping.key, e.target.value)}
                  >
                    <option value="">-- Select Account --</option>
                    {sortedCoa.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        [{acc.code}] {acc.name} ({acc.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VAT Rates ── */}
      {activeTab === 'vat' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>🧾 VAT Rate Configuration</h3>
            {isWriteAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const newRate = {
                  id: `vat-${Date.now()}`,
                  name: 'New VAT Rate',
                  rate: 15,
                  isDefault: false,
                  isActive: true,
                  isSystem: false
                };
                setVatRates([...vatRates, newRate]);
              }} style={{ padding: '0.4rem 0.8rem' }}>
                ➕ Add Custom VAT Rate
              </button>
            )}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rate Name</th>
                <th>Rate %</th>
                <th>Default</th>
                <th>Status</th>
                {isWriteAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vatRates.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>
                    {isWriteAdmin ? (
                      <input
                        type="text"
                        className="form-control"
                        value={v.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVatRates(prev => prev.map(item => item.id === v.id ? { ...item, name: val } : item));
                        }}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-sm)', minWidth: '180px', background: 'var(--bg-tertiary)' }}
                      />
                    ) : (
                      v.name
                    )}
                  </td>
                  <td>
                    {isWriteAdmin ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          className="form-control"
                          value={v.rate}
                          min="0"
                          max="100"
                          step="0.01"
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setVatRates(prev => prev.map(item => item.id === v.id ? { ...item, rate: val } : item));
                          }}
                          style={{ padding: '4px 8px', fontSize: 'var(--font-size-sm)', width: '80px', background: 'var(--bg-tertiary)' }}
                        />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>%</span>
                      </div>
                    ) : (
                      <span className="chip chip-blue">{v.rate}%</span>
                    )}
                  </td>
                  <td>
                    {isWriteAdmin ? (
                      <input
                        type="radio"
                        name="defaultVatRateRadio"
                        checked={!!v.isDefault}
                        disabled={!v.isActive}
                        onChange={() => {
                          setVatRates(prev => prev.map(item => ({
                            ...item,
                            isDefault: item.id === v.id
                          })));
                          // Also automatically update the defaultVatRate key in settings
                          set('accounting', 'defaultVatRate', v.id);
                        }}
                      />
                    ) : (
                      v.isDefault ? <span className="chip chip-green">✓ Default</span> : '—'
                    )}
                  </td>
                  <td>
                    {isWriteAdmin ? (
                      <button
                        type="button"
                        className={`btn btn-sm ${v.isActive ? 'btn-secondary' : 'btn-outline'}`}
                        onClick={() => {
                          if (v.isDefault && v.isActive) {
                            alert('Cannot deactivate the default VAT rate. Please set another rate as default first.');
                            return;
                          }
                          setVatRates(prev => prev.map(item => item.id === v.id ? { ...item, isActive: !item.isActive } : item));
                        }}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                      >
                        {v.isActive ? 'Active' : 'Inactive'}
                      </button>
                    ) : (
                      <span className={`status-pill ${v.isActive ? 'instock' : 'outstock'}`}>{v.isActive ? 'Active' : 'Inactive'}</span>
                    )}
                  </td>
                  {isWriteAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={!!v.isDefault}
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${v.name}"?`)) {
                            setVatRates(prev => prev.filter(item => item.id !== v.id));
                          }
                        }}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: '1rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Standard Bangladesh VAT is 15% (NBR). Contact your tax advisor before changing rates. Make sure to click "Save Changes" at the top to commit custom VAT rate lists.
          </p>
        </div>
      )}

      {/* ── Tax Rates ── */}
      {activeTab === 'tax' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>🧾 Tax Rate Configuration</h3>
            {isWriteAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const newRate = {
                  id: `tax-${Date.now()}`,
                  name: 'New Tax Rate',
                  rate: 5,
                  isDefault: false,
                  isActive: true,
                  isSystem: false
                };
                setTaxRates([...taxRates, newRate]);
              }} style={{ padding: '0.4rem 0.8rem' }}>
                ➕ Add Custom Tax Rate
              </button>
            )}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rate Name</th>
                <th>Rate %</th>
                <th>Default</th>
                <th>Status</th>
                {isWriteAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {taxRates.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>
                    {isWriteAdmin ? (
                      <input
                        type="text"
                        className="form-control"
                        value={v.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTaxRates(prev => prev.map(item => item.id === v.id ? { ...item, name: val } : item));
                        }}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-sm)', minWidth: '180px', background: 'var(--bg-tertiary)' }}
                      />
                    ) : (
                      v.name
                    )}
                  </td>
                  <td>
                    {isWriteAdmin ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          className="form-control"
                          value={v.rate}
                          min="0"
                          max="100"
                          step="0.01"
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTaxRates(prev => prev.map(item => item.id === v.id ? { ...item, rate: val } : item));
                          }}
                          style={{ padding: '4px 8px', fontSize: 'var(--font-size-sm)', width: '80px', background: 'var(--bg-tertiary)' }}
                        />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>%</span>
                      </div>
                    ) : (
                      <span className="chip chip-blue">{v.rate}%</span>
                    )}
                  </td>
                  <td>
                    {isWriteAdmin ? (
                      <input
                        type="radio"
                        name="defaultTaxRateRadio"
                        checked={!!v.isDefault}
                        disabled={!v.isActive}
                        onChange={() => {
                          setTaxRates(prev => prev.map(item => ({
                            ...item,
                            isDefault: item.id === v.id
                          })));
                          set('accounting', 'defaultTaxRate', v.id);
                        }}
                      />
                    ) : (
                      v.isDefault ? <span className="chip chip-green">✓ Default</span> : '—'
                    )}
                  </td>
                  <td>
                    {isWriteAdmin ? (
                      <button
                        type="button"
                        className={`btn btn-sm ${v.isActive ? 'btn-secondary' : 'btn-outline'}`}
                        onClick={() => {
                          if (v.isDefault && v.isActive) {
                            alert('Cannot deactivate the default Tax rate. Please set another rate as default first.');
                            return;
                          }
                          setTaxRates(prev => prev.map(item => item.id === v.id ? { ...item, isActive: !item.isActive } : item));
                        }}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                      >
                        {v.isActive ? 'Active' : 'Inactive'}
                      </button>
                    ) : (
                      <span className={`status-pill ${v.isActive ? 'instock' : 'outstock'}`}>{v.isActive ? 'Active' : 'Inactive'}</span>
                    )}
                  </td>
                  {isWriteAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={!!v.isDefault}
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${v.name}"?`)) {
                            setTaxRates(prev => prev.filter(item => item.id !== v.id));
                          }
                        }}
                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: '1rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Standard Bangladesh withholding tax (TDS) and AIT rates apply. Contact your finance advisor before modifying system defaults. Make sure to click "Save Changes" at the top to commit custom tax rate lists.
          </p>
        </div>
      )}

      {/* ── Users & Roles ── */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* User Management Actions */}
          <div className="card">
            {currentUser?.isPendingGoogleUser && (
              <div className="card" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#d97706', fontSize: 'var(--font-size-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                🔒 <strong>Guest Session Lock:</strong> You have explored this dashboard using Google login. However, because your registration is still pending approval, you are restricted from modifying user accounts.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>👥 User Accounts</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Search users..."
                  className="form-control"
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  style={{ width: '220px', padding: '0.4rem 0.8rem', fontSize: 'var(--font-size-sm)', margin: 0 }}
                />
                {isWriteAdmin && (
                  <button className="btn btn-primary"
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({ displayName: '', email: '', password: '', role: 'sales', branchId: 'br-1', status: 'active' });
                      setUserError('');
                      setSelectedEmployeeCode('');
                      setIsUserModalOpen(true);
                    }}>
                    👤 Register User
                  </button>
                )}
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>System Role</th>
                  <th>Branch ID</th>
                  <th>Status</th>
                  {isWriteAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {usersList.filter(u => {
                  const q = userQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    (u.displayName || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.role || '').toLowerCase().includes(q)
                  );
                }).map(u => {
                  let roleColor = 'var(--text-muted)';
                  if (u.role === 'superadmin') roleColor = 'var(--status-draft-text, #7c3aed)';
                  else if (u.role === 'admin') roleColor = 'var(--accent-color)';
                  else if (u.role === 'accountant') roleColor = 'var(--status-paid-text, #10b981)';
                  else if (u.role === 'warehouse') roleColor = 'var(--status-delivered-text, #3b82f6)';
                  else if (u.role === 'sales') roleColor = 'var(--status-partial-text, #f59e0b)';

                  return (
                    <tr key={u.uid || u.email}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: u.avatarColor || '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 'var(--font-size-sm)'
                          }}>
                            {(u.displayName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="chip" style={{
                          backgroundColor: `${roleColor}12`,
                          color: roleColor,
                          fontWeight: 700,
                          fontSize: 'var(--font-size-xs)',
                          textTransform: 'uppercase'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>
                          {u.branchId || 'br-1'}
                        </code>
                      </td>
                      <td>
                        <span className={`status-pill ${u.status === 'active' ? 'instock' : 'outstock'}`}>
                          {u.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isWriteAdmin && (
                        <td>
                          <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-secondary"
                              onClick={() => {
                                setEditingUser(u);
                                setUserForm({
                                  displayName: u.displayName || '',
                                  email: u.email || '',
                                  password: '', // blank to keep current
                                  role: u.role || 'sales',
                                  branchId: u.branchId || 'br-1',
                                  status: u.status || 'active'
                                });
                                setUserError('');
                                setSelectedEmployeeCode('');
                                setIsUserModalOpen(true);
                              }}>
                              ✏️ Edit
                            </button>
                            <button
                              className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                              disabled={u.email === 'admin@erpforu.com' || u.email === 'superadmin@erpforu.com' || u.uid === currentUser.uid}
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to ${u.status === 'active' ? 'DEACTIVATE' : 'ACTIVATE'} user "${u.displayName}"?`)) {
                                  try {
                                    await authService.toggleUserStatus(u.uid, currentUser);
                                    setUsersList(authService.getUsers());
                                  } catch (err) {
                                    alert(err.message || 'Action failed.');
                                  }
                                }
                              }}
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pending User ID Requests */}
          {isAdmin && (
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🔑 Pending User ID Requests</h3>
              {currentUser?.isPendingGoogleUser && (
                <div className="card" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#d97706', fontSize: 'var(--font-size-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                  🔒 <strong>Guest Session Lock:</strong> You have explored this dashboard using Google login. However, because your registration is still pending approval, you are restricted from approving/rejecting user ID requests.
                </div>
              )}
              {requestsLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading requests...
                </div>
              ) : userIdRequests.filter(r => r.status === 'Pending').length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  ✓ No pending User ID requests.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request Details</th>
                      <th>Mobile Number</th>
                      <th>Tag Employee</th>
                      {isWriteAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {userIdRequests
                      .filter(r => r.status === 'Pending')
                      .map(req => {
                        // Filter out employees who already have user credentials
                        const untaggedEmployees = employees.filter(emp => 
                          !usersList.some(u => u.uid === emp.employeeCode)
                        );

                        return (
                          <tr key={req.id}>
                            <td>
                              <div>
                                <div style={{ fontWeight: 600 }}>{req.fullName}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{req.email}</div>
                              </div>
                            </td>
                            <td>{req.mobileNumber}</td>
                            <td>
                              <select
                                className="form-control"
                                value={taggingMap[req.id] || ''}
                                disabled={!isWriteAdmin}
                                onChange={e => setTaggingMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                                style={{ minWidth: '200px', fontSize: 'var(--font-size-sm)', padding: '0.4rem 0.8rem', background: 'var(--bg-tertiary)' }}
                              >
                                <option value="">-- Select Employee --</option>
                                {untaggedEmployees.map(emp => (
                                  <option key={emp.employeeCode} value={emp.employeeCode}>
                                    {emp.fullNameEnglish} ({emp.employeeCode})
                                  </option>
                                ))}
                              </select>
                            </td>
                            {isWriteAdmin && (
                              <td>
                                <div className="action-buttons" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  <button
                                    className="btn btn-sm btn-primary"
                                    disabled={!taggingMap[req.id]}
                                    onClick={() => handleApproveRequest(req, taggingMap[req.id])}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleRejectRequest(req.id)}
                                  >
                                    ✗ Reject
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Permissions matrix */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🛡️ Standard Roles & Permissions System</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Roles grant permissions to standard modules automatically:
            </p>
            {defaultRoles.map(role => (
              <div key={role.id} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{role.name}</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>— {role.description}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {role.permissions['*']
                    ? <span className="chip chip-purple">✦ Full Access</span>
                    : Object.entries(role.permissions).map(([mod, actions]) => (
                      <span key={mod} className="chip chip-blue" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {mod}: {actions.join(', ')}
                      </span>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── User Add/Edit Modal ── */}
      {isUserModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1050,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '520px',
            maxHeight: '90vh',
            background: 'var(--bg-secondary)',
            borderRadius: '20px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.4rem' }}>{editingUser ? '✏️' : '👤'}</div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>
                    {editingUser ? 'Modify User Account' : 'Register New User'}
                  </h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
                    {editingUser ? 'Update credentials and access permissions' : 'Create a new system user account'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setIsUserModalOpen(false); setSelectedEmployeeCode(''); }} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}>×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setUserError('');
              if (!userForm.displayName || !userForm.email) {
                setUserError('Display Name and Email are required.');
                return;
              }
              if (!editingUser && !userForm.password) {
                setUserError('Password is required for new accounts.');
                return;
              }
              if (!editingUser && usersList.some(u => u.email.trim().toLowerCase() === userForm.email.trim().toLowerCase())) {
                setUserError('A user with this email address already exists.');
                return;
              }
              if (!editingUser && selectedEmployeeCode && usersList.some(u => u.uid === selectedEmployeeCode)) {
                setUserError('This employee is already registered as a user.');
                return;
              }

              const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2'];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];

              const finalUserData = {
                uid: editingUser ? editingUser.uid : (selectedEmployeeCode || `u-${Date.now()}`),
                displayName: userForm.displayName,
                email: userForm.email,
                role: userForm.role,
                branchId: userForm.branchId,
                status: userForm.status,
                avatarColor: editingUser ? editingUser.avatarColor : randomColor,
                mustChangePassword: !editingUser && !!selectedEmployeeCode
              };

              // Only update password if provided
              if (userForm.password) {
                finalUserData.password = userForm.password;
              } else if (editingUser) {
                finalUserData.password = editingUser.password;
              }

              try {
                await authService.saveUser(finalUserData, currentUser);
                
                // Refresh local user list and requests if MySQL was used
                try {
                  const res = await fetch('/api/user-credentials');
                  if (res.ok) {
                    const data = await res.json();
                    const transformed = data.map(u => ({
                      uid: u.employeeCode,
                      displayName: u.fullName,
                      email: u.email,
                      role: u.role,
                      branchId: 'br-1',
                      status: u.status,
                      avatarColor: u.avatarColor || '#3b82f6'
                    }));
                    setUsersList(transformed);
                    authService.saveUsersList(transformed);
                  } else {
                    setUsersList(authService.getUsers());
                  }
                } catch {
                  setUsersList(authService.getUsers());
                }

                setIsUserModalOpen(false);
              } catch (err) {
                setUserError(err.message || 'Failed to save user.');
              }
            }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Scrollable Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {userError && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 'var(--font-size-xs)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                  ⚠️ {userError}
                </div>
              )}

              {!editingUser && (
                <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Import from HRMS Employee (Optional)</label>
                  <select
                    value={selectedEmployeeCode}
                    onChange={e => {
                      const empCode = e.target.value;
                      setSelectedEmployeeCode(empCode);
                      if (empCode) {
                        const emp = employees.find(x => x.employeeCode === empCode);
                        if (emp) {
                          setUserForm({
                            ...userForm,
                            displayName: emp.fullNameEnglish || '',
                            email: emp.emailAddress || emp.personalEmailAddress || '',
                            password: '123456',
                            role: 'employee'
                          });
                        }
                      } else {
                        setUserForm({
                          displayName: '',
                          email: '',
                          password: '',
                          role: 'sales',
                          branchId: 'br-1',
                          status: 'active'
                        });
                      }
                    }}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(129,140,248,0.25)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  >
                    <option value="">-- Manual Input / Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.employeeCode} value={emp.employeeCode}>
                        {emp.fullNameEnglish} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Display Name *</label>
                <input
                  type="text"
                  required
                  value={userForm.displayName}
                  onChange={e => setUserForm({ ...userForm, displayName: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: editingUser ? 'rgba(255,255,255,0.04)' : 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', opacity: editingUser ? 0.6 : 1 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>System Role</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  >
                    <option value="employee">Employee (ESS)</option>
                    <option value="sales">Sales Executive</option>
                    <option value="warehouse">Warehouse Manager</option>
                    <option value="accountant">Chief Accountant</option>
                    <option value="admin">System Admin</option>
                    <option value="superadmin">Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Branch Access</label>
                  <select
                    value={userForm.branchId}
                    onChange={e => setUserForm({ ...userForm, branchId: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Status</label>
                <select
                  value={userForm.status}
                  disabled={editingUser && (editingUser.email === 'admin@erpforu.com' || editingUser.email === 'superadmin@erpforu.com')}
                  onChange={e => setUserForm({ ...userForm, status: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (Suspended)</option>
                </select>
              </div>

              </div>{/* /scrollable body */}
              {/* Fixed Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: 'var(--bg-secondary)',
                display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                flexShrink: 0,
              }}>
                <button type="button" onClick={() => setIsUserModalOpen(false)} style={{
                  padding: '0.6rem 1.25rem', borderRadius: '10px',
                  background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>Cancel</button>
                <button type="submit" style={{
                  padding: '0.6rem 1.5rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                }}>{editingUser ? '💾 Save Details' : '👤 Register User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Branches ── */}
      {activeTab === 'branches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>🏢 Branches</h3>
              {isWriteAdmin && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                  setEditingBranch(null);
                  setBranchForm({ name: '', code: '', address: '', phone: '', isActive: true });
                  setIsBranchModalOpen(true);
                }}>
                  ➕ Add Branch
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Status</th>
                  {isWriteAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td><code style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>{b.code}</code></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{b.address || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{b.phone || '—'}</td>
                    <td>
                      <span className={`status-pill ${b.isActive ? 'instock' : 'outstock'}`}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isWriteAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons" style={{ justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => {
                            setEditingBranch(b);
                            setBranchForm(b);
                            setIsBranchModalOpen(true);
                          }}>✏️ Edit</button>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => {
                            if (window.confirm(`Are you sure you want to delete branch "${b.name}"?`)) {
                              setBranches(prev => prev.filter(x => x.id !== b.id));
                            }
                          }}>🗑️ Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>🏭 Warehouses</h3>
              {isWriteAdmin && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                  setEditingWarehouse(null);
                  setWarehouseForm({ name: '', code: '', branchId: branches[0]?.id || 'br-1', isActive: true });
                  setIsWarehouseModalOpen(true);
                }}>
                  ➕ Add Warehouse
                </button>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Branch</th>
                  <th>Status</th>
                  {isWriteAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {warehouses.map(w => {
                  const branch = branches.find(b => b.id === w.branchId);
                  return (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600 }}>{w.name}</td>
                      <td><code style={{ fontSize: 'var(--font-size-xs)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>{w.code}</code></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{branch?.name || '—'}</td>
                      <td>
                        <span className={`status-pill ${w.isActive ? 'instock' : 'outstock'}`}>
                          {w.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isWriteAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons" style={{ justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => {
                              setEditingWarehouse(w);
                              setWarehouseForm(w);
                              setIsWarehouseModalOpen(true);
                            }}>✏️ Edit</button>
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => {
                              if (window.confirm(`Are you sure you want to delete warehouse "${w.name}"?`)) {
                                setWarehouses(prev => prev.filter(x => x.id !== w.id));
                              }
                            }}>🗑️ Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Branch Add/Edit Modal ── */}
          {isBranchModalOpen && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1100,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}>
              <div style={{
                width: '100%', maxWidth: '460px', maxHeight: '90vh',
                background: 'var(--bg-secondary)', borderRadius: '20px',
                boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '1.4rem' }}>🏢</div>
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>
                        {editingBranch ? 'Modify Branch' : 'Register New Branch'}
                      </h3>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
                        {editingBranch ? 'Update branch details' : 'Add a new company branch location'}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsBranchModalOpen(false)} style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!branchForm.name || !branchForm.code) { alert('Name and Code are required.'); return; }
                  const branchData = { ...branchForm, id: editingBranch ? editingBranch.id : `br-${Date.now()}` };
                  if (editingBranch) { setBranches(prev => prev.map(b => b.id === editingBranch.id ? branchData : b)); }
                  else { setBranches(prev => [...prev, branchData]); }
                  setIsBranchModalOpen(false);
                  alert('Branch details saved. Click "Save Changes" at the top to write to persistent database.');
                }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  {/* Scrollable Body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Branch Name *</label>
                      <input type="text" required value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Branch Code *</label>
                      <input type="text" required value={branchForm.code} onChange={e => setBranchForm({ ...branchForm, code: e.target.value })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Address</label>
                      <textarea rows={2} value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Phone</label>
                      <input type="text" value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Status</label>
                      <select value={branchForm.isActive ? 'active' : 'inactive'} onChange={e => setBranchForm({ ...branchForm, isActive: e.target.value === 'active' })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  {/* Fixed Footer */}
                  <div style={{
                    padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)',
                    background: 'var(--bg-secondary)',
                    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0,
                  }}>
                    <button type="button" onClick={() => setIsBranchModalOpen(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', background: 'linear-gradient(135deg, #059669, #047857)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(5,150,105,0.4)' }}>{editingBranch ? '💾 Save Details' : '🏢 Register Branch'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Warehouse Add/Edit Modal ── */}
          {isWarehouseModalOpen && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1100,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}>
              <div style={{
                width: '100%', maxWidth: '460px', maxHeight: '90vh',
                background: 'var(--bg-secondary)', borderRadius: '20px',
                boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '1.4rem' }}>🏭</div>
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>
                        {editingWarehouse ? 'Modify Warehouse' : 'Register New Warehouse'}
                      </h3>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
                        {editingWarehouse ? 'Update warehouse configuration' : 'Add a new storage facility or depot'}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsWarehouseModalOpen(false)} style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!warehouseForm.name || !warehouseForm.code) { alert('Name and Code are required.'); return; }
                  const warehouseData = { ...warehouseForm, id: editingWarehouse ? editingWarehouse.id : `wh-${Date.now()}` };
                  if (editingWarehouse) { setWarehouses(prev => prev.map(w => w.id === editingWarehouse.id ? warehouseData : w)); }
                  else { setWarehouses(prev => [...prev, warehouseData]); }
                  setIsWarehouseModalOpen(false);
                  alert('Warehouse details saved. Click "Save Changes" at the top to write to persistent database.');
                }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  {/* Scrollable Body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Warehouse Name *</label>
                      <input type="text" required value={warehouseForm.name} onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Warehouse Code *</label>
                      <input type="text" required value={warehouseForm.code} onChange={e => setWarehouseForm({ ...warehouseForm, code: e.target.value })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Link to Branch</label>
                      <select value={warehouseForm.branchId} onChange={e => setWarehouseForm({ ...warehouseForm, branchId: e.target.value })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Status</label>
                      <select value={warehouseForm.isActive ? 'active' : 'inactive'} onChange={e => setWarehouseForm({ ...warehouseForm, isActive: e.target.value === 'active' })} style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  {/* Fixed Footer */}
                  <div style={{
                    padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)',
                    background: 'var(--bg-secondary)',
                    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0,
                  }}>
                    <button type="button" onClick={() => setIsWarehouseModalOpen(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button type="submit" style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', background: 'linear-gradient(135deg, #d97706, #b45309)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 15px rgba(217,119,6,0.4)' }}>{editingWarehouse ? '💾 Save Details' : '🏭 Register Warehouse'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Database & Sync ── */}
      {activeTab === 'database' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Status banner */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: onlineStatus ? '4px solid var(--success)' : '4px solid var(--warning)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 700 }}>MySQL Database Integration Status</h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Online status checks connection to local MySQL database server.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: onlineStatus ? 'var(--success)' : 'var(--warning)', boxShadow: onlineStatus ? '0 0 8px var(--success)' : '0 0 8px var(--warning)' }} />
              <strong style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-sm)', color: onlineStatus ? 'var(--success)' : 'var(--warning)' }}>
                {onlineStatus ? 'MySQL Online' : 'MySQL Offline (LocalStorage Mode)'}
              </strong>
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Sync Queue Inspector */}
            <div className="card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>⚡ Offline Sync Queue Inspector</h3>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Logs database queries and synchronization actions cached in local storage.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={isSyncing || syncQueue.length === 0 || !isWriteAdmin}
                    onClick={async () => {
                      setIsSyncing(true);
                      setSyncMsg('Synchronizing pending operations with MySQL server...');
                      try {
                        const result = await syncQueueService.processQueue();
                        setSyncQueue(syncQueueService.getQueue());
                        setSyncMsg(`SUCCESS: Synchronization finished. Successfully synced ${result.syncedCount} entries.`);
                      } catch (err) {
                        setSyncMsg(`ERROR: Sync process failed: ${err.message}`);
                      }
                      setIsSyncing(false);
                      setTimeout(() => setSyncMsg(''), 5000);
                    }}
                  >
                    🔄 Force Sync Queue
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={syncQueue.length === 0 || !isWriteAdmin}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear the synchronization queue history?')) {
                        syncQueueService.clearQueue();
                        setSyncQueue([]);
                      }
                    }}
                  >
                    🗑️ Clear Queue
                  </button>
                </div>
              </div>

              {syncMsg && (
                <div style={{
                  padding: '12px 16px',
                  background: syncMsg.startsWith('SUCCESS') ? 'rgba(16, 185, 129, 0.08)' : (syncMsg.startsWith('ERROR') ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0,180,216,0.08)'),
                  border: syncMsg.startsWith('SUCCESS') ? '1px solid var(--success)' : (syncMsg.startsWith('ERROR') ? '1px solid var(--danger)' : '1px solid var(--border-color)'),
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: syncMsg.startsWith('SUCCESS') ? 'var(--success)' : (syncMsg.startsWith('ERROR') ? 'var(--danger)' : 'var(--text-primary)')
                }}>
                  {syncMsg}
                </div>
              )}

              <div className="table-container" style={{ padding: 0, maxHeight: 300, overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: 'var(--font-size-xs)' }}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Operation / Table</th>
                      <th>Method</th>
                      <th>API Endpoint</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncQueue.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                          ✓ Offline Sync Queue is empty. All operations synchronized.
                        </td>
                      </tr>
                    ) : (
                      [...syncQueue].reverse().map(item => (
                        <tr key={item.id}>
                          <td>{new Date(item.timestamp).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{item.table}</td>
                          <td>
                            <span className="chip" style={{ background: item.method === 'POST' ? 'rgba(16,185,129,0.12)' : (item.method === 'PUT' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)'), color: item.method === 'POST' ? 'var(--success)' : (item.method === 'PUT' ? 'var(--accent-color)' : 'var(--danger)'), fontWeight: 700 }}>
                              {item.method}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{item.url}</td>
                          <td>
                            <span className={`status-pill ${item.status === 'Synced' ? 'instock' : (item.status === 'Pending' ? 'draft' : 'outstock')}`}>
                              {item.status}
                            </span>
                            {item.error && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--danger)', marginTop: 4 }}>{item.error}</div>}
                          </td>
                          <td style={{ fontWeight: 700 }}>{item.attempts}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                syncQueueService.removeItem(item.id);
                                setSyncQueue(syncQueueService.getQueue());
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MySQL Database Backup Utility Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗄️</div>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: '0.5rem' }}>MySQL Administrator SQL Dump</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Execute an administrative raw SQL database snapshot dump on the active MySQL server. Downloads all CREATE TABLE statements and records.
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: '1.5rem', alignSelf: 'flex-start' }}
                disabled={!onlineStatus || !isWriteAdmin}
                onClick={() => {
                  window.open('/api/db/dump', '_blank');
                }}
              >
                📥 Download MySQL Dump (.sql)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Employees Directory ── */}
      {activeTab === 'employee' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header section with Sync option */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>👨‍💼 Employees Directory</h3>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                View employee records and sync credentials with the local database.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to sync the employee database? This will overwrite the current employee list with the original data.')) {
                    localStorage.setItem('erp_employees_v8', JSON.stringify(SEED_EMPLOYEES));
                    setEmployees(SEED_EMPLOYEES);
                    alert('Employee database synced successfully!');
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                  fontFamily: 'inherit',
                }}
              >
                🔄 Sync Database
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete all employees from the directory? This action cannot be undone.')) {
                    localStorage.setItem('erp_employees_v8', JSON.stringify([]));
                    setEmployees([]);
                    alert('All employee directory entries deleted successfully!');
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                  fontFamily: 'inherit',
                }}
              >
                🗑️ Delete All Employees
              </button>
            </div>
          </div>

          {/* Search and filter controls */}
          <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Search Employee</label>
              <input
                type="text"
                placeholder="Search by Code, Name, Designation..."
                value={empSearchQuery}
                onChange={e => setEmpSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ width: '180px' }}>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Department</label>
              <select
                value={empDeptFilter}
                onChange={e => setEmpDeptFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Departments</option>
                {[...new Set(employees.map(e => e.department))].filter(Boolean).sort().map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '140px' }}>
              <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Status</label>
              <select
                value={empStatusFilter}
                onChange={e => setEmpStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Employee Directory Table Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emp Code</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee Name</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Designation & Dept</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mobile & Email</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Salary</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter(emp => {
                      const matchesSearch = 
                        emp.employeeCode?.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        emp.fullNameEnglish?.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        emp.fullNameBangla?.toLowerCase().includes(empSearchQuery.toLowerCase()) ||
                        emp.designation?.toLowerCase().includes(empSearchQuery.toLowerCase());
                      const matchesDept = !empDeptFilter || emp.department === empDeptFilter;
                      const matchesStatus = !empStatusFilter || emp.status === empStatusFilter;
                      return matchesSearch && matchesDept && matchesStatus;
                    })
                    .map((emp) => (
                      <tr key={emp.employeeCode} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--accent-color)', fontSize: 'var(--font-size-sm)' }}>
                          {emp.employeeCode}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{emp.fullNameEnglish}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{emp.fullNameBangla}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{emp.designation}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{emp.department}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{emp.mobileNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-all' }}>{emp.emailAddress}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
                          ৳ {emp.grossSalary ? Number(emp.grossSalary).toLocaleString('en-BD') : '0'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: emp.status === 'Active' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                            color: emp.status === 'Active' ? '#34d399' : '#f87171',
                            border: emp.status === 'Active' ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(239,68,68,0.2)',
                          }}>
                            {emp.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedDetailedEmp(emp)}
                            style={{
                              padding: '0.4rem 0.8rem',
                              borderRadius: '8px',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'var(--bg-tertiary)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            }}
                          >
                            👁️ View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Detailed View Modal ── */}
      {selectedDetailedEmp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1050,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '680px', maxHeight: '90vh',
            background: 'var(--bg-secondary)', borderRadius: '20px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.4rem' }}>👨‍💼</div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>Employee Detailed Profile</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
                    Record reference: {selectedDetailedEmp.employeeCode}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDetailedEmp(null)} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Primary Employment info banner */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name (English)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{selectedDetailedEmp.fullNameEnglish}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: 1 }}>{selectedDetailedEmp.fullNameBangla}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Designation & Dept</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: 2 }}>{selectedDetailedEmp.designation}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', marginTop: 1 }}>{selectedDetailedEmp.department}</div>
                </div>
              </div>

              {/* Personal Details Section */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>👤 Personal Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                  {[
                    { label: 'Date of Birth', value: selectedDetailedEmp.dob },
                    { label: 'Gender', value: selectedDetailedEmp.gender },
                    { label: 'Blood Group', value: selectedDetailedEmp.bloodGroup },
                    { label: 'Marital Status', value: selectedDetailedEmp.maritalStatus },
                    { label: 'Nationality', value: selectedDetailedEmp.nationality },
                    { label: 'Personal Mobile', value: selectedDetailedEmp.personalMobileNumber || selectedDetailedEmp.mobileNumber },
                    { label: 'Personal Email', value: selectedDetailedEmp.personalEmailAddress || 'N/A' },
                    { label: 'Present Address', value: selectedDetailedEmp.presentAddress },
                    { label: 'Permanent Address', value: selectedDetailedEmp.permanentAddress },
                    { label: 'Father\'s Name', value: selectedDetailedEmp.fatherName },
                    { label: 'Mother\'s Name', value: selectedDetailedEmp.motherName },
                    { label: 'Nominee Reference', value: selectedDetailedEmp.nominee },
                  ].map((item, index) => (
                    <div key={index} style={{ gridColumn: (item.label.includes('Address') || item.label.includes('Name') || item.label.includes('Nominee')) ? '1 / -1' : 'auto' }}>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identification details Section */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>🪪 Identity & Compliance</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                  {[
                    { label: 'National ID (NID)', value: selectedDetailedEmp.nid },
                    { label: 'Passport No.', value: selectedDetailedEmp.passportNumber || 'N/A' },
                    { label: 'TIN / Taxpayer Identification', value: selectedDetailedEmp.tin },
                    { label: 'Tax Circle & Zone', value: `${selectedDetailedEmp.taxCircle || 'N/A'} · ${selectedDetailedEmp.taxZone || 'N/A'}` },
                  ].map((item, index) => (
                    <div key={index}>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Account Info */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>🏦 Salary Payment Account</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                  {[
                    { label: 'Bank Name', value: selectedDetailedEmp.bankName },
                    { label: 'Bank Account Number', value: selectedDetailedEmp.bankAccountNo },
                  ].map((item, index) => (
                    <div key={index}>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employment Record details */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>📅 Corporate Contract Parameters</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                  {[
                    { label: 'Joining Date', value: selectedDetailedEmp.joiningDate },
                    { label: 'Gross Salary (Monthly)', value: `৳ ${selectedDetailedEmp.grossSalary ? Number(selectedDetailedEmp.grossSalary).toLocaleString('en-BD') : '0'}` },
                    { label: 'Office Intercom Ext.', value: selectedDetailedEmp.intercom || 'N/A' },
                    { label: 'Corporate Mobile', value: selectedDetailedEmp.mobileNumber },
                    { label: 'Corporate Email', value: selectedDetailedEmp.emailAddress },
                  ].map((item, index) => (
                    <div key={index}>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--bg-secondary)',
              display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
            }}>
              <button onClick={() => setSelectedDetailedEmp(null)} style={{
                padding: '0.6rem 1.5rem', borderRadius: '10px',
                background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Backup & Reset ── */}
      {activeTab === 'backup' && (
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Danger zone card */}
          <div className="card" style={{
            gridColumn: '1 / -1',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            background: 'rgba(239, 68, 68, 0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ maxWidth: '650px' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0' }}>
                ⚠️ Danger Zone
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                Clears all custom invoices, journals, stock adjustments, register changes, settings, and audits. The platform database will reset back to default demo database states. This cannot be undone.
              </p>
            </div>
            <button className="btn btn-danger" disabled={!isWriteAdmin} onClick={handleResetSystem}>
              🚨 Factory System Reset
            </button>
          </div>

          {/* Export card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📥</div>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: '0.5rem' }}>Export System Backup</h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Download a full backup file of the system database. This contains all inventory products, customers, suppliers, settings, journal entries, vouchers, and audit logs.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleExportBackup} style={{ marginTop: '1.5rem', alignSelf: 'flex-start' }}>
              📥 Download Backup (.json)
            </button>
          </div>

          {/* Import card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📤</div>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: '0.5rem' }}>Import System Backup</h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Upload an existing ACCOUNTICA backup JSON file. This will fully replace the current local storage data.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <input
                type="file"
                accept=".json"
                id="backup-upload-input"
                style={{ display: 'none' }}
                onChange={handleImportBackup}
              />
              <button
                className="btn btn-secondary"
                disabled={!isWriteAdmin}
                onClick={() => document.getElementById('backup-upload-input').click()}
              >
                📤 Choose File & Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'migration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              🔄 Bulk Data Migration
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: '0 0 2rem 0', lineHeight: '1.5' }}>
              Easily migrate your existing business records from spreadsheets or legacy software. Upload A CSV or Excel file containing your products catalog, customer registry, or supplier directories.
            </p>

            {/* Step 1: Select Migration Type */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Select Directory Type to Import
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div
                  onClick={() => { setMigrationType('products'); setValidatedData([]); setImportStatus(null); }}
                  style={{
                    padding: '1.25rem', borderRadius: '16px', background: migrationType === 'products' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                    border: migrationType === 'products' ? '2px solid #6366f1' : '1.5px solid var(--border-color)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: migrationType === 'products' ? '#818cf8' : 'var(--text-primary)' }}>Products Catalog</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>SKU, Name, Price, Stock</div>
                </div>

                <div
                  onClick={() => { setMigrationType('customers'); setValidatedData([]); setImportStatus(null); }}
                  style={{
                    padding: '1.25rem', borderRadius: '16px', background: migrationType === 'customers' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                    border: migrationType === 'customers' ? '2px solid #6366f1' : '1.5px solid var(--border-color)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: migrationType === 'customers' ? '#818cf8' : 'var(--text-primary)' }}>Customer Registry</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Clients, Contact Person, Phone</div>
                </div>

                <div
                  onClick={() => { setMigrationType('suppliers'); setValidatedData([]); setImportStatus(null); }}
                  style={{
                    padding: '1.25rem', borderRadius: '16px', background: migrationType === 'suppliers' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                    border: migrationType === 'suppliers' ? '2px solid #6366f1' : '1.5px solid var(--border-color)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: migrationType === 'suppliers' ? '#818cf8' : 'var(--text-primary)' }}>Supplier Registry</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Vendors, Payables, Terms</div>
                </div>
              </div>
            </div>

            {/* Step 2: Download Template & Set Conflict Resolution */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderRadius: '14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Sample File Template</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Download the sample template file to structure your spreadsheet headers correctly before uploading.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDownloadTemplate(migrationType)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                📥 Download Template (.csv)
              </button>
            </div>

            {/* Step 3: Conflict Options (Products only) */}
            {migrationType === 'products' && (
              <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1px dashed rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>SKU Conflict Strategy</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Define what happens when an uploaded product matches a SKU already present in the system database.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setProductOverwriteConflict(false)}
                    style={{
                      padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer',
                      background: !productOverwriteConflict ? '#6366f1' : 'transparent',
                      color: !productOverwriteConflict ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >Skip duplicates</button>
                  <button
                    type="button"
                    onClick={() => setProductOverwriteConflict(true)}
                    style={{
                      padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer',
                      background: productOverwriteConflict ? '#6366f1' : 'transparent',
                      color: productOverwriteConflict ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >Overwrite details</button>
                </div>
              </div>
            )}

            {/* Step 4: Dropzone Upload Area */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. Select Spreadsheet File
              </label>
              <div
                onClick={() => document.getElementById('migration-file-input').click()}
                style={{
                  border: '2px dashed var(--border-color)', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer',
                  background: 'var(--bg-secondary)', transition: 'all 0.2s', position: 'relative'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
              >
                <input
                  type="file"
                  id="migration-file-input"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                {isProcessingFile ? (
                  <div>
                    <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem', marginBottom: '1rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Parsing file content...</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Checking structure and validating rows...</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Upload your CSV or Excel file</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Drag & drop file here, or click to choose from local files (Supports .xlsx, .xls, .csv)</div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 5: Parser/Validation results */}
            {validatedData.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Validation Report</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Below is the parsed results and verification report. Items with warnings or errors are highlighted.
                    </p>
                  </div>
                  
                  {/* Status Pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', padding: '0.3rem 0.65rem', borderRadius: '6px', fontWeight: 700, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.15)' }}>
                      Valid: {validatedData.filter(r => r.status.valid).length} rows
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '0.3rem 0.65rem', borderRadius: '6px', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                      Invalid: {validatedData.filter(r => !r.status.valid).length} rows
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '0.3rem 0.65rem', borderRadius: '6px', fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}>
                      Conflicts: {validatedData.filter(r => r.status.isDuplicate).length} rows
                    </span>
                  </div>
                </div>

                {/* Validation Preview Table */}
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80, textAlign: 'center' }}>Row</th>
                        <th style={{ width: 120 }}>Status</th>
                        {migrationType === 'products' ? (
                          <>
                            <th style={{ width: 120 }}>SKU Code</th>
                            <th>Product Name</th>
                            <th style={{ width: 100 }}>Price</th>
                            <th style={{ width: 80 }}>Qty</th>
                          </>
                        ) : (
                          <>
                            <th style={{ width: 150 }}>Contact Name</th>
                            <th style={{ width: 150 }}>Mobile Number</th>
                            <th>Email Address</th>
                          </>
                        )}
                        <th>Details / Error message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validatedData.map((row, index) => {
                        const isRowValid = row.status.valid;
                        const isDup = row.status.isDuplicate;
                        const errorMsg = row.status.error;
                        const warnMsg = row.status.warning;

                        let statusBadge = (
                          <span style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-block' }}>
                            ✓ Valid
                          </span>
                        );
                        if (!isRowValid) {
                          statusBadge = (
                            <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-block' }}>
                              ✗ Blocked
                            </span>
                          );
                        } else if (isDup) {
                          statusBadge = (
                            <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-block' }}>
                              ⚠ Overwrite
                            </span>
                          );
                        }

                        return (
                          <tr key={index} style={{ background: !isRowValid ? 'rgba(239,68,68,0.02)' : 'transparent' }}>
                            <td style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {index + 1}
                            </td>
                            <td>{statusBadge}</td>
                            {migrationType === 'products' ? (
                              <>
                                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: !isRowValid && errorMsg.includes('SKU') ? '#ef4444' : 'var(--text-primary)' }}>
                                  {row.data.sku || '—'}
                                </td>
                                <td style={{ fontWeight: 600 }}>{row.data.name || '—'}</td>
                                <td style={{ fontFamily: 'monospace', textAlign: 'right' }}>{row.data.price || '0.00'}</td>
                                <td style={{ fontFamily: 'monospace', textAlign: 'center' }}>{row.data.qty || '0'}</td>
                              </>
                            ) : (
                              <>
                                <td style={{ fontWeight: 600 }}>{row.data.name || '—'}</td>
                                <td style={{ fontFamily: 'monospace' }}>{row.data.phone || '—'}</td>
                                <td>{row.data.email || '—'}</td>
                              </>
                            )}
                            <td style={{ fontSize: '0.75rem', color: errorMsg ? '#ef4444' : warnMsg ? '#f59e0b' : 'var(--text-muted)' }}>
                              {errorMsg ? `❌ ${errorMsg}` : warnMsg ? `⚠ ${warnMsg}` : 'Ready to import'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Import execution action bar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setValidatedData([]); setImportStatus(null); }}
                    disabled={isExecutingImport}
                  >
                    Clear Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleExecuteImport}
                    disabled={isExecutingImport || validatedData.filter(r => r.status.valid).length === 0}
                    style={{ minWidth: '180px', fontWeight: 700 }}
                  >
                    {isExecutingImport ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ marginRight: '0.5rem' }} />
                        Importing Records...
                      </>
                    ) : (
                      `🚀 Import ${validatedData.filter(r => r.status.valid).length} Records`
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Success Import stats notice */}
            {importStatus && (
              <div style={{ marginTop: '2rem', padding: '1.25rem', borderRadius: '12px', background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0', color: '#22c55e', fontSize: 'var(--font-size-base)', fontWeight: 800 }}>Migration Complete!</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    System successfully processed {importStatus.total} records. **Imported:** {importStatus.imported} rows. **Skipped/Duplicates:** {importStatus.skipped} rows.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Employee Detailed View Modal ── */}
      {selectedDetailedEmp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1050,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '680px', maxHeight: '90vh',
            background: 'var(--bg-secondary)', borderRadius: '20px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.4rem' }}>👨‍💼</div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>Employee Detailed Profile</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
                    Record reference: {selectedDetailedEmp.employeeCode}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDetailedEmp(null)} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Primary Employment info banner */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name (English)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{selectedDetailedEmp.fullNameEnglish}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: 1 }}>{selectedDetailedEmp.fullNameBangla}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Designation & Dept</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-color)', marginTop: 2 }}>{selectedDetailedEmp.designation}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', marginTop: 1 }}>{selectedDetailedEmp.department}</div>
                </div>
              </div>

              {/* Personal Details Section */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>👤 Personal Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                  {[
                    { label: 'Date of Birth', value: selectedDetailedEmp.dob },
                    { label: 'Gender', value: selectedDetailedEmp.gender },
                    { label: 'Blood Group', value: selectedDetailedEmp.bloodGroup },
                    { label: 'Marital Status', value: selectedDetailedEmp.maritalStatus },
                    { label: 'Nationality', value: selectedDetailedEmp.nationality },
                    { label: 'Personal Mobile', value: selectedDetailedEmp.personalMobileNumber || selectedDetailedEmp.mobileNumber },
                    { label: 'Personal Email', value: selectedDetailedEmp.personalEmailAddress || 'N/A' },
                    { label: 'Present Address', value: selectedDetailedEmp.presentAddress },
                    { label: 'Permanent Address', value: selectedDetailedEmp.permanentAddress },
                    { label: 'Father\'s Name', value: selectedDetailedEmp.fatherName },
                    { label: 'Mother\'s Name', value: selectedDetailedEmp.motherName },
                    { label: 'Nominee Reference', value: selectedDetailedEmp.nominee },
                  ].map((item, index) => (
                    <div key={index} style={{ gridColumn: (item.label.includes('Address') || item.label.includes('Name') || item.label.includes('Nominee')) ? '1 / -1' : 'auto' }}>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identification details Section */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>🪪 Identity & Compliance</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                  {[
                    { label: 'National ID (NID)', value: selectedDetailedEmp.nid },
                    { label: 'Passport No.', value: selectedDetailedEmp.passportNumber || 'N/A' },
                    { label: 'TIN / Taxpayer Identification', value: selectedDetailedEmp.tin },
                    { label: 'Tax Circle & Zone', value: `${selectedDetailedEmp.taxCircle || 'N/A'} · ${selectedDetailedEmp.taxZone || 'N/A'}` },
                  ].map((item, index) => (
                    <div key={index}>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Account Info */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>🏦 Salary Payment Account</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                  {[
                    { label: 'Bank Name', value: selectedDetailedEmp.bankName },
                    { label: 'Bank Account Number', value: selectedDetailedEmp.bankAccountNo },
                  ].map((item, index) => (
                    <div key={index}>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employment Record details */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>📅 Corporate Contract Parameters</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.25rem' }}>
                  {[
                    { label: 'Joining Date', value: selectedDetailedEmp.joiningDate },
                    { label: 'Gross Salary (Monthly)', value: `৳ ${selectedDetailedEmp.grossSalary ? Number(selectedDetailedEmp.grossSalary).toLocaleString('en-BD') : '0'}` },
                    { label: 'Office Intercom Ext.', value: selectedDetailedEmp.intercom || 'N/A' },
                    { label: 'Corporate Mobile', value: selectedDetailedEmp.mobileNumber },
                    { label: 'Corporate Email', value: selectedDetailedEmp.emailAddress },
                  ].map((item, index) => (
                    <div key={index}>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--bg-secondary)',
              display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
            }}>
              <button onClick={() => setSelectedDetailedEmp(null)} style={{
                padding: '0.6rem 1.5rem', borderRadius: '10px',
                background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Backup Dry-Run Validation Modal ── */}
      {backupModalOpen && backupSummary && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1050,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '520px', maxHeight: '90vh',
            background: 'var(--bg-secondary)', borderRadius: '20px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.4rem' }}>📤</div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>Validate & Dry-Run Backup</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>Review backup contents before restoring system data</p>
                </div>
              </div>
              <button onClick={() => { setBackupModalOpen(false); setBackupData(null); }} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* File details table */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden' }}>
                {[
                  { label: 'File Name', value: backupSummary.fileName },
                  { label: 'File Size', value: backupSummary.fileSize },
                  { label: 'Validation', value: backupSummary.isValid ? '✅ Valid Schema' : '❌ Invalid Schema', color: backupSummary.isValid ? '#34d399' : '#f87171' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: row.color || 'var(--text-primary)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {backupSummary.isValid ? (
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--accent-color)' }}>📊 Extracted Collections & Record Counts</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { label: 'Products / Inventory', count: backupSummary.productsCount },
                      { label: 'User Accounts', count: backupSummary.usersCount },
                      { label: 'Vouchers / Receipts', count: backupSummary.vouchersCount },
                      { label: 'Invoices (Sales + Purchases)', count: backupSummary.invoicesCount },
                      { label: 'Chart of Accounts (COA)', count: backupSummary.coaCount },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.count} records</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 'var(--font-size-xs)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                  ⚠️ <strong>Validation Error:</strong> {backupSummary.validationError}
                </div>
              )}

              {backupSummary.isValid && (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', padding: '0.9rem 1rem', borderRadius: '12px' }}>
                  <input
                    type="checkbox"
                    id="backup-overwrite-confirm"
                    checked={backupConfirmChecked}
                    onChange={(e) => setBackupConfirmChecked(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#f59e0b', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <label htmlFor="backup-overwrite-confirm" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)', cursor: 'pointer', lineHeight: '1.5' }}>
                    <strong style={{ color: '#fbbf24' }}>I understand:</strong> This will completely overwrite all current local transactions, system settings, inventory database, and user lists with the backup data. This action is irreversible.
                  </label>
                </div>
              )}
            </div>
            {/* Fixed Footer */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--bg-secondary)',
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0,
            }}>
              <button type="button" onClick={() => { setBackupModalOpen(false); setBackupData(null); }} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button
                type="button"
                disabled={!backupSummary.isValid || !backupConfirmChecked}
                onClick={() => {
                  try {
                    Object.keys(backupData).forEach(k => { localStorage.setItem(k, backupData[k]); });
                    alert('System data successfully restored! The page will now reload.');
                    window.location.reload();
                  } catch (err) {
                    alert('An error occurred while importing backup: ' + err.message);
                  }
                }}
                style={{
                  padding: '0.6rem 1.5rem', borderRadius: '10px',
                  background: (!backupSummary.isValid || !backupConfirmChecked) ? 'rgba(127,29,29,0.5)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  border: 'none', color: (!backupSummary.isValid || !backupConfirmChecked) ? 'rgba(255,255,255,0.3)' : '#fff',
                  fontWeight: 700, cursor: (!backupSummary.isValid || !backupConfirmChecked) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: (!backupSummary.isValid || !backupConfirmChecked) ? 'none' : '0 4px 15px rgba(220,38,38,0.4)',
                  transition: 'all 0.2s',
                }}
              >🚨 Restore Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
