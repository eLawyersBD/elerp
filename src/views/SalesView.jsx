import { useState, useEffect, useMemo } from 'react';
import { salesService } from '../services/salesService';
import { vatService } from '../services/vatService';
import { taxService } from '../services/taxService';
import { defaultCustomers, defaultCategories } from '../database/seedData';
import { serviceModuleService } from '../services/serviceModuleService';
import { printProInvoice, printProQuotation, printProSalesOrder } from '../components/ProInvoicePrint';
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

const RETURN_REASONS = ['Wrong Item Delivered', 'Damaged Goods', 'Expired Product', 'Quality Issue / Defective', 'Excess Quantity', 'Pricing Error', 'Customer Cancellation', 'Duplicate Order', 'Other'];

const blankLine = (products) => ({
  type: 'product',
  productId: '',
  productName: '',
  qty: 1,
  unitPrice: '',
  vatRateId: 'vat-std',
  taxRateId: 'tax-exempt',
  discount: 0,
  narration: '',
});

const PAY_STATUS = {
  unpaid:  { bg: 'rgba(239,68,68,0.1)',  text: '#dc2626', label: 'Unpaid'  },
  partial: { bg: 'rgba(245,158,11,0.1)', text: '#d97706', label: 'Partial' },
  paid:    { bg: 'rgba(34,197,94,0.1)',  text: '#16a34a', label: 'Paid'    },
};
const APR_STATUS = {
  auto_approved: { bg: 'rgba(34,197,94,0.08)',  text: '#16a34a', label: 'Auto-Approved' },
  pending:       { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', label: 'Pending'       },
  approved:      { bg: 'rgba(37,99,235,0.1)',   text: '#2563eb', label: 'Approved'      },
};
const DEL_STATUS = {
  pending:    { bg: 'rgba(100,100,100,0.1)', text: '#6b7280', label: 'Pending'    },
  dispatched: { bg: 'rgba(245,158,11,0.1)', text: '#d97706', label: 'Dispatched' },
  delivered:  { bg: 'rgba(34,197,94,0.1)',  text: '#16a34a', label: 'Delivered'  },
};

const StatusPill = ({ map, val }) => {
  const s = map[val] || map.auto_approved || map.pending || { bg: 'rgba(100,100,100,0.1)', text: '#666', label: val || '—' };
  return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, background: s.bg, color: s.text }}>{s.label}</span>;
};

const StockBadge = ({ product, qty }) => {
  if (!product) return null;
  const avail = product.qty || 0;
  const needed = Number(qty || 0);
  if (avail >= needed && avail > (product.reorderLevel || 5)) return <span style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 700 }}>✅ {avail}</span>;
  if (avail >= needed) return <span style={{ fontSize: '0.62rem', color: '#d97706', fontWeight: 700 }}>⚠️ {avail}</span>;
  return <span style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 700 }}>🔴 {avail}</span>;
};


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

