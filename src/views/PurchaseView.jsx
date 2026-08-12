import { useState, useEffect, useMemo } from 'react';
import { purchaseService } from '../services/purchaseService';
import { vatService } from '../services/vatService';
import { defaultSuppliers } from '../database/seedData';
import { USER_SEEDS } from '../utils/userSeeds';

const fmt = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += parseInt(n[1]) !== 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += parseInt(n[2]) !== 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += parseInt(n[3]) !== 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += parseInt(n[4]) !== 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += parseInt(n[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Taka Only' : 'Taka Only';
  return str.trim();
}

const RETURN_REASONS = ['Damaged Goods', 'Wrong Item Delivered', 'Short Supply', 'Expired Product', 'Excess Quantity Received', 'Quality Issue / Defective', 'Invoice Correction / Billing Error', 'Other'];

const blankLine = (products) => ({
  productId: '',
  productName: '',
  qty: 1,
  unitPrice: '',
  vatRateId: 'vat-std',
  discount: 0,
});

const PAY_STATUS = {
  unpaid:  { bg: 'rgba(239,68,68,0.1)',    text: '#dc2626', label: 'Unpaid'  },
  partial: { bg: 'rgba(245,158,11,0.1)',   text: '#d97706', label: 'Partial' },
  paid:    { bg: 'rgba(34,197,94,0.1)',    text: '#16a34a', label: 'Paid'    },
};

const APR_STATUS = {
  auto_approved: { bg: 'rgba(34,197,94,0.08)', text: '#16a34a', label: 'Auto-Approved' },
  pending:       { bg: 'rgba(245,158,11,0.1)', text: '#d97706', label: 'Pending'       },
  approved:      { bg: 'rgba(37,99,235,0.1)',  text: '#2563eb', label: 'Approved'      },
  rejected:      { bg: 'rgba(239,68,68,0.1)',  text: '#dc2626', label: 'Rejected'      },
};

const StatusPill = ({ map, val }) => {
  const s = map[val] || map.auto_approved || { bg: 'rgba(100,100,100,0.1)', text: '#666', label: val || '—' };
  return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, background: s.bg, color: s.text }}>{s.label}</span>;
};

const getInitialFormState = (supplierId) => {
  const today = new Date();
  const dateStr = today.toISOString().substring(0, 10);
  const due = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDateStr = due.toISOString().substring(0, 10);
  return {
    supplierId: supplierId || '',
    date: dateStr,
    dueDate: dueDateStr,
    narration: '', poNumber: '', grnNumber: '', supplierInvoiceNo: '', attachmentName: '', branch: '',
  };
};

function getDaysOverdue(dueDate, invoiceDate, today) {
  const dDate = dueDate ? new Date(dueDate) : new Date(new Date(invoiceDate || today).setDate(new Date(invoiceDate || today).getDate() + 30));
  return Math.max(0, Math.floor((today - dDate) / 86400000));
}