export default function SalesView({ products = [], customers: propCustomers, onRefresh, currentUser, activeRouteHandler }) {
  const customers = propCustomers?.length
    ? propCustomers
    : (JSON.parse(localStorage.getItem('erp_customers') || 'null') || defaultCustomers);

  const vatRates = vatService.getVatRates();
  const taxRates = taxService.getTaxRates();
  const categories = defaultCategories || [];
  const [services, setServices] = useState([]);
  useEffect(() => {
    serviceModuleService.getServiceCatalog().then(data => setServices(data || []));
  }, []);

  /* ─────────── Data States ─────────── */
  const [invoices, setInvoices]       = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [receiptsList, setReceiptsList] = useState([]);
  const [quotations, setQuotations]   = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [chalans, setChalans]         = useState([]);
  const [stats, setStats]             = useState({ totalInvoices: 0, totalRevenue: 0, totalVAT: 0, outstandingAR: 0, paidCount: 0, partialCount: 0, pendingApprovalCount: 0, overdueCount: 0, returnValue: 0, grossProfit: 0, grossMargin: '0', monthlySpend: [], topCustomers: [], topProducts: [] });
  const [tab, setTab]                 = useState('dashboard');
  const [loading, setLoading]         = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');

  /* ─────────── Simulated Role ─────────── */
  const [simulatedRole, setSimulatedRole] = useState(() => {
    const role = currentUser?.role?.toLowerCase();
    if (role === 'sales') return 'Agent';
    if (role === 'warehouse') return 'Dispatcher';
    if (role === 'admin' || role === 'superadmin') return 'CFO';
    return localStorage.getItem('erp_sales_simulated_role') || 'Agent';
  });

  useEffect(() => {
    if (currentUser?.role) {
      const role = currentUser.role.toLowerCase();
      let defaultSimRole = 'Agent';
      if (role === 'sales') defaultSimRole = 'Agent';
      else if (role === 'warehouse') defaultSimRole = 'Dispatcher';
      else if (role === 'admin' || role === 'superadmin') defaultSimRole = 'CFO';
      else if (role === 'accountant') defaultSimRole = 'Manager';
      setSimulatedRole(defaultSimRole);
      localStorage.setItem('erp_sales_simulated_role', defaultSimRole);
    }
  }, [currentUser]);

  useEffect(() => {
    const targetTab = localStorage.getItem('sales_active_tab');
    if (targetTab) {
      setTab(targetTab);
      localStorage.removeItem('sales_active_tab');
    }
    const openInvoice = localStorage.getItem('sales_open_new_invoice');
    if (openInvoice) {
      setShowForm(true);
      setTab('invoices');
      localStorage.removeItem('sales_open_new_invoice');
    }
    const openQuote = localStorage.getItem('sales_open_quotation_modal');
    if (openQuote) {
      setIsQuoteModalOpen(true);
      setTab('quotations');
      localStorage.removeItem('sales_open_quotation_modal');
    }
  }, [currentUser]);

  /* ─────────── Invoice Form ─────────── */
  const [showForm, setShowForm] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [form, setForm] = useState({
    customerId: '',
    date: new Date().toISOString().substring(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    narration: '', discountTotal: 0,
    quoteNo: '', soNumber: '', salesperson: '', branch: '', chalanNo: '',
  });
  const [items, setItems] = useState([blankLine(products)]);

  /* ─────────── Filters ─────────── */
  const [filters, setFilters] = useState({ search: '', customer: 'all', status: 'all', approvalStatus: 'all', deliveryStatus: 'all', fromDate: '', toDate: '', aging: 'all' });
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  /* ─────────── Detail Drawer ─────────── */
  const [detailInv, setDetailInv] = useState(null);
  const [detailQuote, setDetailQuote] = useState(null);
  const [detailSo, setDetailSo] = useState(null);
  const [detailChalan, setDetailChalan] = useState(null);

  const [employees] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_employees_v8');
      if (saved) return JSON.parse(saved);
      return [];
    } catch (e) {
      return [];
    }
  });

  /* ─────────── Receipt Form ─────────── */
  const [payForm, setPayForm] = useState({
    customerId: customers[0]?.id || '',
    amount: '', method: 'bank', accountId: 'acc-1020',
    narration: '', chequeNo: '', invoiceNo: '',
  });

  /* ─────────── Returns ─────────── */
  const [returnInv, setReturnInv]         = useState(null);
  const [returnItems, setReturnItems]     = useState([]);
  const [returnReason, setReturnReason]   = useState('');
  const [returnNarration, setReturnNarration] = useState('');

  /* ─────────── POS State ─────────── */
  const [posItems, setPosItems]           = useState([]);
  const [posCash, setPosCash]             = useState('');
  const [posCustomerId, setPosCustomerId] = useState('');
  const [posMsg, setPosMsg]               = useState('');
  const [posCategory, setPosCategory]     = useState('all');
  const [posSearch, setPosSearch]         = useState('');
  const [completedPosSale, setCompletedPosSale] = useState(null);

  /* ─────────── Quotation, Sales Order, Chalan Modal States ─────────── */
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [quoteForm, setQuoteForm] = useState({
    customerId: '',
    branch: 'Main Branch',
    date: new Date().toISOString().substring(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    salesperson: '',
    discountTotal: 0,
    justification: '',
  });
  const [quoteItems, setQuoteItems] = useState([blankLine(products)]);

  const [isSoModalOpen, setIsSoModalOpen] = useState(false);
  const [editingSoId, setEditingSoId] = useState(null);
  const [selectedQuoteForSo, setSelectedQuoteForSo] = useState(null);
  const [soForm, setSoForm] = useState({
    paymentTerms: 'Net 30'
  });

  const [isChalanModalOpen, setIsChalanModalOpen] = useState(false);
  const [selectedSoForChalan, setSelectedSoForChalan] = useState(null);
  const [chalanForm, setChalanForm] = useState({
    driverName: '',
    vehicleNo: '',
    qtyDispatched: ''
  });

  /* ─────────── Delivery Chalan ─────────── */
  const [chalanInv, setChalanInv]         = useState(null);
  const [chalanDriver, setChalanDriver]   = useState('');
  const [chalanVehicle, setChalanVehicle] = useState('');

  /* ─────────── Ledger ─────────── */
  const [ledgerCust, setLedgerCust]   = useState('');
  const [ledgerFrom, setLedgerFrom]   = useState('');
  const [ledgerTo, setLedgerTo]       = useState('');

  /* ─────────── COA ─────────── */
  const [coa] = useState(() => { try { const r = localStorage.getItem('erp_coa'); return r ? JSON.parse(r) : []; } catch { return []; } });

  /* ─────────── Load Data ─────────── */
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const invs  = await salesService.getSalesInvoices();
    const rets  = JSON.parse(localStorage.getItem('erp_sales_returns') || '[]');
    const rcpts = salesService.getReceiptHistory();
    const quotes = salesService.getQuotations();
    const orders = salesService.getSalesOrders();
    const chls   = salesService.getChalans();
    setInvoices(invs || []);
    setReturnsList(rets || []);
    setReceiptsList(rcpts || []);
    setQuotations(quotes || []);
    setSalesOrders(orders || []);
    setChalans(chls || []);
    setStats(salesService.getDashboardStats(invs || [], rets || [], rcpts || []));
  };

  const reload = async () => { await loadData(); onRefresh?.(); };

  /* ─────────── Computed ─────────── */
  const agingReport = useMemo(() => salesService.getARAgingReport(invoices), [invoices]);

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    if (filters.customer !== 'all' && inv.customerId !== filters.customer) return false;
    if (filters.status !== 'all' && inv.paymentStatus !== filters.status) return false;
    if (filters.approvalStatus !== 'all' && (inv.approvalStatus || 'auto_approved') !== filters.approvalStatus) return false;
    if (filters.deliveryStatus !== 'all' && (inv.deliveryStatus || 'pending') !== filters.deliveryStatus) return false;
    if (filters.fromDate && inv.date < filters.fromDate) return false;
    if (filters.toDate && inv.date > filters.toDate) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const cust = customers.find(c => c.id === inv.customerId);
      if (!inv.invoiceNo.toLowerCase().includes(q) && !(cust?.name || '').toLowerCase().includes(q) && !(inv.quoteNo || '').toLowerCase().includes(q) && !(inv.soNumber || '').toLowerCase().includes(q)) return false;
    }
    if (filters.aging !== 'all') {
      const today = new Date();
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(new Date(inv.date || new Date()).setDate(new Date(inv.date || new Date()).getDate() + 30));
      const days = Math.max(0, Math.floor((today - due) / 86400000));
      const bucket = agingReport.find(b => days >= b.min && days <= b.max);
      if (!bucket || bucket.key !== filters.aging) return false;
    }
    return true;
  }), [invoices, filters, customers, agingReport]);

  /* ─────────── Line Calculations ─────────── */
  const calcLine = (item) => vatService.calculateLine(item.unitPrice, item.qty, item.vatRateId, item.discount || 0);
  const totals = useMemo(() => items.reduce((acc, item) => {
    const c = calcLine(item);
    const taxRateObj = taxRates.find(r => r.id === item.taxRateId) || taxRates.find(r => r.isDefault) || { rate: 0 };
    const taxRate = taxRateObj.rate || 0;
    const lineTax = (c.taxableAmt + c.vatAmount) * (taxRate / 100);
    return {
      subtotal: acc.subtotal + c.taxableAmt,
      vat: acc.vat + c.vatAmount,
      tax: acc.tax + lineTax,
      grand: acc.grand + c.lineTotal
    };
  }, { subtotal: 0, vat: 0, tax: 0, grand: 0 }), [items, taxRates]);

  const quoteTotals = useMemo(() => quoteItems.reduce((acc, item) => {
    const c = calcLine(item);
    const taxRateObj = taxRates.find(r => r.id === item.taxRateId) || taxRates.find(r => r.isDefault) || { rate: 0 };
    const taxRate = taxRateObj.rate || 0;
    const lineTax = (c.taxableAmt + c.vatAmount) * (taxRate / 100);
    return {
      subtotal: acc.subtotal + c.taxableAmt,
      vat: acc.vat + c.vatAmount,
      tax: acc.tax + lineTax,
      grand: acc.grand + c.lineTotal
    };
  }, { subtotal: 0, vat: 0, tax: 0, grand: 0 }), [quoteItems, taxRates]);

  const setItem = (i, key, val) => setItems(ls => ls.map((l, j) => {
    if (j !== i) return l;
    const u = { ...l, [key]: val };
    if (key === 'type') {
      u.productId = '';
      u.productName = '';
      u.unitPrice = '';
      u.narration = '';
    } else if (key === 'productId') {
      if (l.type === 'service') {
        const s = services.find(x => x.id === val);
        if (s) {
          u.productName = s.name;
          u.narration = s.description || s.name;
          u.unitPrice = s.baseFee || 0;
        } else {
          u.productName = '';
          u.narration = '';
          u.unitPrice = '';
        }
      } else {
        const p = products.find(x => x.id === val);
        if (p) {
          u.productName = p.name;
          u.narration = p.description || p.name;
          u.unitPrice = p.price || p.purchasePrice || 0;
        } else {
          u.productName = '';
          u.narration = '';
          u.unitPrice = '';
        }
      }
    }
    return u;
  }));
  const addLine    = () => setItems(ls => [...ls, blankLine(products)]);
  const removeLine = (i) => setItems(ls => ls.filter((_, j) => j !== i));

  const setQuoteItem = (i, key, val) => setQuoteItems(ls => ls.map((l, j) => {
    if (j !== i) return l;
    const u = { ...l, [key]: val };
    if (key === 'type') {
      u.productId = '';
      u.productName = '';
      u.unitPrice = '';
      u.narration = '';
    } else if (key === 'productId') {
      if (l.type === 'service') {
        const s = services.find(x => x.id === val);
        if (s) {
          u.productName = s.name;
          u.narration = s.description || s.name;
          u.unitPrice = s.baseFee || 0;
        } else {
          u.productName = '';
          u.narration = '';
          u.unitPrice = '';
        }
      } else {
        const p = products.find(x => x.id === val);
        if (p) {
          u.productName = p.name;
          u.narration = p.description || p.name;
          u.unitPrice = p.price || p.purchasePrice || 0;
        } else {
          u.productName = '';
          u.narration = '';
          u.unitPrice = '';
        }
      }
    }
    return u;
  }));
  const addQuoteLine    = () => setQuoteItems(ls => [...ls, blankLine(products)]);
  const removeQuoteLine = (i) => setQuoteItems(ls => ls.filter((_, j) => j !== i));

  /* ─────────── Credit Shield & Limit Check ─────────── */
  const creditShield = useMemo(() => {
    if (!form.customerId) return null;
    const cust = customers.find(c => c.id === form.customerId);
    const limit = Number(cust?.creditLimit || 100000);
    const ar = Number(cust?.currentBalance || 0);
    const invoice = Number(totals.grand - Number(form.discountTotal || 0));
    const projected = ar + invoice;
    const remaining = limit - projected;
    const isExceeded = limit > 0 && projected > limit;

    const totalAllocated = Math.max(limit, projected);
    const arPct = totalAllocated > 0 ? (ar / totalAllocated) * 100 : 0;
    const invPct = totalAllocated > 0 ? (invoice / totalAllocated) * 100 : 0;
    const availPct = Math.max(0, 100 - arPct - invPct);

    return { limit, ar, invoice, projected, remaining, isExceeded, arPct, invPct, availPct };
  }, [form.customerId, totals.grand, form.discountTotal, customers]);

  /* ─────────── Delete/Revert & Edit Actions ─────────── */
  const deleteInvoiceJournalsAndRevertCOA = (invoiceNo) => {
    try {
      const journals = JSON.parse(localStorage.getItem('erp_journal_entries') || '[]');
      const coa = JSON.parse(localStorage.getItem('erp_coa') || '[]');
      
      const matching = journals.filter(j => j.refNo === invoiceNo || j.refNo === `${invoiceNo}-COGS`);
      
      matching.forEach(entry => {
        entry.lines.forEach(line => {
          const acc = coa.find(a => a.id === line.accountId);
          if (acc) {
            let balance = Number(acc.balance || 0);
            const isDebitIncrease = ['asset', 'expense'].includes(acc.type);
            if (line.type === 'debit') {
              balance -= isDebitIncrease ? Number(line.amount) : -Number(line.amount);
            } else {
              balance -= isDebitIncrease ? -Number(line.amount) : Number(line.amount);
            }
            acc.balance = balance;
          }
        });
      });
      
      const remainingJournals = journals.filter(j => j.refNo !== invoiceNo && j.refNo !== `${invoiceNo}-COGS`);
      localStorage.setItem('erp_journal_entries', JSON.stringify(remainingJournals));
      localStorage.setItem('erp_coa', JSON.stringify(coa));
    } catch (err) {
      console.error('Error reverting COA/Journals: ', err);
    }
  };

  const handleDeleteInvoice = (invoiceNo) => {
    if (window.confirm(`Are you sure you want to delete Invoice ${invoiceNo}?`)) {
      deleteInvoiceJournalsAndRevertCOA(invoiceNo);
      const invoicesList = JSON.parse(localStorage.getItem('erp_sales_invoices') || '[]');
      const updated = invoicesList.filter(inv => inv.invoiceNo !== invoiceNo);
      localStorage.setItem('erp_sales_invoices', JSON.stringify(updated));
      setSuccessMsg(`🗑️ Invoice ${invoiceNo} deleted successfully.`);
      reload();
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleDeleteQuotation = (id) => {
    if (window.confirm(`Are you sure you want to delete Quotation ${id}?`)) {
      const list = JSON.parse(localStorage.getItem('erp_quotations') || '[]');
      const updated = list.filter(q => q.id !== id);
      localStorage.setItem('erp_quotations', JSON.stringify(updated));
      setSuccessMsg(`🗑️ Quotation ${id} deleted successfully.`);
      reload();
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleDeleteSalesOrder = (id) => {
    if (window.confirm(`Are you sure you want to delete Sales Order ${id}?`)) {
      const list = JSON.parse(localStorage.getItem('erp_sales_orders') || '[]');
      const updated = list.filter(so => so.id !== id);
      localStorage.setItem('erp_sales_orders', JSON.stringify(updated));
      setSuccessMsg(`🗑️ Sales Order ${id} deleted successfully.`);
      reload();
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleEditInvoice = (inv) => {
    setEditingInvoiceId(inv.invoiceNo);
    setForm({
      customerId: inv.customerId,
      date: inv.date,
      dueDate: inv.dueDate,
      narration: inv.narration,
      discountTotal: inv.discountTotal || 0,
      quoteNo: inv.quoteNo || '',
      soNumber: inv.soNumber || '',
      salesperson: inv.salesperson || '',
      branch: inv.branch || 'Main Branch',
      chalanNo: inv.chalanNo || '',
    });
    setItems(inv.items.map(it => ({
      type: it.type || 'product',
      productId: it.productId,
      productName: it.productName,
      qty: it.qty,
      unitPrice: it.unitPrice,
      discount: it.discount || 0,
      vatRateId: it.vatRateId || (vatRates.find(r => r.rate === it.vatRate)?.id) || 'vat-exempt',
      taxRateId: it.taxRateId || (taxRates.find(r => r.rate === it.taxRate)?.id) || 'tax-exempt',
      narration: it.narration || '',
    })));
    setShowForm(true);
  };

  const handleEditQuotation = (q) => {
    setEditingQuoteId(q.id);
    setQuoteForm({
      customerId: q.customerId,
      branch: q.branch || 'Main Branch',
      date: q.date,
      dueDate: q.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
      salesperson: q.salesperson || '',
      discountTotal: q.discountTotal || 0,
      justification: q.justification || '',
    });
    setQuoteItems(q.items.map(it => ({
      type: it.type || 'product',
      productId: it.productId,
      productName: it.productName,
      qty: it.qty,
      unitPrice: it.unitPrice,
      discount: it.discount || 0,
      vatRateId: it.vatRateId || (vatRates.find(r => r.rate === it.vatRate)?.id) || 'vat-exempt',
      taxRateId: it.taxRateId || (taxRates.find(r => r.rate === it.taxRate)?.id) || 'tax-exempt',
      narration: it.narration || '',
    })));
    setIsQuoteModalOpen(true);
  };

  const handleEditSalesOrder = (so) => {
    setEditingSoId(so.id);
    setSelectedQuoteForSo({
      id: so.quoteId || '',
      customerId: so.customerId,
      items: so.items
    });
    setSoForm({
      paymentTerms: so.paymentTerms || 'Net 30'
    });
    setIsSoModalOpen(true);
  };

  /* ─────────── Submit Invoice ─────────── */
  const handleSubmit = async () => {
    if (!form.customerId) return alert('Select a customer.');
    if (items.some(l => !l.productId || Number(l.qty) <= 0 || Number(l.unitPrice) <= 0)) return alert('Fill all item lines correctly.');
    if (creditShield && creditShield.isExceeded) {
      alert(`⚠️ আপনার ক্রেডিট লিমিট অতিক্রম করেছে, আপনি এটি সেভ করতে পারবেন না。\n\n(Credit Limit Exceeded: You cannot save this invoice.)`);
      return;
    }
    setLoading(true);
    try {
      if (editingInvoiceId) {
        deleteInvoiceJournalsAndRevertCOA(editingInvoiceId);
        const invoicesList = JSON.parse(localStorage.getItem('erp_sales_invoices') || '[]');
        const updatedInvoices = invoicesList.filter(inv => inv.invoiceNo !== editingInvoiceId);
        localStorage.setItem('erp_sales_invoices', JSON.stringify(updatedInvoices));
      }

      const refNo = await salesService.postSalesInvoice({
        ...form,
        invoiceNo: editingInvoiceId || undefined,
        branchId: 'br-1',
        discountTotal: Number(form.discountTotal || 0),
        items: items.map(l => ({ ...l, qty: Number(l.qty), unitPrice: Number(l.unitPrice), discount: Number(l.discount || 0) })),
      }, currentUser);
      
      // Mark linked Sales Order as completed
      if (form.soNumber) {
        const orders = JSON.parse(localStorage.getItem('erp_sales_orders') || '[]');
        const updatedOrders = orders.map(o => o.id === form.soNumber ? { ...o, status: 'completed' } : o);
        localStorage.setItem('erp_sales_orders', JSON.stringify(updatedOrders));
      }

      setSuccessMsg(`✅ Invoice ${refNo} posted! Stock updated, journals posted.`);
      setShowForm(false);
      setEditingInvoiceId(null);
      setItems([blankLine(products)]);
      setForm(f => ({ ...f, narration: '', discountTotal: 0, quoteNo: '', soNumber: '', salesperson: '', chalanNo: '' }));
      await reload();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  /* ─────────── Receipt ─────────── */
  const outstandingInvoices = useMemo(() => invoices.filter(inv => inv.customerId === payForm.customerId && inv.paymentStatus !== 'paid'), [invoices, payForm.customerId]);
  const customerReceipts    = useMemo(() => receiptsList.filter(r => r.customerId === payForm.customerId), [receiptsList, payForm.customerId]);

  const handleReceipt = async () => {
    if (!payForm.customerId || !payForm.amount) return alert('Fill all fields.');
    const amt = Number(payForm.amount);
    if (amt <= 0) return alert('Amount must be greater than zero.');
    if (payForm.invoiceNo) {
      const inv = invoices.find(i => i.invoiceNo === payForm.invoiceNo);
      if (inv) {
        const remaining = (inv.grandTotal || 0) - (inv.paidAmount || 0);
        if (amt > remaining + 0.01) return alert(`⚠️ Overpayment! Remaining balance for ${payForm.invoiceNo} is ${fmt(remaining)}.`);
      }
    }
    setLoading(true);
    try {
      const refNo = await salesService.receiveFromCustomer({
        customerId: payForm.customerId, amount: amt,
        method: payForm.method, accountId: payForm.accountId,
        chequeNo: payForm.chequeNo, invoiceNo: payForm.invoiceNo || undefined,
        narration: payForm.narration || `Receipt from ${customers.find(c => c.id === payForm.customerId)?.name || 'Customer'}`,
      }, currentUser);
      setSuccessMsg(`✅ Receipt ${refNo} posted! A/R ledger updated.`);
      setPayForm(f => ({ ...f, amount: '', narration: '', chequeNo: '', invoiceNo: '' }));
      await reload();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  /* ─────────── Sales Workflow Handlers ─────────── */
  const handleCreateQuotation = (e) => {
    e.preventDefault();
    if (!quoteForm.customerId) return alert('Select a customer.');
    if (quoteItems.some(i => !i.productId)) return alert('Please select a product/service for all lines.');
    if (quoteItems.some(i => !i.qty || Number(i.qty) <= 0)) return alert('Please enter a valid quantity for all lines.');
    if (quoteItems.some(i => !i.unitPrice || Number(i.unitPrice) < 0)) return alert('Please enter a valid unit price for all lines.');

    // 1. Calculate VAT
    const vatCalc = vatService.calculateInvoiceVAT(quoteItems);
    const subtotal = vatCalc.subtotal;
    const vatAmount = vatCalc.totalVat;
    const grandTotal = vatCalc.grandTotal;

    // 2. Calculate Tax (AIT) per line
    let totalTaxAmount = 0;
    const linesWithTax = vatCalc.lines.map((l, index) => {
      const originalItem = quoteItems[index] || {};
      const taxRateObj = taxRates.find(r => r.id === originalItem.taxRateId) || taxRates.find(r => r.isDefault) || { rate: 0 };
      const taxRate = taxRateObj.rate || 0;
      const lineVatTotal = l.taxableAmt + l.vatAmount;
      const lineTaxAmt = +(lineVatTotal * (taxRate / 100)).toFixed(2);
      totalTaxAmount += lineTaxAmt;
      return {
        type: originalItem.type || 'product',
        productId: l.productId,
        productName: l.productName || '',
        qty: l.qty,
        unitPrice: l.unitPrice,
        vatRateId: l.vatRateId,
        vatRate: l.vatRate,
        taxableAmt: l.taxableAmt,
        vatAmount: l.vatAmount,
        lineTotal: l.lineTotal,
        taxRateId: originalItem.taxRateId || 'tax-exempt',
        taxRate,
        taxAmount: lineTaxAmt,
        narration: originalItem.narration || '',
      };
    });
    totalTaxAmount = +totalTaxAmount.toFixed(2);
    const netReceivable = +(grandTotal - totalTaxAmount).toFixed(2);

    const newQuote = {
      id: editingQuoteId || `QT-2026-${String(quotations.length + 1).padStart(4, '0')}`,
      date: quoteForm.date || new Date().toISOString().substring(0, 10),
      dueDate: quoteForm.dueDate || '',
      customerId: quoteForm.customerId,
      branch: quoteForm.branch || 'Main Branch',
      salesperson: quoteForm.salesperson || currentUser?.displayName || 'Sales Agent',
      items: linesWithTax,
      subtotal,
      vatAmount,
      totalTaxAmount,
      netReceivable,
      discountTotal: Number(quoteForm.discountTotal || 0),
      grandTotal,
      status: 'draft',
      justification: quoteForm.justification || ''
    };

    salesService.saveQuotation(newQuote, currentUser);
    setIsQuoteModalOpen(false);
    setEditingQuoteId(null);
    setQuoteForm({
      customerId: '',
      branch: 'Main Branch',
      date: new Date().toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
      salesperson: '',
      discountTotal: 0,
      justification: ''
    });
    setQuoteItems([blankLine(products)]);
    setSuccessMsg(`✅ Quotation ${newQuote.id} ${editingQuoteId ? 'updated' : 'created'}!`);
    reload();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleAcceptQuotation = (quoteId) => {
    salesService.acceptQuotation(quoteId);
    setSuccessMsg(`✅ Quotation ${quoteId} accepted by customer.`);
    reload();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCreateSalesOrder = (e) => {
    e.preventDefault();
    if (!selectedQuoteForSo) return;
    
    if (editingSoId) {
      const orders = JSON.parse(localStorage.getItem('erp_sales_orders') || '[]');
      const updated = orders.map(o => o.id === editingSoId ? { ...o, paymentTerms: soForm.paymentTerms } : o);
      localStorage.setItem('erp_sales_orders', JSON.stringify(updated));
      
      setSuccessMsg(`✅ Sales Order ${editingSoId} updated successfully.`);
      setIsSoModalOpen(false);
      setSelectedQuoteForSo(null);
      setEditingSoId(null);
      reload();
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }

    const newSO = {
      id: `SO-2026-${String(salesOrders.length + 1).padStart(4, '0')}`,
      quoteId: selectedQuoteForSo.id,
      customerId: selectedQuoteForSo.customerId,
      date: new Date().toISOString().substring(0, 10),
      items: selectedQuoteForSo.items,
      status: 'pending_approval',
      paymentTerms: soForm.paymentTerms || 'Net 30'
    };
    salesService.saveSalesOrder(newSO, currentUser);
    setIsSoModalOpen(false);
    setSelectedQuoteForSo(null);
    setSuccessMsg(`✅ Sales Order ${newSO.id} created and awaiting approval.`);
    reload();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleApproveSalesOrder = async (orderId) => {
    const approver = simulatedRole === 'CFO' ? 'CFO (Executive)' : (currentUser?.displayName || 'Sales Manager');
    setLoading(true);
    try {
      const result = await salesService.approveSalesOrder(orderId, approver, currentUser);
      if (result.invoiceNo) {
        setSuccessMsg(`✅ SO ${orderId} approved! Invoice ${result.invoiceNo} auto-created and posted.`);
      } else {
        setSuccessMsg(`⚠️ SO ${orderId} approved, but auto-invoice was skipped: ${result.warning}`);
      }
      await reload();
      setTimeout(() => setSuccessMsg(''), 7000);
    } catch (err) {
      alert(`❌ Approval failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSalesOrder = (orderId) => {
    salesService.rejectSalesOrder(orderId);
    setSuccessMsg(`❌ Sales Order ${orderId} rejected.`);
    reload();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCreateChalan = async (e) => {
    e.preventDefault();
    if (!selectedSoForChalan) return;
    if (!chalanForm.driverName || !chalanForm.vehicleNo || !chalanForm.qtyDispatched) {
      alert('Please fill all required fields.');
      return;
    }
    const qtyDisp = Number(chalanForm.qtyDispatched);
    const orderedQty = selectedSoForChalan.items[0]?.qty || 0;
    if (qtyDisp > orderedQty) {
      alert(`Dispatched quantity cannot exceed ordered quantity (${orderedQty} pcs).`);
      return;
    }
    const newChalan = {
      id: `CH-2026-${String(chalans.length + 1).padStart(4, '0')}`,
      soId: selectedSoForChalan.id,
      date: new Date().toISOString().substring(0, 10),
      driverName: chalanForm.driverName,
      vehicleNo: chalanForm.vehicleNo,
      items: [{
        productId: selectedSoForChalan.items[0].productId,
        productName: selectedSoForChalan.items[0].productName,
        qtyDispatched: qtyDisp,
        unitPrice: selectedSoForChalan.items[0].unitPrice
      }],
      status: 'dispatched'
    };
    await salesService.saveChalan(newChalan, currentUser);
    setIsChalanModalOpen(false);
    setSelectedSoForChalan(null);
    setChalanForm({ driverName: '', vehicleNo: '', qtyDispatched: '' });
    setSuccessMsg(`✅ Delivery Chalan ${newChalan.id} dispatched! Stock updated.`);
    reload();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSoChange = (soId) => {
    if (!soId) {
      setForm(f => ({ ...f, soNumber: '', quoteNo: '', customerId: customers[0]?.id || '' }));
      setItems([blankLine(products)]);
      return;
    }
    const so = salesOrders.find(o => o.id === soId);
    if (so) {
      setForm(f => ({
        ...f,
        soNumber: so.id,
        quoteNo: so.quoteId || '',
        customerId: so.customerId,
        narration: `Billing for Sales Order ${so.id}`,
      }));
      setItems(so.items.map(it => ({
        type: it.type || 'product',
        productId: it.productId,
        productName: it.productName,
        qty: it.qty,
        unitPrice: it.unitPrice,
        vatRateId: 'vat-std',
        discount: 0
      })));
    }
  };

  const handleChalanChange = (chId) => {
    if (!chId) {
      setForm(f => ({ ...f, chalanNo: '', soNumber: '', quoteNo: '', customerId: customers[0]?.id || '' }));
      setItems([blankLine(products)]);
      return;
    }
    const ch = chalans.find(c => c.id === chId);
    if (ch) {
      const so = salesOrders.find(o => o.id === ch.soId);
      setForm(f => ({
        ...f,
        chalanNo: ch.id,
        soNumber: ch.soId,
        quoteNo: so?.quoteId || '',
        customerId: so?.customerId || customers[0]?.id || '',
        narration: `Billing for Delivery Chalan ${ch.id}`,
      }));
      setItems(ch.items.map(it => ({
        type: 'product',
        productId: it.productId,
        productName: it.productName,
        qty: it.qtyDispatched,
        unitPrice: it.unitPrice || 0,
        vatRateId: 'vat-std',
        discount: 0
      })));
    }
  };

  /* ─────────── Return Workflow ─────────── */
  const initiateReturn = (inv) => {
    setReturnInv(inv); setReturnReason(''); setReturnNarration('');
    setReturnItems(inv.items.map(it => ({ ...it, originalQty: it.qty, returnQty: 0, vatRateId: it.vatRateId || 'vat-std' })));
  };

  const handlePostReturn = async () => {
    const toReturn = returnItems.filter(it => Number(it.returnQty) > 0);
    if (toReturn.length === 0) return alert('Select at least one item with quantity > 0.');
    for (const it of toReturn) { if (Number(it.returnQty) > it.originalQty) return alert(`Return qty for "${it.productName}" exceeds original (${it.originalQty}).`); }
    if (!returnReason) return alert('Please select a return reason.');
    setLoading(true);
    try {
      const formatted = toReturn.map(it => ({ productId: it.productId, qty: Number(it.returnQty), unitPrice: Number(it.unitPrice), vatRateId: it.vatRateId || 'vat-std', discount: Number(it.discount || 0), customerId: returnInv.customerId }));
      const returnNo = await salesService.postSalesReturn(returnInv.invoiceNo, formatted, `[${returnReason}] ${returnNarration || `Return against ${returnInv.invoiceNo}`}`, currentUser);
      setSuccessMsg(`✅ Return ${returnNo} posted! Stock restored, A/R reversed.`);
      setReturnInv(null);
      await reload();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  /* ─────────── Approvals & Delivery ─────────── */
  const handleApproveInvoice = (invoiceNo) => {
    salesService.approveInvoice(invoiceNo, currentUser?.displayName || 'Finance Manager');
    setSuccessMsg(`✅ Invoice ${invoiceNo} approved.`);
    reload(); setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleMarkDelivered = (inv, status, chalanNo = '') => {
    salesService.updateDeliveryStatus(inv.invoiceNo, status, chalanNo);
    setSuccessMsg(`✅ Delivery status for ${inv.invoiceNo} updated to "${status}".`);
    setChalanInv(null); setChalanDriver(''); setChalanVehicle('');
    reload(); setTimeout(() => setSuccessMsg(''), 4000);
  };

  /* ─────────── POS Handlers ─────────── */
  const posTotal = posItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const filteredPosProducts = products.filter(p => {
    if (posCategory !== 'all' && p.category !== posCategory) return false;
    if (posSearch.trim()) { const q = posSearch.toLowerCase(); return p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q); }
    return true;
  });
  const addToPos = (p) => {
    setPosItems(items => {
      const ex = items.find(x => x.productId === p.id);
      if (ex) return items.map(x => x.productId === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [...items, { productId: p.id, productName: p.name, unitPrice: p.price || 0, qty: 1, vatRateId: 'vat-std', discount: 0 }];
    });
  };
  const posVatCalc = useMemo(() => {
    if (posItems.length === 0) return { subtotal: 0, totalVat: 0, grandTotal: 0 };
    return vatService.calculateInvoiceVAT(posItems);
  }, [posItems]);

  const handlePosCheckout = async () => {
    if (posItems.length === 0) return setPosMsg('Add at least one product.');
    const cash = Number(posCash || 0);
    if (cash < posVatCalc.grandTotal) return setPosMsg(`Insufficient cash. Need ${fmt(posVatCalc.grandTotal)}.`);
    const posCustId = posCustomerId || customers[0]?.id;
    if (posCustId) {
      const cust = customers.find(c => c.id === posCustId);
      const limit = Number(cust?.creditLimit || 100000);
      const ar = Number(cust?.currentBalance || 0);
      const invoice = posVatCalc.grandTotal;
      const projected = ar + invoice;
      if (limit > 0 && projected > limit) {
        alert(`⚠️ আপনার ক্রেডিট লিমিট অতিক্রম করেছে, আপনি এটি সেভ করতে পারবেন না。\n\n(Credit Limit Exceeded: You cannot save this invoice.)`);
        setPosMsg('Credit Limit Exceeded.');
        return;
      }
    }
    setLoading(true);
    try {
      const refNo = await salesService.postSalesInvoice({
        customerId: posCustomerId || customers[0]?.id,
        date: new Date().toISOString().substring(0, 10),
        narration: 'POS Cash Sale',
        branch: 'Main Branch',
        items: posItems,
      }, currentUser);
      setCompletedPosSale({ refNo, items: [...posItems], grandTotal: posVatCalc.grandTotal, cash, change: cash - posVatCalc.grandTotal });
      setPosItems([]); setPosCash(''); setPosMsg('');
      await reload();
    } catch (err) { setPosMsg('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  /* ─────────── Customer Ledger ─────────── */
  const ledgerStatement = useMemo(() => {
    if (!ledgerCust) return [];
    return salesService.getCustomerStatement(ledgerCust, ledgerFrom, ledgerTo);
  }, [ledgerCust, ledgerFrom, ledgerTo, invoices, receiptsList, returnsList]);

  const downloadCustomerLedgerPDF = (custId) => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF is not loaded.');
    const cust = customers.find(c => c.id === custId);
    const stmt = ledgerStatement;
    if (!cust || stmt.length === 0) return alert('No statement data to export.');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.rect(5, 5, 200, 287);
    
    // Header
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text('ACCOUNTICA', 105, 18, { align: 'center' });
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text('House-12, Road-05, Dhanmondi, Dhaka-1205, Bangladesh', 105, 23, { align: 'center' });
    doc.text('BIN: 001234567-0101 | info@erpforu.com', 105, 27, { align: 'center' });
    doc.setLineWidth(0.5); doc.setDrawColor(37, 99, 235); doc.line(10, 31, 200, 31);
    
    // Title
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(37, 99, 235);
    doc.text('CUSTOMER ACCOUNT STATEMENT', 105, 41, { align: 'center' });
    
    // Info Block
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(10, 47, 190, 28, 'FD');
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold'); doc.text('Customer Details:', 12, 53); doc.setFont('Helvetica', 'normal');
    doc.text(cust.name || custId, 45, 53);
    doc.text(`Address: ${cust.address || 'N/A'}`, 12, 59);
    doc.text(`Phone: ${cust.phone || 'N/A'}`, 12, 65);
    doc.text(`Email: ${cust.email || 'N/A'}`, 12, 71);
    
    doc.setFont('Helvetica', 'bold'); doc.text('Statement Summary:', 110, 53); doc.setFont('Helvetica', 'normal');
    doc.text(`Period: ${ledgerFrom || 'All Time'} to ${ledgerTo || 'Present'}`, 110, 59);
    const balance = cust.currentBalance || 0;
    doc.text(`Total Transactions: ${stmt.length}`, 110, 65);
    doc.text(`Outstanding Balance: BDT ${balance.toLocaleString()}`, 110, 71);
    
    // Table Header
    let tableY = 80;
    doc.setFillColor(241, 245, 249); doc.rect(10, tableY, 190, 8, 'F'); doc.rect(10, tableY, 190, 8);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('Date', 12, tableY + 5.5);
    doc.text('Ref No', 30, tableY + 5.5);
    doc.text('Type', 65, tableY + 5.5);
    doc.text('Debit (Sales)', 95, tableY + 5.5, { align: 'right' });
    doc.text('Credit (Pay/Ret)', 130, tableY + 5.5, { align: 'right' });
    doc.text('Balance BDT', 180, tableY + 5.5, { align: 'right' });
    
    doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59);
    let y = tableY + 8;
    
    stmt.forEach((t) => {
      if (y > 260) {
        doc.addPage();
        doc.rect(5, 5, 200, 287);
        y = 20;
        // repeat table header
        doc.setFillColor(241, 245, 249); doc.rect(10, y, 190, 8, 'F'); doc.rect(10, y, 190, 8);
        doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('Date', 12, y + 5.5);
        doc.text('Ref No', 30, y + 5.5);
        doc.text('Type', 65, y + 5.5);
        doc.text('Debit (Sales)', 95, y + 5.5, { align: 'right' });
        doc.text('Credit (Pay/Ret)', 130, y + 5.5, { align: 'right' });
        doc.text('Balance BDT', 180, y + 5.5, { align: 'right' });
        doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59);
        y += 8;
      }
      doc.rect(10, y, 190, 8);
      doc.text(t.date || '', 12, y + 5.5);
      doc.text(t.refNo || '', 30, y + 5.5);
      doc.text(t.type || '', 65, y + 5.5);
      doc.text(t.debit > 0 ? Number(t.debit).toLocaleString() : '—', 95, y + 5.5, { align: 'right' });
      doc.text(t.credit > 0 ? Number(t.credit).toLocaleString() : '—', 130, y + 5.5, { align: 'right' });
      doc.text(Number(t.balance).toLocaleString() + (t.balance > 0 ? ' Dr' : ' Cr'), 180, y + 5.5, { align: 'right' });
      y += 8;
    });
    
    doc.save(`Statement_${cust.name.replace(/\s+/g, '_')}.pdf`);
  };

  /* ─────────── PDF ─────────── */
  const downloadInvoicePDF = (inv) => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF is not loaded.');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.rect(5, 5, 200, 287);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text('ACCOUNTICA', 105, 18, { align: 'center' });
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text('House-12, Road-05, Dhanmondi, Dhaka-1205, Bangladesh', 105, 23, { align: 'center' });
    doc.text('BIN: 001234567-0101 | TIN: 9876543210 | info@erpforu.com', 105, 27, { align: 'center' });
    doc.setLineWidth(0.5); doc.setDrawColor(37, 99, 235); doc.line(10, 31, 200, 31);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(37, 99, 235);
    doc.text('SALES TAX INVOICE', 105, 41, { align: 'center' });
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(10, 47, 190, 28, 'FD');
    const cust = customers.find(c => c.id === inv.customerId);
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'bold'); doc.text('Billed To (Customer):', 12, 53); doc.setFont('Helvetica', 'normal');
    doc.text(cust?.name || inv.customerId, 50, 53); doc.text(`Address: ${cust?.address || 'N/A'}`, 12, 59);
    doc.text(`Phone: ${cust?.phone || 'N/A'}`, 12, 65); doc.text(`TIN/BIN: ${cust?.vatNo || 'N/A'}`, 12, 71);
    doc.setFont('Helvetica', 'bold'); doc.text('Invoice Details:', 110, 53); doc.setFont('Helvetica', 'normal');
    doc.text(`Invoice No: ${inv.invoiceNo}`, 110, 59); doc.text(`Date: ${inv.date}`, 110, 65);
    doc.text(`Due Date: ${inv.dueDate || '—'}`, 110, 68); doc.text(`Status: ${(inv.paymentStatus || 'unpaid').toUpperCase()}`, 110, 71);
    let tableY = 80;
    doc.setFillColor(241, 245, 249); doc.rect(10, tableY, 190, 8, 'F'); doc.rect(10, tableY, 190, 8);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('SL', 12, tableY + 5.5); doc.text('Product', 20, tableY + 5.5);
    doc.text('Qty', 85, tableY + 5.5, { align: 'right' }); doc.text('Price', 110, tableY + 5.5, { align: 'right' });
    doc.text('Taxable', 135, tableY + 5.5, { align: 'right' }); doc.text('VAT%', 158, tableY + 5.5, { align: 'right' }); doc.text('Total', 180, tableY + 5.5, { align: 'right' });
    doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59); let y = tableY + 8;
    inv.items?.forEach((item, idx) => {
      doc.rect(10, y, 190, 8);
      let nm = item.productName || ''; if (nm.length > 30) nm = nm.substring(0, 28) + '...';
      doc.text(String(idx + 1), 12, y + 5.5); doc.text(nm, 20, y + 5.5);
      doc.text(String(item.qty), 85, y + 5.5, { align: 'right' }); doc.text(Number(item.unitPrice).toLocaleString(), 110, y + 5.5, { align: 'right' });
      doc.text(Number(item.taxableAmt || item.unitPrice * item.qty).toLocaleString(), 135, y + 5.5, { align: 'right' });
      doc.text(`${item.vatRate || 0}%`, 158, y + 5.5, { align: 'right' }); doc.text(Number(item.lineTotal || item.unitPrice * item.qty).toLocaleString(), 180, y + 5.5, { align: 'right' }); y += 8;
    });
    doc.setFillColor(248, 250, 252); doc.rect(10, y, 190, 16, 'F'); doc.rect(10, y, 190, 16);
    doc.setFont('Helvetica', 'bold'); doc.text('Subtotal:', 120, y + 5.5); doc.text(Number(inv.subtotal).toLocaleString(), 180, y + 5.5, { align: 'right' });
    doc.text('VAT Amount:', 120, y + 11.5); doc.text(Number(inv.vatAmount).toLocaleString(), 180, y + 11.5, { align: 'right' });
    y += 16; doc.setFillColor(241, 245, 249); doc.rect(10, y, 190, 8, 'F'); doc.rect(10, y, 190, 8);
    doc.text('Grand Total (BDT):', 120, y + 5.5); doc.text(Number(inv.grandTotal).toLocaleString(), 180, y + 5.5, { align: 'right' });
    y += 14; doc.text('Amount in Words:', 10, y); doc.setFont('Helvetica', 'normal');
    doc.text(numberToWords(Math.round(inv.grandTotal)), 50, y);
    y += 35; doc.setLineWidth(0.3); doc.setDrawColor(148, 163, 184);
    doc.line(15, y, 55, y); doc.line(80, y, 120, y); doc.line(145, y, 185, y);
    doc.setFontSize(8); doc.setFont('Helvetica', 'bold');
    doc.text('Customer Signature', 35, y + 4, { align: 'center' }); doc.text('Prepared By', 100, y + 4, { align: 'center' }); doc.text('Authorized Sign & Seal', 165, y + 4, { align: 'center' });
    doc.save(`Invoice_${inv.invoiceNo}.pdf`);
  };

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Sales Cockpit Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #1e1b4b 30%, #311062 100%)',
        borderRadius: '20px',
        padding: '1.75rem 2rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative subtle background circle glow */}
        <div style={{
          position: 'absolute',
          right: '-10%',
          top: '-20%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '0.75rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#a5b4fc' }}>
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>Sales Cockpit</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500 }}>
              Order-to-Cash Lifecycle, AR Aging Oversight & Customer Ledger Audits
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {/* Custom Styled Role Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '9999px',
            padding: '4px 14px',
            gap: '0.35rem',
            position: 'relative'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role:</span>
            <select
              value={simulatedRole}
              onChange={e => { setSimulatedRole(e.target.value); localStorage.setItem('erp_sales_simulated_role', e.target.value); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                paddingRight: '12px',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            >
              <option value="Agent" style={{ background: '#1e1b4b', color: '#fff' }}>Sales Agent</option>
              <option value="Manager" style={{ background: '#1e1b4b', color: '#fff' }}>Sales Manager</option>
              <option value="Dispatcher" style={{ background: '#1e1b4b', color: '#fff' }}>Warehouse Dispatcher</option>
              <option value="Accountant" style={{ background: '#1e1b4b', color: '#fff' }}>Finance Accountant</option>
              <option value="CFO" style={{ background: '#1e1b4b', color: '#fff' }}>CFO (Executive)</option>
            </select>
            {/* Custom Caret Arrow */}
            <span style={{
              position: 'absolute',
              right: '12px',
              pointerEvents: 'none',
              fontSize: '0.55rem',
              color: '#94a3b8'
            }}>▼</span>
          </div>

          {/* Pending Approval Badge */}
          {stats.pendingApprovalCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#fbbf24',
              gap: '4px'
            }}>
              ⏳ {stats.pendingApprovalCount} Review Required
            </div>
          )}

          {/* + New Invoice Action button */}
          <button
            onClick={() => { setShowForm(true); setTab('invoices'); }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '9999px',
              padding: '8px 18px',
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)'; }}
          >
            + New Invoice
          </button>
        </div>
      </div>

      {/* ── Success Banner ── */}
      {successMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.9rem 1.25rem', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontWeight: 600, color: '#15803d' }}>{successMsg}</div>
      )}

      {/* ── 10 KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Invoices',    value: stats.totalInvoices,             icon: '🧾', color: '#2563eb' },
          { label: 'Total Revenue',     value: fmt(stats.totalRevenue),          icon: '💰', color: '#7c3aed' },
          { label: 'VAT Collected',     value: fmt(stats.totalVAT),              icon: '📋', color: '#0891b2' },
          { label: 'Outstanding AR',    value: fmt(stats.outstandingAR),         icon: '⚠️', color: '#dc2626' },
          { label: 'Paid Invoices',     value: stats.paidCount,                  icon: '✅', color: '#16a34a' },
          { label: 'Partial Payments',  value: stats.partialCount,               icon: '⚡', color: '#7c3aed' },
          { label: 'Overdue Invoices',  value: stats.overdueCount,               icon: '🔴', color: '#ef4444' },
          { label: 'Return Value',      value: fmt(stats.returnValue),           icon: '↩', color: '#f97316' },
          { label: 'Gross Profit',      value: fmt(stats.grossProfit),           icon: '📈', color: '#16a34a' },
          { label: 'Gross Margin',      value: `${stats.grossMargin}%`,          icon: '🎯', color: '#0891b2' },
        ].map(k => (
          <div key={k.label}
            style={{ background: `linear-gradient(135deg, ${k.color}15, ${k.color}08)`, border: `1px solid ${k.color}25`, borderRadius: 14, padding: '0.85rem 1rem', cursor: 'default', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${k.color}20`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{k.icon}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="scrollable-tab-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 10, width: 'fit-content' }}>
          {[
            { id: 'dashboard',  label: '📊 Dashboard'        },
            { id: 'quotations', label: '📄 Quotations'       },
            { id: 'orders',     label: '📋 Sales Orders'     },
            { id: 'invoices',   label: '🧾 Invoices'         },
            { id: 'pos',        label: '🛒 POS'              },
            { id: 'payments',   label: '💰 Payments'         },
            { id: 'deliveries', label: '🚚 Deliveries'       },
            { id: 'returns',    label: '↩ Returns'           },
            { id: 'ledger',     label: '🏢 Customer Ledger'  },
            { id: 'aging',      label: '📅 AR Aging'         },
            { id: 'analytics',  label: '📈 Analytics'        },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '0.4rem 0.8rem', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.77rem', fontWeight: 600, background: tab === t.id ? 'var(--bg-secondary)' : 'transparent', color: tab === t.id ? 'var(--accent-color)' : 'var(--text-muted)', boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none', whiteSpace: 'nowrap' }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         TAB: DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid-2">
            {/* Monthly Revenue vs COGS Comparative Trend */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>📊 Monthly Revenue vs COGS</h3>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Revenue</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'linear-gradient(180deg, #ef4444, #b91c1c)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>COGS</span>
                  </div>
                </div>
              </div>
              {(() => {
                const maxVal = Math.max(...stats.monthlySpend.map(m => Math.max(m.value, m.cogs)), 1);
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: 130 }}>
                    {stats.monthlySpend.map((m, i) => {
                      const revH = (m.value / maxVal) * 100;
                      const cogsH = (m.cogs / maxVal) * 100;
                      return (
                        <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, flex: 1, width: '100%', justifyContent: 'center' }}>
                            {/* Revenue Bar */}
                            <div 
                              style={{ width: '40%', height: `${Math.max(revH, 2)}%`, background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius: '3px 3px 0 0', minHeight: 4, opacity: i === stats.monthlySpend.length - 1 ? 1 : 0.75 }} 
                              title={`Revenue: ${fmt(m.value)}`} 
                            />
                            {/* COGS Bar */}
                            <div 
                              style={{ width: '40%', height: `${Math.max(cogsH, 2)}%`, background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)', borderRadius: '3px 3px 0 0', minHeight: 4, opacity: i === stats.monthlySpend.length - 1 ? 1 : 0.75 }} 
                              title={`COGS: ${fmt(m.cogs)}`} 
                            />
                          </div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', marginTop: 2 }}>{m.label}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Attention Alerts */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>🚨 Attention Required</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {stats.pendingApprovalCount > 0 && <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>⏳ {stats.pendingApprovalCount} invoice(s) awaiting approval</div>}
                {stats.overdueCount > 0 && <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>🔴 {stats.overdueCount} overdue invoice(s) need collection follow-up</div>}
                {agingReport[4]?.invoices.length > 0 && <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(127,29,29,0.1)', border: '1px solid rgba(127,29,29,0.2)', borderRadius: 8, fontSize: '0.78rem', color: '#7f1d1d', fontWeight: 600 }}>⚠️ {agingReport[4].invoices.length} invoice(s) are 90+ days overdue ({fmt(agingReport[4].total)})</div>}
                {stats.partialCount > 0 && <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: '0.78rem', color: '#7c3aed', fontWeight: 600 }}>⚡ {stats.partialCount} invoice(s) have outstanding partial balances</div>}
                {stats.pendingApprovalCount === 0 && stats.overdueCount === 0 && stats.partialCount === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>🎉 No urgent items — collections are on track!</div>}
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Top Customers */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>🏆 Top Customers by Revenue</h3>
              {stats.topCustomers.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>No sales data yet.</div>
              ) : stats.topCustomers.map((tc, idx) => {
                const cust = customers.find(c => c.id === tc.id);
                const max = stats.topCustomers[0]?.value || 1;
                return (
                  <div key={tc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.55rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #4f46e5)', color: '#fff', fontSize: '0.62rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</div>
                    <div style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600 }}>{cust?.name || tc.id}</div>
                    <div style={{ width: 80, height: 5, background: 'var(--bg-tertiary)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(tc.value / max) * 100}%`, background: 'var(--accent-color)', borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-color)' }}>{fmt(tc.value)}</div>
                  </div>
                );
              })}
            </div>

            {/* Top Products */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>📦 Top Products by Revenue</h3>
              {stats.topProducts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>No sales data yet.</div>
              ) : stats.topProducts.map((tp, idx) => {
                const max = stats.topProducts[0]?.value || 1;
                return (
                  <div key={tp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.55rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontSize: '0.62rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</div>
                    <div style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600 }}>{tp.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tp.qty} pcs</div>
                    <div style={{ width: 60, height: 5, background: 'var(--bg-tertiary)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(tp.value / max) * 100}%`, background: '#16a34a', borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700, color: '#16a34a' }}>{fmt(tp.value)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AR Aging Summary */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>📅 AR Aging Snapshot</h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {agingReport.map(bucket => (
                <div key={bucket.key} style={{ flex: '1 1 150px', background: bucket.bg, border: `1px solid ${bucket.color}30`, borderRadius: 12, padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => { setFilter('aging', bucket.key); setTab('invoices'); }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: bucket.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{bucket.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: bucket.color, fontFamily: 'monospace' }}>{fmt(bucket.total)}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{bucket.invoices.length} inv</div>
                </div>
              ))}
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
          <div className="card" style={{ padding: '0.9rem 1.25rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            <input type="text" className="form-control" style={{ flex: '1 1 200px' }} placeholder="🔍 Search invoice, customer, quote or SO no..." value={filters.search} onChange={e => setFilter('search', e.target.value)} />
            <select className="form-control" style={{ width: '160px' }} value={filters.customer} onChange={e => setFilter('customer', e.target.value)}>
              <option value="all">All Customers</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="form-control" style={{ width: '120px' }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="all">All Payment</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
            <select className="form-control" style={{ width: '130px' }} value={filters.approvalStatus} onChange={e => setFilter('approvalStatus', e.target.value)}>
              <option value="all">All Approval</option>
              <option value="auto_approved">Auto-Approved</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
            <select className="form-control" style={{ width: '130px' }} value={filters.deliveryStatus} onChange={e => setFilter('deliveryStatus', e.target.value)}>
              <option value="all">All Delivery</option>
              <option value="pending">Pending</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
            </select>
            <input type="date" className="form-control" style={{ width: '130px' }} value={filters.fromDate} onChange={e => setFilter('fromDate', e.target.value)} />
            <input type="date" className="form-control" style={{ width: '130px' }} value={filters.toDate} onChange={e => setFilter('toDate', e.target.value)} />
            <select className="form-control" style={{ width: '120px' }} value={filters.aging} onChange={e => setFilter('aging', e.target.value)}>
              <option value="all">All Aging</option>
              <option value="current">0–15 Days</option>
              <option value="b30">16–30 Days</option>
              <option value="b60">31–60 Days</option>
              <option value="b90">61–90 Days</option>
              <option value="over90">90+ Days</option>
            </select>
            {Object.values(filters).some(v => v && v !== 'all') && (
              <button onClick={() => setFilters({ search: '', customer: 'all', status: 'all', approvalStatus: 'all', deliveryStatus: 'all', fromDate: '', toDate: '', aging: 'all' })} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✕ Clear</button>
            )}
          </div>

          <div className="table-container">
            {filteredInvoices.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div><div>No matching invoices found.</div></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Invoice No</th><th>Quote No</th><th>SO No</th><th>Customer</th><th>Date</th><th>Due Date</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Paid</th><th style={{ textAlign: 'right' }}>Balance</th><th>Payment</th><th>Delivery</th><th>Approval</th><th className="no-print">Actions</th></tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, i) => {
                    const cust = customers.find(c => c.id === inv.customerId);
                    const balance = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
                    const today = new Date();
                    const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(new Date(inv.date || new Date()).setDate(new Date(inv.date || new Date()).getDate() + 30));
                    const overdue = inv.paymentStatus !== 'paid' && dueDate < today;
                    return (
                      <tr key={i} onClick={() => setDetailInv(inv)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontWeight: 700 }}>{inv.invoiceNo}</td>
                        <td style={{ fontSize: '0.75rem', color: inv.quoteNo ? 'var(--text-primary)' : 'var(--text-muted)' }}>{inv.quoteNo || '—'}</td>
                        <td style={{ fontSize: '0.75rem', color: inv.soNumber ? 'var(--text-primary)' : 'var(--text-muted)' }}>{inv.soNumber || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{cust?.name || inv.customerId}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{window.formatDate(inv.date)}</td>
                        <td style={{ fontSize: '0.8rem', color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: overdue ? 700 : 400 }}>{window.formatDate(inv.dueDate)}{overdue && ' ⚠️'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(inv.grandTotal)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{(inv.paidAmount || 0) > 0 ? fmt(inv.paidAmount) : '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: balance > 0 ? 'var(--danger)' : '#16a34a' }}>{balance > 0 ? fmt(balance) : '—'}</td>
                        <td><StatusPill map={PAY_STATUS} val={inv.paymentStatus || 'unpaid'} /></td>
                        <td><StatusPill map={DEL_STATUS} val={inv.deliveryStatus || 'pending'} /></td>
                        <td><StatusPill map={APR_STATUS} val={inv.approvalStatus || 'auto_approved'} /></td>
                        <td onClick={e => e.stopPropagation()} className="no-print">
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem' }} onClick={() => setDetailInv(inv)} title="View Detail">👁️</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem' }} onClick={() => handleEditInvoice(inv)} title="Edit Invoice">✏️</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem', color: 'var(--danger)' }} onClick={() => handleDeleteInvoice(inv.invoiceNo)} title="Delete Invoice">🗑️</button>
                            
                            <span style={{ borderLeft: '1px solid var(--border-color)', height: '14px', margin: '0 2px' }}></span>
                            
                            {inv.approvalStatus === 'pending' && <button className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.65rem', background: '#d97706', border: 'none' }} onClick={() => handleApproveInvoice(inv.invoiceNo)}>✓ Approve</button>}
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.65rem' }} onClick={() => { const allReceipts = JSON.parse(localStorage.getItem('erp_customer_receipts') || '[]'); const invReceipts = allReceipts.filter(r => r.invoiceNo === inv.invoiceNo).sort((a,b) => (a.date||'').localeCompare(b.date||'')); printProInvoice(inv, customers.find(c => c.id === inv.customerId), invReceipts); }}>🖨️ Print</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.65rem', color: 'var(--danger)' }} onClick={() => initiateReturn(inv)} title="Sales Return">↩</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}>
                    <td colSpan={6} style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Totals ({filteredInvoices.length} invoices)</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--accent-color)' }}>{fmt(filteredInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0))}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#16a34a' }}>{fmt(filteredInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0))}</td>
                    <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--danger)' }}>{fmt(filteredInvoices.reduce((s, i) => s + Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0)), 0))}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: QUOTATIONS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'quotations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>📄 Customer Quotations</h3>
            {simulatedRole === 'Agent' && (
              <button onClick={() => {
                setQuoteForm({ customerId: '', salesperson: currentUser?.displayName || '', type: 'product', productId: '', qty: 1, unitPrice: '', justification: '' });
                setIsQuoteModalOpen(true);
              }} className="btn btn-primary">
                ➕ New Quotation
              </button>
            )}
          </div>

          <div className="table-container">
            {quotations.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                <div>No quotations found. Click "New Quotation" to draft one.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quote Number</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Salesperson</th>
                    <th>Item Details</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => {
                    const cust = customers.find(c => c.id === q.customerId);
                    const item = q.items[0];
                    const qTotal = (item?.qty || 0) * (item?.unitPrice || 0);
                    const statusColors = {
                      draft: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', text: 'Draft' },
                      sent: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', text: 'Sent' },
                      accepted: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', text: 'Accepted' },
                      expired: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', text: 'Expired' }
                    };
                    const s = statusColors[q.status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', text: q.status };
                    return (
                      <tr key={q.id} onClick={() => setDetailQuote(q)} style={{ cursor: 'pointer', background: detailQuote?.id === q.id ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-color)' }}>{q.id}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.date}</td>
                        <td style={{ fontWeight: 600 }}>{cust?.name || q.customerId}</td>
                        <td>{q.salesperson}</td>
                        <td>{item?.productName || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{item?.qty}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(qTotal)}</td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, color: s.color, background: s.bg }}>
                            {s.text}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem' }} onClick={() => setDetailQuote(q)} title="View Detail">👁️</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem' }} onClick={() => handleEditQuotation(q)} title="Edit Quotation">✏️</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem', color: 'var(--danger)' }} onClick={() => handleDeleteQuotation(q.id)} title="Delete Quotation">🗑️</button>
                            
                            <span style={{ borderLeft: '1px solid var(--border-color)', height: '14px', margin: '0 2px' }}></span>

                            <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.65rem' }} onClick={() => {
                              const qt = {
                                quoteNo:        q.id,
                                date:           q.date,
                                validityDate:   q.dueDate || '',
                                grandTotal:     q.grandTotal || ((q.items || []).reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0) + (q.vatAmount || 0) - (q.discountTotal || 0)),
                                subtotal:       q.subtotal || (q.items || []).reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0),
                                vatAmount:      q.vatAmount || 0,
                                totalTaxAmount: q.totalTaxAmount || 0,
                                netReceivable:  q.netReceivable || 0,
                                discountTotal:  q.discountTotal || 0,
                                salesperson:    q.salesperson,
                                branch:         q.branch || 'Main Branch',
                                narration:      q.justification || '',
                                termsText:      '1. Payment: 50% advance upon order confirmation, balance before delivery.\n2. Delivery: 15–21 working days after order confirmation.\n3. Warranty: 12 months from delivery date.\n4. Subject to standard terms of sales.',
                                items: (q.items || []).map(i => ({
                                  productName: i.productName,
                                  narration:   i.narration || '',
                                  qty:         i.qty,
                                  unitPrice:   i.unitPrice,
                                  discount:    i.discount || 0,
                                  vatRate:     i.vatRate || 0,
                                  taxRate:     i.taxRate || 0,
                                  taxAmount:   i.taxAmount || 0,
                                  lineTotal:   i.lineTotal || ((i.qty || 0) * (i.unitPrice || 0)),
                                })),
                              };
                              printProQuotation(qt, customers.find(c => c.id === q.customerId));
                            }}>🖨️ Print</button>

                            {q.status === 'draft' && simulatedRole === 'Agent' && (
                              <button onClick={() => {
                                salesService.saveQuotation({ ...q, status: 'sent' }, currentUser);
                                reload();
                                setSuccessMsg(`✅ Quotation ${q.id} marked as Sent to Customer.`);
                                setTimeout(() => setSuccessMsg(''), 4000);
                              }} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#3b82f6', borderColor: '#3b82f6' }}>
                                Mark Sent
                              </button>
                            )}
                            {q.status === 'sent' && simulatedRole === 'Agent' && (
                              <button onClick={() => handleAcceptQuotation(q.id)} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#10b981', borderColor: '#10b981' }}>
                                Mark Accepted
                              </button>
                            )}
                            {q.status === 'accepted' && simulatedRole === 'Agent' && (
                              <button onClick={() => {
                                setSelectedQuoteForSo(q);
                                setSoForm({ paymentTerms: 'Net 30' });
                                setIsSoModalOpen(true);
                              }} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#7c3aed', borderColor: '#7c3aed' }}>
                                Convert to SO
                              </button>
                            )}
                            {q.status === 'accepted' && simulatedRole !== 'Agent' && (
                              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Accepted</span>
                            )}
                            {q.status === 'draft' && simulatedRole !== 'Agent' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Draft</span>
                            )}
                            {q.status === 'sent' && simulatedRole !== 'Agent' && (
                              <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700 }}>Sent</span>
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

      {/* ══════════════════════════════════════════════════════════
         TAB: SALES ORDERS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <div className="table-container">
          {salesOrders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
              <div>No Sales Orders found. Accepted Quotations can be converted by Sales Agents.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>SO Number</th>
                  <th>Quote Ref</th>
                  <th>Customer</th>
                  <th>SO Date</th>
                  <th>Item Details</th>
                  <th style={{ textAlign: 'right' }}>Total Value</th>
                  <th>Terms</th>
                  <th>Status</th>
                  <th>Invoice</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesOrders.map(so => {
                  const cust = customers.find(c => c.id === so.customerId);
                  const item = so.items[0];
                  const soTotal = (item?.qty || 0) * (item?.unitPrice || 0);
                  const statusColors = {
                    pending_approval: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: 'Pending Approval' },
                    approved: { color: '#2563eb', bg: 'rgba(37,99,235,0.1)', text: 'Approved' },
                    invoiced: { color: '#059669', bg: 'rgba(5,150,105,0.12)', text: '🧾 Invoiced' },
                    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', text: 'Rejected' },
                    processing: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', text: 'Processing' },
                    completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', text: 'Completed' }
                  };
                  const s = statusColors[so.status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', text: so.status };
                  return (
                    <tr key={so.id} onClick={() => setDetailSo(so)} style={{ cursor: 'pointer', background: detailSo?.id === so.id ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-color)' }}>{so.id}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{so.quoteId || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{cust?.name || so.customerId}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{so.date}</td>
                      <td>{item ? `${item.productName} (${item.qty} pcs)` : '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(soTotal)}</td>
                      <td>{so.paymentTerms}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, color: s.color, background: s.bg }}>
                          {s.text}
                        </span>
                        {so.invoiceWarning && (
                           <div style={{ fontSize: '0.62rem', color: '#f59e0b', marginTop: 2 }} title={so.invoiceWarning}>⚠️ Invoice skipped</div>
                         )}
                      </td>
                      <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                         {so.invoiceNo ? (
                           <span
                             style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 800, color: '#059669', cursor: 'pointer', textDecoration: 'underline' }}
                             title={`View invoice ${so.invoiceNo}`}
                             onClick={() => { setTab('invoices'); setFilters(f => ({ ...f, search: so.invoiceNo })); }}
                           >
                             {so.invoiceNo}
                           </span>
                         ) : (
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                         )}
                         {so.status === 'approved' && so.invoiceWarning && (simulatedRole === 'Manager' || simulatedRole === 'CFO') && (
                           <button
                             onClick={() => handleApproveSalesOrder(so.id)}
                             className="btn btn-sm"
                             style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#f59e0b', borderColor: '#f59e0b', color: '#fff', cursor: 'pointer' }}
                             title={so.invoiceWarning}
                           >🔄 Retry Invoice</button>
                         )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem' }} onClick={() => setDetailSo(so)} title="View Detail">👁️</button>
                          <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem' }} onClick={() => handleEditSalesOrder(so)} title="Edit Sales Order">✏️</button>
                          <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.4rem', fontSize: '0.65rem', color: 'var(--danger)' }} onClick={() => handleDeleteSalesOrder(so.id)} title="Delete Sales Order">🗑️</button>
                          
                          <span style={{ borderLeft: '1px solid var(--border-color)', height: '14px', margin: '0 2px' }}></span>

                          <button className="btn btn-sm btn-secondary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.65rem' }} onClick={() => {
                            const quoteRef = quotations.find(q => q.id === so.quoteId);
                            const soWithSalesperson = {
                              ...so,
                              salesperson: so.salesperson || quoteRef?.salesperson || 'Sales Agent',
                              discountTotal: so.discountTotal || quoteRef?.discountTotal || 0
                            };
                            const customer = customers.find(c => c.id === so.customerId);
                            printProSalesOrder(soWithSalesperson, customer);
                          }}>🖨️ Print</button>

                          {so.status === 'pending_approval' && (simulatedRole === 'Manager' || simulatedRole === 'CFO') && (
                            <>
                              <button onClick={() => handleApproveSalesOrder(so.id)} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem' }}>Approve</button>
                              <button onClick={() => handleRejectSalesOrder(so.id)} className="btn btn-sm btn-danger" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}>Reject</button>
                            </>
                          )}
                          {(so.status === 'approved' || so.status === 'invoiced') && simulatedRole === 'Dispatcher' && (
                             <button onClick={() => {
                               setSelectedSoForChalan(so);
                               setChalanForm({ driverName: '', vehicleNo: '', qtyDispatched: String(so.items[0].qty) });
                               setIsChalanModalOpen(true);
                             }} className="btn btn-sm btn-primary" style={{ padding: '0.22rem 0.5rem', fontSize: '0.68rem', background: '#16a34a', borderColor: '#16a34a' }}>
                               🚚 Dispatch Goods
                             </button>
                           )}
                           {so.status === 'pending_approval' && simulatedRole !== 'Manager' && simulatedRole !== 'CFO' && (
                             <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>Awaiting Approval</span>
                           )}
                           {so.status === 'approved' && simulatedRole !== 'Dispatcher' && (
                             <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>Approved</span>
                           )}
                           {so.status === 'invoiced' && simulatedRole !== 'Dispatcher' && (
                             <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>🧾 Invoiced</span>
                           )}
                           {so.status === 'processing' && (
                             <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700 }}>Dispatched</span>
                           )}
                           {so.status === 'completed' && (
                             <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Billed</span>
                           )}
                           {so.status === 'rejected' && (
                             <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>Closed</span>
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
         TAB: POS CHECKOUT
      ══════════════════════════════════════════════════════════ */}
      {tab === 'pos' && (
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>
          {/* Product Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <input type="text" className="form-control" style={{ flex: '1 1 180px' }} placeholder="🔍 Search product or SKU..." value={posSearch} onChange={e => setPosSearch(e.target.value)} />
              <select className="form-control" style={{ width: '160px' }} value={posCategory} onChange={e => setPosCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {[...new Set(products.map(p => p.category).filter(Boolean))].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem', maxHeight: '520px', overflowY: 'auto' }}>
              {filteredPosProducts.map(p => (
                <div key={p.id} onClick={() => p.qty > 0 && addToPos(p)} style={{ background: 'var(--bg-tertiary)', border: `1px solid ${p.qty > 0 ? 'var(--border-color)' : 'var(--danger-light)'}`, borderRadius: 10, padding: '0.75rem', cursor: p.qty > 0 ? 'pointer' : 'not-allowed', opacity: p.qty > 0 ? 1 : 0.5, transition: 'all 0.15s', userSelect: 'none' }}
                  onMouseEnter={e => p.qty > 0 && (e.currentTarget.style.transform = 'scale(1.03)', e.currentTarget.style.borderColor = 'var(--accent-color)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'none', e.currentTarget.style.borderColor = p.qty > 0 ? 'var(--border-color)' : 'var(--danger-light)')}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 4, lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(p.price || 0)}</div>
                  <div style={{ fontSize: '0.63rem', color: p.qty > 0 ? '#16a34a' : 'var(--danger)', fontWeight: 600, marginTop: 2 }}>{p.qty > 0 ? `Stock: ${p.qty}` : 'Out of Stock'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {completedPosSale ? (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>Sale Complete!</h3>
                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', marginBottom: '0.5rem' }}>Invoice: <strong>{completedPosSale.refNo}</strong></div>
                <div style={{ fontSize: '0.82rem' }}>Total: <strong>{fmt(completedPosSale.grandTotal)}</strong></div>
                <div style={{ fontSize: '0.82rem' }}>Cash: <strong>{fmt(completedPosSale.cash)}</strong></div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>Change: {fmt(completedPosSale.change)}</div>
                <button onClick={() => setCompletedPosSale(null)} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>New Sale</button>
              </div>
            ) : (
              <div className="card" style={{ padding: '1rem', flex: 1 }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.75rem' }}>🛒 Cart</h3>
                {posItems.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Click products to add to cart</div>
                ) : posItems.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.45rem' }}>
                    <div style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600 }}>{it.productName}</div>
                    <button onClick={() => setPosItems(pi => pi.map((x, j) => j === idx ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{it.qty}</span>
                    <button onClick={() => setPosItems(pi => pi.map((x, j) => j === idx ? { ...x, qty: x.qty + 1 } : x))} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-color)', minWidth: 65, textAlign: 'right' }}>{fmt(it.qty * it.unitPrice)}</span>
                    <button onClick={() => setPosItems(pi => pi.filter((_, j) => j !== idx))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
                  </div>
                ))}
                {posItems.length > 0 && (
                  <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Subtotal:</span><span style={{ fontFamily: 'monospace' }}>{fmt(posVatCalc.subtotal || posTotal)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}><span style={{ color: 'var(--text-muted)' }}>VAT:</span><span style={{ fontFamily: 'monospace' }}>{fmt(posVatCalc.totalVat || 0)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem' }}><span>Total:</span><span style={{ fontFamily: 'monospace', color: 'var(--accent-color)' }}>{fmt(posVatCalc.grandTotal || posTotal)}</span></div>
                    <select className="form-control" style={{ marginBottom: '0.6rem', fontSize: '0.8rem' }} value={posCustomerId} onChange={e => setPosCustomerId(e.target.value)}>
                      <option value="">Walk-in Customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="number" className="form-control" style={{ marginBottom: '0.4rem', fontSize: '0.88rem', fontFamily: 'monospace' }} placeholder="Cash Received (৳)" value={posCash} onChange={e => setPosCash(e.target.value)} />
                    
                    {/* Quick Cash Buttons */}
                    {(() => {
                      const g = posVatCalc.grandTotal || posTotal;
                      if (g <= 0) return null;
                      const exact = Math.ceil(g);
                      const n100 = Math.ceil(g / 100) * 100;
                      const n500 = Math.ceil(g / 500) * 500;
                      const n1000 = Math.ceil(g / 1000) * 1000;
                      const options = [...new Set([exact, n100, n500, n1000])].filter(v => v >= g).slice(0, 4);
                      return (
                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                          {options.map(val => (
                            <button key={val} type="button" onClick={() => setPosCash(String(val))} style={{ flex: 1, padding: '3px 6px', fontSize: '0.68rem', fontWeight: 700, background: Number(posCash) === val ? 'var(--accent-color)' : 'var(--bg-tertiary)', color: Number(posCash) === val ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' }}>
                              ৳{val}
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {posCash && Number(posCash) >= (posVatCalc.grandTotal || posTotal) && (
                      <div style={{ marginBottom: '0.6rem', padding: '0.5rem', background: 'rgba(34,197,94,0.1)', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, color: '#16a34a' }}>💵 Change: {fmt(Number(posCash) - (posVatCalc.grandTotal || posTotal))}</div>
                    )}
                    {posMsg && <div style={{ marginBottom: '0.5rem', fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>{posMsg}</div>}
                    <button onClick={handlePosCheckout} disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>{loading ? 'Processing...' : '✓ Complete Sale'}</button>
                    <button onClick={() => setPosItems([])} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.4rem', fontSize: '0.8rem' }}>Clear Cart</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: PAYMENTS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'payments' && (
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          {/* Payment Form */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '1.25rem' }}>💰 Receive Customer Payment</h3>
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select className="form-control" value={payForm.customerId} onChange={e => setPayForm(f => ({ ...f, customerId: e.target.value, invoiceNo: '', amount: '' }))}>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {payForm.customerId && <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600, marginTop: 3 }}>Outstanding AR: {fmt(customers.find(c => c.id === payForm.customerId)?.currentBalance || 0)}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Allocate to Invoice (Optional)</label>
              <select className="form-control" value={payForm.invoiceNo} onChange={e => {
                const inv = outstandingInvoices.find(i => i.invoiceNo === e.target.value);
                setPayForm(f => ({ ...f, invoiceNo: e.target.value, amount: inv ? String(Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0)).toFixed(2)) : f.amount }));
              }}>
                <option value="">— Unallocated payment —</option>
                {outstandingInvoices.map(b => <option key={b.invoiceNo} value={b.invoiceNo}>{b.invoiceNo} — Due: {fmt(Math.max(0, (b.grandTotal || 0) - (b.paidAmount || 0)))}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (৳)</label>
              <input type="number" className="form-control" placeholder="0.00" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              {payForm.invoiceNo && payForm.amount && (() => {
                const inv = invoices.find(i => i.invoiceNo === payForm.invoiceNo);
                if (!inv) return null;
                const remaining = (inv.grandTotal || 0) - (inv.paidAmount || 0);
                const amt = Number(payForm.amount);
                if (amt > remaining + 0.01) return <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700, marginTop: 2 }}>⚠️ Overpayment! Max: {fmt(remaining)}</div>;
                if (amt < remaining) return <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700, marginTop: 2 }}>⚡ Partial — {fmt(remaining - amt)} will remain</div>;
                return <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, marginTop: 2 }}>✓ Full payment</div>;
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
              <label className="form-label">Bank / Cash Account</label>
              <select className="form-control" value={payForm.accountId} onChange={e => setPayForm(f => ({ ...f, accountId: e.target.value }))}>
                <option value="acc-1020">Current Account (BKB)</option>
                <option value="acc-1021">Savings Account (Dhaka Bank)</option>
                <option value="acc-1030">Petty Cash</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Narration</label>
              <input className="form-control" placeholder="Payment reference..." value={payForm.narration} onChange={e => setPayForm(f => ({ ...f, narration: e.target.value }))} />
            </div>
            <div style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-color)', marginBottom: 3 }}>📒 Journal Preview</div>
              <div><span style={{ color: '#2563eb' }}>DR</span> Bank/Cash: <strong>{fmt(payForm.amount)}</strong></div>
              <div><span style={{ color: '#7c3aed' }}>CR</span> Accounts Receivable (1100): <strong>{fmt(payForm.amount)}</strong></div>
            </div>
            <button onClick={handleReceipt} disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>{loading ? 'Posting...' : '💰 Post Customer Receipt'}</button>
          </div>

          {/* Outstanding + Receipt History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.75rem' }}>📋 Outstanding Invoices</h3>
              {outstandingInvoices.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>🎉 No outstanding invoices.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Invoice</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem' }}>Total</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem' }}>Paid</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem' }}>Balance</th>
                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>Settle</th>
                  </tr></thead>
                  <tbody>
                    {outstandingInvoices.map((bill, idx) => {
                      const balance = (bill.grandTotal || 0) - (bill.paidAmount || 0);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: payForm.invoiceNo === bill.invoiceNo ? 'rgba(37,99,235,0.05)' : 'transparent' }}>
                          <td style={{ padding: '0.45rem 0.4rem', fontFamily: 'monospace', fontWeight: 700 }}>{bill.invoiceNo}</td>
                          <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(bill.grandTotal)}</td>
                          <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{bill.paidAmount > 0 ? fmt(bill.paidAmount) : '—'}</td>
                          <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--danger)' }}>{fmt(balance)}</td>
                          <td style={{ padding: '0.45rem 0.4rem', textAlign: 'center' }}>
                            <button onClick={() => setPayForm(f => ({ ...f, invoiceNo: bill.invoiceNo, amount: String(balance.toFixed(2)), narration: `Full payment for ${bill.invoiceNo}` }))} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>Settle</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.75rem' }}>🕒 Payment History</h3>
              {customerReceipts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No payments recorded for this customer.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Receipt No</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Method</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>Invoice</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem' }}>Amount</th>
                  </tr></thead>
                  <tbody>
                    {customerReceipts.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.45rem 0.4rem', fontFamily: 'monospace', color: '#16a34a', fontWeight: 700 }}>{r.receiptNo}</td>
                        <td style={{ padding: '0.45rem 0.4rem', color: 'var(--text-muted)' }}>{r.date}</td>
                        <td style={{ padding: '0.45rem 0.4rem', textTransform: 'capitalize' }}>{r.method}</td>
                        <td style={{ padding: '0.45rem 0.4rem', fontFamily: 'monospace', fontSize: '0.73rem' }}>{r.invoiceNo || '—'}</td>
                        <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>{fmt(r.amount)}</td>
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
         TAB: DELIVERIES
      ══════════════════════════════════════════════════════════ */}
      {tab === 'deliveries' && (
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
          {/* Left Column: Kanban Board */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>🚚 Delivery Pipeline (Invoices)</h3>
            
            {/* Kanban Board columns */}
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {[
                { statusKey: 'pending',    label: '📦 Pending Dispatch', color: '#6b7280', bg: 'rgba(100,100,100,0.04)' },
                { statusKey: 'dispatched', label: '🚚 In Transit', color: '#d97706', bg: 'rgba(245,158,11,0.03)' },
                { statusKey: 'delivered',  label: '✅ Delivered', color: '#16a34a', bg: 'rgba(34,197,94,0.03)' },
              ].map(col => {
                const list = invoices.filter(i => (i.deliveryStatus || 'pending') === col.statusKey);
                return (
                  <div key={col.statusKey} style={{ background: col.bg, border: '1px solid var(--border-color)', borderRadius: 14, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${col.color}`, paddingBottom: '0.35rem', marginBottom: '0.2rem' }}>
                      <strong style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{col.label}</strong>
                      <span style={{ fontSize: '0.68rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '1px 6px', borderRadius: 6, fontWeight: 700, color: col.color }}>{list.length}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '420px', flex: 1 }}>
                      {list.length === 0 ? (
                        <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', border: '1.25px dashed var(--border-color)', borderRadius: 8 }}>No shipments</div>
                      ) : list.map((inv, i) => {
                        const cust = customers.find(c => c.id === inv.customerId);
                        return (
                          <div key={i} style={{ background: 'var(--bg-secondary)', border: '1.25px solid var(--border-color)', borderRadius: 8, padding: '0.55rem', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-color)' }}>{inv.invoiceNo}</span>
                              <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(inv.grandTotal)}</span>
                            </div>
                            <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{cust?.name || inv.customerId}</div>
                            {inv.chalanNo && (
                              <div style={{ padding: '0.3rem', background: 'var(--bg-tertiary)', borderRadius: 5, fontSize: '0.62rem', marginTop: 4, border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                🚚 Chalan: <strong>{inv.chalanNo}</strong>
                              </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                              {col.statusKey === 'pending' && (
                                <button onClick={() => setChalanInv(inv)} className="btn btn-sm btn-primary" style={{ padding: '0.15rem 0.4rem', fontSize: '0.62rem', background: '#d97706', borderColor: '#d97706' }}>
                                  Dispatch
                                </button>
                              )}
                              {col.statusKey === 'dispatched' && (
                                <button onClick={() => handleMarkDelivered(inv, 'delivered', inv.chalanNo)} className="btn btn-sm btn-primary" style={{ padding: '0.15rem 0.4rem', fontSize: '0.62rem', background: '#16a34a', borderColor: '#16a34a' }}>
                                  Arrive
                                </button>
                              )}
                              <button onClick={() => setDetailInv(inv)} className="btn btn-sm btn-secondary" style={{ padding: '0.15rem 0.35rem', fontSize: '0.62rem' }}>
                                View
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Warehouse Delivery Chalans */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>📦 Delivery Chalans</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '520px' }}>
              {chalans.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>No Chalans dispatched yet.</div>
              ) : chalans.map(ch => {
                const item = ch.items[0];
                return (
                  <div key={ch.id} onClick={() => setDetailChalan(ch)} style={{ cursor: 'pointer', padding: '0.75rem', background: 'var(--bg-tertiary)', border: `1px solid ${detailChalan?.id === ch.id ? 'var(--accent-color)' : 'var(--border-color)'}`, borderRadius: 10, transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: '0.78rem' }}>{ch.id}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{ch.date}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 2 }}>SO Ref: <strong style={{ fontFamily: 'monospace' }}>{ch.soId}</strong></div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{item?.productName} (x{item?.qtyDispatched} pcs)</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      🚚 {ch.vehicleNo} | 👤 {ch.driverName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: RETURNS & CREDITS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'returns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Total Returns', value: returnsList.length, color: '#dc2626', icon: '↩' },
              { label: 'Return Value', value: fmt(stats.returnValue), color: '#ef4444', icon: '💸' },
              { label: 'Avg Return Size', value: returnsList.length > 0 ? fmt(stats.returnValue / returnsList.length) : '৳0', color: '#f97316', icon: '📊' },
            ].map(k => (
              <div key={k.label} style={{ background: `${k.color}10`, border: `1px solid ${k.color}25`, borderRadius: 12, padding: '1rem' }}>
                <div style={{ fontSize: '1.1rem' }}>{k.icon}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: k.color, margin: '4px 0' }}>{k.value}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{k.label}</div>
              </div>
            ))}
          </div>
          <div className="table-container">
            {returnsList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>↩</div><div>No returns recorded. Click "↩" on any invoice to initiate a return.</div></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Return No</th><th>Date</th><th>Orig. Invoice</th><th>Reason</th><th>Items</th><th style={{ textAlign: 'right' }}>Subtotal</th><th style={{ textAlign: 'right' }}>VAT</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {returnsList.map((ret, i) => {
                    const reasonText = ret.narration?.startsWith('[') ? ret.narration.substring(1, ret.narration.indexOf(']')) : ret.narration;
                    return (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--danger)', fontWeight: 700 }}>{ret.returnNo}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ret.date}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ret.originalInvoiceNo}</td>
                        <td><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.67rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>{reasonText || 'General Return'}</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ret.items?.length || 0} lines</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.82rem' }}>{fmt(ret.subtotal)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.82rem', color: '#0891b2' }}>{fmt(ret.vatAmount)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--danger)' }}>{fmt(ret.grandTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: CUSTOMER LEDGER
      ══════════════════════════════════════════════════════════ */}
      {tab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <select className="form-control" style={{ width: '220px' }} value={ledgerCust} onChange={e => setLedgerCust(e.target.value)}>
                <option value="">— Select Customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" className="form-control" style={{ width: '130px' }} value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} />
              <input type="date" className="form-control" style={{ width: '130px' }} value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} />
            </div>
            {ledgerCust && ledgerStatement.length > 0 && (
              <button onClick={() => downloadCustomerLedgerPDF(ledgerCust)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                🖨️ Download Statement
              </button>
            )}
          </div>

          {ledgerCust && (() => {
            const intel = salesService.getCustomerIntelligence(ledgerCust);
            const cust = customers.find(c => c.id === ledgerCust);
            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Total Invoices', value: intel?.totalInvoices || 0, color: '#2563eb' },
                    { label: 'Total Revenue', value: fmt(intel?.totalRevenue || 0), color: '#7c3aed' },
                    { label: 'Total Received', value: fmt(intel?.totalReceived || 0), color: '#16a34a' },
                    { label: 'Outstanding', value: fmt(intel?.outstandingBalance || 0), color: '#dc2626' },
                    { label: 'Return Value', value: fmt(intel?.returnValue || 0), color: '#f97316' },
                    { label: 'Return Rate', value: `${intel?.returnRate || 0}%`, color: '#d97706' },
                    { label: 'Avg Invoice', value: fmt(intel?.avgInvoiceSize || 0), color: '#0891b2' },
                    { label: 'Overdue Count', value: intel?.overdueCount || 0, color: '#ef4444' },
                  ].map(k => (
                    <div key={k.label} style={{ background: `${k.color}10`, border: `1px solid ${k.color}20`, borderRadius: 10, padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>{k.label}</div>
                    </div>
                  ))}
                </div>
                <div className="table-container">
                  {ledgerStatement.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found for {cust?.name} in this period.</div>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Description</th><th style={{ textAlign: 'right' }}>Debit (Invoice)</th><th style={{ textAlign: 'right' }}>Credit (Receipt/Return)</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
                      <tbody>
                        {ledgerStatement.map((t, idx) => (
                          <tr key={idx}>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.date}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: t.type === 'Invoice' ? 'var(--accent-color)' : t.type === 'Receipt' ? '#16a34a' : '#dc2626' }}>{t.refNo}</td>
                            <td><span style={{ padding: '2px 7px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 700, background: t.type === 'Invoice' ? 'rgba(37,99,235,0.1)' : t.type === 'Receipt' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: t.type === 'Invoice' ? '#2563eb' : t.type === 'Receipt' ? '#16a34a' : '#dc2626' }}>{t.type}</span></td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.description}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: t.debit > 0 ? '#dc2626' : 'var(--text-muted)' }}>{t.debit > 0 ? fmt(t.debit) : '—'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: t.credit > 0 ? '#16a34a' : 'var(--text-muted)' }}>{t.credit > 0 ? fmt(t.credit) : '—'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: t.balance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(Math.abs(t.balance))}{t.balance > 0 ? ' Dr' : ' Cr'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}
          {!ledgerCust && (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
              <div>Select a customer to view their complete account statement and intelligence profile.</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB: AR AGING
      ══════════════════════════════════════════════════════════ */}
      {tab === 'aging' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {agingReport.map(bucket => (
              <div key={bucket.key} style={{ background: bucket.bg, border: `1px solid ${bucket.color}30`, borderRadius: 14, padding: '1.1rem 1.25rem', cursor: 'pointer' }}
                onClick={() => { setFilter('aging', bucket.key); setTab('invoices'); }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: bucket.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{bucket.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: bucket.color, fontFamily: 'monospace' }}>{fmt(bucket.total)}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{bucket.invoices.length} invoice(s)</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>📋 Customer-wise Aging Breakdown</h3>
            {(() => {
              const custAging = {};
              agingReport.forEach(bucket => {
                bucket.invoices.forEach(inv => {
                  if (!custAging[inv.customerId]) custAging[inv.customerId] = { current: 0, b30: 0, b60: 0, b90: 0, over90: 0, total: 0 };
                  custAging[inv.customerId][bucket.key] = (custAging[inv.customerId][bucket.key] || 0) + inv.remaining;
                  custAging[inv.customerId].total += inv.remaining;
                });
              });
              const rows = Object.entries(custAging);
              if (rows.length === 0) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>🎉 No outstanding receivables.</div>;
              return (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th style={{ textAlign: 'right', color: '#22c55e' }}>0–15 Days</th>
                        <th style={{ textAlign: 'right', color: '#f59e0b' }}>16–30 Days</th>
                        <th style={{ textAlign: 'right', color: '#f97316' }}>31–60 Days</th>
                        <th style={{ textAlign: 'right', color: '#ef4444' }}>61–90 Days</th>
                        <th style={{ textAlign: 'right', color: '#7f1d1d' }}>90+ Days</th>
                        <th style={{ textAlign: 'right' }}>Total Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.sort((a, b) => b[1].total - a[1].total).map(([custId, data]) => {
                        const cust = customers.find(c => c.id === custId);
                        return (
                          <tr key={custId}>
                            <td style={{ fontWeight: 600 }}>{cust?.name || custId}</td>
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
         TAB: ANALYTICS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid-2">
            {/* Monthly Revenue vs COGS */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>📊 Revenue vs COGS (Last 6 Months)</h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Gross Profit: <strong style={{ color: '#16a34a' }}>{fmt(stats.grossProfit)}</strong> &nbsp;|&nbsp; Gross Margin: <strong style={{ color: '#16a34a' }}>{stats.grossMargin}%</strong>
              </div>
              {(() => {
                const monthlyData = stats.monthlySpend;
                const maxVal = Math.max(...monthlyData.map(m => m.value), 1);
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 130 }}>
                    {monthlyData.map((m, i) => (
                      <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--accent-color)', fontWeight: 700 }}>{m.value > 0 ? `${Math.round(m.value / 1000)}K` : ''}</div>
                        <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '4px 4px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: `${Math.max((m.value / maxVal) * 100, 2)}%`, minHeight: 4 }}>
                          <div style={{ background: `linear-gradient(180deg, var(--accent-color), #4f46e5)`, borderRadius: '4px 4px 0 0', flex: 1, opacity: i === monthlyData.length - 1 ? 1 : 0.65 }} />
                        </div>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Payment Collection Rate */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>💰 Payment Collection Rate</h3>
              {(() => {
                const total = stats.totalRevenue;
                const collected = total - stats.outstandingAR;
                const rate = total > 0 ? ((collected / total) * 100).toFixed(1) : 0;
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#16a34a' }}>{rate}%</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>COLLECTION RATE</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-color)' }}>{fmt(collected)}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>COLLECTED</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>{fmt(stats.outstandingAR)}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>OUTSTANDING</div>
                      </div>
                    </div>
                    <div style={{ height: 12, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${rate}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: 6, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid-2">
            {/* Top Products */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>📦 Top Products by Revenue</h3>
              {stats.topProducts.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontSize: '0.82rem' }}>No product sales data yet.</div>
              ) : stats.topProducts.map((tp, i) => {
                const max = stats.topProducts[0]?.value || 1;
                return (
                  <div key={tp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                    <div style={{ width: 20, fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-color)', textAlign: 'center' }}>#{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 2 }}>{tp.name}</div>
                      <div style={{ height: 5, background: 'var(--bg-tertiary)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(tp.value / max) * 100}%`, background: 'linear-gradient(90deg, var(--accent-color), #4f46e5)', borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tp.qty} pcs</div>
                    <div style={{ width: 80, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-color)' }}>{fmt(tp.value)}</div>
                  </div>
                );
              })}
            </div>

            {/* Return Rate & Key Metrics */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>📊 Key Business Metrics</h3>
              {[
                { label: 'Total Invoice Count', value: stats.totalInvoices, unit: 'invoices' },
                { label: 'Paid Count', value: stats.paidCount, unit: 'invoices' },
                { label: 'Partial Payments', value: stats.partialCount, unit: 'invoices' },
                { label: 'Overdue Count', value: stats.overdueCount, unit: 'invoices' },
                { label: 'Return Count', value: returnsList.length, unit: 'returns' },
                { label: 'Return Rate', value: stats.totalInvoices > 0 ? `${((returnsList.length / stats.totalInvoices) * 100).toFixed(1)}%` : '0%', unit: '' },
                { label: 'Avg Invoice Size', value: stats.totalInvoices > 0 ? fmt(stats.totalRevenue / stats.totalInvoices) : '৳0', unit: '' },
                { label: 'Gross Margin', value: `${stats.grossMargin}%`, unit: '' },
              ].map((m, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{m.value} <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 400 }}>{m.unit}</span></strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         DETAIL DRAWER
      ══════════════════════════════════════════════════════════ */}
      {detailInv && (
        <>
          <div onClick={() => setDetailInv(null)} style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '490px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', zIndex: 900, boxShadow: '-15px 0 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg, var(--accent-color) 0%, #4f46e5 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Invoice Details</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>{detailInv.invoiceNo}</h3>
              </div>
              <button onClick={() => setDetailInv(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Document Chain Stepper */}
              <div>
                <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>🔗 Order-to-Cash Lifecycle</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.4rem', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border-color)', position: 'relative' }}>
                  {[
                    { label: 'QT', title: 'Quotation', val: detailInv.quoteNo, color: '#9333ea' },
                    { label: 'SO', title: 'Sales Order', val: detailInv.soNumber, color: '#2563eb' },
                    { label: 'INV', title: 'Invoice', val: detailInv.invoiceNo, color: 'var(--accent-color)', active: true },
                    { label: 'CH', title: 'Chalan', val: detailInv.chalanNo || ((detailInv.deliveryStatus && detailInv.deliveryStatus !== 'pending') ? 'CH-GEN' : null), color: '#d97706' },
                    { label: 'RV', title: 'Receipt', val: receiptsList.find(r => r.invoiceNo === detailInv.invoiceNo)?.receiptNo || (detailInv.paymentStatus === 'paid' ? 'PAID' : null), color: '#16a34a' },
                  ].map((step, idx, arr) => {
                    const isPassed = step.val || step.active;
                    return (
                      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                        {idx < arr.length - 1 && (
                          <div style={{ position: 'absolute', left: '50%', right: '-50%', top: '11px', height: 2, background: arr[idx+1].val ? 'var(--accent-color)' : 'rgba(100,116,139,0.15)', zIndex: 1 }} />
                        )}
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: isPassed ? step.color : 'var(--bg-secondary)', border: `2px solid ${isPassed ? step.color : 'var(--border-color)'}`, color: isPassed ? '#fff' : 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }} title={`${step.title}: ${step.val || 'Pending'}`}>
                          {step.label}
                        </div>
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: isPassed ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4 }}>{step.title}</span>
                        <span style={{ fontSize: '0.45rem', fontFamily: 'monospace', color: isPassed ? step.color : 'transparent', marginTop: 1, height: 8 }}>{step.val ? (step.val.length > 8 ? `${step.val.slice(0, 6)}..` : step.val) : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                {[
                  { label: 'Customer', value: customers.find(c => c.id === detailInv.customerId)?.name || detailInv.customerId },
                  { label: 'Branch', value: detailInv.branch || 'Main Branch' },
                  { label: 'Invoice Date', value: window.formatDate(detailInv.date) },
                  { label: 'Due Date', value: window.formatDate(detailInv.dueDate) },
                  { label: 'Salesperson', value: detailInv.salesperson || '—' },
                  { label: 'Payment', value: <StatusPill map={PAY_STATUS} val={detailInv.paymentStatus || 'unpaid'} /> },
                  { label: 'Delivery', value: <StatusPill map={DEL_STATUS} val={detailInv.deliveryStatus || 'pending'} /> },
                  { label: 'Approval', value: <StatusPill map={APR_STATUS} val={detailInv.approvalStatus || 'auto_approved'} /> },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontWeight: 600 }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {/* Financials */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>💰 Financials</h4>
                {[
                  { label: 'Subtotal', value: fmt(detailInv.subtotal), muted: true },
                  { label: 'VAT', value: fmt(detailInv.vatAmount), muted: true },
                  { label: 'Discount', value: detailInv.discountTotal > 0 ? fmt(detailInv.discountTotal) : null, muted: true },
                  { label: 'Grand Total', value: fmt(detailInv.grandTotal), bold: true },
                  detailInv.paidAmount > 0 && { label: 'Paid Amount', value: fmt(detailInv.paidAmount), green: true },
                  { label: 'Balance Due', value: fmt(Math.max(0, (detailInv.grandTotal || 0) - (detailInv.paidAmount || 0))), red: true, bold: true },
                  { label: 'COGS', value: fmt(detailInv.totalCogs), muted: true },
                  { label: 'Gross Profit', value: fmt(detailInv.grossProfit || 0), green: true },
                  { label: 'Gross Margin', value: `${detailInv.grossMargin || 0}%`, muted: true },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '3px 0', borderTop: row.bold ? '1px solid var(--border-color)' : 'none', marginTop: row.bold ? 4 : 0, paddingTop: row.bold ? 6 : 3 }}>
                    <span style={{ color: row.bold ? 'var(--text-primary)' : 'var(--text-muted)' }}>{row.label}</span>
                    <strong style={{ color: row.red ? 'var(--danger)' : row.green ? '#16a34a' : 'var(--text-primary)', fontFamily: 'monospace' }}>{row.value}</strong>
                  </div>
                ))}
              </div>

              {/* Line Items */}
              <div>
                <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>📦 Line Items</h4>
                {detailInv.items?.map((it, idx) => (
                  <div key={idx} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 5, fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{it.productName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.67rem' }}>{it.qty} pcs × {fmt(it.unitPrice)} | VAT: {it.vatRate || 0}%</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-color)', fontFamily: 'monospace' }}>{fmt(it.lineTotal)}</div>
                  </div>
                ))}
              </div>

              {/* Approval Trail */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>✅ Approval & Audit</h4>
                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Approval:</span><StatusPill map={APR_STATUS} val={detailInv.approvalStatus || 'auto_approved'} /></div>
                  {detailInv.approvedBy && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Approved By:</span><strong>{detailInv.approvedBy}</strong></div>}
                  {detailInv.approvedAt && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Approved At:</span><strong>{new Date(detailInv.approvedAt).toLocaleString()}</strong></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Posted By:</span><strong>{detailInv.postedBy || '—'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Created At:</span><strong>{detailInv.createdAt ? new Date(detailInv.createdAt).toLocaleString() : '—'}</strong></div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setDetailInv(null)}>Close</button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => downloadInvoicePDF(detailInv)}>🖨️ PDF</button>
              {detailInv.approvalStatus === 'pending' && (
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem', background: '#d97706', border: 'none' }} onClick={() => { handleApproveInvoice(detailInv.invoiceNo); setDetailInv(null); }}>✓ Approve</button>
              )}
              {detailInv.paymentStatus !== 'paid' && (
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => { setPayForm(f => ({ ...f, customerId: detailInv.customerId, invoiceNo: detailInv.invoiceNo, amount: String(Math.max(0, (detailInv.grandTotal || 0) - (detailInv.paidAmount || 0)).toFixed(2)) })); setTab('payments'); setDetailInv(null); }}>💰 Receive</button>
              )}
              {(detailInv.deliveryStatus || 'pending') === 'pending' && (
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem', color: '#d97706' }} onClick={() => { setChalanInv(detailInv); setDetailInv(null); setTab('deliveries'); }}>🚚 Dispatch</button>
              )}
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => { initiateReturn(detailInv); setDetailInv(null); }}>↩ Return</button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
         INVOICE CREATION MODAL
      ══════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }} onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '1100px', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 2rem)', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, var(--accent-color) 0%, #4f46e5 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>🧾 New Sales Invoice</h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', opacity: 0.85 }}>Issue a tax invoice — updates inventory, AR and journals automatically</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Row 1: Customer, Dates, Branch */}
              {/* Row 1: Customer & Branch */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <SearchableSelect 
                    items={customers}
                    placeholder="-- Select Customer --"
                    value={form.customerId}
                    onChange={val => setForm(f => ({ ...f, customerId: val }))}
                    onAddNew={() => {
                      localStorage.setItem('open_add_customer_on_load', 'true');
                      activeRouteHandler('ledgers');
                    }}
                  />
                  {form.customerId && (() => {
                    const c = customers.find(x => x.id === form.customerId);
                    return <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>AR Balance: {fmt(c?.currentBalance || 0)}{c?.creditLimit ? ` / Limit: ${c.creditLimit.toLocaleString()}` : ''}</div>;
                  })()}
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
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-control" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              {/* Row 2: Quote, SO, Chalan, Salesperson */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Reference Sales Order (SO)</label>
                  <select className="form-control" value={form.soNumber} onChange={e => handleSoChange(e.target.value)}>
                    <option value="">— Select Sales Order —</option>
                    {salesOrders.filter(so => so.status === 'approved' || so.status === 'processing').map(so => (
                      <option key={so.id} value={so.id}>{so.id} ({customers.find(c => c.id === so.customerId)?.name || so.customerId})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference Chalan</label>
                  <select className="form-control" value={form.chalanNo} onChange={e => handleChalanChange(e.target.value)}>
                    <option value="">— Select Delivery Chalan —</option>
                    {chalans.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.id} (SO Ref: {ch.soId})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Salesperson *</label>
                  <select 
                    className="form-control" 
                    required 
                    value={form.salesperson} 
                    onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))}
                  >
                    <option value="">-- Select Salesperson --</option>
                    {employees.map(emp => (
                      <option key={emp.employeeCode} value={emp.fullNameEnglish}>{emp.fullNameEnglish} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Discount (৳)</label>
                  <input type="number" className="form-control" placeholder="0.00" min="0" value={form.discountTotal} onChange={e => setForm(f => ({ ...f, discountTotal: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Narration / Reference</label>
                <input className="form-control" placeholder="e.g. Monthly order, Project delivery..." value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} />
              </div>

              {/* Sales 3-Way Match Widget */}
              {(form.soNumber || form.chalanNo) && (() => {
                const linkedSo = salesOrders.find(o => o.id === form.soNumber);
                const linkedCh = chalans.find(c => c.id === form.chalanNo);
                const item = items[0];
                const soQty = linkedSo?.items[0]?.qty || 0;
                const chQty = linkedCh?.items[0]?.qtyDispatched || 0;
                const invQty = item?.qty || 0;
                const soPrice = linkedSo?.items[0]?.unitPrice || 0;
                const invPrice = item?.unitPrice || 0;

                const qtyMatch = (form.soNumber && form.chalanNo)
                  ? (soQty === chQty && chQty === invQty)
                  : (form.soNumber ? soQty === invQty : chQty === invQty);
                const priceMatch = !form.soNumber || soPrice === invPrice;

                return (
                  <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>🔍</span>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Sales 3-Way Match Reconciliation Audit</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.9rem' }}>{qtyMatch ? '✅' : '⚠️'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Quantity Match:</span>
                        {qtyMatch ? (
                          <strong style={{ color: '#16a34a' }}>Matched ({invQty} pcs)</strong>
                        ) : (
                          <strong style={{ color: '#d97706' }}>
                            Mismatch (SO: {soQty || '—'} pcs | Chalan: {chQty || '—'} pcs | Invoice: {invQty} pcs)
                          </strong>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.9rem' }}>{priceMatch ? '✅' : '⚠️'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Price Match:</span>
                        {priceMatch ? (
                          <strong style={{ color: '#16a34a' }}>Matched ({fmt(invPrice)})</strong>
                        ) : (
                          <strong style={{ color: '#dc2626' }}>
                            Price Difference (SO: {fmt(soPrice)} | Invoice: {fmt(invPrice)})
                          </strong>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Credit Shield & Limit Meter */}
              {creditShield && (
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1rem' }}>🛡️</span>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Accounts Receivable Credit Shield</strong>
                    </div>
                    {creditShield.limit > 0 ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: creditShield.isExceeded ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: creditShield.isExceeded ? '#dc2626' : '#10b981', textTransform: 'uppercase' }}>
                        {creditShield.isExceeded ? '⚠️ Credit Limit Exceeded' : '✅ Under Credit Limit'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', color: '#2563eb', textTransform: 'uppercase' }}>
                        ♾️ Unlimited Credit
                      </span>
                    )}
                  </div>
                  
                  {/* Segmented Progress Bar */}
                  {creditShield.limit > 0 && (
                    <div>
                      <div style={{ display: 'flex', height: 8, borderRadius: 4, background: 'rgba(100,116,139,0.1)', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ width: `${creditShield.arPct}%`, background: '#d97706', transition: 'width 0.3s' }} title={`Current A/R Balance: ${fmt(creditShield.ar)}`} />
                        <div style={{ width: `${creditShield.invPct}%`, background: '#2563eb', transition: 'width 0.3s' }} title={`Prospective Invoice: ${fmt(creditShield.invoice)}`} />
                        <div style={{ width: `${creditShield.availPct}%`, background: '#10b981', transition: 'width 0.3s' }} title={`Available Credit: ${fmt(Math.max(0, creditShield.remaining))}`} />
                      </div>
                      
                      {/* Metric Labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
                          <span style={{ color: 'var(--text-muted)' }}>Current AR:</span>
                          <strong>{fmt(creditShield.ar)}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
                          <span style={{ color: 'var(--text-muted)' }}>This Invoice:</span>
                          <strong>{fmt(creditShield.invoice)}</strong>
                        </div>
                        {creditShield.remaining >= 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Available Limit:</span>
                            <strong>{fmt(creditShield.remaining)}</strong>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Deficit:</span>
                            <strong style={{ color: '#dc2626' }}>{fmt(Math.abs(creditShield.remaining))}</strong>
                          </div>
                        )}
                        <div style={{ color: 'var(--text-muted)' }}>
                          Limit: <strong>{fmt(creditShield.limit)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Approval Warning */}
              {totals.grand > 50000 && (
                <div style={{ padding: '0.65rem 1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>
                  ⏳ Invoice exceeds ৳50,000 — will require Finance Manager approval before delivery.
                </div>
              )}

              {/* Product Lines */}
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>📋 Invoice Line Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {items.map((item, idx) => {
                    const c = calcLine(item);
                    const isService = item.type === 'service';
                    const listToUse = isService ? services : products;
                    const prod = !isService ? products.find(p => p.id === item.productId) : null;
                    return (
                      <div key={idx} style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '10px', 
                        padding: '1rem', 
                        background: 'var(--bg-tertiary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        {/* Row 1: Type & Item Selection */}
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div style={{ width: '140px' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Type</label>
                            <select className="form-control" value={item.type || 'product'} onChange={e => setItem(idx, 'type', e.target.value)} style={{ padding: '0.35rem' }}>
                              <option value="product">📦 Product</option>
                              <option value="service">🛠️ Service</option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>{isService ? 'Service Offering' : 'Product Name'}</label>
                            <select className="form-control" value={item.productId} onChange={e => setItem(idx, 'productId', e.target.value)} style={{ padding: '0.35rem' }}>
                              <option value="">{isService ? '-- Select Service --' : '-- Select Product --'}</option>
                              {listToUse.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                          </div>
                          <div style={{ alignSelf: 'flex-end' }}>
                            <button onClick={() => removeLine(idx)} disabled={items.length === 1} className="btn btn-danger btn-sm" style={{ padding: '0.35rem 0.55rem', height: '32px' }} title="Remove Line">✕</button>
                          </div>
                        </div>

                        {/* Row 2: Description / Narration (Single Line Full-Width) */}
                        <div>
                          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Description / Narration</label>
                          <input type="text" className="form-control" placeholder="Line item notes (will print below product)" value={item.narration || ''} onChange={e => setItem(idx, 'narration', e.target.value)} style={{ padding: '0.35rem', width: '100%' }} />
                        </div>

                        {/* Row 3: Quantities, Prices, Discount, VAT, Tax Rate, Totals */}
                        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr 0.8fr 1.2fr 1.2fr 1.2fr 0.6fr', gap: '0.75rem', alignItems: 'center' }}>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Qty</label>
                            <input type="number" className="form-control" min="1" value={item.qty} onChange={e => setItem(idx, 'qty', e.target.value)} style={{ padding: '0.35rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Unit Price (৳)</label>
                            <input type="number" className="form-control" placeholder="0.00" value={item.unitPrice} onChange={e => setItem(idx, 'unitPrice', e.target.value)} style={{ padding: '0.35rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Discount (%)</label>
                            <input type="number" className="form-control" placeholder="0" min="0" max="100" value={item.discount} onChange={e => setItem(idx, 'discount', e.target.value)} style={{ padding: '0.35rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>VAT</label>
                            <select className="form-control" value={item.vatRateId} onChange={e => setItem(idx, 'vatRateId', e.target.value)} style={{ padding: '0.35rem' }}>
                              {vatRates.map(v => <option key={v.id} value={v.id}>{v.name} ({v.rate}%)</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Tax Rate (TDS/AIT)</label>
                            <select className="form-control" value={item.taxRateId || 'tax-exempt'} onChange={e => setItem(idx, 'taxRateId', e.target.value)} style={{ padding: '0.35rem' }}>
                              {taxRates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                            </select>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Line Total</label>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent-color)', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{fmt(c.lineTotal)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Stock</label>
                            <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isService ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span> : <StockBadge product={prod} qty={item.qty} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={addLine} className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>+ Add Line Item</button>
              </div>

              {/* Totals & Journal Preview */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 800, color: 'var(--accent-color)', marginBottom: 6 }}>📒 Journal Preview</div>
                  <div>🟢 <strong>DR</strong> Accounts Receivable (1100): <span style={{ fontFamily: 'monospace' }}>{fmt(totals.grand - totals.tax - Number(form.discountTotal || 0))}</span></div>
                  {totals.tax > 0 && <div>🟢 <strong>DR</strong> AIT (Advance Income Tax) (1310): <span style={{ fontFamily: 'monospace' }}>{fmt(totals.tax)}</span></div>}
                  <div>🔴 <strong>CR</strong> Sales Revenue: <span style={{ fontFamily: 'monospace' }}>{fmt(totals.subtotal)}</span></div>
                  {totals.vat > 0 && <div>🔴 <strong>CR</strong> VAT Output (2200): <span style={{ fontFamily: 'monospace' }}>{fmt(totals.vat)}</span></div>}
                </div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem', fontSize: '0.78rem' }}>
                  {[['Subtotal', fmt(totals.subtotal)], totals.vat > 0 && ['VAT', fmt(totals.vat)], totals.tax > 0 && ['Tax Withholding (AIT)', `−${fmt(totals.tax)}`], Number(form.discountTotal) > 0 && ['Discount', `−${fmt(form.discountTotal)}`], ['Grand Total', fmt(totals.grand)], totals.tax > 0 && ['Net Receivable', fmt(totals.grand - totals.tax)]].filter(Boolean).map(([label, value], i, arr) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderTop: i === arr.length - 1 ? '1px solid var(--border-color)' : 'none', marginTop: i === arr.length - 1 ? 4 : 0 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <strong style={{ fontFamily: 'monospace', color: i === arr.length - 1 ? 'var(--accent-color)' : 'var(--text-primary)' }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderRadius: '0 0 16px 16px' }}>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="btn btn-primary" 
                style={{ 
                  minWidth: 165, 
                  fontWeight: 700,
                  background: (creditShield && creditShield.isExceeded) ? '#dc2626' : undefined,
                  borderColor: (creditShield && creditShield.isExceeded) ? '#dc2626' : undefined,
                  opacity: (creditShield && creditShield.isExceeded) ? 0.75 : 1,
                  cursor: (creditShield && creditShield.isExceeded) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Posting Journals…' : (creditShield && creditShield.isExceeded ? '🚨 Limit Exceeded' : '✓ Post Sales Invoice')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         DISPATCH CHALAN MODAL
      ══════════════════════════════════════════════════════════ */}
      {chalanInv && (
        <div className="modal-overlay" style={{ zIndex: 850 }}>
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
              <h3 className="modal-title" style={{ color: '#fff' }}>🚚 Dispatch — {chalanInv.invoiceNo}</h3>
              <button className="modal-close" style={{ color: '#fff' }} onClick={() => setChalanInv(null)}>×</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Record delivery dispatch for this invoice. A chalan number will be auto-generated.</p>
              <div className="form-group">
                <label className="form-label">Driver Name</label>
                <input className="form-control" placeholder="Driver name" value={chalanDriver} onChange={e => setChalanDriver(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Number</label>
                <input className="form-control" placeholder="e.g. DH-1234" value={chalanVehicle} onChange={e => setChalanVehicle(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setChalanInv(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ background: '#d97706', border: 'none' }} onClick={() => {
                  const chalanNo = `CH-${Date.now().toString().slice(-6)}`;
                  handleMarkDelivered(chalanInv, 'dispatched', chalanNo);
                }}>📦 Mark Dispatched</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         SALES RETURN MODAL
      ══════════════════════════════════════════════════════════ */}
      {returnInv && (
        <div className="modal-overlay" style={{ zIndex: 850 }}>
          <div className="modal-content" style={{ maxWidth: 720, overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
              <h3 className="modal-title" style={{ color: '#fff' }}>↩ Sales Return — {returnInv.invoiceNo}</h3>
              <button className="modal-close" style={{ color: '#fff' }} onClick={() => setReturnInv(null)}>×</button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select items and quantities to return. Stock will be restocked and A/R reversed.</p>
              <div className="form-group">
                <label className="form-label">Return Reason *</label>
                <select className="form-control" value={returnReason} onChange={e => setReturnReason(e.target.value)}>
                  <option value="">— Select Return Reason —</option>
                  {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <input className="form-control" placeholder="Optional details..." value={returnNarration} onChange={e => setReturnNarration(e.target.value)} />
              </div>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.5fr', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <span>Product</span><span style={{ textAlign: 'right' }}>Sold Qty</span><span style={{ textAlign: 'right' }}>Unit Price</span><span>Return Qty</span><span style={{ textAlign: 'right' }}>Return Value</span>
                </div>
                {returnItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.5fr', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{item.productName}</div>
                    <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.originalQty}</div>
                    <div style={{ textAlign: 'right', fontSize: '0.82rem', fontFamily: 'monospace' }}>{fmt(item.unitPrice)}</div>
                    <input type="number" className="form-control" min="0" max={item.originalQty} value={item.returnQty} onChange={e => setReturnItems(ris => ris.map((r, j) => j === idx ? { ...r, returnQty: e.target.value } : r))} />
                    <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontFamily: 'monospace' }}>{fmt(Number(item.returnQty || 0) * Number(item.unitPrice))}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                <span>Total Return Value:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--danger)' }}>{fmt(returnItems.reduce((s, it) => s + (Number(it.returnQty || 0) * Number(it.unitPrice)), 0))}</span>
              </div>

              {/* Credit Note Journal Preview */}
              {(() => {
                const sub = returnItems.reduce((s, it) => s + (Number(it.returnQty || 0) * Number(it.unitPrice)), 0);
                const vat = returnItems.reduce((s, it) => {
                  const rate = vatRates.find(r => r.id === it.vatRateId)?.rate || 0;
                  return s + (Number(it.returnQty || 0) * Number(it.unitPrice) * rate) / 100;
                }, 0);
                const grand = sub + vat;
                if (grand <= 0) return null;
                return (
                  <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--danger)', marginBottom: 4 }}>↩ Credit Note Journal Preview</div>
                    <div>🟢 <strong>DR</strong> Sales Returns: <span style={{ fontFamily: 'monospace' }}>{fmt(sub)}</span></div>
                    {vat > 0 && <div>🟢 <strong>DR</strong> VAT Output: <span style={{ fontFamily: 'monospace' }}>{fmt(vat)}</span></div>}
                    <div>🔴 <strong>CR</strong> Accounts Receivable: <span style={{ fontFamily: 'monospace' }}>{fmt(grand)}</span></div>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setReturnInv(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handlePostReturn} disabled={loading}>{loading ? 'Processing...' : '↩ Post Sales Return'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
      {/* ══════════════════════════════════════════════════════════
         NEW QUOTATION MODAL
      ══════════════════════════════════════════════════════════ */}
      {isQuoteModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }} onClick={() => { setIsQuoteModalOpen(false); setEditingQuoteId(null); }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '1100px', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 2rem)', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{editingQuoteId ? `✏️ Edit Customer Quotation — ${editingQuoteId}` : '📄 New Customer Quotation'}</h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', opacity: 0.85 }}>Draft a professional quotation — can be converted to sales order or invoice later</p>
              </div>
              <button onClick={() => { setIsQuoteModalOpen(false); setEditingQuoteId(null); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateQuotation} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Row 1: Customer & Branch */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <SearchableSelect 
                    items={customers}
                    placeholder="-- Select Customer --"
                    value={quoteForm.customerId}
                    onChange={val => setQuoteForm(f => ({ ...f, customerId: val }))}
                    onAddNew={() => {
                      localStorage.setItem('open_add_customer_on_load', 'true');
                      activeRouteHandler('ledgers');
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select className="form-control" value={quoteForm.branch} onChange={e => setQuoteForm(f => ({ ...f, branch: e.target.value }))}>
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
                  <label className="form-label">Quotation Date *</label>
                  <input type="date" className="form-control" value={quoteForm.date} onChange={e => setQuoteForm(f => ({ ...f, date: e.target.value, dueDate: new Date(new Date(e.target.value).setDate(new Date(e.target.value).getDate() + 30)).toISOString().substring(0, 10) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Valid Until</label>
                  <input type="date" className="form-control" value={quoteForm.dueDate} onChange={e => setQuoteForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              {/* Row 3: Salesperson & Discount */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Salesperson *</label>
                  <select 
                    className="form-control" 
                    required 
                    value={quoteForm.salesperson} 
                    onChange={e => setQuoteForm(f => ({ ...f, salesperson: e.target.value }))}
                  >
                    <option value="">-- Select Salesperson --</option>
                    {employees.map(emp => (
                      <option key={emp.employeeCode} value={emp.fullNameEnglish}>{emp.fullNameEnglish} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quotation Discount (৳)</label>
                  <input type="number" className="form-control" placeholder="0.00" min="0" value={quoteForm.discountTotal} onChange={e => setQuoteForm(f => ({ ...f, discountTotal: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purpose / Justification</label>
                <input className="form-control" placeholder="e.g. Project bidding, corporate customer inquiry..." value={quoteForm.justification} onChange={e => setQuoteForm(f => ({ ...f, justification: e.target.value }))} />
              </div>

              {/* Product Lines */}
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>📋 Quotation Line Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {quoteItems.map((item, idx) => {
                    const c = calcLine(item);
                    const isService = item.type === 'service';
                    const listToUse = isService ? services : products;
                    const prod = !isService ? products.find(p => p.id === item.productId) : null;
                    return (
                      <div key={idx} style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '10px', 
                        padding: '1rem', 
                        background: 'var(--bg-tertiary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        {/* Row 1: Type & Item Selection */}
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div style={{ width: '140px' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Type</label>
                            <select className="form-control" value={item.type || 'product'} onChange={e => setQuoteItem(idx, 'type', e.target.value)} style={{ padding: '0.35rem' }}>
                              <option value="product">📦 Product</option>
                              <option value="service">🛠️ Service</option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>{isService ? 'Service Offering' : 'Product Name'}</label>
                            <select className="form-control" value={item.productId} onChange={e => setQuoteItem(idx, 'productId', e.target.value)} style={{ padding: '0.35rem' }}>
                              <option value="">{isService ? '-- Select Service --' : '-- Select Product --'}</option>
                              {listToUse.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                          </div>
                          <div style={{ alignSelf: 'flex-end' }}>
                            <button type="button" onClick={() => removeQuoteLine(idx)} disabled={quoteItems.length === 1} className="btn btn-danger btn-sm" style={{ padding: '0.35rem 0.55rem', height: '32px' }} title="Remove Line">✕</button>
                          </div>
                        </div>

                        {/* Row 2: Description / Narration */}
                        <div>
                          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Description / Narration</label>
                          <input type="text" className="form-control" placeholder="Line item notes (will print below product)" value={item.narration || ''} onChange={e => setQuoteItem(idx, 'narration', e.target.value)} style={{ padding: '0.35rem', width: '100%' }} />
                        </div>

                        {/* Row 3: Qty, Prices, Discount, VAT, Tax Rate, Totals */}
                        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr 0.8fr 1.2fr 1.2fr 1.2fr 0.6fr', gap: '0.75rem', alignItems: 'center' }}>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Qty</label>
                            <input type="number" className="form-control" min="1" value={item.qty} onChange={e => setQuoteItem(idx, 'qty', e.target.value)} style={{ padding: '0.35rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Unit Price (৳)</label>
                            <input type="number" className="form-control" placeholder="0.00" value={item.unitPrice} onChange={e => setQuoteItem(idx, 'unitPrice', e.target.value)} style={{ padding: '0.35rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Discount (%)</label>
                            <input type="number" className="form-control" placeholder="0" min="0" max="100" value={item.discount} onChange={e => setQuoteItem(idx, 'discount', e.target.value)} style={{ padding: '0.35rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>VAT</label>
                            <select className="form-control" value={item.vatRateId} onChange={e => setQuoteItem(idx, 'vatRateId', e.target.value)} style={{ padding: '0.35rem' }}>
                              {vatRates.map(v => <option key={v.id} value={v.id}>{v.name} ({v.rate}%)</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Tax Rate (TDS/AIT)</label>
                            <select className="form-control" value={item.taxRateId || 'tax-exempt'} onChange={e => setQuoteItem(idx, 'taxRateId', e.target.value)} style={{ padding: '0.35rem' }}>
                              {taxRates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                            </select>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Line Total</label>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent-color)', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{fmt(c.lineTotal)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Stock</label>
                            <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isService ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span> : <StockBadge product={prod} qty={item.qty} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={addQuoteLine} className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>+ Add Line Item</button>
              </div>

              {/* Totals Section */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.45rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '0.9rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Subtotal:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{fmt(quoteTotals.subtotal)}</strong>
                  </div>
                  {quoteTotals.vat > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>VAT Total:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{fmt(quoteTotals.vat)}</strong>
                    </div>
                  )}
                  {quoteTotals.tax > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Tax Withholding (AIT):</span>
                      <strong style={{ color: 'var(--danger)' }}>−{fmt(quoteTotals.tax)}</strong>
                    </div>
                  )}
                  {Number(quoteForm.discountTotal || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Quotation Discount:</span>
                      <strong style={{ color: 'var(--danger)' }}>−{fmt(Number(quoteForm.discountTotal))}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, borderTop: '1px dashed var(--border-color)', paddingTop: '0.45rem', color: 'var(--text-primary)' }}>
                    <span>Quoted Amount:</span>
                    <strong style={{ color: 'var(--accent-color)' }}>{fmt(Math.max(0, quoteTotals.grand - Number(quoteForm.discountTotal || 0)))}</strong>
                  </div>
                  {quoteTotals.tax > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', marginTop: 4 }}>
                      <span style={{ color: '#15803d', fontWeight: 700 }}>Expected Net:</span>
                      <strong style={{ color: '#15803d' }}>{fmt(Math.max(0, quoteTotals.grand - quoteTotals.tax - Number(quoteForm.discountTotal || 0)))}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setIsQuoteModalOpen(false); setEditingQuoteId(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>{editingQuoteId ? 'Update Quote' : 'Create Quote'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════
         CONVERT QUOTATION TO SO MODAL
      ══════════════════════════════════════════════════════════ */}
      {isSoModalOpen && selectedQuoteForSo && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => { setIsSoModalOpen(false); setSelectedQuoteForSo(null); setEditingSoId(null); }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{editingSoId ? `✏️ Edit Sales Order — ${editingSoId}` : '📋 Convert Quote to Sales Order'}</h3>
              <button onClick={() => { setIsSoModalOpen(false); setSelectedQuoteForSo(null); setEditingSoId(null); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleCreateSalesOrder} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.9rem', borderRadius: 10, fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: 4 }}>Quote Ref: <strong>{selectedQuoteForSo.quoteId || selectedQuoteForSo.id}</strong></div>
                <div style={{ marginBottom: 4 }}>Customer: <strong>{customers.find(c => c.id === selectedQuoteForSo.customerId)?.name || selectedQuoteForSo.customerId}</strong></div>
                <div style={{ marginBottom: 4 }}>Items: <strong>{selectedQuoteForSo.items[0]?.productName} ({selectedQuoteForSo.items[0]?.qty} pcs)</strong></div>
                <div>Total Value: <strong style={{ color: 'var(--accent-color)' }}>{fmt((selectedQuoteForSo.items[0]?.qty || 0) * (selectedQuoteForSo.items[0]?.unitPrice || 0))}</strong></div>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Terms</label>
                <select className="form-control" value={soForm.paymentTerms} onChange={e => setSoForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                  <option value="Net 30">Net 30 days</option>
                  <option value="Net 15">Net 15 days</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                  <option value="Cash">Immediate Cash Sale</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setIsSoModalOpen(false); setSelectedQuoteForSo(null); setEditingSoId(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', borderColor: '#2563eb' }}>{editingSoId ? '✓ Update SO' : '✓ Approve & Create SO'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         DISPATCH SO / GENERATE CHALAN MODAL
      ══════════════════════════════════════════════════════════ */}
      {isChalanModalOpen && selectedSoForChalan && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>🚚 Generate Delivery Chalan</h3>
              <button onClick={() => { setIsChalanModalOpen(false); setSelectedSoForChalan(null); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleCreateChalan} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.9rem', borderRadius: 10, fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: 4 }}>SO Reference: <strong>{selectedSoForChalan.id}</strong></div>
                <div style={{ marginBottom: 4 }}>Customer: <strong>{customers.find(c => c.id === selectedSoForChalan.customerId)?.name || selectedSoForChalan.customerId}</strong></div>
                <div style={{ marginBottom: 4 }}>Product Ordered: <strong>{selectedSoForChalan.items[0]?.productName}</strong></div>
                <div>Ordered Quantity: <strong>{selectedSoForChalan.items[0]?.qty} pcs</strong></div>
              </div>
              <div className="form-group">
                <label className="form-label">Driver Name *</label>
                <input type="text" className="form-control" required value={chalanForm.driverName} onChange={e => setChalanForm(f => ({ ...f, driverName: e.target.value }))} placeholder="e.g. Abul Rahman" />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Number *</label>
                <input type="text" className="form-control" required value={chalanForm.vehicleNo} onChange={e => setChalanForm(f => ({ ...f, vehicleNo: e.target.value }))} placeholder="e.g. Dhaka Metro-Ta-11-2233" />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity to Dispatch *</label>
                <input type="number" className="form-control" required min="1" max={selectedSoForChalan.items[0]?.qty} value={chalanForm.qtyDispatched} onChange={e => setChalanForm(f => ({ ...f, qtyDispatched: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setIsChalanModalOpen(false); setSelectedSoForChalan(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }}>📦 Dispatch & Stock Out</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Slide-over Quotation Detail Drawer ── */}
      {detailQuote && (
        <>
          <div onClick={() => setDetailQuote(null)} className="backdrop-overlay" style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
          <div className="slide-over" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '470px', background: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 900, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quotation Details</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>{detailQuote.id}</h3>
              </div>
              <button onClick={() => setDetailQuote(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Customer</div>
                  <div style={{ fontWeight: 600 }}>{customers.find(c => c.id === detailQuote.customerId)?.name || detailQuote.customerId}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Quoted Date</div>
                  <div style={{ fontWeight: 600 }}>{detailQuote.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Salesperson</div>
                  <div style={{ fontWeight: 600 }}>{detailQuote.salesperson}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                  <div>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, 
                      color: detailQuote.status === 'draft' ? '#6b7280' : (detailQuote.status === 'sent' ? '#3b82f6' : (detailQuote.status === 'accepted' ? '#10b981' : '#ef4444')), 
                      background: detailQuote.status === 'draft' ? 'rgba(107,114,128,0.1)' : (detailQuote.status === 'sent' ? 'rgba(59,130,246,0.1)' : (detailQuote.status === 'accepted' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'))
                    }}>
                      {detailQuote.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>📋 Quotation Item Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Product Name:</span>
                    <strong>{detailQuote.items[0]?.productName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Quantity:</span>
                    <strong>{detailQuote.items[0]?.qty} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Unit Price:</span>
                    <strong>{fmt(detailQuote.items[0]?.unitPrice)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Quote Value:</span>
                    <strong style={{ color: 'var(--accent-color)' }}>{fmt((detailQuote.items[0]?.qty || 0) * (detailQuote.items[0]?.unitPrice || 0))}</strong>
                  </div>
                </div>
              </div>
              {detailQuote.justification && (
                <div>
                  <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Justification / Notes</h4>
                  <div style={{ fontSize: '0.8rem', fontStyle: 'italic', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    "{detailQuote.justification}"
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDetailQuote(null)}>Close</button>
              {detailQuote.status === 'draft' && simulatedRole === 'Agent' && (
                <button onClick={() => {
                  salesService.saveQuotation({ ...detailQuote, status: 'sent' }, currentUser);
                  reload();
                  setSuccessMsg(`✅ Quotation ${detailQuote.id} marked as Sent to Customer.`);
                  setDetailQuote(null);
                  setTimeout(() => setSuccessMsg(''), 4000);
                }} className="btn btn-primary" style={{ flex: 1, background: '#3b82f6', borderColor: '#3b82f6' }}>Mark Sent</button>
              )}
              {detailQuote.status === 'sent' && simulatedRole === 'Agent' && (
                <button onClick={() => {
                  handleAcceptQuotation(detailQuote.id);
                  setDetailQuote(null);
                }} className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}>Mark Accepted</button>
              )}
              {detailQuote.status === 'accepted' && simulatedRole === 'Agent' && (
                <button onClick={() => {
                  setSelectedQuoteForSo(detailQuote);
                  setSoForm({ paymentTerms: 'Net 30' });
                  setIsSoModalOpen(true);
                  setDetailQuote(null);
                }} className="btn btn-primary" style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed' }}>Convert to SO</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Slide-over Sales Order Detail Drawer ── */}
      {detailSo && (
        <>
          <div onClick={() => setDetailSo(null)} className="backdrop-overlay" style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
          <div className="slide-over" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '470px', background: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 900, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sales Order Details</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>{detailSo.id}</h3>
              </div>
              <button onClick={() => setDetailSo(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Customer</div>
                  <div style={{ fontWeight: 600 }}>{customers.find(c => c.id === detailSo.customerId)?.name || detailSo.customerId}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>SO Date</div>
                  <div style={{ fontWeight: 600 }}>{detailSo.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Payment Terms</div>
                  <div style={{ fontWeight: 600 }}>{detailSo.paymentTerms}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                  <div>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, 
                      color: detailSo.status === 'pending_approval' ? '#f59e0b' : (detailSo.status === 'approved' ? '#2563eb' : (detailSo.status === 'completed' ? '#10b981' : '#7c3aed')), 
                      background: detailSo.status === 'pending_approval' ? 'rgba(245,158,11,0.1)' : (detailSo.status === 'approved' ? 'rgba(37,99,235,0.1)' : (detailSo.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)'))
                    }}>
                      {detailSo.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>📋 SO Line Item Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Product Name:</span>
                    <strong>{detailSo.items[0]?.productName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ordered Qty:</span>
                    <strong>{detailSo.items[0]?.qty} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Unit Price:</span>
                    <strong>{fmt(detailSo.items[0]?.unitPrice)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Cost:</span>
                    <strong style={{ color: 'var(--accent-color)' }}>{fmt((detailSo.items[0]?.qty || 0) * (detailSo.items[0]?.unitPrice || 0))}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDetailSo(null)}>Close</button>
              {detailSo.status === 'pending_approval' && (simulatedRole === 'Manager' || simulatedRole === 'CFO') && (
                <>
                  <button onClick={() => { handleApproveSalesOrder(detailSo.id); setDetailSo(null); }} className="btn btn-primary" style={{ flex: 1 }}>Approve SO</button>
                </>
              )}
              {detailSo.status === 'approved' && simulatedRole === 'Dispatcher' && (
                <button onClick={() => {
                  setSelectedSoForChalan(detailSo);
                  setChalanForm({ driverName: '', vehicleNo: '', qtyDispatched: String(detailSo.items[0].qty) });
                  setIsChalanModalOpen(true);
                  setDetailSo(null);
                }} className="btn btn-primary" style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a' }}>Dispatch Goods</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Slide-over Delivery Chalan Detail Drawer ── */}
      {detailChalan && (
        <>
          <div onClick={() => setDetailChalan(null)} className="backdrop-overlay" style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
          <div className="slide-over" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '470px', background: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 900, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Chalan Details</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>{detailChalan.id}</h3>
              </div>
              <button onClick={() => setDetailChalan(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>SO Reference</div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{detailChalan.soId}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Date Dispatched</div>
                  <div style={{ fontWeight: 600 }}>{detailChalan.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Driver Name</div>
                  <div style={{ fontWeight: 600 }}>{detailChalan.driverName}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Vehicle Number</div>
                  <div style={{ fontWeight: 600 }}>{detailChalan.vehicleNo}</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.9rem' }}>
                <h4 style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>📦 Shipped Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Product:</span>
                    <strong>{detailChalan.items[0]?.productName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Qty Dispatched:</span>
                    <strong style={{ color: '#16a34a' }}>{detailChalan.items[0]?.qtyDispatched} pcs</strong>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDetailChalan(null)}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