/* ── SEARCHABLE COMBOBOX SELECTOR ── */
const SearchableSelect = ({ items, placeholder, value, onChange, onAddNew, labelKey = 'name', idKey = 'id' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const selectedItem = items.find(item => item[idKey] === value);
  const filtered = items.filter(item => 
    (item[labelKey] || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.phone || '').includes(search)
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.45rem 0.75rem',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          background: 'var(--bg-secondary)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          minHeight: '38px',
          color: selectedItem ? 'var(--text-primary)' : 'var(--text-muted)'
        }}
      >
        <span>
          {selectedItem ? selectedItem[labelKey] : placeholder}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 990 }}
          />
          <div 
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 995,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              marginTop: '4px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '260px'
            }}
          >
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.55rem' }}
              autoFocus
            />
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '160px' }}>
              {filtered.map(item => (
                <div 
                  key={item[idKey]}
                  onClick={() => {
                    onChange(item[idKey]);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  style={{
                    padding: '0.45rem 0.55rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    background: item[idKey] === value ? 'var(--accent-color)' : 'transparent',
                    color: item[idKey] === value ? '#fff' : 'var(--text-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (item[idKey] !== value) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={e => { if (item[idKey] !== value) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontWeight: 600 }}>{item[labelKey]}</span>
                  {item.phone && (
                    <span style={{ fontSize: '0.72rem', opacity: 0.7, marginLeft: '0.5rem', color: item[idKey] === value ? '#fff' : 'var(--text-muted)' }}>
                      📞 {item.phone}
                    </span>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                  No matches found.
                </div>
              )}
            </div>
            
            {onAddNew && (
              <div 
                onClick={() => {
                  onAddNew();
                  setIsOpen(false);
                }}
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.5rem',
                  marginTop: '0.2rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: 'var(--accent-color)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                ➕ Add New Profile
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default function PurchaseView({ products = [], suppliers: propSuppliers, onRefresh, currentUser, activeRouteHandler }) {
  const suppliers = propSuppliers?.length ? propSuppliers : (JSON.parse(localStorage.getItem('erp_suppliers') || 'null') || defaultSuppliers);
  const vatRates = vatService.getVatRates();

  /* ─────────── Data States ─────────── */
  const [invoices, setInvoices]         = useState([]);
  const [returnsList, setReturnsList]   = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [stats, setStats]               = useState({ totalInvoices: 0, totalPurchaseValue: 0, totalVAT: 0, outstandingAP: 0, paidCount: 0, pendingApprovalCount: 0, partialCount: 0, returnValue: 0, monthlySpend: [], topSuppliers: [] });
  const [tab, setTab]                   = useState('dashboard');
  const [loading, setLoading]           = useState(false);
  const [successMsg, setSuccessMsg]     = useState('');
  
  /* ─────────── Simulated Approval Role ─────────── */
  const [simulatedRole, setSimulatedRole] = useState(() => {
    const role = currentUser?.role?.toLowerCase();
    if (role === 'warehouse') return 'Receiver';
    if (role === 'accountant') return 'Accountant';
    if (role === 'admin' || role === 'superadmin') return 'CFO';
    if (role === 'employee') return 'Requester';
    return localStorage.getItem('erp_simulated_role') || 'Requester';
  });

  useEffect(() => {
    if (currentUser?.role) {
      const role = currentUser.role.toLowerCase();
      let defaultSimRole = 'Requester';
      if (role === 'warehouse') defaultSimRole = 'Receiver';
      else if (role === 'accountant') defaultSimRole = 'Accountant';
      else if (role === 'admin' || role === 'superadmin') defaultSimRole = 'CFO';
      else if (role === 'sales') defaultSimRole = 'Agent';
      setSimulatedRole(defaultSimRole);
      localStorage.setItem('erp_simulated_role', defaultSimRole);
    }
  }, [currentUser]);

  useEffect(() => {
    const targetTab = localStorage.getItem('purchase_active_tab');
    if (targetTab) {
      setTab(targetTab);
      localStorage.removeItem('purchase_active_tab');
    }
    const openInvoice = localStorage.getItem('purchase_open_new_invoice');
    if (openInvoice) {
      setShowForm(true);
      setTab('invoices');
      localStorage.removeItem('purchase_open_new_invoice');
    }
    const openPr = localStorage.getItem('purchase_open_pr_modal');
    if (openPr) {
      setIsPrModalOpen(true);
      setTab('requisitions');
      localStorage.removeItem('purchase_open_pr_modal');
    }
  }, [currentUser]);

  /* ─────────── PR, PO, GRN States ─────────── */
  const [requisitions, setRequisitions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);

  /* ─────────── Invoice Form ─────────── */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => getInitialFormState(''));
  const [items, setItems]               = useState([blankLine(products)]);
  const [landedCost, setLandedCost]     = useState({ freight: '', customs: '', insurance: '' });
  const [allocationMethod, setAllocationMethod] = useState('value');

  /* ─────────── Detail Drawer ─────────── */
  const [detailInv, setDetailInv] = useState(null);
  const [detailPr, setDetailPr] = useState(null);
  const [detailPo, setDetailPo] = useState(null);
  const [detailGrn, setDetailGrn] = useState(null);

  /* ─────────── Employees list ─────────── */
  const [employees] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_employees_v8');
      if (saved) return JSON.parse(saved);
      return [];
    } catch (e) {
      return [];
    }
  });

  /* ─────────── Expanded GRN for 3-Way Match ─────────── */
  const [expandedGrn, setExpandedGrn] = useState(null);

  /* ─────────── Filters ─────────── */
  const [filters, setFilters] = useState({ search: '', supplier: 'all', status: 'all', approvalStatus: 'all', fromDate: '', toDate: '', aging: 'all' });
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  /* ─────────── Payment Form ─────────── */
  const [payForm, setPayForm] = useState({ supplierId: suppliers[0]?.id || '', amount: '', method: 'bank', accountId: 'acc-1020', narration: '', chequeNo: '', invoiceNo: '' });

  /* ─────────── Returns ─────────── */
  const [returnInv, setReturnInv]         = useState(null);
  const [returnItems, setReturnItems]     = useState([]);
  const [returnReason, setReturnReason]   = useState('');
  const [returnNarration, setReturnNarration] = useState('');

  /* ─────────── PR, PO, GRN Modal & Form States ─────────── */
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [prForm, setPrForm] = useState({ department: 'Engineering', requestedBy: '', productId: '', qty: 1, estimatedCost: '', justification: '' });

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedPrForPo, setSelectedPrForPo] = useState(null);
  const [poForm, setPoForm] = useState({ supplierId: '', unitPrice: '', paymentTerms: 'Net 30' });

  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedPoForGrn, setSelectedPoForGrn] = useState(null);
  const [grnForm, setGrnForm] = useState({ receivedBy: 'Warehouse Team', qtyReceived: '', qtyRejected: 0 });

  /* ─────────── Supplier Ledger ─────────── */
  const [ledgerSup, setLedgerSup] = useState('');
  const [ledgerFrom, setLedgerFrom] = useState('');
  const [ledgerTo, setLedgerTo] = useState('');

  /* ─────────── Load Data ─────────── */
  const loadData = async () => {
    const [invs, rets] = await Promise.all([purchaseService.getPurchaseInvoices(), purchaseService.getPurchaseReturns()]);
    setInvoices(invs);
    setReturnsList(rets);
    const pmts = purchaseService.getPaymentHistory();
    setPaymentsList(pmts);
    setStats(purchaseService.getDashboardStats(invs, rets, pmts));
    setRequisitions(purchaseService.getRequisitions());
    setPurchaseOrders(purchaseService.getPurchaseOrders());
    setGoodsReceipts(purchaseService.getGoodsReceivedNotes());
  };

  useEffect(() => { 
    const t = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const reload = async () => { await loadData(); onRefresh?.(); };

  /* ─────────── Computed ─────────── */
  const agingReport = useMemo(() => purchaseService.getAPAgingReport(invoices), [invoices]);

  const filteredInvoices = useMemo(() => {
    const today = new Date();
    return invoices.filter(inv => {
      if (filters.supplier !== 'all' && inv.supplierId !== filters.supplier) return false;
      if (filters.status !== 'all' && inv.paymentStatus !== filters.status) return false;
      if (filters.approvalStatus !== 'all' && (inv.approvalStatus || 'auto_approved') !== filters.approvalStatus) return false;
      if (filters.fromDate && inv.date < filters.fromDate) return false;
      if (filters.toDate && inv.date > filters.toDate) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const sup = suppliers.find(s => s.id === inv.supplierId);
        if (!inv.invoiceNo.toLowerCase().includes(q) && !(sup?.name || '').toLowerCase().includes(q) && !(inv.poNumber || '').toLowerCase().includes(q) && !(inv.grnNumber || '').toLowerCase().includes(q)) return false;
      }
      if (filters.aging !== 'all') {
        const days = getDaysOverdue(inv.dueDate, inv.date, today);
        const bucket = agingReport.find(b => days >= b.min && days <= b.max);
        if (!bucket || bucket.key !== filters.aging) return false;
      }
      return true;
    });
  }, [invoices, filters, suppliers, agingReport]);

  /* ─────────── Line Calculations ─────────── */
  const calcLine = (item) => vatService.calculateLine(item.unitPrice, item.qty, item.vatRateId, item.discount || 0);
  const totals = useMemo(() => items.reduce((acc, item) => { const c = calcLine(item); return { subtotal: acc.subtotal + c.taxableAmt, vat: acc.vat + c.vatAmount, grand: acc.grand + c.lineTotal }; }, { subtotal: 0, vat: 0, grand: 0 }), [items]);


  const setItem = (i, key, val) => setItems(ls => ls.map((l, j) => {
    if (j !== i) return l;
    const u = { ...l, [key]: val };
    if (key === 'productId') {
      const p = products.find(x => x.id === val);
      if (p) {
        u.productName = p.name;
        u.unitPrice = p.purchasePrice || p.price || 0;
      } else {
        u.productName = '';
        u.unitPrice = '';
      }
    }
    return u;
  }));
  const addLine    = () => setItems(ls => [...ls, blankLine(products)]);
  const removeLine = (i) => setItems(ls => ls.filter((_, j) => j !== i));

  /* ─────────── Submit Invoice ─────────── */
  const handleSubmit = async () => {
    if (!form.supplierId) return alert('Select a supplier.');
    if (items.some(l => !l.productId || l.qty <= 0 || l.unitPrice <= 0)) return alert('Fill all item lines correctly.');
    setLoading(true);
    try {
      const refNo = await purchaseService.postPurchaseInvoice({ ...form, items: items.map(l => ({ ...l, qty: Number(l.qty), unitPrice: Number(l.unitPrice) })), landedCost: { freight: Number(landedCost.freight || 0), customs: Number(landedCost.customs || 0), insurance: Number(landedCost.insurance || 0) }, allocationMethod }, currentUser);
      setSuccessMsg(`✅ Invoice ${refNo} posted! Inventory updated, journal entry posted.`);
      setShowForm(false);
      setItems([blankLine(products)]);
      setForm(getInitialFormState(suppliers[0]?.id));
      setLandedCost({ freight: '', customs: '', insurance: '' });
      await reload();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) { alert('Error: ' + err.message); } finally { setLoading(false); }
  };

  /* ─────────── Return Workflow ─────────── */
  const initiateReturn = (inv) => { setReturnInv(inv); setReturnReason(''); setReturnNarration(''); setReturnItems(inv.items.map(it => ({ ...it, originalQty: it.qty, returnQty: 0, vatRateId: it.vatRateId || 'vat-std' }))); };

  const handlePostReturn = async () => {
    const toReturn = returnItems.filter(it => Number(it.returnQty) > 0);
    if (toReturn.length === 0) return alert('Select at least one item with a return quantity.');
    for (const it of toReturn) { if (Number(it.returnQty) > it.originalQty) return alert(`Return qty for "${it.productName}" exceeds original (${it.originalQty}).`); }
    if (!returnReason) return alert('Please select a return reason.');
    setLoading(true);
    try {
      const formatted = toReturn.map(it => ({ productId: it.productId, qty: Number(it.returnQty), unitPrice: Number(it.unitPrice), vatRateId: it.vatRateId || 'vat-std', discount: Number(it.discount || 0) }));
      const returnNo = await purchaseService.postPurchaseReturn(returnInv.invoiceNo, formatted, `[${returnReason}] ${returnNarration || `Return against ${returnInv.invoiceNo}`}`, currentUser);
      const vatCalc = vatService.calculateInvoiceVAT(formatted);
      const localSups = JSON.parse(localStorage.getItem('erp_suppliers') || '[]');
      localStorage.setItem('erp_suppliers', JSON.stringify(localSups.map(s => s.id === returnInv.supplierId ? { ...s, currentBalance: Math.max(0, (s.currentBalance || 0) - vatCalc.grandTotal) } : s)));
      setSuccessMsg(`✅ Return ${returnNo} posted! Inventory reversed, AP credit note issued.`);
      setReturnInv(null);
      await reload();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) { alert('Error posting return: ' + err.message); } finally { setLoading(false); }
  };

  /* ─────────── Supplier Payment ─────────── */
  const outstandingBills = useMemo(() => invoices.filter(i => i.supplierId === payForm.supplierId && i.paymentStatus !== 'paid'), [invoices, payForm.supplierId]);
  const supplierPayHistory = useMemo(() => paymentsList.filter(p => p.supplierId === payForm.supplierId), [paymentsList, payForm.supplierId]);

  const handlePayment = async () => {
    if (!payForm.supplierId || !payForm.amount) return alert('Fill all payment fields.');
    const amt = Number(payForm.amount);
    if (amt <= 0) return alert('Payment amount must be greater than zero.');
    if (payForm.invoiceNo) {
      const targetInv = invoices.find(i => i.invoiceNo === payForm.invoiceNo);
      if (targetInv) {
        const remaining = (targetInv.grandTotal + (targetInv.landedCost?.total || 0)) - (targetInv.paidAmount || 0);
        if (amt > remaining + 0.01) return alert(`⚠️ Overpayment! Remaining balance for ${payForm.invoiceNo} is ${fmt(remaining)}. Cannot pay more than outstanding amount.`);
      }
    }
    setLoading(true);
    try {
      const refNo = await purchaseService.paySupplier({ supplierId: payForm.supplierId, amount: amt, method: payForm.method, accountId: payForm.accountId, chequeNo: payForm.chequeNo, invoiceNo: payForm.invoiceNo || undefined, narration: payForm.narration || `Supplier payment` }, currentUser);
      setSuccessMsg(`✅ Payment ${refNo} posted successfully.`);
      setPayForm(f => ({ ...f, amount: '', narration: '', chequeNo: '', invoiceNo: '' }));
      await reload();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) { alert('Error: ' + err.message); } finally { setLoading(false); }
  };

  /* ── Requisitions (PR) Handlers ── */
  const handleCreatePR = (e) => {
    e.preventDefault();
    if (!prForm.productId || !prForm.qty || !prForm.estimatedCost) {
      alert('Please fill all required fields.');
      return;
    }
    const selectedProd = products.find(p => p.id === prForm.productId);
    const newPR = {
      id: `PR-2026-${String(requisitions.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString().substring(0, 10),
      department: prForm.department,
      requestedBy: prForm.requestedBy || currentUser?.displayName || 'Dept Head',
      justification: prForm.justification || '',
      items: [{
        productId: prForm.productId,
        productName: selectedProd?.name || 'Unknown Item',
        qty: Number(prForm.qty),
        estimatedCost: Number(prForm.estimatedCost)
      }],
      status: 'pending_approval'
    };
    purchaseService.saveRequisition(newPR, currentUser);
    setRequisitions(purchaseService.getRequisitions());
    setIsPrModalOpen(false);
    setPrForm({ department: 'Engineering', requestedBy: '', productId: products[0]?.id || '', qty: 1, estimatedCost: '', justification: '' });
    setSuccessMsg(`✅ Requisition ${newPR.id} submitted for approval.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleApprovePR = (prId) => {
    const approverName = simulatedRole === 'CFO' ? 'CFO (Executive)' : (currentUser?.displayName || 'Finance Manager');
    purchaseService.approveRequisition(prId, approverName);
    setRequisitions(purchaseService.getRequisitions());
    setSuccessMsg(`✅ Requisition ${prId} approved.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRejectPR = (prId) => {
    purchaseService.rejectRequisition(prId);
    setRequisitions(purchaseService.getRequisitions());
    setSuccessMsg(`❌ Requisition ${prId} rejected.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  /* ── Purchase Orders (PO) Handlers ── */
  const handleCreatePO = (e) => {
    e.preventDefault();
    if (!poForm.supplierId || !poForm.unitPrice || !selectedPrForPo) {
      alert('Please fill all required fields.');
      return;
    }
    const prItem = selectedPrForPo.items[0];
    const newPO = {
      id: `PO-2026-${String(purchaseOrders.length + 1).padStart(4, '0')}`,
      prId: selectedPrForPo.id,
      supplierId: poForm.supplierId,
      date: new Date().toISOString().substring(0, 10),
      items: [{
        productId: prItem.productId,
        productName: prItem.productName,
        qty: prItem.qty,
        unitPrice: Number(poForm.unitPrice)
      }],
      status: 'draft',
      paymentTerms: poForm.paymentTerms
    };
    purchaseService.savePurchaseOrder(newPO, currentUser);
    setPurchaseOrders(purchaseService.getPurchaseOrders());
    setRequisitions(purchaseService.getRequisitions());
    setIsPoModalOpen(false);
    setSelectedPrForPo(null);
    setPoForm({ supplierId: suppliers[0]?.id || '', unitPrice: '', paymentTerms: 'Net 30' });
    setSuccessMsg(`✅ Purchase Order ${newPO.id} created successfully.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  /* ── Goods Received Notes (GRN) Handlers ── */
  const handleCreateGRN = async (e) => {
    e.preventDefault();
    if (!selectedPoForGrn || grnForm.qtyReceived === '') {
      alert('Please enter quantity received.');
      return;
    }
    const poItem = selectedPoForGrn.items[0];
    if (Number(grnForm.qtyReceived) > poItem.qty) {
      alert(`Received quantity cannot exceed ordered quantity (${poItem.qty}).`);
      return;
    }
    const newGRN = {
      id: `GRN-2026-${String(goodsReceipts.length + 1).padStart(4, '0')}`,
      poId: selectedPoForGrn.id,
      date: new Date().toISOString().substring(0, 10),
      receivedBy: grnForm.receivedBy,
      items: [{
        productId: poItem.productId,
        productName: poItem.productName,
        qtyReceived: Number(grnForm.qtyReceived),
        qtyRejected: Number(grnForm.qtyRejected),
        unitPrice: poItem.unitPrice
      }],
      status: 'completed'
    };
    await purchaseService.saveGoodsReceivedNote(newGRN, currentUser);
    setGoodsReceipts(purchaseService.getGoodsReceivedNotes());
    setPurchaseOrders(purchaseService.getPurchaseOrders());
    setIsGrnModalOpen(false);
    setSelectedPoForGrn(null);
    setGrnForm({ receivedBy: 'Warehouse Team', qtyReceived: '', qtyRejected: 0 });
    await reload();
    setSuccessMsg(`✅ Goods Received Note ${newGRN.id} posted. Inventory updated.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  /* ─────────── Approval ─────────── */
  const handleApproveInvoice = (invoiceNo) => {
    const approverName = simulatedRole === 'CFO' ? 'CFO (Executive)' : (currentUser?.displayName || 'Finance Manager');
    purchaseService.approveInvoice(invoiceNo, approverName);
    setSuccessMsg(`✅ Invoice ${invoiceNo} approved by ${approverName}.`);
    reload();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  /* ─────────── Supplier Ledger ─────────── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ledgerStatement = useMemo(() => { if (!ledgerSup) return []; return purchaseService.getSupplierStatement(ledgerSup, ledgerFrom, ledgerTo); }, [ledgerSup, ledgerFrom, ledgerTo, invoices, paymentsList, returnsList]);

  /* ─────────── jsPDF Supplier Statement Downloader ─────────── */
  const downloadSupplierLedgerPDF = (supId) => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF is not loaded.');
    const sup = suppliers.find(s => s.id === supId);
    const stmt = ledgerStatement;
    if (!sup || stmt.length === 0) return alert('No statement data to export.');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.rect(5, 5, 200, 287);
    
    // Header
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text('ACCOUNTICA', 105, 18, { align: 'center' });
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text('House 42, Road 11, Banani, Dhaka, Bangladesh', 105, 23, { align: 'center' });
    doc.text('BIN: 001234567-0101 | info@erpforu.com', 105, 27, { align: 'center' });
    doc.setLineWidth(0.5); doc.setDrawColor(99, 102, 241); doc.line(10, 31, 200, 31);
    
    // Title
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(99, 102, 241);
    doc.text('SUPPLIER ACCOUNT STATEMENT', 105, 41, { align: 'center' });
    
    // Info Block
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(10, 47, 190, 28, 'FD');
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold'); doc.text('Supplier Details:', 12, 53); doc.setFont('Helvetica', 'normal');
    doc.text(sup.name || supId, 45, 53);
    doc.text(`Address: ${sup.address || 'N/A'}`, 12, 59);
    doc.text(`Phone: ${sup.phone || 'N/A'}`, 12, 65);
    doc.text(`Email: ${sup.email || 'N/A'}`, 12, 71);
    
    doc.setFont('Helvetica', 'bold'); doc.text('Statement Summary:', 110, 53); doc.setFont('Helvetica', 'normal');
    doc.text(`Period: ${ledgerFrom || 'All Time'} to ${ledgerTo || 'Present'}`, 110, 59);
    const balance = sup.currentBalance || 0;
    doc.text(`Total Transactions: ${stmt.length}`, 110, 65);
    doc.text(`Outstanding Balance: BDT ${balance.toLocaleString()}`, 110, 71);
    
    // Table Header
    let tableY = 80;
    doc.setFillColor(241, 245, 249); doc.rect(10, tableY, 190, 8, 'F'); doc.rect(10, tableY, 190, 8);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('Date', 12, tableY + 5.5);
    doc.text('Ref No', 30, tableY + 5.5);
    doc.text('Type', 60, tableY + 5.5);
    doc.text('Debit (Out)', 90, tableY + 5.5, { align: 'right' });
    doc.text('Credit (In)', 125, tableY + 5.5, { align: 'right' });
    doc.text('Balance BDT', 180, tableY + 5.5, { align: 'right' });
    
    doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59);
    let y = tableY + 8;
    
    stmt.forEach((t) => {
      if (y > 260) {
        doc.addPage();
        doc.rect(5, 5, 200, 287);
        doc.setFont('Helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
        tableY = 15;
        doc.setFillColor(241, 245, 249); doc.rect(10, tableY, 190, 8, 'F'); doc.rect(10, tableY, 190, 8);
        doc.text('Date', 12, tableY + 5.5);
        doc.text('Ref No', 30, tableY + 5.5);
        doc.text('Type', 60, tableY + 5.5);
        doc.text('Debit (Out)', 90, tableY + 5.5, { align: 'right' });
        doc.text('Credit (In)', 125, tableY + 5.5, { align: 'right' });
        doc.text('Balance BDT', 180, tableY + 5.5, { align: 'right' });
        doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59);
        y = tableY + 8;
      }
      doc.rect(10, y, 190, 8);
      doc.text(t.date, 12, y + 5.5);
      doc.text(t.refNo, 30, y + 5.5);
      doc.text(t.type, 60, y + 5.5);
      doc.text(t.debit > 0 ? Number(t.debit).toLocaleString() : '—', 90, y + 5.5, { align: 'right' });
      doc.text(t.credit > 0 ? Number(t.credit).toLocaleString() : '—', 125, y + 5.5, { align: 'right' });
      doc.text(`${Number(Math.abs(t.balance)).toLocaleString()} ${t.balance > 0 ? 'Cr' : 'Dr'}`, 180, y + 5.5, { align: 'right' });
      y += 8;
    });
    
    y += 20;
    if (y > 270) {
      doc.addPage();
      doc.rect(5, 5, 200, 287);
      y = 40;
    }
    doc.setLineWidth(0.3); doc.setDrawColor(148, 163, 184);
    doc.line(15, y, 65, y); doc.line(135, y, 185, y);
    doc.setFontSize(8); doc.setFont('Helvetica', 'bold');
    doc.text('Prepared By', 40, y + 4, { align: 'center' });
    doc.text('Supplier Signature', 160, y + 4, { align: 'center' });
    
    doc.save(`Ledger_Statement_${sup.name.replace(/\s+/g, '_')}.pdf`);
  };

  /* ─────────── PDF Purchase Invoice Download ─────────── */
  const downloadPurchasePDF = (inv) => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF is not loaded.');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.rect(5, 5, 200, 287);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text('ACCOUNTICA', 105, 18, { align: 'center' });
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text('House 42, Road 11, Banani, Dhaka, Bangladesh', 105, 23, { align: 'center' });
    doc.text('BIN: 001234567-0101 | TIN: 9876543210 | info@erpforu.com', 105, 27, { align: 'center' });
    doc.setLineWidth(0.5); doc.setDrawColor(37, 99, 235); doc.line(10, 31, 200, 31);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(37, 99, 235);
    doc.text('PURCHASE TAX BILL', 105, 41, { align: 'center' });
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(10, 47, 190, 28, 'FD');
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    const sup = suppliers.find(s => s.id === inv.supplierId);
    doc.setFont('Helvetica', 'bold'); doc.text('Billed From (Supplier):', 12, 53); doc.setFont('Helvetica', 'normal');
    doc.text(sup?.name || inv.supplierId, 50, 53); doc.text(`Address: ${sup?.address || 'N/A'}`, 12, 59);
    doc.text(`Phone: ${sup?.phone || 'N/A'}`, 12, 65); doc.text(`BIN/TIN: ${sup?.binNo || 'N/A'}`, 12, 71);
    doc.setFont('Helvetica', 'bold'); doc.text('Bill Details:', 110, 53); doc.setFont('Helvetica', 'normal');
    doc.text(`Bill Ref: ${inv.invoiceNo}`, 110, 59); doc.text(`Bill Date: ${inv.date}`, 110, 65);
    doc.text(`Due Date: ${inv.dueDate || '—'}`, 110, 68);
    doc.text(`Payment Status: ${(inv.paymentStatus || 'unpaid').toUpperCase()}`, 110, 71);
    let tableY = 80;
    doc.setFillColor(241, 245, 249); doc.rect(10, tableY, 190, 8, 'F'); doc.rect(10, tableY, 190, 8);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('SL', 12, tableY + 5.5); doc.text('Product / Item Description', 20, tableY + 5.5);
    doc.text('Qty', 85, tableY + 5.5, { align: 'right' }); doc.text('Unit Cost', 110, tableY + 5.5, { align: 'right' });
    doc.text('VAT Rate', 140, tableY + 5.5, { align: 'right' }); doc.text('Total BDT', 180, tableY + 5.5, { align: 'right' });
    doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59); let y = tableY + 8;
    inv.items?.forEach((item, idx) => {
      doc.rect(10, y, 190, 8);
      let prodName = item.productName || products.find(p => p.id === item.productId)?.name || item.productId;
      if (prodName.length > 32) prodName = prodName.substring(0, 30) + '...';
      doc.text(String(idx + 1), 12, y + 5.5); doc.text(prodName, 20, y + 5.5);
      doc.text(String(item.qty), 85, y + 5.5, { align: 'right' });
      doc.text(Number(item.unitPrice).toLocaleString(), 110, y + 5.5, { align: 'right' });
      doc.text(`${item.vatRate || 0}%`, 140, y + 5.5, { align: 'right' });
      doc.text(Number(item.lineTotal || (item.qty * item.unitPrice)).toLocaleString(), 180, y + 5.5, { align: 'right' }); y += 8;
    });
    doc.setFillColor(248, 250, 252); doc.rect(10, y, 190, 16, 'F'); doc.rect(10, y, 190, 16);
    doc.setFont('Helvetica', 'bold'); doc.text('Subtotal:', 120, y + 5.5); doc.text(Number(inv.subtotal).toLocaleString(), 180, y + 5.5, { align: 'right' });
    doc.text('VAT Amount:', 120, y + 11.5); doc.text(Number(inv.vatAmount).toLocaleString(), 180, y + 11.5, { align: 'right' });
    y += 16;
    doc.setFillColor(241, 245, 249); doc.rect(10, y, 190, 8, 'F'); doc.rect(10, y, 190, 8); doc.setFont('Helvetica', 'bold');
    doc.text('Grand Total (BDT):', 120, y + 5.5); doc.text(Number(inv.grandTotal + (inv.landedCost?.total || 0)).toLocaleString(), 180, y + 5.5, { align: 'right' });
    y += 14; doc.text('Amount in Words:', 10, y); doc.setFont('Helvetica', 'normal');
    doc.text(numberToWords(Math.round(inv.grandTotal + (inv.landedCost?.total || 0))), 50, y);
    y += 35; doc.setLineWidth(0.3); doc.setDrawColor(148, 163, 184);
    doc.line(15, y, 55, y); doc.line(80, y, 120, y); doc.line(145, y, 185, y);
    doc.setFontSize(8); doc.setFont('Helvetica', 'bold');
    doc.text('Warehouse Receiver', 35, y + 4, { align: 'center' }); doc.text('Prepared By', 100, y + 4, { align: 'center' }); doc.text('Authorized Finance Sign', 165, y + 4, { align: 'center' });
    doc.save(`Purchase_Invoice_${inv.invoiceNo}.pdf`);
  };

  return (
    <div>
      {/* Custom Styles */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .slide-over {
          animation: slideInRight 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .backdrop-overlay {
          animation: fadeInOverlay 0.25s ease-out forwards;
        }
        .data-table tbody tr {
          transition: background 0.15s;
        }
        .data-table tbody tr:hover {
          background: var(--bg-tertiary) !important;
        }
      `}</style>

      {/* ── Premium Identity Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #0f172a 100%)',
        padding: '1.75rem 2rem',
        borderRadius: 20,
        color: '#fff',
        marginBottom: '1.5rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Decorative background glow blobs */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
              <span style={{ fontSize: '1.75rem' }}>🛒</span>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                Purchases Cockpit
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              Procurement-to-Payment Lifecycle, AP Aging Oversight & Supplier Ledger Audits
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Simulated Role Selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.07)',
              padding: '6px 12px',
              borderRadius: 30,
              border: '1px solid rgba(255,255,255,0.12)'
            }}>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role:</span>
              <select 
                value={simulatedRole} 
                onChange={e => {
                  const val = e.target.value;
                  setSimulatedRole(val);
                  localStorage.setItem('erp_simulated_role', val);
                }} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: '0.78rem', 
                  cursor: 'pointer',
                  outline: 'none',
                  paddingRight: 4
                }}>
                <option value="Requester" style={{ color: '#0f172a' }}>Requester (Dept Head)</option>
                <option value="Agent" style={{ color: '#0f172a' }}>Purchasing Agent</option>
                <option value="Receiver" style={{ color: '#0f172a' }}>Warehouse Receiver</option>
                <option value="Accountant" style={{ color: '#0f172a' }}>Finance Accountant</option>
                <option value="CFO" style={{ color: '#0f172a' }}>CFO (Executive)</option>
              </select>
            </div>

            {stats.pendingApprovalCount > 0 && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                background: 'rgba(245,158,11,0.2)',
                border: '1px solid rgba(245,158,11,0.4)',
                color: '#fbbf24',
                padding: '6px 14px',
                borderRadius: 30,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                ⏳ {stats.pendingApprovalCount} Review Required
              </span>
            )}
            
            <button 
              onClick={() => { setShowForm(true); setTab('invoices'); }} 
              style={{
                background: 'linear-gradient(135deg, var(--accent-color) 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 30,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <span>+ New Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Success Banner ── */}
      {successMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.9rem 1.25rem', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontWeight: 600, color: '#15803d', animation: 'fadeInOverlay 0.3s' }}>{successMsg}</div>
      )}

      {/* ── 8 KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Invoices',      value: stats.totalInvoices,                    icon: '🧾', color: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
          { label: 'Purchase Value',       value: fmt(stats.totalPurchaseValue),          icon: '💰', color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
          { label: 'VAT / Tax Paid',       value: fmt(stats.totalVAT),                   icon: '📋', color: '#06b6d4', glow: 'rgba(6,182,212,0.15)' },
          { label: 'Outstanding AP',       value: fmt(stats.outstandingAP),              icon: '⚠️', color: '#ef4444', glow: 'rgba(239,68,68,0.15)' },
          { label: 'Paid Invoices',        value: stats.paidCount,                        icon: '✅', color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
          { label: 'Pending Approval',     value: stats.pendingApprovalCount,            icon: '⏳', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
          { label: 'Partial Payments',     value: stats.partialCount,                    icon: '⚡', color: '#d946ef', glow: 'rgba(217,70,239,0.15)' },
          { label: 'Return Value',         value: fmt(stats.returnValue),                icon: '↩', color: '#f43f5e', glow: 'rgba(244,63,94,0.15)' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
            padding: '1.1rem 1rem',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.25s ease'
          }}
            onMouseEnter={e => { 
              e.currentTarget.style.transform = 'translateY(-4px)'; 
              e.currentTarget.style.boxShadow = `0 12px 24px ${k.glow}`;
              e.currentTarget.style.borderColor = k.color;
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.transform = 'none'; 
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: k.color }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {k.label}
              </span>
              <span style={{ fontSize: '1.1rem', background: `${k.color}15`, color: k.color, borderRadius: 8, padding: '4px 6px', lineHeight: 1 }}>
                {k.icon}
              </span>
            </div>
            
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '-0.02em', wordBreak: 'break-all' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="scrollable-tab-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 10, width: 'fit-content' }}>
  {(() => {
            const pendingPRs   = requisitions.filter(r => r.status === 'pending_approval').length;
            const approvedPRs  = requisitions.filter(r => r.status === 'approved').length;
            const pendingGRNs  = purchaseOrders.filter(p => p.status === 'sent' || p.status === 'partially_received').length;
            const tabs = [
              { id: 'dashboard',    label: '📊 Dashboard' },
              { id: 'requisitions', label: '📝 Requisitions (PR)', badge: pendingPRs },
              { id: 'pos',          label: '🛒 Purchase Orders',   badge: approvedPRs },
              { id: 'grns',         label: '📦 Goods Receipts',    badge: pendingGRNs },
              { id: 'invoices',     label: '🧾 Invoices' },
              { id: 'payments',     label: '💸 Payments' },
              { id: 'returns',      label: '↩ Returns & Credits' },
              { id: 'aging',        label: '📅 AP Aging' },
              { id: 'ledger',       label: '🏢 Supplier Ledger' },
            ];
            return tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '0.42rem 0.85rem', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, background: tab === t.id ? 'var(--bg-secondary)' : 'transparent', color: tab === t.id ? 'var(--accent-color)' : 'var(--text-muted)', boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                {t.label}
                {t.badge > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.62rem', fontWeight: 900, padding: '0px 5px', lineHeight: '16px', minWidth: 16, textAlign: 'center' }}>{t.badge}</span>
                )}
              </button>
            ));
          })()}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         TAB: DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── Procurement Pipeline Status Strip ── */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            {[
              {
                label: 'Open Requisitions',
                value: requisitions.filter(r => r.status === 'pending_approval').length,
                sub: `${requisitions.filter(r => r.status === 'approved').length} approved`,
                icon: '📝', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
                onClick: () => setTab('requisitions')
              },
              {
                label: 'Active POs',
                value: purchaseOrders.filter(p => p.status === 'sent' || p.status === 'draft').length,
                sub: `${purchaseOrders.filter(p => p.status === 'received').length} fully received`,
                icon: '🛒', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)',
                onClick: () => setTab('pos')
              },
              {
                label: 'GRNs This Month',
                value: goodsReceipts.length,
                sub: `${goodsReceipts.reduce((s,g) => s + g.items.reduce((si,i) => si + (i.qtyReceived||0), 0), 0)} units received`,
                icon: '📦', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',
                onClick: () => setTab('grns')
              },
              {
                label: 'Unpaid Invoices',
                value: invoices.filter(i => i.paymentStatus !== 'paid').length,
                sub: fmt(invoices.filter(i => i.paymentStatus !== 'paid').reduce((s,i) => s + Math.max(0,(i.grandTotal||0)-(i.paidAmount||0)),0)),
                icon: '🧾', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)',
                onClick: () => setTab('invoices')
              },
              {
                label: 'Pending Approvals',
                value: requisitions.filter(r => r.status === 'pending_approval').length + invoices.filter(i => i.approvalStatus === 'pending').length,
                sub: 'PRs & invoices combined',
                icon: '⏳', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)',
                onClick: () => setTab('requisitions')
              },
            ].map(card => (
              <div
                key={card.label}
                onClick={card.onClick}
                style={{
                  background: card.bg,
                  border: `1px solid ${card.border}`,
                  borderRadius: 14,
                  padding: '1rem 1.1rem',
                  cursor: 'pointer',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  display: 'flex', flexDirection: 'column', gap: 6
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${card.border}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: card.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                  <span style={{ fontSize: '1rem' }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: card.color, lineHeight: 1, fontFamily: 'monospace' }}>{card.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Procurement Flow Progress Tracker ── */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>🔗 Procurement Lifecycle — Active Flow</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
              {[
                { label: 'Requisition', count: requisitions.length, pending: requisitions.filter(r=>r.status==='pending_approval').length, color: '#9333ea', icon: '📝' },
                { label: 'Purchase Order', count: purchaseOrders.length, pending: purchaseOrders.filter(p=>p.status==='draft'||p.status==='sent').length, color: '#2563eb', icon: '🛒' },
                { label: 'Goods Receipt', count: goodsReceipts.length, pending: purchaseOrders.filter(p=>p.status==='sent').length, color: '#0891b2', icon: '📦' },
                { label: 'Invoice', count: invoices.length, pending: invoices.filter(i=>i.approvalStatus==='pending').length, color: '#7c3aed', icon: '🧾' },
                { label: 'Payment', count: invoices.filter(i=>i.paymentStatus==='paid').length, pending: invoices.filter(i=>i.paymentStatus!=='paid').length, color: '#16a34a', icon: '💸' },
              ].map((step, idx, arr) => (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{step.icon}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: step.color, fontFamily: 'monospace', lineHeight: 1 }}>{step.count}</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>{step.label}</div>
                    {step.pending > 0 && (
                      <div style={{ fontSize: '0.58rem', color: '#f59e0b', fontWeight: 700, marginTop: 3, background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 99, display: 'inline-block' }}>
                        {step.pending} pending
                      </div>
                    )}
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem', flexShrink: 0, opacity: 0.5 }}>›</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2">

            {/* Monthly Spend Chart */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>📈 Monthly Purchase Spend</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: 700 }}>Last 6 Months</span>
              </div>
              
              <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: 10 }}>
                {/* Horizontal Grid lines */}
                <div style={{ position: 'absolute', inset: '10px 0 30px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                  {[1, 2, 3].map(line => (
                    <div key={line} style={{ width: '100%', borderBottom: '1px dashed var(--border-color)', opacity: 0.5 }} />
                  ))}
                </div>

                {(() => {
                  const maxVal = Math.max(...stats.monthlySpend.map(m => m.value), 1);
                  return (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: 140, position: 'relative', zIndex: 2 }}>
                      {stats.monthlySpend.map((m, i) => {
                        const pct = (m.value / maxVal) * 100;
                        const isCurrent = i === stats.monthlySpend.length - 1;
                        return (
                          <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{ 
                              fontSize: '0.62rem', 
                              color: isCurrent ? 'var(--accent-color)' : 'var(--text-secondary)', 
                              fontWeight: 800, 
                              fontFamily: 'monospace',
                              background: isCurrent ? 'rgba(99,102,241,0.1)' : 'var(--bg-tertiary)',
                              padding: '2px 6px',
                              borderRadius: 6
                            }}>
                              {m.value > 0 ? `${(m.value / 1000).toFixed(1)}k` : '৳0'}
                            </div>
                            <div 
                              style={{ 
                                width: '100%', 
                                height: `${Math.max(pct, 4)}%`, 
                                background: isCurrent 
                                  ? 'linear-gradient(180deg, var(--accent-color) 0%, #4f46e5 100%)' 
                                  : 'linear-gradient(180deg, rgba(99,102,241,0.5) 0%, rgba(79,70,229,0.3) 100%)', 
                                borderRadius: '6px 6px 0 0', 
                                minHeight: 4, 
                                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                                boxShadow: isCurrent ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.filter = 'brightness(1.15)';
                                e.currentTarget.style.transform = 'scaleY(1.02)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.filter = 'none';
                                e.currentTarget.style.transform = 'none';
                              }}
                              title={`Total Purchase Spend: ${fmt(m.value)}`}
                            />
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', marginTop: 2 }}>{m.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* AP Aging Overview */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, minHeight: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>📅 AP Aging Overview</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Click bar to filter</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {agingReport.map(bucket => {
                  const pct = stats.outstandingAP > 0 ? (bucket.total / stats.outstandingAP) * 100 : 0;
                  return (
                    <div 
                      key={bucket.key} 
                      onClick={() => { setFilter('aging', bucket.key === filters.aging ? 'all' : bucket.key); setTab('invoices'); }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 8,
                        transition: 'background 0.2s',
                        background: filters.aging === bucket.key ? `${bucket.color}10` : 'transparent'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.background = filters.aging === bucket.key ? `${bucket.color}10` : 'transparent'}
                    >
                      <div style={{ width: 80, fontSize: '0.7rem', fontWeight: 800, color: bucket.color }}>{bucket.label}</div>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: bucket.color, borderRadius: 6, transition: 'width 0.5s ease-out' }} />
                      </div>
                      <div style={{ width: 90, textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{fmt(bucket.total)}</div>
                      <div style={{ width: 45, textAlign: 'right', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{bucket.invoices.length} inv</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Suppliers + Attention Required */}
          <div className="grid-2">
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>🏆 Top Suppliers by Purchase Value</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {stats.topSuppliers.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem' }}>No purchase data yet.</div>
                ) : stats.topSuppliers.map((ts, idx) => {
                  const sup = suppliers.find(s => s.id === ts.id);
                  const maxVal = stats.topSuppliers[0]?.value || 1;
                  const pctOfMax = (ts.value / maxVal) * 100;
                  const totalSpend = stats.totalPurchaseValue || 1;
                  const pctOfTotal = ((ts.value / totalSpend) * 100).toFixed(1);
                  
                  const colors = ['#f59e0b', '#cbd5e1', '#b45309', 'var(--text-muted)', 'var(--text-muted)'];
                  return (
                    <div key={ts.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
                      <div style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        background: idx < 3 ? colors[idx] : 'var(--bg-tertiary)', 
                        color: idx < 3 ? '#fff' : 'var(--text-muted)', 
                        fontSize: '0.7rem', 
                        fontWeight: 900, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: idx < 3 ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                      }}>
                        {idx + 1}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sup?.name || ts.id}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-color)', background: 'rgba(99,102,241,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                            {pctOfTotal}% share
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pctOfMax}%`, background: 'linear-gradient(90deg, var(--accent-color), #4f46e5)', borderRadius: 3 }} />
                        </div>
                      </div>
                      
                      <div style={{ width: 90, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {fmt(ts.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>🚨 Attention Required</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.pendingApprovalCount > 0 && (
                  <div 
                    onClick={() => { setFilter('approvalStatus', 'pending'); setTab('invoices'); }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.75rem 1rem', 
                      background: 'rgba(245,158,11,0.06)', 
                      border: '1px solid rgba(245,158,11,0.2)', 
                      borderRadius: 12, 
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>⏳</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>Approval Worklist</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(180,83,9,0.8)', marginTop: 2 }}>
                        {stats.pendingApprovalCount} purchase invoice(s) awaiting review
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309' }}>Review ➔</span>
                  </div>
                )}
                
                {agingReport[4]?.invoices.length > 0 && (
                  <div 
                    onClick={() => { setFilter('aging', 'over90'); setTab('invoices'); }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.75rem 1rem', 
                      background: 'rgba(239,68,68,0.05)', 
                      border: '1px solid rgba(239,68,68,0.2)', 
                      borderRadius: 12, 
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>🛑</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>Critical AP Aging</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(220,38,38,0.8)', marginTop: 2 }}>
                        {agingReport[4].invoices.length} invoices are 90+ days overdue ({fmt(agingReport[4].total)})
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626' }}>Resolve ➔</span>
                  </div>
                )}

                {agingReport[3]?.invoices.length > 0 && (
                  <div 
                    onClick={() => { setFilter('aging', 'b90'); setTab('invoices'); }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.75rem 1rem', 
                      background: 'rgba(249,115,22,0.05)', 
                      border: '1px solid rgba(249,115,22,0.18)', 
                      borderRadius: 12, 
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>Delayed Payables</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(234,88,12,0.8)', marginTop: 2 }}>
                        {agingReport[3].invoices.length} invoices are 61-90 days overdue ({fmt(agingReport[3].total)})
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea580c' }}>View ➔</span>
                  </div>
                )}

                {stats.partialCount > 0 && (
                  <div 
                    onClick={() => { setFilter('status', 'partial'); setTab('invoices'); }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.75rem 1rem', 
                      background: 'rgba(139,92,246,0.05)', 
                      border: '1px solid rgba(139,92,246,0.18)', 
                      borderRadius: 12, 
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    <div style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚡</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-color)' }}>Partially Paid Bills</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {stats.partialCount} invoices with active outstanding payment balances
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-color)' }}>Check ➔</span>
                  </div>
                )}

                {stats.pendingApprovalCount === 0 && agingReport[4]?.invoices.length === 0 && agingReport[3]?.invoices.length === 0 && stats.partialCount === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '2.5rem 1.5rem', 
                    color: 'var(--text-muted)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 12,
                    border: '1px dashed var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>🎉</span>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>No actions required</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>All purchase invoice flows are operating normally.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: INVOICES
      ══════════════════════════════════════════════════════════ */}
      {tab === 'invoices' && (
        <div>
          {/* Advanced Filter Bar */}
          <div className="card" style={{ padding: '0.9rem 1.25rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 14 }}>
            <input type="text" className="form-control" style={{ flex: '1 1 200px' }} placeholder="🔍 Search invoice no, supplier, PO or GRN..." value={filters.search} onChange={e => setFilter('search', e.target.value)} />
            <select className="form-control" style={{ width: '160px' }} value={filters.supplier} onChange={e => setFilter('supplier', e.target.value)}>
              <option value="all">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="form-control" style={{ width: '130px' }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
            <select className="form-control" style={{ width: '150px' }} value={filters.approvalStatus} onChange={e => setFilter('approvalStatus', e.target.value)}>
              <option value="all">All Approvals</option>
              <option value="auto_approved">Auto-Approved</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
            <input type="date" className="form-control" style={{ width: '130px' }} value={filters.fromDate} onChange={e => setFilter('fromDate', e.target.value)} title="From date" />
            <input type="date" className="form-control" style={{ width: '130px' }} value={filters.toDate} onChange={e => setFilter('toDate', e.target.value)} title="To date" />
            <select className="form-control" style={{ width: '130px' }} value={filters.aging} onChange={e => setFilter('aging', e.target.value)}>
              <option value="all">All Aging</option>
              <option value="current">0–15 Days</option>
              <option value="b30">16–30 Days</option>
              <option value="b60">31–60 Days</option>
              <option value="b90">61–90 Days</option>
              <option value="over90">90+ Days</option>
            </select>
            {(filters.search || filters.supplier !== 'all' || filters.status !== 'all' || filters.approvalStatus !== 'all' || filters.fromDate || filters.toDate || filters.aging !== 'all') && (
              <button onClick={() => setFilters({ search: '', supplier: 'all', status: 'all', approvalStatus: 'all', fromDate: '', toDate: '', aging: 'all' })} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✕ Clear</button>
            )}
          </div>

          <div className="table-container">
            {filteredInvoices.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div><div>No matching purchase invoices found.</div></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th><th>PO No</th><th>GRN No</th><th>Supplier</th>
                    <th>Invoice Date</th><th>Due Date</th>
                    <th style={{ textAlign: 'right' }}>Grand Total</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Balance Due</th>
                    <th>Payment</th><th>Approval</th><th className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, i) => {
                    const sup = suppliers.find(s => s.id === inv.supplierId);
                    const total = (inv.grandTotal || 0) + (inv.landedCost?.total || 0);
                    const paid = inv.paidAmount || 0;
                    const balance = Math.max(0, total - paid);
                    const today = new Date();
                    const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(new Date(inv.date || new Date()).setDate(new Date(inv.date || new Date()).getDate() + 30));
                    const overdue = inv.paymentStatus !== 'paid' && dueDate < today;
                    return (
                      <tr key={i} onClick={() => setDetailInv(inv)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontWeight: 700 }}>{inv.invoiceNo}</td>
                        <td style={{ fontSize: '0.78rem', color: inv.poNumber ? 'var(--text-primary)' : 'var(--text-muted)' }}>{inv.poNumber || '—'}</td>
                        <td style={{ fontSize: '0.78rem', color: inv.grnNumber ? 'var(--text-primary)' : 'var(--text-muted)' }}>{inv.grnNumber || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{sup?.name || inv.supplierId}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{window.formatDate(inv.date)}</td>
                        <td style={{ fontSize: '0.8rem', color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: overdue ? 700 : 400 }}>{window.formatDate(inv.dueDate)}{overdue && ' ⚠️'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(total)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{paid > 0 ? fmt(paid) : '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: balance > 0 ? 'var(--danger)' : '#16a34a' }}>{balance > 0 ? fmt(balance) : '—'}</td>
                        <td><StatusPill map={PAY_STATUS} val={inv.paymentStatus || 'unpaid'} /></td>
                        <td><StatusPill map={APR_STATUS} val={inv.approvalStatus || 'auto_approved'} /></td>
                        <td onClick={e => e.stopPropagation()} className="no-print">
                          <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                            {inv.approvalStatus === 'pending' && (
                              <button 
                                className="btn btn-sm btn-primary" 
                                style={{ 
                                  padding: '0.22rem 0.5rem', 
                                  fontSize: '0.68rem', 
                                  background: (simulatedRole === 'Agent') ? 'var(--border-color)' : '#d97706',
                                  color: (simulatedRole === 'Agent') ? 'var(--text-muted)' : '#fff',
                                  border: 'none',
                                  cursor: (simulatedRole === 'Agent') ? 'not-allowed' : 'pointer'
                                }} 
                                disabled={simulatedRole === 'Agent'}
                                onClick={() => handleApproveInvoice(inv.invoiceNo)}
                              >
                                ✓ Approve
                              </button>
                            )}
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem' }} onClick={() => downloadPurchasePDF(inv)}>🖨️</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', color: 'var(--danger)' }} onClick={() => initiateReturn(inv)}>↩</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                    <td colSpan={6} style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Totals ({filteredInvoices.length} invoices)</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--accent-color)' }}>{fmt(filteredInvoices.reduce((s, i) => s + (i.grandTotal || 0) + (i.landedCost?.total || 0), 0))}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#16a34a' }}>{fmt(filteredInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0))}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--danger)' }}>{fmt(filteredInvoices.reduce((s, i) => s + Math.max(0, (i.grandTotal || 0) + (i.landedCost?.total || 0) - (i.paidAmount || 0)), 0))}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════
         TAB: REQUISITIONS (PR)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'requisitions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>📝 Purchase Requisitions</h3>
            {simulatedRole === 'Requester' && (
              <button onClick={() => {
                setPrForm({ department: 'Engineering', requestedBy: currentUser?.displayName || '', productId: products[0]?.id || '', qty: 1, estimatedCost: '' });
                setIsPrModalOpen(true);
              }} className="btn btn-primary">
                ➕ New Requisition
              </button>
            )}
          </div>

          <div className="table-container">
            {requisitions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <div>No requisitions found. Click "New Requisition" to create one.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PR Number</th>
                    <th>Date</th>
                    <th>Requested By</th>
                    <th>Department</th>
                    <th>Item Requested</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Est. Cost</th>
                    <th>Status</th>
                    <th>Approved By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.map(pr => {
                    const statusColors = {
                      pending_approval: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: 'Pending Approval' },
                      approved: { color: '#2563eb', bg: 'rgba(37,99,235,0.1)', text: 'Approved' },
                      rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', text: 'Rejected' },
                      ordered: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', text: 'PO Created' }
                    };
                    const s = statusColors[pr.status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', text: pr.status };
                    return (
                      <tr key={pr.id} onClick={() => setDetailPr(pr)} style={{ cursor: 'pointer', background: detailPr?.id === pr.id ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-color)' }}>{pr.id}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pr.date}</td>
                        <td>{pr.requestedBy}</td>
                        <td><strong>{pr.department}</strong></td>
                        <td>{pr.items[0]?.productName || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{pr.items[0]?.qty}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(pr.items[0]?.estimatedCost)}</td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, color: s.color, background: s.bg }}>
                            {s.text}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: pr.approvedBy ? '#16a34a' : 'var(--text-muted)', fontWeight: pr.approvedBy ? 700 : 400 }}>
                          {pr.approvedBy || (pr.status === 'rejected' ? '✗ Rejected' : '—')}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {pr.status === 'pending_approval' && (simulatedRole === 'CFO' || simulatedRole === 'Accountant') && (
                              <>
                                <button onClick={() => handleApprovePR(pr.id)} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem' }}>✓ Approve</button>
                                <button onClick={() => handleRejectPR(pr.id)} className="btn btn-sm btn-danger" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}>✗ Reject</button>
                              </>
                            )}
                            {pr.status === 'approved' && simulatedRole === 'Agent' && (
                              <button onClick={() => {
                                setSelectedPrForPo(pr);
                                setPoForm({ supplierId: suppliers[0]?.id || '', unitPrice: String(Math.round(pr.items[0].estimatedCost / pr.items[0].qty)), paymentTerms: 'Net 30' });
                                setIsPoModalOpen(true);
                              }} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#7c3aed', borderColor: '#7c3aed' }}>
                                🛒 Convert to PO
                              </button>
                            )}
                            {pr.status === 'pending_approval' && simulatedRole === 'Requester' && (
                              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>⏳ Awaiting Approval</span>
                            )}
                            {pr.status === 'ordered' && (
                              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>✅ Ordered</span>
                            )}
                            {pr.status === 'rejected' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>🚫 Closed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'pos' && (
        <div className="table-container">
          {purchaseOrders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
              <div>No Purchase Orders found. Approved Requisitions can be converted by the Purchasing Agent.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>PO Date</th>
                  <th>Linked PR</th>
                  <th>Item Details</th>
                  <th style={{ textAlign: 'right' }}>Total Cost</th>
                  <th>Terms</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => {
                  const sup = suppliers.find(s => s.id === po.supplierId);
                  const item = po.items[0];
                  const poTotal = (item?.qty || 0) * (item?.unitPrice || 0);
                  const statusColors = {
                    draft: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', text: 'Draft' },
                    sent: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', text: 'Sent' },
                    partially_received: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: 'Partially Received' },
                    received: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', text: 'Received' }
                  };
                  const s = statusColors[po.status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', text: po.status };
                  return (
                    <tr key={po.id} onClick={() => setDetailPo(po)} style={{ cursor: 'pointer', background: detailPo?.id === po.id ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-color)' }}>{po.id}</td>
                      <td style={{ fontWeight: 600 }}>{sup?.name || po.supplierId}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{po.date}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{po.prId || '—'}</td>
                      <td>{item ? `${item.productName} (${item.qty} pcs)` : '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(poTotal)}</td>
                      <td>{po.paymentTerms}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, color: s.color, background: s.bg }}>
                          {s.text}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {po.status === 'draft' && simulatedRole === 'Agent' && (
                            <button onClick={() => {
                              purchaseService.updatePurchaseOrderStatus(po.id, 'sent');
                              setPurchaseOrders(purchaseService.getPurchaseOrders());
                              setSuccessMsg(`✅ PO ${po.id} status updated to Sent to Supplier.`);
                              setTimeout(() => setSuccessMsg(''), 4000);
                            }} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#3b82f6', borderColor: '#3b82f6' }}>
                              Mark Sent
                            </button>
                          )}
                          {po.status === 'sent' && simulatedRole === 'Receiver' && (
                            <button onClick={() => {
                              setSelectedPoForGrn(po);
                              setGrnForm({ receivedBy: 'Warehouse Team', qtyReceived: String(po.items[0].qty), qtyRejected: 0 });
                              setIsGrnModalOpen(true);
                            }} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#10b981', borderColor: '#10b981' }}>
                              Receive Goods
                            </button>
                          )}
                          {po.status === 'received' && (
                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Stocked In</span>
                          )}
                          {po.status === 'partially_received' && simulatedRole === 'Receiver' && (
                            <button onClick={() => {
                              setSelectedPoForGrn(po);
                              const grnItemsList = goodsReceipts.filter(g => g.poId === po.id);
                              const alreadyReceived = grnItemsList.reduce((sum, g) => sum + g.items.reduce((s, item) => s + item.qtyReceived, 0), 0);
                              const remaining = Math.max(0, po.items[0].qty - alreadyReceived);
                              setGrnForm({ receivedBy: 'Warehouse Team', qtyReceived: String(remaining), qtyRejected: 0 });
                              setIsGrnModalOpen(true);
                            }} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#10b981', borderColor: '#10b981' }}>
                              Receive Balance
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: GOODS RECEIPTS (GRN)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'grns' && (
        <div className="table-container">
          {goodsReceipts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
              <div>No Goods Receipts found. Warehouse Receivers can post GRNs against sent POs.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>GRN Number</th>
                  <th>PO Reference</th>
                  <th>Date Received</th>
                  <th>Receiver</th>
                  <th>Item Details</th>
                  <th style={{ textAlign: 'right' }}>Qty Received</th>
                  <th style={{ textAlign: 'right' }}>Qty Rejected</th>
                  <th style={{ textAlign: 'right' }}>Value (৳)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {goodsReceipts.map(grn => {
                  const po = purchaseOrders.find(p => p.id === grn.poId);
                  const sup = po ? suppliers.find(s => s.id === po.supplierId) : null;
                  const item = grn.items[0];
                  return (
                    <tr key={grn.id} onClick={() => setDetailGrn(grn)} style={{ cursor: 'pointer', background: detailGrn?.id === grn.id ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{grn.id}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{grn.poId} {sup ? `(${sup.name})` : ''}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{grn.date}</td>
                      <td>{grn.receivedBy}</td>
                      <td>{item?.productName || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{item?.qtyReceived} pcs</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: item?.qtyRejected > 0 ? '#ef4444' : 'var(--text-muted)' }}>{item?.qtyRejected} pcs</td>
                       <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt((item?.qtyReceived || 0) * (item?.unitPrice || 0))}</td>
                       <td>
                         <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
                           ✓ Completed
                         </span>
                       </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: SUPPLIER PAYMENTS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'payments' && (
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          {/* Payment Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '1.25rem' }}>💸 Supplier Payment</h3>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select className="form-control" value={payForm.supplierId} onChange={e => setPayForm(f => ({ ...f, supplierId: e.target.value, invoiceNo: '', amount: '' }))}>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {payForm.supplierId && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600, marginTop: 4 }}>Balance: {fmt(suppliers.find(s => s.id === payForm.supplierId)?.currentBalance || 0)}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Allocate to Invoice (Optional)</label>
                <select className="form-control" value={payForm.invoiceNo} onChange={e => { const inv = outstandingBills.find(i => i.invoiceNo === e.target.value); setPayForm(f => ({ ...f, invoiceNo: e.target.value, amount: inv ? String((inv.grandTotal + (inv.landedCost?.total || 0) - (inv.paidAmount || 0)).toFixed(2)) : f.amount })); }}>
                  <option value="">— Unallocated payment —</option>
                  {outstandingBills.map(b => <option key={b.invoiceNo} value={b.invoiceNo}>{b.invoiceNo} — Due: {fmt((b.grandTotal + (b.landedCost?.total || 0)) - (b.paidAmount || 0))}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Amount (৳)</label>
                <input type="number" className="form-control" placeholder="0.00" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
                {payForm.invoiceNo && payForm.amount && (() => {
                  const inv = invoices.find(i => i.invoiceNo === payForm.invoiceNo);
                  if (!inv) return null;
                  const remaining = (inv.grandTotal + (inv.landedCost?.total || 0)) - (inv.paidAmount || 0);
                  const amt = Number(payForm.amount);
                  if (amt > remaining + 0.01) return <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 700, marginTop: 3 }}>⚠️ Overpayment! Max allowed: {fmt(remaining)}</div>;
                  if (amt < remaining) return <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700, marginTop: 3 }}>⚡ Partial payment — balance {fmt(remaining - amt)} will remain</div>;
                  return <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginTop: 3 }}>✓ Full payment</div>;
                })()}
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  <option value="bank">🏦 Bank Transfer</option>
                  <option value="cash">💵 Cash</option>
                  <option value="cheque">📄 Cheque</option>
                  <option value="bkash">📱 bKash</option>
                  <option value="nagad">📱 Nagad</option>
                  <option value="neft">🔄 NEFT/RTGS</option>
                </select>
              </div>
              {payForm.method === 'cheque' && (
                <div className="form-group">
                  <label className="form-label">Cheque Number</label>
                  <input className="form-control" placeholder="CHQ-..." value={payForm.chequeNo} onChange={e => setPayForm(f => ({ ...f, chequeNo: e.target.value }))} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Bank/Cash Account</label>
                <select className="form-control" value={payForm.accountId} onChange={e => setPayForm(f => ({ ...f, accountId: e.target.value }))}>
                  <option value="acc-1020">Current Account (BKB)</option>
                  <option value="acc-1021">Savings Account (Dhaka Bank)</option>
                  <option value="acc-1030">Petty Cash</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Narration</label>
                <input className="form-control" placeholder="Payment reference…" value={payForm.narration} onChange={e => setPayForm(f => ({ ...f, narration: e.target.value }))} />
              </div>
              <div style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-color)', marginBottom: 3 }}>📒 Journal Preview</div>
                <div><span style={{ color: '#2563eb' }}>DR</span> Accounts Payable (2010): <strong>{fmt(payForm.amount)}</strong></div>
                <div><span style={{ color: '#7c3aed' }}>CR</span> Bank/Cash ({payForm.accountId}): <strong>{fmt(payForm.amount)}</strong></div>
              </div>
              <button onClick={handlePayment} disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {loading ? 'Posting…' : '💸 Post Supplier Payment'}
              </button>
            </div>
          </div>

          {/* Outstanding Invoices + Payment History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Outstanding Bills */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.75rem' }}>📋 Outstanding Invoices for Selected Supplier</h3>
              {outstandingBills.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>🎉 No outstanding invoices for this supplier.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Invoice No</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem' }}>Total</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem' }}>Paid</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem' }}>Balance</th>
                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>Settle</th>
                  </tr></thead>
                  <tbody>
                    {outstandingBills.map((bill, idx) => {
                      const total = (bill.grandTotal + (bill.landedCost?.total || 0));
                      const balance = total - (bill.paidAmount || 0);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: payForm.invoiceNo === bill.invoiceNo ? 'rgba(37,99,235,0.06)' : 'transparent' }}>
                          <td style={{ padding: '0.45rem 0.4rem', fontFamily: 'monospace', fontWeight: 700 }}>{bill.invoiceNo}</td>
                          <td style={{ padding: '0.45rem 0.4rem', color: 'var(--text-muted)' }}>{bill.date}</td>
                          <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(total)}</td>
                          <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{bill.paidAmount > 0 ? fmt(bill.paidAmount) : '—'}</td>
                          <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--danger)' }}>{fmt(balance)}</td>
                          <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center' }}>
                            <button onClick={() => setPayForm(f => ({ ...f, invoiceNo: bill.invoiceNo, amount: String(balance.toFixed(2)), narration: `Full settlement for invoice ${bill.invoiceNo}` }))} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem' }}>Settle</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payment History */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.75rem' }}>🕒 Payment History</h3>
              {supplierPayHistory.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No payment records found for this supplier.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Payment No</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Method</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Invoice</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem' }}>Amount</th>
                  </tr></thead>
                  <tbody>
                    {supplierPayHistory.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.45rem 0.4rem', fontFamily: 'monospace', color: '#16a34a', fontWeight: 700 }}>{p.paymentNo}</td>
                        <td style={{ padding: '0.45rem 0.4rem', color: 'var(--text-muted)' }}>{p.date}</td>
                        <td style={{ padding: '0.45rem 0.4rem', textTransform: 'capitalize' }}>{p.method}</td>
                        <td style={{ padding: '0.45rem 0.4rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.invoiceNo || '—'}</td>
                        <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>{fmt(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: RETURNS & CREDITS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'returns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Total Returns', value: returnsList.length, color: '#dc2626', icon: '↩' },
              { label: 'Return Value', value: fmt(stats.returnValue), color: '#ef4444', icon: '💸' },
              { label: 'Avg Return Size', value: returnsList.length > 0 ? fmt(stats.returnValue / returnsList.length) : '৳0', color: '#7c3aed', icon: '📊' },
            ].map(k => (
              <div key={k.label} style={{ background: `${k.color}10`, border: `1px solid ${k.color}25`, borderRadius: 12, padding: '1rem' }}>
                <div style={{ fontSize: '1.2rem' }}>{k.icon}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: k.color, margin: '4px 0' }}>{k.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div className="table-container">
            {returnsList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>↩</div>
                <div>No purchase returns recorded. Click \"↩\" on any invoice to initiate a return.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Return No</th><th>Date</th><th>Orig. Invoice</th><th>Reason</th><th>Items</th><th style={{ textAlign: 'right' }}>Subtotal</th><th style={{ textAlign: 'right' }}>VAT Reversed</th><th style={{ textAlign: 'right' }}>Total Reversed</th></tr>
                </thead>
                <tbody>
                  {returnsList.map((ret, i) => {
                    const reasonText = ret.narration?.startsWith('[') ? ret.narration.substring(1, ret.narration.indexOf(']')) : ret.narration;
                    return (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--danger)', fontWeight: 700 }}>{ret.returnNo}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ret.date}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ret.originalInvoiceNo}</td>
                        <td><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>{reasonText || 'General Return'}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{ret.items?.length || 0} lines</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.82rem' }}>{fmt(ret.subtotal)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.82rem', color: '#0891b2' }}>{fmt(ret.vatAmount)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--danger)' }}>{fmt(ret.grandTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                    <td colSpan={5} style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Totals ({returnsList.length} returns)</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{fmt(returnsList.reduce((s, r) => s + (r.subtotal || 0), 0))}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#0891b2' }}>{fmt(returnsList.reduce((s, r) => s + (r.vatAmount || 0), 0))}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--danger)' }}>{fmt(returnsList.reduce((s, r) => s + (r.grandTotal || 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: AP AGING
      ══════════════════════════════════════════════════════════ */}
      {tab === 'aging' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Bucket Summary Cards */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {agingReport.map(bucket => (
              <div key={bucket.key} style={{ background: bucket.bg, border: `1px solid ${bucket.color}30`, borderRadius: 14, padding: '1.1rem 1.25rem', cursor: 'pointer' }}
                onClick={() => { setFilter('aging', bucket.key === filters.aging ? 'all' : bucket.key); setTab('invoices'); }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: bucket.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{bucket.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: bucket.color, fontFamily: 'monospace' }}>{fmt(bucket.total)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{bucket.invoices.length} invoice(s)</div>
              </div>
            ))}
          </div>

          {/* Supplier-wise Aging Table */}
          <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>📋 Supplier-wise Aging Breakdown</h3>
            {(() => {
              const supplierAging = {};
              agingReport.forEach(bucket => {
                bucket.invoices.forEach(inv => {
                  if (!supplierAging[inv.supplierId]) supplierAging[inv.supplierId] = { current: 0, b30: 0, b60: 0, b90: 0, over90: 0, total: 0 };
                  supplierAging[inv.supplierId][bucket.key] = (supplierAging[inv.supplierId][bucket.key] || 0) + inv.remaining;
                  supplierAging[inv.supplierId].total += inv.remaining;
                });
              });
              const rows = Object.entries(supplierAging);
              if (rows.length === 0) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>🎉 No outstanding payables found.</div>;
              return (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th style={{ textAlign: 'right', color: '#10b981' }}>0–15 Days</th>
                        <th style={{ textAlign: 'right', color: '#f59e0b' }}>16–30 Days</th>
                        <th style={{ textAlign: 'right', color: '#f97316' }}>31–60 Days</th>
                        <th style={{ textAlign: 'right', color: '#ef4444' }}>61–90 Days</th>
                        <th style={{ textAlign: 'right', color: '#7f1d1d' }}>90+ Days</th>
                        <th style={{ textAlign: 'right' }}>Total Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.sort((a, b) => b[1].total - a[1].total).map(([supId, data]) => {
                        const sup = suppliers.find(s => s.id === supId);
                        return (
                          <tr key={supId}>
                            <td style={{ fontWeight: 600 }}>{sup?.name || supId}</td>
                            {['current', 'b30', 'b60', 'b90', 'over90'].map(key => (
                              <td key={key} style={{ textAlign: 'right', fontFamily: 'monospace' }}>{data[key] > 0 ? fmt(data[key]) : '—'}</td>
                            ))}
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: 'var(--danger)' }}>{fmt(data.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                        <td style={{ padding: '0.5rem 1rem' }}>Total</td>
                        {agingReport.map(b => <td key={b.key} style={{ textAlign: 'right', padding: '0.5rem 1rem', fontFamily: 'monospace', color: b.color }}>{fmt(b.total)}</td>)}
                        <td style={{ textAlign: 'right', padding: '0.5rem 1rem', fontFamily: 'monospace', color: 'var(--danger)' }}>{fmt(agingReport.reduce((s, b) => s + b.total, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: SUPPLIER LEDGER
      ══════════════════════════════════════════════════════════ */}
      {tab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
            <select className="form-control" style={{ width: '220px' }} value={ledgerSup} onChange={e => setLedgerSup(e.target.value)}>
              <option value="">— Select Supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="date" className="form-control" style={{ width: '130px' }} value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} placeholder="From" />
            <input type="date" className="form-control" style={{ width: '130px' }} value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} placeholder="To" />
            {ledgerSup && ledgerStatement.length > 0 && (
              <button 
                onClick={() => downloadSupplierLedgerPDF(ledgerSup)} 
                className="btn btn-primary" 
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                🖨️ Download Statement
              </button>
            )}
          </div>

          {ledgerSup && (() => {
            const intel = purchaseService.getSupplierIntelligence(ledgerSup);
            const sup = suppliers.find(s => s.id === ledgerSup);
            return (
              <div>
                {/* Supplier Intelligence Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Total Invoices', value: intel?.totalInvoices || 0, color: '#3b82f6' },
                    { label: 'Total Purchase', value: fmt(intel?.totalValue || 0), color: '#8b5cf6' },
                    { label: 'Total Paid', value: fmt(intel?.totalPaid || 0), color: '#10b981' },
                    { label: 'Outstanding Balance', value: fmt(intel?.outstandingBalance || 0), color: '#ef4444' },
                    { label: 'Return Value', value: fmt(intel?.returnValue || 0), color: '#f97316' },
                    { label: 'Return Rate', value: `${intel?.returnRate || 0}%`, color: '#d97706' },
                    { label: 'Avg Invoice Size', value: fmt(intel?.avgInvoiceSize || 0), color: '#06b6d4' },
                    { label: 'Last Purchase', value: intel?.lastPurchaseDate || '—', color: '#8b5cf6' },
                  ].map(k => (
                    <div key={k.label} style={{ background: `${k.color}10`, border: `1px solid ${k.color}20`, borderRadius: 12, padding: '0.85rem' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: k.color, fontFamily: 'monospace' }}>{k.value}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginTop: 4 }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Statement Table */}
                <div className="table-container">
                  {ledgerStatement.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found for {sup?.name || ledgerSup} in this period.</div>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Description</th><th style={{ textAlign: 'right' }}>Debit (Payment/Return)</th><th style={{ textAlign: 'right' }}>Credit (Invoice)</th><th style={{ textAlign: 'right' }}>Running Balance</th></tr></thead>
                      <tbody>
                        {ledgerStatement.map((t, idx) => (
                          <tr key={idx}>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.date}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: t.type === 'Invoice' ? 'var(--accent-color)' : t.type === 'Payment' ? '#10b981' : '#ef4444' }}>{t.refNo}</td>
                            <td><span style={{ padding: '2px 7px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 700, background: t.type === 'Invoice' ? 'rgba(37,99,235,0.1)' : t.type === 'Payment' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: t.type === 'Invoice' ? '#2563eb' : t.type === 'Payment' ? '#10b981' : '#ef4444' }}>{t.type}</span></td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.description}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: t.debit > 0 ? '#10b981' : 'var(--text-muted)' }}>{t.debit > 0 ? fmt(t.debit) : '—'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: t.credit > 0 ? '#ef4444' : 'var(--text-muted)' }}>{t.credit > 0 ? fmt(t.credit) : '—'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: t.balance >= 0 ? '#ef4444' : '#10b981' }}>{fmt(Math.abs(t.balance))}{t.balance > 0 ? ' Cr' : ' Dr'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}
          {!ledgerSup && (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16 }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
              <div>Select a supplier above to view their complete account statement and intelligence profile.</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         SLIDE-OVER DETAIL DRAWER
      ══════════════════════════════════════════════════════════ */}
      {detailInv && (
        <>
          <div onClick={() => setDetailInv(null)} className="backdrop-overlay" style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
          <div className="slide-over" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '490px', background: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 900, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#818cf8' }}>Invoice Details</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', color: '#fff' }}>{detailInv.invoiceNo}</h3>
              </div>
              <button onClick={() => setDetailInv(null)} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}>×</button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Document Chain Flowchart Stepper */}
              <div>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>🔗 Visual Document Flow</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 12, overflowX: 'auto' }}>
                  {[
                    { step: 'PR', label: 'Requisition', value: detailInv.poNumber ? `PR-${detailInv.poNumber.substring(3)}` : null, color: '#9333ea', icon: '📝' },
                    { step: 'PO', label: 'Purchase Order', value: detailInv.poNumber, color: '#2563eb', icon: '📋' },
                    { step: 'GRN', label: 'Goods Receipt', value: detailInv.grnNumber, color: '#10b981', icon: '📦' },
                    { step: 'INV', label: 'Supplier Bill', value: detailInv.invoiceNo, color: 'var(--accent-color)', icon: '🧾' },
                    { step: 'PAY', label: 'Payment Receipt', value: detailInv.paymentStatus === 'paid' ? 'Paid' : detailInv.paymentStatus === 'partial' ? 'Partial' : null, color: '#10b981', icon: '💸' }
                  ].map((step, idx, arr) => {
                    const isCompleted = !!step.value;
                    return (
                      <div key={step.step} style={{ display: 'flex', alignItems: 'center', flex: idx < arr.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, minWidth: 60 }}>
                          <div style={{ 
                            width: 30, 
                            height: 30, 
                            borderRadius: '50%', 
                            background: isCompleted ? step.color : 'var(--border-color)', 
                            color: isCompleted ? '#fff' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            boxShadow: isCompleted ? `0 4px 10px ${step.color}30` : 'none',
                            border: isCompleted ? 'none' : '2px solid var(--border-color)',
                            cursor: 'default'
                          }} title={`${step.label}: ${step.value || 'Not linked'}`}>
                            {step.icon}
                          </div>
                          <span style={{ fontSize: '0.58rem', fontWeight: 800, marginTop: 4, color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {step.step}
                          </span>
                          {isCompleted && step.value && (
                            <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: 4, marginTop: 2, border: '1px solid var(--border-color)', whiteSpace: 'nowrap', maxWidth: 65, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {step.value}
                            </span>
                          )}
                        </div>
                        {idx < arr.length - 1 && (
                          <div style={{ 
                            flex: 1, 
                            height: 3, 
                            background: isCompleted && arr[idx + 1].value ? `linear-gradient(90deg, ${step.color}, ${arr[idx + 1].color})` : 'var(--border-color)',
                            margin: '0 -10px',
                            position: 'relative',
                            top: -8,
                            zIndex: 1
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                {[
                  { label: 'Supplier', value: suppliers.find(s => s.id === detailInv.supplierId)?.name || detailInv.supplierId },
                  { label: 'Branch', value: detailInv.branch || 'Main Branch' },
                  { label: 'Invoice Date', value: window.formatDate(detailInv.date) },
                  { label: 'Due Date', value: window.formatDate(detailInv.dueDate) },
                  { label: 'Payment Status', value: <StatusPill map={PAY_STATUS} val={detailInv.paymentStatus || 'unpaid'} /> },
                  { label: 'Approval', value: <StatusPill map={APR_STATUS} val={detailInv.approvalStatus || 'auto_approved'} /> },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>💰 Financial Summary</h4>
                {[
                  { label: 'Net Subtotal', value: fmt(detailInv.subtotal), muted: true },
                  { label: 'VAT / Tax', value: fmt(detailInv.vatAmount), muted: true },
                  detailInv.landedCost?.total > 0 && { label: `Landed Costs (Freight: ${fmt(detailInv.landedCost.freight || 0)}, Customs: ${fmt(detailInv.landedCost.customs || 0)}, Insurance: ${fmt(detailInv.landedCost.insurance || 0)})`, value: fmt(detailInv.landedCost.total), muted: true },
                  { label: 'Grand Total', value: fmt((detailInv.grandTotal || 0) + (detailInv.landedCost?.total || 0)), bold: true },
                  detailInv.paidAmount > 0 && { label: 'Paid Amount', value: fmt(detailInv.paidAmount), green: true },
                  { label: 'Balance Due', value: fmt(Math.max(0, (detailInv.grandTotal || 0) + (detailInv.landedCost?.total || 0) - (detailInv.paidAmount || 0))), red: true, bold: true },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '3px 0', borderTop: row.bold ? '1px solid var(--border-color)' : 'none', marginTop: row.bold ? 4 : 0, paddingTop: row.bold ? 6 : 3 }}>
                    <span style={{ color: row.bold ? 'var(--text-primary)' : 'var(--text-muted)' }}>{row.label}</span>
                    <strong style={{ color: row.red ? 'var(--danger)' : row.green ? '#10b981' : 'var(--text-primary)', fontFamily: 'monospace' }}>{row.value}</strong>
                  </div>
                ))}
              </div>

              {/* Line Items */}
              <div>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>📦 Line Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {detailInv.items?.map((it, idx) => (
                    <div key={idx} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{it.productName || products.find(p => p.id === it.productId)?.name || it.productId}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{it.qty} pcs × {fmt(it.unitPrice)} | VAT: {it.vatRate || 0}%</div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-color)', fontFamily: 'monospace' }}>{fmt(it.lineTotal || (it.qty * it.unitPrice))}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Trail */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>✅ Approval Audit Trail</h4>
                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Status:</span><StatusPill map={APR_STATUS} val={detailInv.approvalStatus || 'auto_approved'} /></div>
                  {detailInv.approvedBy && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Approved By:</span><strong>{detailInv.approvedBy}</strong></div>}
                  {detailInv.approvedAt && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Approved At:</span><strong>{new Date(detailInv.approvedAt).toLocaleDateString()}</strong></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Posted By:</span><strong>{detailInv.postedBy || '—'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Created At:</span><strong>{detailInv.createdAt ? new Date(detailInv.createdAt).toLocaleString() : '—'}</strong></div>
                </div>
              </div>

              {/* Attachment */}
              {detailInv.attachmentName && (
                <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, fontSize: '0.78rem' }}>
                  📎 <a href="#attachment" onClick={e => e.preventDefault()} style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{detailInv.attachmentName}</a>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => setDetailInv(null)}>Close</button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => downloadPurchasePDF(detailInv)}>🖨️ PDF</button>
              
              {detailInv.approvalStatus === 'pending' && (
                <button 
                  className="btn btn-primary" 
                  style={{ 
                    flex: 1, 
                    fontSize: '0.78rem', 
                    background: (simulatedRole === 'Agent') ? 'var(--border-color)' : '#d97706', 
                    color: (simulatedRole === 'Agent') ? 'var(--text-muted)' : '#fff',
                    border: 'none',
                    cursor: (simulatedRole === 'Agent') ? 'not-allowed' : 'pointer'
                  }} 
                  disabled={simulatedRole === 'Agent'}
                  title={simulatedRole === 'Agent' ? 'Requires Finance Manager or CFO role to approve' : 'Approve Invoice'}
                  onClick={() => { 
                    handleApproveInvoice(detailInv.invoiceNo); 
                    setDetailInv(null); 
                  }}
                >
                  {simulatedRole === 'Agent' ? '🔒 Approve (Finance only)' : '✓ Approve'}
                </button>
              )}
              {detailInv.paymentStatus !== 'paid' && (
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => { setPayForm(f => ({ ...f, invoiceNo: detailInv.invoiceNo, supplierId: detailInv.supplierId, amount: String(Math.max(0, (detailInv.grandTotal + (detailInv.landedCost?.total || 0) - (detailInv.paidAmount || 0))).toFixed(2)) })); setTab('payments'); setDetailInv(null); }}>💸 Pay</button>
              )}
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.78rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }} onClick={() => { initiateReturn(detailInv); setDetailInv(null); }}>↩ Return</button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
         INVOICE CREATION MODAL WITH LANDED COST ALLOCATION
      ══════════════════════════════════════════════════════════ */}
      {showForm && (() => {
        const totalQty = items.reduce((s, it) => s + Number(it.qty || 0), 0);
        const totalValue = items.reduce((s, it) => s + (Number(it.qty || 0) * Number(it.unitPrice || 0)), 0);
        const freight = Number(landedCost.freight || 0);
        const customs = Number(landedCost.customs || 0);
        const insurance = Number(landedCost.insurance || 0);
        const totalLanded = freight + customs + insurance;

        // Dynamic pricing adjustment calculations for visual checklist
        const adjustedPreviewLines = items.map(l => {
          let lineShare = 0;
          if (totalLanded > 0) {
            if (allocationMethod === 'quantity' && totalQty > 0) {
              lineShare = (Number(l.qty || 0) / totalQty) * totalLanded;
            } else if (allocationMethod === 'value' && totalValue > 0) {
              lineShare = ((Number(l.qty || 0) * Number(l.unitPrice || 0)) / totalValue) * totalLanded;
            }
          }
          const landedPerUnit = Number(l.qty || 0) > 0 ? lineShare / Number(l.qty || 0) : 0;
          const adjustedPrice = Number(l.unitPrice || 0) + landedPerUnit;
          return {
            ...l,
            adjustedUnitPrice: Number(adjustedPrice.toFixed(2)),
            landedAllocation: Number(lineShare.toFixed(2)),
          };
        });

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 850, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }} onClick={() => setShowForm(false)}>
            <div className="modal-content" style={{ width: '100%', maxWidth: '900px', background: 'var(--bg-secondary)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 2rem)', margin: 'auto' }} onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px 20px 0 0' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>🛒 New Purchase Invoice</h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', opacity: 0.8, color: 'rgba(255,255,255,0.7)' }}>Record incoming supplier invoice — updates inventory asset costs and AP ledgers</p>
                </div>
                <button onClick={() => setShowForm(false)} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Row 1: Supplier, Date, Due Date */}
                {/* Row 1: Supplier & Branch */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="form-group">
                    <label className="form-label">Supplier *</label>
                    <SearchableSelect 
                      items={suppliers}
                      placeholder="-- Select Supplier --"
                      value={form.supplierId}
                      onChange={val => setForm(f => ({ ...f, supplierId: val }))}
                      onAddNew={() => {
                        localStorage.setItem('open_add_supplier_on_load', 'true');
                        activeRouteHandler('ledgers');
                      }}
                    />
                    {form.supplierId && <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: 2 }}>Outstanding: {fmt(suppliers.find(s => s.id === form.supplierId)?.currentBalance || 0)}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Branch</label>
                    <select className="form-control" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
                      <option value="">-- Select Branch --</option>
                      <option value="Main Branch">Main Branch</option>
                      <option value="North Hub">North Hub</option>
                      <option value="West Transit">West Transit</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Dates */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Invoice Date *</label>
                    <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value, dueDate: new Date(new Date(e.target.value).setDate(new Date(e.target.value).getDate() + 30)).toISOString().substring(0, 10) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Due Date</label>
                    <input type="date" className="form-control" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                </div>

                {/* Row 2: PO, GRN, Supplier Invoice No */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">PO Reference (Optional)</label>
                    <select
                      className="form-control"
                      value={form.poNumber}
                      onChange={e => {
                        const poId = e.target.value;
                        const po = purchaseOrders.find(x => x.id === poId);
                        setForm(f => ({ ...f, poNumber: poId, supplierId: po ? po.supplierId : f.supplierId }));
                        if (po && po.items && po.items.length > 0) {
                          setItems(po.items.map(item => ({
                            productId: item.productId,
                            productName: item.productName,
                            qty: item.qty,
                            unitPrice: item.unitPrice,
                            vatRateId: 'vat-std',
                            discount: 0
                          })));
                        }
                      }}
                    >
                      <option value="">— Select PO —</option>
                      {purchaseOrders.map(p => (
                        <option key={p.id} value={p.id}>{p.id} (Supplier: {suppliers.find(s => s.id === p.supplierId)?.name || p.supplierId})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GRN Reference (Optional)</label>
                    <select
                      className="form-control"
                      value={form.grnNumber}
                      onChange={e => {
                        const grnId = e.target.value;
                        const grn = goodsReceipts.find(x => x.id === grnId);
                        // If PO number is not set, set it from the GRN's PO reference
                        if (grn && grn.poId) {
                          const po = purchaseOrders.find(x => x.id === grn.poId);
                          setForm(f => ({ ...f, poNumber: grn.poId, grnNumber: grnId, supplierId: po ? po.supplierId : f.supplierId }));
                          if (grn.items && grn.items.length > 0) {
                            setItems(grn.items.map(item => ({
                              productId: item.productId,
                              productName: item.productName,
                              qty: item.qtyReceived,
                              unitPrice: item.unitPrice || 0,
                              vatRateId: 'vat-std',
                              discount: 0
                            })));
                          }
                        } else {
                          setForm(f => ({ ...f, grnNumber: grnId }));
                        }
                      }}
                    >
                      <option value="">— Select GRN —</option>
                      {goodsReceipts.map(g => (
                        <option key={g.id} value={g.id}>{g.id} (PO: {g.poId})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier Invoice No</label>
                    <input className="form-control" placeholder="Supplier's ref no" value={form.supplierInvoiceNo} onChange={e => setForm(f => ({ ...f, supplierInvoiceNo: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Attachment (Optional)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { const files = ['Invoice_Doc_Original.pdf', 'PO_Confirmation.pdf', 'GRN_Receipt.pdf']; setForm(f => ({ ...f, attachmentName: files[Math.floor(Math.random() * files.length)] })); }}>📁 Upload</button>
                      {form.attachmentName && <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>✓ {form.attachmentName}</span>}
                    </div>
                  </div>
                </div>

                {/* Narration */}
                <div className="form-group">
                  <label className="form-label">Narration / Reference</label>
                  <input className="form-control" placeholder="e.g. Regular restock purchase, Q2 inventory top-up…" value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} />
                </div>

                {/* 3-Way Match Checklist (Visible when PO and GRN are referenced) */}
                {(form.poNumber || form.grnNumber) && (
                  <div style={{ background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: '1rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.82rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🛡️</span> 3-Way Match Verification Checklist
                    </div>
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      {/* Match 1: Quantities check */}
                      {(() => {
                        const linkedPo = purchaseOrders.find(p => p.id === form.poNumber);
                        const linkedGrn = goodsReceipts.find(g => g.id === form.grnNumber);
                        const poQty = linkedPo?.items[0]?.qty || 0;
                        const grnQty = linkedGrn?.items[0]?.qtyReceived || 0;
                        const invQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
                        const isQtyMatched = (poQty === grnQty) && (grnQty === invQty);
                        return (
                          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 10, border: `1px solid ${isQtyMatched ? '#10b98130' : '#ef444430'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Quantity Match</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isQtyMatched ? '#10b981' : '#ef4444' }}>
                                {isQtyMatched ? '✓ Matched' : '⚠️ Mismatch'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div>PO Ordered: <strong>{poQty} pcs</strong></div>
                              <div>GRN Received: <strong>{grnQty} pcs</strong></div>
                              <div>Invoice Billed: <strong>{invQty} pcs</strong></div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Match 2: Pricing check */}
                      {(() => {
                        const linkedPo = purchaseOrders.find(p => p.id === form.poNumber);
                        const poPrice = linkedPo?.items[0]?.unitPrice || 0;
                        const invPrice = items[0]?.unitPrice || 0;
                        const isPriceMatched = poPrice === invPrice;
                        return (
                          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 10, border: `1px solid ${isPriceMatched ? '#10b98130' : '#ef444430'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Unit Cost Match</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isPriceMatched ? '#10b981' : '#ef4444' }}>
                                {isPriceMatched ? '✓ Matched' : '⚠️ Price Difference'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div>PO Price: <strong>{fmt(poPrice)}</strong></div>
                              <div>Invoice Price: <strong>{fmt(invPrice)}</strong></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Approval Warning */}
                {(totals.grand + totalLanded) > 50000 && (
                  <div style={{ padding: '0.65rem 1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>
                    ⏳ This invoice exceeds ৳50,000 and will require Finance Manager approval before payment processing.
                  </div>
                )}

                {/* Landed Costs */}
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.75rem' }}>🚢 Landed Costs Add-on</h4>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    {['freight', 'customs', 'insurance'].map(key => (
                      <div key={key} className="form-group">
                        <label className="form-label" style={{ textTransform: 'capitalize' }}>{key} (৳)</label>
                        <input type="number" className="form-control" placeholder="0.00" value={landedCost[key]} onChange={e => setLandedCost(lc => ({ ...lc, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="form-group">
                      <label className="form-label">Allocation Method</label>
                      <select className="form-control" value={allocationMethod} onChange={e => setAllocationMethod(e.target.value)}>
                        <option value="value">By Value</option>
                        <option value="quantity">By Quantity</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Landed Cost Visual Distribution & Share Bar */}
                {totalLanded > 0 && (
                  <div style={{ background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h5 style={{ margin: 0, fontSize: '0.75rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        🚢 Landed Cost Distribution Preview
                      </h5>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', color: '#b45309' }}>
                        Total Landed Cost: {fmt(totalLanded)}
                      </span>
                    </div>

                    {/* Segmented Share Bar */}
                    <div style={{ height: 10, background: 'var(--bg-tertiary)', borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
                      {[
                        { key: 'Product cost', val: totalValue, color: 'var(--accent-color)' },
                        { key: 'Freight', val: freight, color: '#f59e0b' },
                        { key: 'Customs', val: customs, color: '#ef4444' },
                        { key: 'Insurance', val: insurance, color: '#06b6d4' }
                      ].map(seg => {
                        const totalCost = totalValue + totalLanded;
                        const pct = totalCost > 0 ? (seg.val / totalCost) * 100 : 0;
                        if (pct <= 0) return null;
                        return (
                          <div key={seg.key} style={{ height: '100%', width: `${pct}%`, background: seg.color }} title={`${seg.key}: ${fmt(seg.val)} (${pct.toFixed(1)}%)`} />
                        );
                      })}
                    </div>

                    {/* Cost Legend */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-color)' }} /> Product Base Cost: {fmt(totalValue)}</div>
                      {freight > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Freight: {fmt(freight)}</div>}
                      {customs > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Customs: {fmt(customs)}</div>}
                      {insurance > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} /> Insurance: {fmt(insurance)}</div>}
                    </div>

                    {/* Dynamic Cost adjustment table */}
                    <div style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <th style={{ textAlign: 'left', padding: '4px' }}>Line Item</th>
                            <th style={{ textAlign: 'right', padding: '4px' }}>Original Cost</th>
                            <th style={{ textAlign: 'right', padding: '4px' }}>Landed Share</th>
                            <th style={{ textAlign: 'right', padding: '4px' }}>Adjusted Cost (DR Inventory Asset)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adjustedPreviewLines.map((l, idx) => {
                            const pName = l.productName || products.find(p => p.id === l.productId)?.name || l.productId;
                            return (
                              <tr key={idx} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                                <td style={{ padding: '6px 4px', fontWeight: 600 }}>{pName} (x{l.qty})</td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(l.unitPrice)}</td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'monospace', color: '#b45309' }}>+{fmt(l.landedAllocation / (l.qty || 1))}/unit</td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-color)' }}>{fmt(l.adjustedUnitPrice)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Line Items */}
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>📦 Product Line Items</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: '750px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.2fr 1fr 1.2fr 1.2fr auto', gap: '0.4rem', marginBottom: '0.4rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        <span>Product</span><span>Qty</span><span>Unit Price (৳)</span><span>Discount</span><span>VAT</span><span>Line Total</span><span />
                      </div>
                      {items.map((item, idx) => {
                        const c = calcLine(item);
                        return (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.2fr 1fr 1.2fr 1.2fr auto', gap: '0.4rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                            <select className="form-control" value={item.productId} onChange={e => setItem(idx, 'productId', e.target.value)}>
                              <option value="">-- Select Product --</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" className="form-control" min="1" value={item.qty} onChange={e => setItem(idx, 'qty', e.target.value)} />
                            <input type="number" className="form-control" placeholder="0.00" value={item.unitPrice} onChange={e => setItem(idx, 'unitPrice', e.target.value)} />
                            <input type="number" className="form-control" placeholder="0" min="0" max="100" value={item.discount} onChange={e => setItem(idx, 'discount', e.target.value)} />
                            <select className="form-control" value={item.vatRateId} onChange={e => setItem(idx, 'vatRateId', e.target.value)}>
                              {vatRates.map(v => <option key={v.id} value={v.id}>{v.name} ({v.rate}%)</option>)}
                            </select>
                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'monospace' }}>{fmt(c.lineTotal)}</div>
                            <button type="button" onClick={() => removeLine(idx)} disabled={items.length === 1} className="btn btn-danger btn-sm" style={{ padding: '0.35rem 0.55rem' }}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button type="button" onClick={addLine} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>+ Add Line</button>
                </div>

                {/* Totals + Journal Preview */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--accent-color)', marginBottom: 6 }}>📒 Journal Entry Preview</div>
                    <div>🟢 <strong>DR</strong> Inventory Asset: <span style={{ fontFamily: 'monospace' }}>{fmt(totals.subtotal + totalLanded)}</span></div>
                    <div>🟢 <strong>DR</strong> VAT Input: <span style={{ fontFamily: 'monospace' }}>{fmt(totals.vat)}</span></div>
                    <div>🔴 <strong>CR</strong> Accounts Payable: <span style={{ fontFamily: 'monospace' }}>{fmt(totals.grand + totalLanded)}</span></div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem', fontSize: '0.78rem' }}>
                    {[['Subtotal', fmt(totals.subtotal)], ['VAT', fmt(totals.vat)], totalLanded > 0 && ['Landed Costs', fmt(totalLanded)], ['Grand Total', fmt(totals.grand + totalLanded)]].filter(Boolean).map(([label, value], i, arr) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderTop: i === arr.length - 1 ? '1px solid var(--border-color)' : 'none', marginTop: i === arr.length - 1 ? 4 : 0 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <strong style={{ fontFamily: 'monospace', color: i === arr.length - 1 ? 'var(--accent-color)' : 'var(--text-primary)' }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1.1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderRadius: '0 0 20px 20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="button" onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{ minWidth: 160, fontWeight: 700 }}>
                  {loading ? 'Posting Journals…' : '✓ Post Purchase Invoice'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════
         PURCHASE RETURN MODAL
      ══════════════════════════════════════════════════════════ */}
      {returnInv && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.4rem' }}>↩</div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>Purchase Return</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>Invoice Ref: {returnInv.invoiceNo}</p>
                </div>
              </div>
              <button onClick={() => setReturnInv(null)} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select items and quantities to return. The system will reverse stock and issue an AP credit note.</p>

              {/* Return Reason */}
              <div className="form-group">
                <label className="form-label">Return Reason *</label>
                <select className="form-control" value={returnReason} onChange={e => setReturnReason(e.target.value)}>
                  <option value="">— Select Return Reason —</option>
                  {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Additional Notes / Narration</label>
                <input className="form-control" placeholder="Optional details…" value={returnNarration} onChange={e => setReturnNarration(e.target.value)} />
              </div>

              {/* Items */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.5fr', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <span>Product</span><span style={{ textAlign: 'right' }}>Purchased Qty</span><span style={{ textAlign: 'right' }}>Unit Price</span><span>Return Qty</span><span style={{ textAlign: 'right' }}>Return Subtotal</span>
                </div>
                {returnItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.5fr', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{item.productName || products.find(p => p.id === item.productId)?.name}</div>
                    <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.originalQty}</div>
                    <div style={{ textAlign: 'right', fontSize: '0.82rem', fontFamily: 'monospace' }}>{fmt(item.unitPrice)}</div>
                    <input type="number" className="form-control" min="0" max={item.originalQty} value={item.returnQty} onChange={e => setReturnItems(ris => ris.map((r, j) => j === idx ? { ...r, returnQty: e.target.value } : r))} />
                    <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontFamily: 'monospace' }}>{fmt(Number(item.returnQty || 0) * Number(item.unitPrice))}</div>
                  </div>
                ))}
              </div>

              {/* Return Total */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span>Total Return Value:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--danger)' }}>{fmt(returnItems.reduce((s, it) => s + (Number(it.returnQty || 0) * Number(it.unitPrice)), 0))}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => setReturnInv(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handlePostReturn} disabled={loading}>{loading ? 'Processing…' : '↩ Post Purchase Return'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PR CREATION MODAL OVERLAY ── */}
      {isPrModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.4rem' }}>📝</div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>New Purchase Requisition</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>Create internal request for procurement planning</p>
                </div>
              </div>
              <button onClick={() => setIsPrModalOpen(false)} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            <form onSubmit={handleCreatePR} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Scrollable Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-control" value={prForm.department} onChange={e => setPrForm({ ...prForm, department: e.target.value })}>
                    <option value="Engineering">Engineering & Tech</option>
                    <option value="Sales">Sales & Marketing</option>
                    <option value="Accounts">Accounts & Finance</option>
                    <option value="HR">Human Resources</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Requested By *</label>
                  <select 
                    className="form-control" 
                    required 
                    value={prForm.requestedBy} 
                    onChange={e => setPrForm({ ...prForm, requestedBy: e.target.value })}
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.employeeCode} value={emp.fullNameEnglish}>{emp.fullNameEnglish} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Item / Product Required</label>
                  <select className="form-control" value={prForm.productId} onChange={e => setPrForm({ ...prForm, productId: e.target.value })}>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                  </select>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Quantity Required</label>
                    <input type="number" min="1" className="form-control" value={prForm.qty} onChange={e => setPrForm({ ...prForm, qty: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Cost (BDT)</label>
                    <input type="number" min="0" className="form-control" placeholder="Total Est. Cost" value={prForm.estimatedCost} onChange={e => setPrForm({ ...prForm, estimatedCost: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Justification / Purpose</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Why is this item needed? (e.g. Lab equipment replacement, office use, project requirement...)"
                    value={prForm.justification}
                    onChange={e => setPrForm({ ...prForm, justification: e.target.value })}
                    style={{ resize: 'vertical', minHeight: 60 }}
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPrModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 700 }}>📝 Submit for Approval</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PO CONVERSION MODAL OVERLAY ── */}
      {isPoModalOpen && selectedPrForPo && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #3b0764 0%, #581c87 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.4rem' }}>🛒</div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>Convert Requisition to PO</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>Requisition ID: {selectedPrForPo.id}</p>
                </div>
              </div>
              <button onClick={() => { setIsPoModalOpen(false); setSelectedPrForPo(null); }} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Scrollable Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 12, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>Requester: <strong>{selectedPrForPo.requestedBy} ({selectedPrForPo.department})</strong></div>
                  <div>Item: <strong>{selectedPrForPo.items[0].productName}</strong></div>
                  <div>Quantity: <strong>{selectedPrForPo.items[0].qty} pcs</strong></div>
                  <div>Estimated Cost: <strong>{fmt(selectedPrForPo.items[0].estimatedCost)}</strong></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Select Supplier *</label>
                  <select className="form-control" required value={poForm.supplierId} onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Final Unit Price (BDT) *</label>
                    <input type="number" min="1" className="form-control" required value={poForm.unitPrice} onChange={e => setPoForm({ ...poForm, unitPrice: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms</label>
                    <select className="form-control" value={poForm.paymentTerms} onChange={e => setPoForm({ ...poForm, paymentTerms: e.target.value })}>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="COD">Cash on Delivery (COD)</option>
                      <option value="Immediate">Immediate Pay</option>
                    </select>
                  </div>
                </div>
                <div style={{ background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)', padding: '0.8rem 1rem', fontSize: '0.75rem', borderRadius: 10 }}>
                  Total PO Amount: <strong style={{ color: '#c084fc', fontSize: '0.9rem' }}>{poForm.unitPrice ? fmt(Number(poForm.unitPrice) * selectedPrForPo.items[0].qty) : '৳ 0.00'}</strong>
                </div>
              </div>

              {/* Fixed Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsPoModalOpen(false); setSelectedPrForPo(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700 }}>Create PO & Send</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── GRN RECEIPT MODAL OVERLAY ── */}
      {isGrnModalOpen && selectedPoForGrn && (
        <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #064e3b 0%, #0f766e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '1.4rem' }}>📦</div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>Goods Receipt Note</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>PO ID: {selectedPoForGrn.id}</p>
                </div>
              </div>
              <button onClick={() => { setIsGrnModalOpen(false); setSelectedPoForGrn(null); }} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            <form onSubmit={handleCreateGRN} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Scrollable Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 12, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>Supplier: <strong>{suppliers.find(s => s.id === selectedPoForGrn.supplierId)?.name || selectedPoForGrn.supplierId}</strong></div>
                  <div>Ordered Item: <strong>{selectedPoForGrn.items[0].productName}</strong></div>
                  <div>Ordered Quantity: <strong>{selectedPoForGrn.items[0].qty} pcs</strong></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Received By</label>
                  <input type="text" className="form-control" value={grnForm.receivedBy} onChange={e => setGrnForm({ ...grnForm, receivedBy: e.target.value })} />
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Qty Accepted *</label>
                    <input type="number" min="0" max={selectedPoForGrn.items[0].qty} className="form-control" required value={grnForm.qtyReceived} onChange={e => setGrnForm({ ...grnForm, qtyReceived: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qty Rejected</label>
                    <input type="number" min="0" className="form-control" value={grnForm.qtyRejected} onChange={e => setGrnForm({ ...grnForm, qtyRejected: e.target.value })} />
                  </div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.05)', padding: '0.8rem 1rem', borderRadius: 10, fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
                  📌 Stocks will update automatically for accepted quantities.
                </div>
              </div>

              {/* Fixed Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsGrnModalOpen(false); setSelectedPoForGrn(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}>Post Goods Receipt Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Slide-over Requisition Detail Drawer ── */}
      {detailPr && (
        <>
          <div onClick={() => setDetailPr(null)} className="backdrop-overlay" style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
          <div className="slide-over" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '470px', background: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 900, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purchase Requisition</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>{detailPr.id}</h3>
              </div>
              <button onClick={() => setDetailPr(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Requested By</div>
                  <div style={{ fontWeight: 600 }}>{detailPr.requestedBy}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Department</div>
                  <div style={{ fontWeight: 600 }}>{detailPr.department}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Date Submitted</div>
                  <div style={{ fontWeight: 600 }}>{detailPr.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                  <div>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, 
                      color: detailPr.status === 'pending_approval' ? '#f59e0b' : (detailPr.status === 'approved' ? '#2563eb' : (detailPr.status === 'ordered' ? '#10b981' : '#ef4444')), 
                      background: detailPr.status === 'pending_approval' ? 'rgba(245,158,11,0.1)' : (detailPr.status === 'approved' ? 'rgba(37,99,235,0.1)' : (detailPr.status === 'ordered' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'))
                    }}>
                      {detailPr.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>📋 Requisition Item Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Product:</span>
                    <strong>{detailPr.items[0]?.productName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Quantity:</span>
                    <strong>{detailPr.items[0]?.qty} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Cost:</span>
                    <strong style={{ color: 'var(--accent-color)' }}>{fmt(detailPr.items[0]?.estimatedCost)}</strong>
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Justification</h4>
                <div style={{ fontSize: '0.8rem', fontStyle: 'italic', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  "{detailPr.justification || 'No justification provided.'}"
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDetailPr(null)}>Close</button>
              {detailPr.status === 'pending_approval' && (simulatedRole === 'CFO' || simulatedRole === 'Accountant') && (
                <>
                  <button onClick={() => { handleApprovePR(detailPr.id); setDetailPr(null); }} className="btn btn-primary" style={{ flex: 1 }}>Approve</button>
                </>
              )}
              {detailPr.status === 'approved' && simulatedRole === 'Agent' && (
                <button onClick={() => {
                  setSelectedPrForPo(detailPr);
                  setPoForm({ supplierId: suppliers[0]?.id || '', unitPrice: String(Math.round(detailPr.items[0].estimatedCost / detailPr.items[0].qty)), paymentTerms: 'Net 30' });
                  setIsPoModalOpen(true);
                  setDetailPr(null);
                }} className="btn btn-primary" style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed' }}>Convert to PO</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Slide-over Purchase Order Detail Drawer ── */}
      {detailPo && (
        <>
          <div onClick={() => setDetailPo(null)} className="backdrop-overlay" style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
          <div className="slide-over" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '470px', background: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 900, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #3b0764 0%, #581c87 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purchase Order</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>{detailPo.id}</h3>
              </div>
              <button onClick={() => setDetailPo(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Supplier</div>
                  <div style={{ fontWeight: 600 }}>{suppliers.find(s => s.id === detailPo.supplierId)?.name || detailPo.supplierId}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>PO Date</div>
                  <div style={{ fontWeight: 600 }}>{detailPo.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Payment Terms</div>
                  <div style={{ fontWeight: 600 }}>{detailPo.paymentTerms}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                  <div>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, 
                      color: detailPo.status === 'draft' ? '#6b7280' : (detailPo.status === 'sent' ? '#3b82f6' : (detailPo.status === 'received' ? '#10b981' : '#f59e0b')), 
                      background: detailPo.status === 'draft' ? 'rgba(107,114,128,0.1)' : (detailPo.status === 'sent' ? 'rgba(59,130,246,0.1)' : (detailPo.status === 'received' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'))
                    }}>
                      {detailPo.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>🛒 PO Line Item Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Product Name:</span>
                    <strong>{detailPo.items[0]?.productName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ordered Qty:</span>
                    <strong>{detailPo.items[0]?.qty} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Unit Price:</span>
                    <strong>{fmt(detailPo.items[0]?.unitPrice)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Cost:</span>
                    <strong style={{ color: 'var(--accent-color)' }}>{fmt((detailPo.items[0]?.qty || 0) * (detailPo.items[0]?.unitPrice || 0))}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDetailPo(null)}>Close</button>
              {detailPo.status === 'draft' && simulatedRole === 'Agent' && (
                <button onClick={() => {
                  purchaseService.updatePurchaseOrderStatus(detailPo.id, 'sent');
                  setPurchaseOrders(purchaseService.getPurchaseOrders());
                  setSuccessMsg(`✅ PO ${detailPo.id} status updated to Sent to Supplier.`);
                  setDetailPo(null);
                  setTimeout(() => setSuccessMsg(''), 4000);
                }} className="btn btn-primary" style={{ flex: 1 }}>Mark Sent</button>
              )}
              {detailPo.status === 'sent' && simulatedRole === 'Receiver' && (
                <button onClick={() => {
                  setSelectedPoForGrn(detailPo);
                  setGrnForm({ receivedBy: 'Warehouse Team', qtyReceived: String(detailPo.items[0].qty), qtyRejected: 0 });
                  setIsGrnModalOpen(true);
                  setDetailPo(null);
                }} className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}>Receive Goods</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Slide-over Goods Receipt Detail Drawer ── */}
      {detailGrn && (
        <>
          <div onClick={() => setDetailGrn(null)} className="backdrop-overlay" style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
          <div className="slide-over" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '470px', background: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 900, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #064e3b 0%, #0f766e 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goods Received Note</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>{detailGrn.id}</h3>
              </div>
              <button onClick={() => setDetailGrn(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>PO Reference</div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{detailGrn.poId}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Date Received</div>
                  <div style={{ fontWeight: 600 }}>{detailGrn.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Received By</div>
                  <div style={{ fontWeight: 600 }}>{detailGrn.receivedBy}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                  <div>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
                      Completed
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>📦 Stock Receipt Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Product:</span>
                    <strong>{detailGrn.items[0]?.productName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Qty Accepted:</span>
                    <strong style={{ color: '#16a34a' }}>{detailGrn.items[0]?.qtyReceived} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Qty Rejected:</span>
                    <strong style={{ color: detailGrn.items[0]?.qtyRejected > 0 ? '#ef4444' : 'var(--text-muted)' }}>{detailGrn.items[0]?.qtyRejected || 0} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Value:</span>
                    <strong>{fmt((detailGrn.items[0]?.qtyReceived || 0) * (detailGrn.items[0]?.unitPrice || 0))}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDetailGrn(null)}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
