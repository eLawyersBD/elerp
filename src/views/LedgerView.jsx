import { useState, useEffect, useMemo } from 'react';

import { salesService } from '../services/salesService';

import { purchaseService } from '../services/purchaseService';

// NOTE: paymentService is intentionally NOT used here for receipt/payment posting.

// All settlements are routed through salesService.receiveFromCustomer() and

// purchaseService.paySupplier() as the single authoritative journal-posting path.

// This prevents duplicate double-entry if both Module views and LedgerView are used.

import { defaultChartOfAccounts } from '../database/seedData';

import { accountingService } from '../services/accountingService';

import { auditService } from '../services/auditService';
import { paymentService } from '../services/paymentService';



// Format currency standard BDT

const fmt = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



// Number to Words for Bengali Taka formatting

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



const ADJUSTMENT_TYPES = [

  { key: 'write_off', label: 'Write-off (Bad Debt)' },

  { key: 'credit_note', label: 'Credit Note' },

  { key: 'debit_note', label: 'Debit Note' },

  { key: 'rounding', label: 'Rounding Difference' },

  { key: 'advance_alloc', label: 'Advance Allocation' }

];



export default function LedgerView({ 

  customers = [], 

  suppliers = [], 

  onSaveCustomer, 

  onDeleteCustomer, 

  onSaveSupplier, 

  onDeleteSupplier, 

  onRefresh, 

  currentUser 

}) {

  /* ─────────── State Hooks ─────────── */

  const [payments, setPayments]               = useState([]);

  const [salesInvoices, setSalesInvoices]     = useState([]);

  const [purchaseInvoices, setPurchaseInvoices] = useState([]);

  const [adjustments, setAdjustments]         = useState([]);

  const [reconciliations, setReconciliations] = useState([]);

  const [auditLogs, setAuditLogs]             = useState([]);

  const [tab, setTab]                         = useState('customers');

  const [simRole, setSimRole]                 = useState('admin');

  const [loading, setLoading]                 = useState(false);

  const [successMsg, setSuccessMsg]           = useState('');

  const [partnerSearch, setPartnerSearch]     = useState('');

  const [showForecast, setShowForecast]       = useState(false);

  const [showAlerts, setShowAlerts]           = useState(true);

  const [hasAlertedLimit, setHasAlertedLimit] = useState(false);



  /* ─────────── Modal & Drawer States ─────────── */

  const [isModalOpen, setIsModalOpen]                 = useState(false);

  const [selectedParty, setSelectedParty]             = useState(null);

  const [amount, setAmount]                           = useState('');

  const [method, setMethod]                           = useState('bank_transfer');

  const [ledgerAccount, setLedgerAccount]             = useState('acc-1020');

  const [narration, setNarration]                     = useState('');

  const [selectedInvoice, setSelectedInvoice]         = useState('');



  const [isPartnerModalOpen, setIsPartnerModalOpen]   = useState(false);

  const [editingPartner, setEditingPartner]           = useState(null);

  const [partnerForm, setPartnerForm]                 = useState({ id: '', name: '', contact: '', phone: '', email: '', address: '', company: '', currentBalance: 0, creditLimit: 100000, creditTerms: 'Net 30', customFields: [] });



  const generateNextPartnerId = (prefix) => {

    let maxNum = 1000;

    const list = prefix === 'cust' ? customers : suppliers;

    list.forEach(p => {

      if (p.id) {

        const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');

        const match = p.id.match(pattern);

        if (match) {

          const num = parseInt(match[1], 10);

          if (num > maxNum) maxNum = num;

        }

      }

    });

    return `${prefix}-${maxNum + 1}`;

  };



  const handleAddCustomField = () => {

    setPartnerForm(prev => ({

      ...prev,

      customFields: [...(prev.customFields || []), { label: '', value: '' }]

    }));

  };



  const handleCustomFieldChange = (index, field, value) => {

    setPartnerForm(prev => {

      const updated = [...(prev.customFields || [])];

      updated[index] = { ...updated[index], [field]: value };

      return { ...prev, customFields: updated };

    });

  };



  const handleRemoveCustomField = (index) => {

    setPartnerForm(prev => ({

      ...prev,

      customFields: (prev.customFields || []).filter((_, i) => i !== index)

    }));

  };



  const [detailDrawerParty, setDetailDrawerParty]     = useState(null);

  const [isStatementOpen, setIsStatementOpen]         = useState(false);

  const [statementParty, setStatementParty]           = useState(null);

  const [statementFromDate, setStatementFromDate]     = useState('');

  const [statementToDate, setStatementToDate]         = useState('');



  /* ─────────── Filter States ─────────── */

  const [filters, setFilters] = useState({ search: '', status: 'all', fromDate: '', toDate: '', amountMin: '', amountMax: '', mode: 'all' });

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));



  /* ─────────── Reconciliation Workspace States ─────────── */

  const [reconcileParty, setReconcileParty]           = useState('');

  const [reconcilePayment, setReconcilePayment]       = useState(null);

  const [reconcileInvoice, setReconcileInvoice]       = useState(null);

  const [reconcileAmt, setReconcileAmt]               = useState('');



  /* ─────────── Adjustment States ─────────── */

  const [showAdjModal, setShowAdjModal]               = useState(false);

  const [adjForm, setAdjForm] = useState({ partyType: 'customer', partyId: '', type: 'write_off', amount: '', narration: '' });



  /* ─────────── Load Data ─────────── */

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (customers && customers.length > 0 && !hasAlertedLimit) {
      const overLimitCustomers = customers.filter(c => {
        const bal = c.currentBalance || 0;
        const limit = c.creditLimit || 100000;
        return bal > limit;
      });
      if (overLimitCustomers.length > 0) {
        const names = overLimitCustomers.map(c => `- ${c.name} (Balance: ৳${(c.currentBalance || 0).toLocaleString()}, Limit: ৳${(c.creditLimit || 100000).toLocaleString()})`).join('\n');
        alert(`🚨 Credit Limit Exceeded Alarm:\nThe following customer(s) have exceeded their credit limit:\n${names}`);
        setHasAlertedLimit(true);
      }
    }
  }, [customers, hasAlertedLimit]);

  useEffect(() => {
    const openAddCustomer = localStorage.getItem('open_add_customer_on_load');
    const openAddSupplier = localStorage.getItem('open_add_supplier_on_load');
    
    if (openAddCustomer === 'true') {
      localStorage.removeItem('open_add_customer_on_load');
      setTab('customers');
      setTimeout(() => {
        handleOpenAddPartner();
      }, 150);
    } else if (openAddSupplier === 'true') {
      localStorage.removeItem('open_add_supplier_on_load');
      setTab('suppliers');
      setTimeout(() => {
        handleOpenAddPartner();
      }, 150);
    }
  }, [customers, suppliers]);



  const loadAllData = async () => {

    const data = await paymentService.getPayments();

    setPayments(data || []);

    setSalesInvoices(JSON.parse(localStorage.getItem('erp_sales_invoices') || '[]'));

    setPurchaseInvoices(JSON.parse(localStorage.getItem('erp_purchase_invoices') || '[]'));

    setAdjustments(JSON.parse(localStorage.getItem('erp_ledger_adjustments') || '[]'));

    setReconciliations(JSON.parse(localStorage.getItem('erp_reconciliations') || '[]'));

    setAuditLogs(JSON.parse(localStorage.getItem('erp_audit_logs') || '[]'));

  };



  const reload = async () => { await loadAllData(); onRefresh?.(); };



  /* ─────────── Role View Guards ─────────── */

  useEffect(() => {

    if (simRole === 'sales' && (tab !== 'customers' && tab !== 'aging' && tab !== 'logs')) {

      setTab('customers');

    } else if (simRole === 'purchase' && (tab !== 'suppliers' && tab !== 'aging' && tab !== 'logs')) {

      setTab('suppliers');

    }

  }, [simRole]);



  const showAR = simRole === 'admin' || simRole === 'sales';

  const showAP = simRole === 'admin' || simRole === 'purchase';



  /* ─────────── Computed Financial KPI Metrics ─────────── */

  const kpis = useMemo(() => {

    const todayStr = new Date().toISOString().substring(0, 10);

    const thisMonthStr = new Date().toISOString().substring(0, 7);



    // AR

    const totalARValue = customers.reduce((sum, c) => sum + Number(c.currentBalance || 0), 0);

    

    let arDueToday = 0;

    let arOverdue = 0;

    salesInvoices.forEach(i => {

      if (i.paymentStatus !== 'paid') {

        const remaining = Number(i.grandTotal || 0) - Number(i.paidAmount || 0);

        const due = i.dueDate || i.date;

        if (due === todayStr) arDueToday += remaining;

        else if (due < todayStr) arOverdue += remaining;

      }

    });



    const collectedThisMonth = payments

      .filter(p => p.type === 'receipt' && (p.date || '').substring(0, 7) === thisMonthStr)

      .reduce((sum, p) => sum + Number(p.amount || 0), 0);



    // AP

    const totalAPValue = suppliers.reduce((sum, s) => sum + Number(s.currentBalance || 0), 0);

    

    let apDueToday = 0;

    let apOverdue = 0;

    purchaseInvoices.forEach(i => {

      if (i.paymentStatus !== 'paid') {

        const remaining = Number(i.grandTotal || 0) - Number(i.paidAmount || 0);

        const due = i.dueDate || i.date;

        if (due === todayStr) apDueToday += remaining;

        else if (due < todayStr) apOverdue += remaining;

      }

    });



    const paidThisMonth = payments

      .filter(p => p.type === 'payment' && (p.date || '').substring(0, 7) === thisMonthStr)

      .reduce((sum, p) => sum + Number(p.amount || 0), 0);



    return {

      totalAR: totalARValue,

      arDueToday,

      arOverdue,

      collectedThisMonth,

      totalAP: totalAPValue,

      apDueToday,

      apOverdue,

      paidThisMonth,

      settlementCount: payments.length

    };

  }, [customers, suppliers, salesInvoices, purchaseInvoices, payments]);



  /* ─────────── Aging Bucket Generator ─────────── */

  const getAgingReport = (type = 'AR') => {

    const today = new Date();

    const invs = type === 'AR' ? salesInvoices : purchaseInvoices;

    const buckets = [

      { key: 'current', label: '0–15 Days',  min: 0,  max: 15,       invoices: [], total: 0, color: '#10b981', bg: 'rgba(16,185,129,0.08)'  },

      { key: 'b30',     label: '16–30 Days', min: 16, max: 30,       invoices: [], total: 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },

      { key: 'b60',     label: '31–60 Days', min: 31, max: 60,       invoices: [], total: 0, color: '#f97316', bg: 'rgba(249,115,22,0.08)'  },

      { key: 'b90',     label: '61–90 Days', min: 61, max: 90,       invoices: [], total: 0, color: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },

      { key: 'over90',  label: '90+ Days',   min: 91, max: Infinity, invoices: [], total: 0, color: '#b91c1c', bg: 'rgba(185,28,28,0.12)'  },

    ];



    invs.filter(i => i.paymentStatus !== 'paid').forEach(inv => {

      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(new Date(inv.date || new Date()).setDate(new Date(inv.date || new Date()).getDate() + 30));

      const days = Math.max(0, Math.floor((today - due) / 86400000));

      const remaining = Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0);

      const b = buckets.find(x => days >= x.min && days <= x.max) || buckets[buckets.length - 1];

      b.invoices.push({ ...inv, daysOverdue: days, remaining });

      b.total += remaining;

    });

    return buckets;

  };



  const arAgingBuckets = useMemo(() => getAgingReport('AR'), [salesInvoices]);

  const apAgingBuckets = useMemo(() => getAgingReport('AP'), [purchaseInvoices]);



  /* ─────────── Customer Intelligence Snapshots ─────────── */

  const getCustomerStats = (cId) => {

    const invs = salesInvoices.filter(i => i.customerId === cId);

    const rcpts = payments.filter(p => p.partyId === cId && p.type === 'receipt');

    

    const invoiced = invs.reduce((s, i) => s + (i.grandTotal || 0), 0);

    const collected = rcpts.reduce((s, r) => s + (r.amount || 0), 0) + invs.reduce((s, i) => s + (i.paidAmount || 0), 0);

    

    let settledDays = 0;

    let settledCount = 0;

    invs.filter(i => i.paymentStatus === 'paid').forEach(i => {

      const invDate = new Date(i.date);

      const invoicePayments = rcpts.filter(r => r.invoiceNo === i.invoiceNo || (r.narration || '').includes(i.invoiceNo));

      if (invoicePayments.length > 0) {

        const lastPmtDate = new Date(Math.max(...invoicePayments.map(p => new Date(p.date || p.createdAt))));

        settledDays += Math.max(0, Math.floor((lastPmtDate - invDate) / 86400000));

        settledCount++;

      }

    });



    const avgCollectionDays = settledCount > 0 ? Math.round(settledDays / settledCount) : 18;

    const onTimePayments = invs.filter(i => i.paymentStatus === 'paid' && i.dueDate && new Date(i.date) <= new Date(i.dueDate)).length;

    const paymentRatio = invs.length > 0 ? Math.round((onTimePayments / invs.length) * 100) : 100;

    

    return {

      invoiced,

      collected,

      avgCollectionDays,

      paymentRatio,

      disputeCount: invs.filter(i => i.deliveryStatus === 'pending' && i.paymentStatus !== 'paid').length

    };

  };



  /* ─────────── Supplier Intelligence Snapshots ─────────── */

  const getSupplierStats = (sId) => {

    const invs = purchaseInvoices.filter(i => i.supplierId === sId);

    const pmts = payments.filter(p => p.partyId === sId && p.type === 'payment');

    

    const purchased = invs.reduce((s, i) => s + (i.grandTotal || 0) + (i.landedCost?.total || 0), 0);

    const paid = pmts.reduce((s, r) => s + (r.amount || 0), 0) + invs.reduce((s, i) => s + (i.paidAmount || 0), 0);

    

    const mismatchCount = invs.filter(i => i.threeWayMatchStatus === 'mismatch').length;

    

    return {

      purchased,

      paid,

      mismatchCount,

      hasHold: invs.some(i => i.approvalStatus === 'rejected')

    };

  };



  /* ─────────── Transaction statements compiler (Drawer view) ─────────── */

  const compileStatements = (party) => {

    if (!party) return [];

    const isCustomer = party.id.startsWith('cust');



    const invs = (isCustomer ? salesInvoices : purchaseInvoices).filter(i => (isCustomer ? i.customerId : i.supplierId) === party.id);

    const rcpts = payments.filter(p => p.partyId === party.id);

    const rets = JSON.parse(localStorage.getItem(isCustomer ? 'erp_sales_returns' : 'erp_purchase_returns') || '[]').filter(r => isCustomer ? r.originalInvoiceNo && invs.some(i => i.invoiceNo === r.originalInvoiceNo) : r.supplierId === party.id);

    const adjs = adjustments.filter(a => a.partyId === party.id && a.status === 'approved');



    const txns = [

      ...invs.map(i => ({

        date: i.date,

        refNo: i.invoiceNo,

        type: 'Invoice',

        debit: isCustomer ? Number(i.grandTotal) : 0,

        credit: isCustomer ? 0 : Number(i.grandTotal) + (i.landedCost?.total || 0),

        desc: i.narration || `Invoice generation ${i.invoiceNo}`

      })),

      ...rcpts.map(p => ({

        date: p.date?.substring(0, 10) || new Date().toISOString().substring(0, 10),

        refNo: p.refNo,

        type: p.type === 'receipt' ? 'Receipt' : 'Payment',

        debit: isCustomer ? 0 : Number(p.amount),

        credit: isCustomer ? Number(p.amount) : 0,

        desc: p.narration || `${p.type === 'receipt' ? 'Cash receipt collection' : 'Supplier remittance payout'}`

      })),

      ...rets.map(r => ({

        date: r.date,

        refNo: r.returnNo,

        type: 'Return',

        debit: isCustomer ? 0 : Number(r.grandTotal),

        credit: isCustomer ? Number(r.grandTotal) : 0,

        desc: `Return credit/debit slip against ${r.originalInvoiceNo}`

      })),

      ...adjs.map(a => {

        const isArReduction = a.type === 'write_off' || a.type === 'credit_note' || a.type === 'rounding';

        return {

          date: a.date,

          refNo: a.refNo,

          type: 'Adjustment',

          debit: isCustomer ? (isArReduction ? 0 : Number(a.amount)) : (isArReduction ? Number(a.amount) : 0),

          credit: isCustomer ? (isArReduction ? Number(a.amount) : 0) : (isArReduction ? 0 : Number(a.amount)),

          desc: `[${a.type.toUpperCase()}] ${a.narration}`

        };

      })

    ].sort((a, b) => a.date.localeCompare(b.date));



    let runningBal = 0;

    return txns.map(t => {

      if (isCustomer) runningBal += t.debit - t.credit;

      else runningBal += t.credit - t.debit;

      return { ...t, balance: runningBal };

    });

  };



  /* ─────────── Add / Edit Business Partners ─────────── */

  const handleOpenAddPartner = () => {

    setEditingPartner(null);

    setPartnerForm({ name: '', contact: '', phone: '', email: '', address: '', company: '', currentBalance: 0, creditLimit: 100000, creditTerms: 'Net 30' });

    setIsPartnerModalOpen(true);

  };



  const handleOpenEditPartner = (party) => {

    setEditingPartner(party);

    setPartnerForm({

      name: party.name,

      contact: party.contact || '',

      phone: party.phone || '',

      email: party.email || '',

      address: party.address || '',

      company: party.company || '',

      currentBalance: party.currentBalance || 0,

      creditLimit: party.creditLimit || 100000,

      creditTerms: party.creditTerms || 'Net 30'

    });

    setIsPartnerModalOpen(true);

  };



  const handlePartnerSubmit = async (e) => {

    e.preventDefault();

    if (!partnerForm.name.trim()) return alert("Name is required!");

    const isCustomer = tab === 'customers' || tab === 'aging' || tab === 'logs';

    const partnerId = editingPartner ? editingPartner.id : partnerForm.id;

    const payload = {

      id: partnerId,

      name: partnerForm.name,

      contact: partnerForm.contact,

      phone: partnerForm.phone,

      email: partnerForm.email,

      address: partnerForm.address,

      company: partnerForm.company,

      currentBalance: Number(partnerForm.currentBalance),

      creditLimit: Number(partnerForm.creditLimit || 100000),

      creditTerms: partnerForm.creditTerms || 'Net 30',

      customFields: partnerForm.customFields || []

    };



    setLoading(true);

    try {

      if (isCustomer) {

        await onSaveCustomer(payload, !!editingPartner);

      } else {

        await onSaveSupplier(payload, !!editingPartner);

      }

      setIsPartnerModalOpen(false);

      setSuccessMsg(`✅ Partner profile "${payload.name}" saved!`);

      await reload();

      setTimeout(() => setSuccessMsg(''), 4000);

    } catch (err) { alert(err.message || "Save failed."); }

    finally { setLoading(false); }

  };



  const handleDeletePartnerClick = async (partyId, name) => {

    const isCustomer = partyId.startsWith('cust');

    if (window.confirm(`Are you sure you want to delete ${isCustomer ? 'Customer' : 'Supplier'} "${name}"?`)) {

      try {

        if (isCustomer) {

          await onDeleteCustomer(partyId);

        } else {

          await onDeleteSupplier(partyId);

        }

        setSuccessMsg(`🗑️ Deleted profile "${name}" successfully.`);

        await reload();

        setTimeout(() => setSuccessMsg(''), 4000);

      } catch (err) { alert(err.message || "Delete failed."); }

    }

  };



  /* ─────────── Unallocated Receipts/Payments (Reconciliation) ─────────── */

  const unallocatedPayments = useMemo(() => {

    return payments.filter(p => {

      if (p.invoiceNo) return false;

      const reconciledSum = reconciliations.filter(r => r.paymentRef === p.refNo).reduce((sum, r) => sum + Number(r.amount || 0), 0);

      return (Number(p.amount) - reconciledSum) > 0.01;

    });

  }, [payments, reconciliations]);



  const getUnallocatedRemaining = (paymentRef) => {

    const pmt = payments.find(p => p.refNo === paymentRef);

    if (!pmt) return 0;

    const reconciledSum = reconciliations.filter(r => r.paymentRef === paymentRef).reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return Math.max(0, Number(pmt.amount) - reconciledSum);

  };



  const activeReconcileInvoices = useMemo(() => {

    if (!reconcileParty) return [];

    const isCustomer = reconcileParty.startsWith('cust');

    const invs = isCustomer ? salesInvoices : purchaseInvoices;

    return invs.filter(i => (isCustomer ? i.customerId : i.supplierId) === reconcileParty && i.paymentStatus !== 'paid');

  }, [reconcileParty, salesInvoices, purchaseInvoices]);



  const handleSelectReconcilePayment = (pmt) => {

    setReconcilePayment(pmt);

    setReconcileParty(pmt.partyId);

    setReconcileInvoice(null);

    setReconcileAmt('');

  };



  const handlePostReconciliation = () => {

    if (!reconcilePayment || !reconcileInvoice || !reconcileAmt) return alert('Select payment, invoice, and amount.');

    const amt = Number(reconcileAmt);

    if (amt <= 0) return alert('Reconciliation amount must be positive.');

    

    const remainingPmt = getUnallocatedRemaining(reconcilePayment.refNo);

    const invoiceDue = Number(reconcileInvoice.grandTotal + (reconcileInvoice.landedCost?.total || 0)) - Number(reconcileInvoice.paidAmount || 0);



    if (amt > remainingPmt + 0.01) return alert(`Cannot allocate more than unallocated payment amount (${fmt(remainingPmt)}).`);

    if (amt > invoiceDue + 0.01) return alert(`Allocation exceeds invoice due balance (${fmt(invoiceDue)}).`);



    setLoading(true);

    try {

      const recNo = `REC-AL-${Date.now().toString().slice(-5)}`;

      const newRec = {

        id: `rec-${Date.now()}`,

        refNo: recNo,

        paymentRef: reconcilePayment.refNo,

        invoiceNo: reconcileInvoice.invoiceNo,

        partyId: reconcileParty,

        amount: amt,

        date: new Date().toISOString().substring(0, 10),

        reconciledBy: currentUser?.displayName || 'System Ledger Manager'

      };



      const currentRecs = JSON.parse(localStorage.getItem('erp_reconciliations') || '[]');

      localStorage.setItem('erp_reconciliations', JSON.stringify([newRec, ...currentRecs]));



      const isCustomer = reconcileParty.startsWith('cust');

      const storeKey = isCustomer ? 'erp_sales_invoices' : 'erp_purchase_invoices';

      const invoices = JSON.parse(localStorage.getItem(storeKey) || '[]');

      const updatedInvoices = invoices.map(i => {

        if (i.invoiceNo !== reconcileInvoice.invoiceNo) return i;

        const newPaid = Number(i.paidAmount || 0) + amt;

        const total = Number(i.grandTotal || 0) + (i.landedCost?.total || 0);

        return { ...i, paidAmount: +newPaid.toFixed(2), paymentStatus: (total - newPaid) <= 0.01 ? 'paid' : 'partial' };

      });

      localStorage.setItem(storeKey, JSON.stringify(updatedInvoices));



      auditService.logCreate(currentUser, 'ledgers', recNo, recNo, `Reconciled ${amt} of payment ${reconcilePayment.refNo} against invoice ${reconcileInvoice.invoiceNo}`);



      setSuccessMsg(`✓ Reconciliation allocated: ৳${amt.toLocaleString()} matched to invoice ${reconcileInvoice.invoiceNo}`);

      setReconcilePayment(null);

      setReconcileInvoice(null);

      setReconcileAmt('');

      reload();

      setTimeout(() => setSuccessMsg(''), 4000);

    } catch (err) { alert(err.message); }

    finally { setLoading(false); }

  };



  /* ─────────── Manual Adjustments & Write-offs Workflow ─────────── */

  const handlePostAdjustment = async (e) => {

    e.preventDefault();

    const { partyType, partyId, type, amount, narration } = adjForm;

    if (!partyId || !amount || Number(amount) <= 0) return alert('Fill in all adjustment details.');

    const amt = Number(amount);

    const date = new Date().toISOString().substring(0, 10);

    const refNo = `ADJ-${Date.now().toString().slice(-6)}`;



    setLoading(true);

    try {

      const isWriteOff = type === 'write_off';

      const status = isWriteOff ? 'pending' : 'approved';



      const payload = {

        id: `adj-${Date.now()}`,

        refNo,

        partyType,

        partyId,

        type,

        amount: amt,

        narration,

        date,

        status,

        postedBy: currentUser?.displayName || 'Finance Desk',

        approvedBy: isWriteOff ? '' : 'System (Auto-Approved)',

        approvedAt: isWriteOff ? '' : new Date().toISOString()

      };



      const localAdjs = JSON.parse(localStorage.getItem('erp_ledger_adjustments') || '[]');

      localStorage.setItem('erp_ledger_adjustments', JSON.stringify([payload, ...localAdjs]));



      if (status === 'approved') {

        await applyAdjustmentBalance(partyType, partyId, type, amt);

        await postAdjustmentJournal(refNo, partyType, type, amt, narration);

        setSuccessMsg(`✅ Adjustment ${refNo} posted and applied.`);

      } else {

        setSuccessMsg(`⏳ Write-off ${refNo} posted as PENDING. Requires manager approval.`);

      }



      setShowAdjModal(false);

      setAdjForm({ partyType: 'customer', partyId: '', type: 'write_off', amount: '', narration: '' });

      reload();

      setTimeout(() => setSuccessMsg(''), 5000);

    } catch (err) { alert(err.message); }

    finally { setLoading(false); }

  };



  const applyAdjustmentBalance = async (partyType, partyId, type, amt) => {

    const isCustomer = partyType === 'customer';

    const storeKey = isCustomer ? 'erp_customers' : 'erp_suppliers';

    const list = JSON.parse(localStorage.getItem(storeKey) || '[]');

    const isArReduction = type === 'write_off' || type === 'credit_note' || type === 'rounding';



    const updated = list.map(item => {

      if (item.id !== partyId) return item;

      const current = Number(item.currentBalance || 0);

      let factor = 1;

      if (isCustomer) {

        factor = isArReduction ? -1 : 1;

      } else {

        factor = isArReduction ? -1 : 1;

      }

      return { ...item, currentBalance: Math.max(0, current + (factor * amt)) };

    });

    localStorage.setItem(storeKey, JSON.stringify(updated));

  };



  const postAdjustmentJournal = async (refNo, partyType, type, amt, narration) => {

    const isCustomer = partyType === 'customer';

    const isArReduction = type === 'write_off' || type === 'credit_note' || type === 'rounding';

    

    let drAccount = '';

    let crAccount = '';



    if (isCustomer) {

      if (type === 'write_off') {

        drAccount = 'acc-6180'; // Bad Debt Expense

        crAccount = 'acc-1100'; // Accounts Receivable

      } else if (type === 'credit_note') {

        drAccount = 'acc-4050'; // Sales Returns & Allowances (contra revenue)

        crAccount = 'acc-1100';

      } else {

        drAccount = 'acc-6150'; // Miscellaneous Expenses (adjustment)

        crAccount = 'acc-1100';

      }

    } else {

      if (isArReduction) {

        drAccount = 'acc-2010'; // Accounts Payable

        crAccount = 'acc-5020'; // Other Income / Purchase Returns

      } else {

        drAccount = 'acc-5010'; // Inventory/Expense Adjustments

        crAccount = 'acc-2010'; // Accounts Payable

      }

    }



    await accountingService.postJournalEntry({

      date: new Date().toISOString().substring(0, 10),

      refNo,

      narration: `Ledger Adjustment: ${narration}`,

      lines: [

        { accountId: drAccount || 'acc-4090', type: 'debit', amount: amt },

        { accountId: crAccount || 'acc-2010', type: 'credit', amount: amt }

      ],

      sourceModule: 'ledgers',

      sourceRefId: refNo

    });

  };



  const handleApproveAdjustment = async (adj) => {

    setLoading(true);

    try {

      const localAdjs = JSON.parse(localStorage.getItem('erp_ledger_adjustments') || '[]');

      const updated = localAdjs.map(a => {

        if (a.id !== adj.id) return a;

        return { ...a, status: 'approved', approvedBy: currentUser?.displayName || 'Finance Director', approvedAt: new Date().toISOString() };

      });

      localStorage.setItem('erp_ledger_adjustments', JSON.stringify(updated));



      await applyAdjustmentBalance(adj.partyType, adj.partyId, adj.type, adj.amount);

      await postAdjustmentJournal(adj.refNo, adj.partyType, adj.type, adj.amount, adj.narration);



      setSuccessMsg(`✅ write-off ${adj.refNo} approved! Balance and general books updated.`);

      reload();

      setTimeout(() => setSuccessMsg(''), 4000);

    } catch (err) { alert(err.message); }

    finally { setLoading(false); }

  };



  /* ─────────── Quick Settlement Receipts/Payments posting ─────────── */

  const handleOpenSettlementModal = (party) => {

    setSelectedParty(party);

    setAmount('');

    setMethod('bank_transfer');

    setLedgerAccount('acc-1020');

    setNarration('');

    setSelectedInvoice('');

    setIsModalOpen(true);

  };



  const handlePostQuickSettlement = async (e) => {

    e.preventDefault();

    if (!selectedParty || !amount || Number(amount) <= 0) return alert('Select amount.');

    const amt = Number(amount);

    const isCustomer = selectedParty.id.startsWith('cust');



    setLoading(true);

    try {

      if (isCustomer) {

        if (amt > (selectedParty.currentBalance || 0) + 0.01) {

          if (!window.confirm(`Payment BDT ${amt.toLocaleString()} exceeds customer outstanding balance ${fmt(selectedParty.currentBalance)}. Allow excess as advance credit?`)) {

            setLoading(false);

            return;

          }

        }

        // Route through canonical salesService — single authoritative AR receipt path (GAP-2 fix)

        await salesService.receiveFromCustomer({

          customerId: selectedParty.id,

          amount: amt,

          method,

          accountId: ledgerAccount,

          narration: narration || `Collection receipt settled via Ledger — ${selectedParty.name}`,

          chequeNo: '',

          invoiceNo: selectedInvoice || undefined

        }, currentUser);

      } else {

        // Route through canonical purchaseService — single authoritative AP payment path (GAP-2 fix)

        await purchaseService.paySupplier({

          supplierId: selectedParty.id,

          amount: amt,

          method,

          accountId: ledgerAccount,

          narration: narration || `Supplier payout settled via Ledger — ${selectedParty.name}`,

          chequeNo: '',

          invoiceNo: selectedInvoice || undefined

        }, currentUser);

      }



      setSuccessMsg(`✅ Settlement transaction posted! Outstanding balances updated.`);

      setIsModalOpen(false);

      reload();

      setTimeout(() => setSuccessMsg(''), 4000);

    } catch (err) { alert(err.message); }

    finally { setLoading(false); }

  };



  /* ─────────── PDF Account Statement Generation ─────────── */

  const downloadStatementPDF = (party, fromDate, toDate) => {

    const { jsPDF } = window.jspdf;

    if (!jsPDF) return alert('jsPDF is not loaded.');



    const isCustomer = party.id.startsWith('cust');

    const lines = compileStatements(party).filter(l => {

      if (fromDate && l.date < fromDate) return false;

      if (toDate && l.date > toDate) return false;

      return true;

    });

    const closingBalance = lines[lines.length - 1]?.balance || 0;



    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.rect(5, 5, 200, 287);

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);

    doc.text('ERP for EL', 105, 18, { align: 'center' });

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);

    doc.text('House-12, Road-05, Dhanmondi, Dhaka-1205, Bangladesh', 105, 23, { align: 'center' });

    doc.text('BIN: 001234567-0101 | TIN: 9876543210 | info@erpforu.com', 105, 27, { align: 'center' });

    doc.setLineWidth(0.5); doc.setDrawColor(37, 99, 235); doc.line(10, 31, 200, 31);

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(37, 99, 235);

    doc.text(`${isCustomer ? 'CUSTOMER' : 'SUPPLIER'} LEDGER STATEMENT`, 105, 41, { align: 'center' });

    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(10, 47, 190, 25, 'FD');

    doc.setFontSize(9); doc.setTextColor(71, 85, 105);

    doc.setFont('Helvetica', 'bold'); doc.text('Account Holder:', 12, 53); doc.setFont('Helvetica', 'normal');

    doc.text(party.name || '', 38, 53);

    doc.setFont('Helvetica', 'bold'); doc.text('Company Name:', 12, 59); doc.setFont('Helvetica', 'normal');

    doc.text(party.company || 'N/A', 38, 59);

    doc.setFont('Helvetica', 'bold'); doc.text('Contact Detail:', 12, 65); doc.setFont('Helvetica', 'normal');

    doc.text(`${party.phone || ''} | ${party.email || ''}`, 38, 65);

    doc.setFont('Helvetica', 'bold'); doc.text('Report Period:', 110, 53); doc.setFont('Helvetica', 'normal');

    doc.text(`${fromDate || 'Opening'} to ${toDate || 'Today'}`, 135, 53);

    doc.setFont('Helvetica', 'bold'); doc.text('Closing Balance:', 110, 59);

    doc.text(`BDT ${closingBalance.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`, 135, 59);

    doc.setFont('Helvetica', 'bold'); doc.text('Prepared On:', 110, 65); doc.setFont('Helvetica', 'normal');

    doc.text(new Date().toLocaleDateString('en-GB'), 135, 65);

    let tableY = 77;

    doc.setFillColor(241, 245, 249); doc.rect(10, tableY, 190, 8, 'F'); doc.rect(10, tableY, 190, 8);

    doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);

    doc.text('Date', 12, tableY + 5.5); doc.text('Reference No', 32, tableY + 5.5);

    doc.text('Type', 68, tableY + 5.5); doc.text('Debit (DR)', 105, tableY + 5.5, { align: 'right' });

    doc.text('Credit (CR)', 138, tableY + 5.5, { align: 'right' }); doc.text('Balance (BDT)', 180, tableY + 5.5, { align: 'right' });

    doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59); let y = tableY + 8;

    lines.forEach((line) => {

      doc.rect(10, y, 190, 8);

      doc.text(line.date?.substring(0, 10) || '', 12, y + 5.5);

      doc.text(line.refNo || '', 32, y + 5.5);

      doc.text(line.type || '', 68, y + 5.5);

      doc.text(line.debit > 0 ? Number(line.debit).toLocaleString('en-BD') : '-', 105, y + 5.5, { align: 'right' });

      doc.text(line.credit > 0 ? Number(line.credit).toLocaleString('en-BD') : '-', 138, y + 5.5, { align: 'right' });

      doc.text(Number(line.balance).toLocaleString('en-BD', { minimumFractionDigits: 2 }), 180, y + 5.5, { align: 'right' });

      y += 8;

    });

    y += 14; doc.setFont('Helvetica', 'bold'); doc.text('Closing Balance in Words:', 10, y); doc.setFont('Helvetica', 'normal');

    doc.text(numberToWords(Math.round(Math.abs(closingBalance))), 52, y);

    y += 35; doc.setLineWidth(0.3); doc.setDrawColor(148, 163, 184); doc.line(15, y, 65, y); doc.line(140, y, 190, y);

    doc.setFontSize(8.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(71, 85, 105);

    doc.text('Prepared By (Accounts)', 40, y + 4, { align: 'center' }); doc.text('Authorized Seal & Signature', 165, y + 4, { align: 'center' });

    doc.setFont('Helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(148, 163, 184);

    doc.text('Note: This is an official system-generated statement powered by ERP for EL platform.', 105, 275, { align: 'center' });

    doc.save(`Statement_${party.name.replace(/ /g, '_')}_${new Date().toISOString().substring(0, 10)}.pdf`);

  };



  /* ─────────── CSV Export ─────────── */

  const handleExportCSV = () => {

    let headers = ['Ref No', 'Date', 'Party Name', 'Ledger Type', 'Mode', 'Amount (BDT)', 'Narration'];

    let rows = filteredPayments.map(p => {

      const isCustomer = p.type === 'receipt';

      const party = (isCustomer ? customers : suppliers).find(x => x.id === p.partyId);

      return [

        p.refNo,

        p.date?.substring(0, 10) || '',

        party ? party.name : 'Unknown Account',

        p.type === 'receipt' ? 'Customer (AR)' : 'Supplier (AP)',

        p.paymentMethod || 'bank',

        p.amount,

        p.narration || ''

      ];

    });



    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 

      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);

    link.setAttribute("download", `Settlement_Logs_Export_${new Date().toISOString().substring(0, 10)}.csv`);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };



  /* ─────────── Logs filter ─────────── */

  const filteredPayments = useMemo(() => {

    return payments.filter(p => {

      const isReceipt = p.type === 'receipt';

      if (tab === 'logs' && simRole === 'sales' && !isReceipt) return false;

      if (tab === 'logs' && simRole === 'purchase' && isReceipt) return false;

      

      if (filters.search.trim()) {

        const q = filters.search.toLowerCase();

        const party = (isReceipt ? customers : suppliers).find(x => x.id === p.partyId);

        if (!p.refNo.toLowerCase().includes(q) && !(p.narration || '').toLowerCase().includes(q) && !(party?.name || '').toLowerCase().includes(q)) return false;

      }

      if (filters.fromDate && p.date && p.date.substring(0, 10) < filters.fromDate) return false;

      if (filters.toDate && p.date && p.date.substring(0, 10) > filters.toDate) return false;

      if (filters.mode !== 'all' && p.paymentMethod !== filters.mode) return false;

      if (filters.amountMin && Number(p.amount) < Number(filters.amountMin)) return false;

      if (filters.amountMax && Number(p.amount) > Number(filters.amountMax)) return false;

      return true;

    });

  }, [payments, filters, tab, simRole, customers, suppliers]);



  /* ─────────── Style tokens and focus effects ─────────── */

  const inputStyle = { width: '100%', padding: '0.6rem 0.85rem', border: '1.5px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s', fontFamily: 'inherit' };

  const onFocus = (e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; };

  const onBlurInput = (e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; };



  const initials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const avatarColor = (name = '') => {

    const colors = ['#6366f1','#06b6d4','#22c55e','#f59e0b','#ec4899','#8b5cf6','#ef4444'];

    return colors[name.charCodeAt(0) % colors.length];

  };



  /* ─────────── Computed Net Position & Forecast ─────────── */

  const netPosition = useMemo(() => {

    const totalAR = customers.reduce((s, c) => s + Number(c.currentBalance || 0), 0);

    const totalAP = suppliers.reduce((s, s2) => s + Number(s2.currentBalance || 0), 0);

    return { totalAR, totalAP, net: totalAR - totalAP };

  }, [customers, suppliers]);



  const overdueAlerts = useMemo(() => {

    const today = new Date().toISOString().substring(0, 10);

    const alerts = [];

    salesInvoices.forEach(i => {

      if (i.paymentStatus !== 'paid' && (i.dueDate || i.date) < today) {

        const cust = customers.find(c => c.id === i.customerId);

        const remaining = Number(i.grandTotal || 0) - Number(i.paidAmount || 0);

        if (remaining > 0) alerts.push({ type: 'ar', party: cust?.name || i.customerId, ref: i.invoiceNo, amount: remaining, dueDate: i.dueDate || i.date });

      }

    });

    purchaseInvoices.forEach(i => {

      if (i.paymentStatus !== 'paid' && (i.dueDate || i.date) < today) {

        const sup = suppliers.find(s => s.id === i.supplierId);

        const remaining = Number(i.grandTotal || 0) - Number(i.paidAmount || 0);

        if (remaining > 0) alerts.push({ type: 'ap', party: sup?.name || i.supplierId, ref: i.invoiceNo, amount: remaining, dueDate: i.dueDate || i.date });

      }

    });

    return alerts.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  }, [salesInvoices, purchaseInvoices, customers, suppliers]);



  const cashFlowForecast = useMemo(() => {

    const today = new Date();

    const days = Array.from({ length: 30 }, (_, i) => {

      const d = new Date(today); d.setDate(d.getDate() + i);

      return d.toISOString().substring(0, 10);

    });

    return days.map(date => {

      const inflow = salesInvoices.filter(i => (i.dueDate || i.date) === date && i.paymentStatus !== 'paid')

        .reduce((s, i) => s + (Number(i.grandTotal) - Number(i.paidAmount || 0)), 0);

      const outflow = purchaseInvoices.filter(i => (i.dueDate || i.date) === date && i.paymentStatus !== 'paid')

        .reduce((s, i) => s + (Number(i.grandTotal) - Number(i.paidAmount || 0)), 0);

      return { date, inflow, outflow, net: inflow - outflow };

    }).filter(d => d.inflow > 0 || d.outflow > 0);

  }, [salesInvoices, purchaseInvoices]);



  const filteredCustomers = useMemo(() => {

    if (!partnerSearch.trim()) return customers;

    const q = partnerSearch.toLowerCase();

    return customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q));

  }, [customers, partnerSearch]);



  const filteredSuppliers = useMemo(() => {

    if (!partnerSearch.trim()) return suppliers;

    const q = partnerSearch.toLowerCase();

    return suppliers.filter(s => (s.name || '').toLowerCase().includes(q) || (s.company || '').toLowerCase().includes(q) || (s.phone || '').includes(q) || (s.email || '').toLowerCase().includes(q));

  }, [suppliers, partnerSearch]);



  return (

    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'inherit', color: 'var(--text-primary)' }}>

      

      {/* Premium Header Banner */}

      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #3b0764 100%)', borderRadius: 20, padding: '1.5rem 2rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'absolute', bottom: -30, right: 80, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>

            <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⚖️</div>

            <div>

              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.4px' }}>General Subsidiary Ledgers</h2>

              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Manage Customer Receivables (A/R) & Supplier Payables (A/P) · Reconciliations & Settlements</p>

            </div>

          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Net Position Pill */}

            <div style={{ background: netPosition.net >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', border: `1px solid ${netPosition.net >= 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, padding: '0.45rem 0.95rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, color: netPosition.net >= 0 ? '#34d399' : '#f87171' }}>

              {netPosition.net >= 0 ? '📈' : '📉'} Net Position: {fmt(Math.abs(netPosition.net))} {netPosition.net >= 0 ? 'Favorable' : 'Deficit'}

            </div>

            <button onClick={() => setShowForecast(v => !v)} style={{ background: showForecast ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.12)', border: `1px solid ${showForecast ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.2)'}`, padding: '0.45rem 0.95rem', borderRadius: 12, color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>

              📊 {showForecast ? 'Hide' : 'Show'} Forecast

            </button>

            <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.45rem 0.95rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.8rem' }}>

              <span style={{ fontSize: '0.74rem', opacity: 0.8, fontWeight: 700 }}>SIMULATE ROLE:</span>

              <select value={simRole} onChange={e => setSimRole(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', fontFamily: 'inherit' }}>

                <option value="admin" style={{ color: '#0f172a' }}>🔒 Finance Admin</option>

                <option value="sales" style={{ color: '#0f172a' }}>👥 Sales AR Desk</option>

                <option value="purchase" style={{ color: '#0f172a' }}>🏢 Purchase AP Desk</option>

              </select>

            </div>

          </div>

        </div>

      </div>



      {/* Net Position Summary Cards */}

      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>

        {[

          { label: 'Total Receivables (A/R)', value: netPosition.totalAR, color: '#3b82f6', icon: '📥', sub: `${customers.length} active customers` },

          { label: 'Total Payables (A/P)',    value: netPosition.totalAP, color: '#8b5cf6', icon: '📤', sub: `${suppliers.length} active suppliers` },

          { label: 'Net Liquidity Position',  value: netPosition.net,    color: netPosition.net >= 0 ? '#10b981' : '#ef4444', icon: netPosition.net >= 0 ? '🏦' : '⚠️', sub: netPosition.net >= 0 ? 'Healthy net receivable' : 'Net payable position' }

        ].map(card => (

          <div key={card.label} style={{ background: 'var(--bg-secondary)', border: `1px solid var(--border-color)`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>

            <div style={{ height: 4, background: `linear-gradient(90deg, ${card.color}, ${card.color}80)` }} />

            <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>

              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{card.icon}</div>

              <div style={{ flex: 1, minWidth: 0 }}>

                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: card.color, letterSpacing: '-0.5px', fontFamily: 'monospace', lineHeight: 1.1 }}>{fmt(Math.abs(card.value))}</div>

                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{card.label}</div>

                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>{card.sub}</div>

              </div>

            </div>

          </div>

        ))}

      </div>



      {showAlerts && overdueAlerts.length > 0 && (

        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '0.85rem 1.25rem' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#ef4444', fontSize: '0.82rem' }}>

              🚨 {overdueAlerts.length} Overdue Transaction{overdueAlerts.length !== 1 ? 's' : ''} Require Attention

            </div>

            <button onClick={() => setShowAlerts(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, fontFamily: 'inherit' }}>✕ Dismiss</button>

          </div>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>

            {overdueAlerts.slice(0, 6).map((alert, idx) => (

              <div key={idx} style={{ flexShrink: 0, background: alert.type === 'ar' ? 'rgba(59,130,246,0.08)' : 'rgba(139,92,246,0.08)', border: `1px solid ${alert.type === 'ar' ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)'}`, borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.7rem' }}>

                <div style={{ fontWeight: 800, color: alert.type === 'ar' ? '#3b82f6' : '#8b5cf6', marginBottom: 2 }}>{alert.type === 'ar' ? '👥 AR' : '🏢 AP'} · {alert.ref}</div>

                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 1 }}>{alert.party}</div>

                <div style={{ color: '#ef4444', fontWeight: 800, fontFamily: 'monospace' }}>{fmt(alert.amount)}</div>

                <div style={{ color: 'var(--text-muted)', marginTop: 1 }}>Due: {alert.dueDate}</div>

              </div>

            ))}

            {overdueAlerts.length > 6 && (

              <div style={{ flexShrink: 0, background: 'rgba(239,68,68,0.06)', border: '1px dashed rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.5rem 0.85rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', color: '#ef4444', fontWeight: 800 }}>

                +{overdueAlerts.length - 6} more

              </div>

            )}

          </div>

        </div>

      )}



      {/* Credit Limit Alarm Strip */}

      {showAlerts && customers.filter(c => (c.currentBalance || 0) > (c.creditLimit || 100000)).length > 0 && (

        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '0.85rem 1.25rem', marginTop: '1rem' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#ef4444', fontSize: '0.82rem' }}>

              🚨 Credit Limit Alarm: Customers Exceeding Limit

            </div>

            <button onClick={() => setShowAlerts(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, fontFamily: 'inherit' }}>✕ Dismiss</button>

          </div>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>

            {customers.filter(c => (c.currentBalance || 0) > (c.creditLimit || 100000)).map((party, idx) => {

              const bal = party.currentBalance || 0;

              const limit = party.creditLimit || 100000;

              const exceeded = bal - limit;

              return (

                <div key={idx} style={{ flexShrink: 0, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.7rem' }}>

                  <div style={{ fontWeight: 800, color: '#ef4444', marginBottom: 2 }}>👥 Over Limit</div>

                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 1 }}>{party.name}</div>

                  <div style={{ color: '#ef4444', fontWeight: 800, fontFamily: 'monospace' }}>Exceeded: +{fmt(exceeded)}</div>

                  <div style={{ color: 'var(--text-muted)', marginTop: 1 }}>Limit: {fmt(limit)}</div>

                </div>

              );

            })}

          </div>

        </div>

      )}



      {/* Cash Flow Forecast Panel */}

      {showForecast && (

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>

            <div>

              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900 }}>📊 30-Day Cash Flow Forecast</h3>

              <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>Projected inflows (A/R collections) and outflows (A/P payments) based on invoice due dates.</p>

            </div>

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700 }}>

              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />Expected Inflow</span>

              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />Expected Outflow</span>

            </div>

          </div>

          {cashFlowForecast.length === 0 ? (

            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>🎉 No outstanding invoices due in the next 30 days.</div>

          ) : (

            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', alignItems: 'flex-end' }}>

              {(() => {

                const maxVal = Math.max(...cashFlowForecast.map(d => Math.max(d.inflow, d.outflow)), 1);

                return cashFlowForecast.map((d, idx) => (

                  <div key={idx} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 56 }}>

                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</div>

                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>

                      {d.inflow > 0 && <div title={`Inflow: ${fmt(d.inflow)}`} style={{ width: 12, background: 'linear-gradient(to top, #10b981, #34d399)', borderRadius: '3px 3px 0 0', height: `${Math.max(6, (d.inflow / maxVal) * 80)}px`, transition: 'height 0.3s' }} />}

                      {d.outflow > 0 && <div title={`Outflow: ${fmt(d.outflow)}`} style={{ width: 12, background: 'linear-gradient(to top, #ef4444, #f87171)', borderRadius: '3px 3px 0 0', height: `${Math.max(6, (d.outflow / maxVal) * 80)}px`, transition: 'height 0.3s' }} />}

                    </div>

                    <div style={{ fontSize: '0.58rem', fontWeight: 800, color: d.net >= 0 ? '#10b981' : '#ef4444' }}>{d.net >= 0 ? '+' : ''}{Math.round(d.net / 1000)}k</div>

                  </div>

                ));

              })()}

            </div>

          )}

        </div>

      )}



      {/* Success Alert Banner */}

      {successMsg && (

        <div style={{ padding: '1rem 1.25rem', borderRadius: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'slideUp 0.3s ease' }}>

          <span>{successMsg}</span>

        </div>

      )}



      {/* Detailed KPI Cards Grid */}

      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}>

        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />

        Detailed A/R · A/P Metrics

        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />

      </div>

      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>

        {showAR && [

          { label: 'Total Receivables', amt: kpis.totalAR, color: '#3b82f6', icon: '👥', desc: 'Outstanding A/R' },

          { label: 'AR Due Today',     amt: kpis.arDueToday, color: '#06b6d4', icon: '⏳', desc: 'Settlements due' },

          { label: 'AR Overdue',       amt: kpis.arOverdue, color: '#ef4444', icon: '⚠️', desc: 'Late collections' },

          { label: 'Collected Month',  amt: kpis.collectedThisMonth, color: '#10b981', icon: '📥', desc: 'Receipts total' }

        ].map(k => (

          <div key={k.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', cursor: 'default', transition: 'transform 0.2s, box-shadow 0.2s' }}

            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${k.color}1a`; }}

            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}

          >

            <div style={{ height: 3, background: k.color }} />

            <div style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>

              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${k.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{k.icon}</div>

              <div>

                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: k.color, lineHeight: 1, letterSpacing: '-0.5px', fontFamily: 'monospace' }}>{fmt(k.amt)}</div>

                <div style={{ fontSize: '0.67rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{k.label}</div>

                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>{k.desc}</div>

              </div>

            </div>

          </div>

        ))}



        {showAP && [

          { label: 'Total Payables',   amt: kpis.totalAP, color: '#8b5cf6', icon: '🏢', desc: 'Outstanding A/P' },

          { label: 'AP Due Today',     amt: kpis.apDueToday, color: '#f59e0b', icon: '📅', desc: 'Settlements due' },

          { label: 'AP Overdue',       amt: kpis.apOverdue, color: '#ec4899', icon: '🚨', desc: 'Late remittances' },

          { label: 'Paid This Month',  amt: kpis.paidThisMonth, color: '#10b981', icon: '📤', desc: 'Payouts total' }

        ].map(k => (

          <div key={k.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', cursor: 'default', transition: 'transform 0.2s, box-shadow 0.2s' }}

            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${k.color}1a`; }}

            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}

          >

            <div style={{ height: 3, background: k.color }} />

            <div style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>

              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${k.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{k.icon}</div>

              <div>

                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: k.color, lineHeight: 1, letterSpacing: '-0.5px', fontFamily: 'monospace' }}>{fmt(k.amt)}</div>

                <div style={{ fontSize: '0.67rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{k.label}</div>

                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>{k.desc}</div>

              </div>

            </div>

          </div>

        ))}

      </div>



      {/* Tab Selectors & Sub-Actions */}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>

          <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-tertiary)', padding: '0.3rem', borderRadius: 12, overflowX: 'auto', maxWidth: '100%' }}>

            {[

              showAR && { id: 'customers', label: '👥 Customer Ledgers', count: customers.length },

              showAP && { id: 'suppliers', label: '🏢 Supplier Ledgers', count: suppliers.length },

              { id: 'aging',       label: '📅 Aging Analysis' },

              { id: 'logs',        label: '🕒 Settlement Logs', count: payments.length },

              simRole === 'admin' && { id: 'reconcile',   label: '🔄 Reconciliation' },

              simRole === 'admin' && { id: 'adjustments', label: '⚖️ Adjustments' },

              simRole === 'admin' && { id: 'audit',       label: '📋 Audit Trail' }

            ].filter(Boolean).map(t => {

              const active = tab === t.id;

              return (

                <button key={t.id} onClick={() => { setTab(t.id); setPartnerSearch(''); }} style={{ padding: '0.5rem 1rem', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700, background: active ? 'var(--bg-secondary)' : 'transparent', color: active ? 'var(--accent-color)' : 'var(--text-muted)', boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none', whiteSpace: 'nowrap', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}>

                  {t.label}

                  {t.count !== undefined && <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 20, background: active ? 'var(--accent-color)' : 'var(--border-color)', color: active ? '#fff' : 'var(--text-muted)', fontWeight: 800, lineHeight: 1.4 }}>{t.count}</span>}

                </button>

              );

            })}

          </div>



          <div style={{ display: 'flex', gap: '0.5rem' }}>

            {simRole === 'admin' && tab === 'adjustments' && (

              <button onClick={() => setShowAdjModal(true)} style={{ padding: '0.5rem 1.1rem', borderRadius: 10, border: '1.5px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}

                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}

                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)'; }}

              >⚖️ Post Manual Adjustment</button>

            )}

            {(tab === 'customers' || tab === 'suppliers') && (

              <button onClick={handleOpenAddPartner} style={{ padding: '0.5rem 1.1rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(99,102,241,0.25)', transition: 'all 0.2s' }}

                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}

                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}

              >➕ Add {tab === 'customers' ? 'Customer' : 'Supplier'}</button>

            )}

          </div>

        </div>



        {/* Search bar for partner tabs */}

        {(tab === 'customers' || tab === 'suppliers') && (

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>

            <div style={{ flex: 1, position: 'relative' }}>

              <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>

              <input

                type="text"

                placeholder={`Search ${tab === 'customers' ? 'customers' : 'suppliers'} by name, company, phone or email…`}

                value={partnerSearch}

                onChange={e => setPartnerSearch(e.target.value)}

                style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.35rem', border: '1.5px solid var(--border-color)', borderRadius: 10, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s, box-shadow 0.2s' }}

                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}

                onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}

              />

            </div>

            {partnerSearch && (

              <button onClick={() => setPartnerSearch('')} style={{ padding: '0.5rem 0.85rem', border: '1px solid var(--border-color)', background: 'transparent', color: '#ef4444', borderRadius: 10, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>✕ Clear</button>

            )}

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>

              {tab === 'customers' ? filteredCustomers.length : filteredSuppliers.length} of {tab === 'customers' ? customers.length : suppliers.length} shown

            </div>

          </div>

        )}

      </div>



      {tab === 'customers' && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer Name / ID</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Financials (Billed / Out. / Overdue)</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Info</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Performance</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {partnerSearch ? `No customers matching "${partnerSearch}"` : 'No customers registered yet. Click ➕ Add Customer to begin.'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((party, idx) => {
                    const stats = getCustomerStats(party.id);
                    const bal = party.currentBalance || 0;
                    const limit = party.creditLimit || 100000;
                    const overLimit = bal > limit;
                    const pct = Math.min(100, Math.round((bal / limit) * 100));
                    const barColor = pct > 90 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#3b82f6';
                    const overdueValue = salesInvoices.filter(i => i.customerId === party.id && i.paymentStatus !== 'paid' && (i.dueDate || i.date) < new Date().toISOString().substring(0, 10)).reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0);
                    const statusColor = bal > 0 ? (overdueValue > 0 ? '#ef4444' : '#f59e0b') : '#10b981';
                    const statusBg = bal > 0 ? (overdueValue > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)') : 'rgba(16,185,129,0.08)';
                    const ac = avatarColor(party.name);

                    return (
                      <tr key={party.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-color)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                        onClick={() => setDetailDrawerParty(party)}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.04)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                      >
                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${ac}20`, border: `1px solid ${ac}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: ac }}>
                              {initials(party.name)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{party.name}</div>
                                {overLimit && (
                                  <span style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: 4, background: '#ef4444', color: '#fff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }} title={`Exceeded limit by ${fmt(bal - limit)}`}>
                                    🚨 OVER LIMIT
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🏢 {party.company || 'Private Account'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 20, background: statusBg, color: statusColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                            {bal > 0 ? (overdueValue > 0 ? '⚠️ Overdue' : 'Outstanding') : '✓ Settled'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'right', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Billed:</span> <strong style={{ fontFamily: 'monospace' }}>{fmt(stats.invoiced)}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Outstanding:</span> <strong style={{ fontFamily: 'monospace', color: bal > 0 ? statusColor : '#10b981' }}>{fmt(bal)}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Overdue:</span> <strong style={{ fontFamily: 'monospace', color: overdueValue > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{fmt(overdueValue)}</strong></div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          <div>📞 {party.phone || '—'}</div>
                          <div>✉️ {party.email || '—'}</div>
                        </td>
                        <td style={{ padding: '0.85rem', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          <div>On-time: <strong style={{ color: stats.paymentRatio > 80 ? '#10b981' : '#f59e0b' }}>{stats.paymentRatio}%</strong></div>
                          <div>Avg Cycle: <strong>{stats.avgCollectionDays} days</strong></div>
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button onClick={() => handleOpenEditPartner(party)} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}>Edit</button>
                            <button onClick={() => { setStatementParty(party); setIsStatementOpen(true); }} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: 6, color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}>📖</button>
                            <button onClick={() => handleOpenSettlementModal(party)} style={{ padding: '0.25rem 0.55rem', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: '0.68rem', fontWeight: 800 }}>💵 Collect</button>
                            <button onClick={() => handleDeletePartnerClick(party.id, party.name)} style={{ padding: '0.25rem 0.4rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontSize: '0.68rem' }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {tab === 'suppliers' && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Supplier Name / ID</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Financials (Purchased / Out. / Overdue)</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Credit Terms</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Info</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Metrics / Hold</th>
                  <th style={{ padding: '1rem', fontWeight: 800, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      {partnerSearch ? `No suppliers matching "${partnerSearch}"` : 'No suppliers registered yet. Click ➕ Add Supplier to begin.'}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((party, idx) => {
                    const stats = getSupplierStats(party.id);
                    const bal = party.currentBalance || 0;
                    const overdueValue = purchaseInvoices.filter(i => i.supplierId === party.id && i.paymentStatus !== 'paid' && (i.dueDate || i.date) < new Date().toISOString().substring(0, 10)).reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0);
                    const statusColor = bal > 0 ? (overdueValue > 0 ? '#ef4444' : '#f97316') : '#10b981';
                    const statusBg = bal > 0 ? (overdueValue > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.08)') : 'rgba(16,185,129,0.08)';
                    const ac = avatarColor(party.name);

                    return (
                      <tr key={party.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-color)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                        onClick={() => setDetailDrawerParty(party)}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.04)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                      >
                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${ac}20`, border: `1px solid ${ac}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: ac }}>
                              {initials(party.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{party.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🏢 {party.company || 'Direct Supplier'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem' }}>
                          <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 20, background: statusBg, color: statusColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                            {bal > 0 ? (overdueValue > 0 ? '⚠️ Overdue' : 'Outstanding') : '✓ Settled'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'right', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Purchased:</span> <strong style={{ fontFamily: 'monospace' }}>{fmt(stats.purchased)}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Outstanding:</span> <strong style={{ fontFamily: 'monospace', color: bal > 0 ? statusColor : '#10b981' }}>{fmt(bal)}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Overdue:</span> <strong style={{ fontFamily: 'monospace', color: overdueValue > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{fmt(overdueValue)}</strong></div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem', fontWeight: 700 }}>{party.creditTerms || 'Net 30'}</td>
                        <td style={{ padding: '0.85rem', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          <div>📞 {party.phone || '—'}</div>
                          <div>✉️ {party.email || '—'}</div>
                        </td>
                        <td style={{ padding: '0.85rem', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          <div>Mismatches: <strong style={{ color: stats.mismatchCount > 0 ? '#ef4444' : '#10b981' }}>{stats.mismatchCount} matches</strong></div>
                          <div>Hold: <strong style={{ color: stats.hasHold ? '#ef4444' : '#10b981' }}>{stats.hasHold ? 'Yes' : 'No'}</strong></div>
                        </td>
                        <td style={{ padding: '0.85rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button onClick={() => handleOpenEditPartner(party)} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}>Edit</button>
                            <button onClick={() => { setStatementParty(party); setIsStatementOpen(true); }} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: 6, color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}>📖</button>
                            <button onClick={() => handleOpenSettlementModal(party)} style={{ padding: '0.25rem 0.55rem', border: 'none', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: '0.68rem', fontWeight: 800 }}>💸 Pay</button>
                            <button onClick={() => handleDeletePartnerClick(party.id, party.name)} style={{ padding: '0.25rem 0.4rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontSize: '0.68rem' }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* ──────────────────────────────────────────────────────────

         TAB: AGING ANALYSIS

      ────────────────────────────────────────────────────────── */}

      {tab === 'aging' && (

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          

          {/* Customer AR Buckets */}

          {showAR && (() => {

            const total = arAgingBuckets.reduce((s, b) => s + b.total, 0) || 1;

            return (

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>

                <h3 style={{ fontSize: '0.98rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>

                  👥 Accounts Receivable (A/R) Aging Analysis

                </h3>

                <p style={{ margin: '0 0 1.25rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>Visual breakdown of customer outstanding debt based on invoice due date thresholds.</p>

                

                {/* Horizontal progress stack bar chart */}

                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: '1.5rem', background: 'var(--bg-tertiary)' }}>

                  {arAgingBuckets.map(b => {

                    const widthPct = (b.total / total) * 100;

                    return widthPct > 0 ? (

                      <div key={b.key} style={{ width: `${widthPct}%`, background: b.color, transition: 'width 0.4s' }} title={`${b.label}: ${fmt(b.total)} (${Math.round(widthPct)}%)`} />

                    ) : null;

                  })}

                </div>



                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>

                  {arAgingBuckets.map(b => {

                    const widthPct = total > 1 ? Math.round((b.total / total) * 100) : 0;

                    return (

                      <div key={b.key} style={{ background: b.bg, border: `1.5px solid ${b.color}25`, borderRadius: 14, padding: '1rem', position: 'relative', cursor: b.invoices.length > 0 ? 'pointer' : 'default' }}

                        onMouseEnter={e => { if (b.invoices.length > 0) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${b.color}18`; }}}

                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}

                      >

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>

                          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{b.label}</span>

                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>{widthPct}%</span>

                        </div>

                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: b.color, fontFamily: 'monospace', margin: '3px 0' }}>{fmt(b.total)}</div>

                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginBottom: b.invoices.length > 0 ? 6 : 0 }}>{b.invoices.length} outstanding bills</div>

                        {b.invoices.length > 0 && (

                          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 90, overflowY: 'auto' }}>

                            {b.invoices.slice(0, 3).map(inv => (

                              <div key={inv.invoiceNo} style={{ fontSize: '0.63rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: 3 }}>

                                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inv.invoiceNo}</span>

                                <span style={{ color: b.color, fontWeight: 800 }}>{fmt(inv.remaining)}</span>

                              </div>

                            ))}

                            {b.invoices.length > 3 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', paddingTop: 2 }}>+{b.invoices.length - 3} more…</div>}

                          </div>

                        )}

                      </div>

                    );

                  })}

                </div>

              </div>

            );

          })()}



          {/* Supplier AP Buckets */}

          {showAP && (() => {

            const total = apAgingBuckets.reduce((s, b) => s + b.total, 0) || 1;

            return (

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>

                <h3 style={{ fontSize: '0.98rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>

                  🏢 Accounts Payable (A/P) Aging Analysis

                </h3>

                <p style={{ margin: '0 0 1.25rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>Visual breakdown of supplier liabilities based on vendor invoice due date thresholds.</p>

                

                {/* Horizontal progress stack bar chart */}

                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: '1.5rem', background: 'var(--bg-tertiary)' }}>

                  {apAgingBuckets.map(b => {

                    const widthPct = (b.total / total) * 100;

                    return widthPct > 0 ? (

                      <div key={b.key} style={{ width: `${widthPct}%`, background: b.color, transition: 'width 0.4s' }} title={`${b.label}: ${fmt(b.total)} (${Math.round(widthPct)}%)`} />

                    ) : null;

                  })}

                </div>



                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>

                  {apAgingBuckets.map(b => {

                    const widthPct = total > 1 ? Math.round((b.total / total) * 100) : 0;

                    return (

                      <div key={b.key} style={{ background: b.bg, border: `1.5px solid ${b.color}25`, borderRadius: 14, padding: '1rem', position: 'relative', cursor: b.invoices.length > 0 ? 'pointer' : 'default' }}

                        onMouseEnter={e => { if (b.invoices.length > 0) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${b.color}18`; }}}

                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}

                      >

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>

                          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{b.label}</span>

                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>{widthPct}%</span>

                        </div>

                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: b.color, fontFamily: 'monospace', margin: '3px 0' }}>{fmt(b.total)}</div>

                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginBottom: b.invoices.length > 0 ? 6 : 0 }}>{b.invoices.length} supplier bills</div>

                        {b.invoices.length > 0 && (

                          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 90, overflowY: 'auto' }}>

                            {b.invoices.slice(0, 3).map(inv => (

                              <div key={inv.invoiceNo} style={{ fontSize: '0.63rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: 3 }}>

                                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inv.invoiceNo}</span>

                                <span style={{ color: b.color, fontWeight: 800 }}>{fmt(inv.remaining)}</span>

                              </div>

                            ))}

                            {b.invoices.length > 3 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', paddingTop: 2 }}>+{b.invoices.length - 3} more…</div>}

                          </div>

                        )}

                      </div>

                    );

                  })}

                </div>

              </div>

            );

          })()}

        </div>

      )}



      {/* ──────────────────────────────────────────────────────────

         TAB: SETTLEMENT LOGS

      ────────────────────────────────────────────────────────── */}

      {tab === 'logs' && (

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          

          {/* Advanced filter Bar */}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 12 }}>

            <input type="text" placeholder="Search ref, memo, partner name..." value={filters.search} onChange={e => setFilter('search', e.target.value)} style={{ ...inputStyle, flex: '1 1 200px', padding: '0.45rem 0.75rem' }} onFocus={onFocus} onBlur={onBlurInput} />

            <select value={filters.mode} onChange={e => setFilter('mode', e.target.value)} style={{ ...inputStyle, width: '140px', padding: '0.45rem 0.75rem' }} onFocus={onFocus} onBlur={onBlurInput}>

              <option value="all">All Channels</option>

              <option value="bank_transfer">🏛️ Bank Transfer</option>

              <option value="cash">💵 Cash</option>

              <option value="cheque">📄 Cheque</option>

              <option value="bkash">📱 bKash</option>

              <option value="nagad">📱 Nagad</option>

              <option value="credit_note">🧾 Credit Note</option>

              <option value="journal_adj">⚖️ Journal Entry</option>

            </select>

            <input type="date" value={filters.fromDate} onChange={e => setFilter('fromDate', e.target.value)} style={{ ...inputStyle, width: '130px', padding: '0.45rem 0.75rem' }} onFocus={onFocus} onBlur={onBlurInput} />

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>

            <input type="date" value={filters.toDate} onChange={e => setFilter('toDate', e.target.value)} style={{ ...inputStyle, width: '130px', padding: '0.45rem 0.75rem' }} onFocus={onFocus} onBlur={onBlurInput} />

            

            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>

              <button onClick={handleExportCSV} style={{ padding: '0.48rem 1.1rem', border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, borderRadius: 8, boxShadow: '0 2px 6px rgba(99,102,241,0.2)' }}>📥 Export CSV</button>

              {(filters.search || filters.mode !== 'all' || filters.fromDate || filters.toDate || filters.amountMin || filters.amountMax) && (

                <button onClick={() => setFilters({ search: '', status: 'all', fromDate: '', toDate: '', amountMin: '', amountMax: '', mode: 'all' })} style={{ padding: '0.48rem 0.8rem', border: '1px solid var(--border-color)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, borderRadius: 8 }}>✕ Clear</button>

              )}

            </div>

          </div>



          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 12 }}>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>

              <thead>

                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>

                  <th style={{ textAlign: 'left', padding: '0.85rem' }}>Ref No</th>

                  <th style={{ textAlign: 'left', padding: '0.85rem' }}>Date</th>

                  <th style={{ textAlign: 'left', padding: '0.85rem' }}>Partner Profile</th>

                  <th style={{ textAlign: 'left', padding: '0.85rem' }}>Ledger Type</th>

                  <th style={{ textAlign: 'left', padding: '0.85rem' }}>Settlement Account</th>

                  <th style={{ textAlign: 'left', padding: '0.85rem' }}>Method</th>

                  <th style={{ textAlign: 'right', padding: '0.85rem' }}>Settled Amount</th>

                  <th style={{ textAlign: 'left', padding: '0.85rem' }}>Narration Remarks</th>

                </tr>

              </thead>

              <tbody>

                {filteredPayments.map((p, idx) => {

                  const isReceipt = p.type === 'receipt';

                  const party = (isReceipt ? customers : suppliers).find(x => x.id === p.partyId);

                  const accountName = defaultChartOfAccounts.find(a => a.id === p.ledgerAccountId)?.name || p.ledgerAccountId || 'Contra Account';

                  return (

                    <tr key={p.id} style={{ borderBottom: idx !== filteredPayments.length - 1 ? '1px solid var(--border-color)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>

                      <td style={{ padding: '0.85rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-color)' }}>{p.refNo}</td>

                      <td style={{ padding: '0.85rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{window.formatDate(p.date)}</td>

                      <td style={{ padding: '0.85rem', fontWeight: 700 }}>{party?.name || p.partyId}</td>

                      <td style={{ padding: '0.85rem' }}>

                        <span style={{ fontSize: '0.66rem', padding: '2px 7px', borderRadius: 20, background: isReceipt ? 'rgba(16,185,129,0.08)' : 'rgba(139,92,246,0.08)', color: isReceipt ? '#10b981' : '#8b5cf6', fontWeight: 800 }}>

                          {isReceipt ? 'RECEIPT (AR)' : 'PAYMENT (AP)'}

                        </span>

                      </td>

                      <td style={{ padding: '0.85rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{accountName}</td>

                      <td style={{ padding: '0.85rem', textTransform: 'capitalize', fontSize: '0.76rem' }}>{p.paymentMethod?.replace('_', ' ') || 'bank'}</td>

                      <td style={{ padding: '0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: isReceipt ? '#10b981' : '#ef4444' }}>{fmt(p.amount)}</td>

                      <td style={{ padding: '0.85rem', fontSize: '0.76rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{p.narration || '—'}</td>

                    </tr>

                  );

                })}

                {filteredPayments.length === 0 && (

                  <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No settlement logs found matching filters.</td></tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      )}



      {/* ──────────────────────────────────────────────────────────

         TAB: RECONCILIATION

      ────────────────────────────────────────────────────────── */}

      {tab === 'reconcile' && (

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', alignItems: 'flex-start' }}>

          

          {/* Unallocated Payments Panel */}

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            <h3 style={{ fontSize: '0.92rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}>📥 Unallocated Remittances / Receipts</h3>

            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Select an general payment on account to allocate it to pending client invoices.</p>

            

            {unallocatedPayments.length === 0 ? (

              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', border: '1px dashed var(--border-color)', borderRadius: 12 }}>

                🎉 No unallocated receipts in general subsidiary ledger!

              </div>

            ) : (

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '480px', overflowY: 'auto' }}>

                {unallocatedPayments.map(p => {

                  const isCust = p.type === 'receipt';

                  const party = (isCust ? customers : suppliers).find(x => x.id === p.partyId);

                  const remAmt = getUnallocatedRemaining(p.refNo);

                  const selected = reconcilePayment?.refNo === p.refNo;

                  return (

                    <div key={p.refNo} onClick={() => handleSelectReconcilePayment(p)}

                      style={{ padding: '0.85rem', borderRadius: 12, background: selected ? 'rgba(99,102,241,0.06)' : 'var(--bg-tertiary)', border: `1.5px solid ${selected ? '#6366f1' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, marginBottom: 4 }}>

                        <span style={{ fontFamily: 'monospace', color: '#6366f1' }}>{p.refNo}</span>

                        <span style={{ color: 'var(--text-muted)' }}>{window.formatDate(p.date)}</span>

                      </div>

                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5 }}>{party?.name || p.partyId}</div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>

                        <span style={{ color: 'var(--text-muted)' }}>Total: {fmt(p.amount)}</span>

                        <span>Unallocated: <strong style={{ color: '#ef4444' }}>{fmt(remAmt)}</strong></span>

                      </div>

                    </div>

                  );

                })}

              </div>

            )}

          </div>



          {/* Allocation Matcher Workspace */}

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.25rem' }}>

            <h3 style={{ fontSize: '0.92rem', fontWeight: 900, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 5 }}>🔄 Reconciliation Matcher</h3>

            

            {reconcilePayment ? (

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', padding: '0.9rem 1.1rem', borderRadius: 12, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 3 }}>

                  <div><strong>Selected Payment Ref:</strong> <span style={{ fontFamily: 'monospace' }}>{reconcilePayment.refNo}</span></div>

                  <div><strong>Partner Profile:</strong> {customers.find(c => c.id === reconcilePayment.partyId)?.name || suppliers.find(s => s.id === reconcilePayment.partyId)?.name || reconcilePayment.partyId}</div>

                  <div><strong>Pending Match Fund:</strong> <span style={{ color: '#ef4444', fontWeight: 800 }}>{fmt(getUnallocatedRemaining(reconcilePayment.refNo))}</span></div>

                </div>



                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Outstanding Invoices / Bills</label>

                  <select style={inputStyle} value={reconcileInvoice?.invoiceNo || ''} onChange={e => {

                    const inv = activeReconcileInvoices.find(i => i.invoiceNo === e.target.value);

                    setReconcileInvoice(inv || null);

                    if (inv) {

                      const due = (inv.grandTotal + (inv.landedCost?.total || 0)) - (inv.paidAmount || 0);

                      const remPmt = getUnallocatedRemaining(reconcilePayment.refNo);

                      setReconcileAmt(String(Math.min(due, remPmt).toFixed(2)));

                    }

                  }} onFocus={onFocus} onBlur={onBlurInput}>

                    <option value="">— Select outstanding document to match —</option>

                    {activeReconcileInvoices.map(i => {

                      const due = (i.grandTotal + (i.landedCost?.total || 0)) - (i.paidAmount || 0);

                      return <option key={i.invoiceNo} value={i.invoiceNo}>{i.invoiceNo} (Date: {i.date} | Outstanding Due: {fmt(due)})</option>;

                    })}

                  </select>

                  {activeReconcileInvoices.length === 0 && <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginTop: 4 }}>✓ No outstanding matches found for this account.</span>}

                </div>



                {reconcileInvoice && (

                  <>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>

                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Match Allocation Amount (BDT) *</label>

                      <input type="number" placeholder="0.00" value={reconcileAmt} onChange={e => setReconcileAmt(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                    </div>

                    <button onClick={handlePostReconciliation} disabled={loading} style={{ padding: '0.6rem', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, borderRadius: 10, boxShadow: '0 4px 12px rgba(99,102,241,0.2)', transition: 'all 0.2s', marginTop: '0.5rem' }}>

                      ✓ Post Matching Allocation

                    </button>

                  </>

                )}

              </div>

            ) : (

              <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: 12 }}>

                Select an unallocated transaction card from the left panel to trigger matching reconciliation.

              </div>

            )}

          </div>

        </div>

      )}



      {/* ──────────────────────────────────────────────────────────

         TAB: ADJUSTMENTS

      ────────────────────────────────────────────────────────── */}

      {tab === 'adjustments' && (

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.5rem' }}>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, marginBottom: '1rem' }}>⚖️ General Ledger Adjustments Registry</h3>

            

            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 12 }}>

              {adjustments.length === 0 ? (

                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No adjustments logged. Click "Post Manual Adjustment" to create one.</div>

              ) : (

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>

                  <thead>

                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>

                      <th style={{ textAlign: 'left', padding: '0.8rem' }}>Ref No</th>

                      <th style={{ textAlign: 'left', padding: '0.8rem' }}>Date</th>

                      <th style={{ textAlign: 'left', padding: '0.8rem' }}>Partner Profile</th>

                      <th style={{ textAlign: 'left', padding: '0.8rem' }}>Type</th>

                      <th style={{ textAlign: 'left', padding: '0.8rem' }}>Narration Remarks</th>

                      <th style={{ textAlign: 'right', padding: '0.8rem' }}>Amount</th>

                      <th style={{ textAlign: 'left', padding: '0.8rem' }}>Status</th>

                      <th style={{ textAlign: 'center', padding: '0.8rem' }}>Actions</th>

                    </tr>

                  </thead>

                  <tbody>

                    {adjustments.map((a, idx) => {

                      const isCust = a.partyType === 'customer';

                      const partyName = (isCust ? customers : suppliers).find(x => x.id === a.partyId)?.name || a.partyId;

                      const badgeColor = a.status === 'approved' ? '#10b981' : '#f59e0b';

                      return (

                        <tr key={a.id} style={{ borderBottom: idx !== adjustments.length - 1 ? '1px solid var(--border-color)' : 'none' }}>

                          <td style={{ padding: '0.8rem', fontFamily: 'monospace', fontWeight: 800 }}>{a.refNo}</td>

                          <td style={{ padding: '0.8rem', color: 'var(--text-secondary)' }}>{window.formatDate(a.date)}</td>

                          <td style={{ padding: '0.8rem', fontWeight: 700 }}>{partyName}</td>

                          <td style={{ padding: '0.8rem', textTransform: 'capitalize' }}>{a.type.replace('_', ' ')}</td>

                          <td style={{ padding: '0.8rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>{a.narration}</td>

                          <td style={{ padding: '0.8rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{fmt(a.amount)}</td>

                          <td style={{ padding: '0.8rem' }}>

                            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800, background: `${badgeColor}12`, color: badgeColor }}>

                              {a.status === 'approved' ? 'Approved' : 'Pending'}

                            </span>

                          </td>

                          <td style={{ padding: '0.8rem', textAlign: 'center' }}>

                            {a.status === 'pending' && simRole === 'admin' && (

                              <button onClick={() => handleApproveAdjustment(a)} style={{ padding: '0.25rem 0.65rem', border: 'none', background: '#10b981', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}>Approve</button>

                            )}

                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              )}

            </div>

          </div>

        </div>

      )}



      {/* ──────────────────────────────────────────────────────────

         TAB: AUDIT LOG

      ────────────────────────────────────────────────────────── */}

      {tab === 'audit' && (

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '1.5rem' }}>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 900, marginBottom: '1.15rem' }}>📋 Audit Trail Timeline</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '480px', overflowY: 'auto' }}>

            {auditLogs.filter(log => log.module === 'ledgers' || log.module === 'sales' || log.module === 'purchases' || log.module === 'accounting' || log.module === 'inventory').map(log => {
              const moduleColor = {
                sales: '#3b82f6',
                purchases: '#8b5cf6',
                accounting: '#eab308',
                inventory: '#10b981',
                ledgers: '#6366f1'
              }[log.module] || '#64748b';

              const actionColor = {
                create: '#10b981',
                update: '#3b82f6',
                delete: '#ef4444',
                post: '#2563eb',
                approve: '#059669',
                reverse: '#ea580c'
              }[log.action] || '#64748b';

              return (
                <div key={log.id} style={{ padding: '0.9rem 1.1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 14, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        👤 {log.userName || log.userId || 'System'}
                      </span>
                      <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 20, background: `${moduleColor}12`, color: moduleColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {log.module}
                      </span>
                      <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 20, background: `${actionColor}12`, color: actionColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {log.action}
                      </span>
                      {log.refNo && (
                        <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', padding: '1px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-muted)' }}>
                          {log.refNo}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem', paddingLeft: '2px' }}>
                    {log.description || log.details}
                  </div>
                </div>
              );
            })}

            {auditLogs.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No audit trail logs logged yet.</div>}

          </div>

        </div>

      )}



      {/* ──────────────────────────────────────────────────────────

         DETAIL DRAWER

      ────────────────────────────────────────────────────────── */}

      {detailDrawerParty && (() => {

        const isCust = detailDrawerParty.id.startsWith('cust');

        const statement = compileStatements(detailDrawerParty);

        const overdueValue = (isCust ? salesInvoices : purchaseInvoices).filter(i => (isCust ? i.customerId : i.supplierId) === detailDrawerParty.id && i.paymentStatus !== 'paid' && (i.dueDate || i.date) < new Date().toISOString().substring(0, 10)).reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0);



        return (

          <>

            <div onClick={() => setDetailDrawerParty(null)} style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)', animation: 'fadeIn 0.25s' }} />

            <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '480px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', zIndex: 900, boxShadow: '-15px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', animation: 'slideLeft 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

              

              {/* Header */}

              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #581c87 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>

                <div>

                  <div style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{isCust ? 'Customer A/R Account' : 'Supplier A/P Account'}</div>

                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>{detailDrawerParty.name}</h3>

                </div>

                <button onClick={() => setDetailDrawerParty(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

              </div>



              {/* Body */}

              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

                {/* Information Card Grid */}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 12, fontSize: '0.76rem' }}>

                  <div>Outstanding Balance: <strong style={{ color: detailDrawerParty.currentBalance > 0 ? '#ef4444' : '#10b981' }}>{fmt(detailDrawerParty.currentBalance)}</strong></div>

                  <div>Overdue Amount: <strong style={{ color: overdueValue > 0 ? '#ef4444' : 'var(--text-primary)' }}>{fmt(overdueValue)}</strong></div>

                  <div>Limit / Terms: <strong>{isCust ? fmt(detailDrawerParty.creditLimit || 100000) : detailDrawerParty.creditTerms || 'Net 30'}</strong></div>

                  <div>Account Code: <strong style={{ fontFamily: 'monospace' }}>{detailDrawerParty.id}</strong></div>

                </div>



                {/* Custom Metadata Fields */}

                {detailDrawerParty.customFields && detailDrawerParty.customFields.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 12, fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Additional Details</div>
                    {detailDrawerParty.customFields.map((cf, idx) => {
                      const isLink = typeof cf.value === 'string' && (cf.value.startsWith('http://') || cf.value.startsWith('https://'));
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderBottom: idx !== detailDrawerParty.customFields.length - 1 ? '1px dashed var(--border-color)' : 'none', padding: '0.35rem 0' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{cf.label}:</span>
                          <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right' }}>
                            {isLink ? (
                              <a href={cf.value} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline', fontWeight: 800 }}>Open Link 🔗</a>
                            ) : (
                              cf.value
                            )}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                )}



                {/* Ledger entries running balance statement */}

                <div>

                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>📖 Ledger Transaction History</h4>

                  <div style={{ overflowX: 'auto', maxHeight: '360px', border: '1px solid var(--border-color)', borderRadius: 10 }}>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>

                      <thead>

                        <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>

                          <th style={{ padding: '0.45rem', textAlign: 'left' }}>Date</th>

                          <th style={{ padding: '0.45rem', textAlign: 'left' }}>Ref No</th>

                          <th style={{ padding: '0.45rem', textAlign: 'left' }}>Type</th>

                          <th style={{ padding: '0.45rem', textAlign: 'right' }}>Debit</th>

                          <th style={{ padding: '0.45rem', textAlign: 'right' }}>Credit</th>

                          <th style={{ padding: '0.45rem', textAlign: 'right' }}>Balance</th>

                        </tr>

                      </thead>

                      <tbody>

                        {statement.map((s, idx) => (

                          <tr key={idx} style={{ borderBottom: idx !== statement.length - 1 ? '1px solid var(--border-color)' : 'none' }}>

                            <td style={{ padding: '0.45rem' }}>{window.formatDate(s.date)}</td>

                            <td style={{ padding: '0.45rem', fontFamily: 'monospace', fontWeight: 700 }}>{s.refNo}</td>

                            <td style={{ padding: '0.45rem', textTransform: 'capitalize' }}>{s.type}</td>

                            <td style={{ padding: '0.45rem', textAlign: 'right', fontFamily: 'monospace' }}>{s.debit > 0 ? fmt(s.debit) : '—'}</td>

                            <td style={{ padding: '0.45rem', textAlign: 'right', fontFamily: 'monospace' }}>{s.credit > 0 ? fmt(s.credit) : '—'}</td>

                            <td style={{ padding: '0.45rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(s.balance)}</td>

                          </tr>

                        ))}

                        {statement.length === 0 && (

                          <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No ledger transaction history.</td></tr>

                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

              </div>



              {/* Footer Actions */}

              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.45rem' }}>

                <button onClick={() => setDetailDrawerParty(null)} style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 8, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700 }}>Close</button>

                <button onClick={() => { setStatementParty(detailDrawerParty); setIsStatementOpen(true); setDetailDrawerParty(null); }} style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--accent-color)', borderRadius: 8, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800 }}>📖 Statement</button>

                <button onClick={() => { handleOpenSettlementModal(detailDrawerParty); setDetailDrawerParty(null); }} style={{ flex: 1, padding: '0.5rem', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 800 }}>{isCust ? '💵 Collect' : '💸 Pay'}</button>

              </div>

            </div>

          </>

        );

      })()}



      {/* ──────────────────────────────────────────────────────────

         MODAL: RECEIVE PAYMENT / REMIT SUPPLIER PAYOUT

      ────────────────────────────────────────────────────────── */}

      {isModalOpen && selectedParty && (() => {

        const isCust = selectedParty.id.startsWith('cust');

        const activeOutstandingInvoices = isCust

          ? salesInvoices.filter(i => i.customerId === selectedParty.id && i.paymentStatus !== 'paid')

          : purchaseInvoices.filter(i => i.supplierId === selectedParty.id && i.paymentStatus !== 'paid');



        return (

          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>

            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>

              <div className="modal-header">

                <h3 className="modal-title">{isCust ? '💵 Customer Receipt Settlement' : '💸 Supplier Remittance payout'}</h3>

                <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>

              </div>

              <div className="modal-form-content" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>



              <form onSubmit={handlePostQuickSettlement} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

                <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 0.95rem', borderRadius: 10, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 3 }}>

                  <div><strong>Party Account:</strong> {selectedParty.name}</div>

                  <div><strong>Outstanding Balance:</strong> <strong style={{ color: '#ef4444' }}>{fmt(selectedParty.currentBalance)}</strong></div>

                </div>



                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Link Settlement to specific invoice (Optional)</label>

                  <select value={selectedInvoice} onChange={e => {

                    setSelectedInvoice(e.target.value);

                    const inv = activeOutstandingInvoices.find(i => i.invoiceNo === e.target.value);

                    if (inv) setAmount(String((inv.grandTotal - (inv.paidAmount || 0)).toFixed(2)));

                  }} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput}>

                    <option value="">— General ledger payment on account —</option>

                    {activeOutstandingInvoices.map(i => (

                      <option key={i.invoiceNo} value={i.invoiceNo}>{i.invoiceNo} (Due: {i.dueDate || i.date} | Outstanding: {fmt(i.grandTotal - i.paidAmount)})</option>

                    ))}

                  </select>

                </div>



                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Settlement Amount (৳) *</label>

                  <input type="number" required placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                </div>



                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Payment Mode</label>

                    <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput}>

                      <option value="bank">🏛️ Bank Transfer</option>

                      <option value="cash">💵 Cash</option>

                      <option value="cheque">📄 Cheque</option>

                      <option value="bkash">📱 bKash</option>

                      <option value="nagad">📱 Nagad</option>

                    </select>

                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Contra Ledger Account</label>

                    <select value={ledgerAccount} onChange={e => setLedgerAccount(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput}>

                      <option value="acc-1020">City Bank Current (acc-1020)</option>

                      <option value="acc-1010">Cash on Hand (acc-1010)</option>

                    </select>

                  </div>

                </div>



                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Narration Description Reference</label>

                  <input placeholder="e.g. Cleared invoice PI-01 bank deposit ref" value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                </div>



                <div className="form-actions" style={{ marginTop: '0.5rem' }}>

                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>

                  <button type="submit" className="btn btn-primary" disabled={loading}>

                    {loading ? 'Posting Settlement...' : '✓ Post Settlement'}

                  </button>

                </div>

              </form>

              </div>

            </div>

          </div>

        );

      })()}



      {/* ──────────────────────────────────────────────────────────

         MODAL: POST MANUAL ADJUSTMENT

      ────────────────────────────────────────────────────────── */}

      {showAdjModal && (

        <div className="modal-overlay" onClick={() => setShowAdjModal(false)}>

          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>

            <div className="modal-header">

              <h3 className="modal-title">Record Manual Ledger Adjustment</h3>

              <button type="button" className="modal-close" onClick={() => setShowAdjModal(false)}>&times;</button>

            </div>

            <div className="modal-form-content" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>



            <form onSubmit={handlePostAdjustment} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Party Type</label>

                <select value={adjForm.partyType} onChange={e => setAdjForm(f => ({ ...f, partyType: e.target.value, partyId: '' }))} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput}>

                  <option value="customer">Customer (AR)</option>

                  <option value="supplier">Supplier (AP)</option>

                </select>

              </div>



              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Select Party Profile *</label>

                <select required value={adjForm.partyId} onChange={e => setAdjForm(f => ({ ...f, partyId: e.target.value }))} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput}>

                  <option value="">— Select Customer or Supplier —</option>

                  {(adjForm.partyType === 'customer' ? customers : suppliers).map(p => (

                    <option key={p.id} value={p.id}>{p.name} (Balance: {fmt(p.currentBalance)})</option>

                  ))}

                </select>

              </div>



              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Adjustment Type</label>

                  <select value={adjForm.type} onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput}>

                    {ADJUSTMENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}

                  </select>

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Amount (৳) *</label>

                  <input type="number" required placeholder="0.00" value={adjForm.amount} onChange={e => setAdjForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                </div>

              </div>



              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Narration Note / Reference Details</label>

                <input required placeholder="e.g. Write-off bad debt reference..." value={adjForm.narration} onChange={e => setAdjForm(f => ({ ...f, narration: e.target.value }))} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

              </div>



              {adjForm.type === 'write_off' && (

                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', padding: '6px 10px', borderRadius: 8, fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>

                  ⏳ Write-off adjustments require supervisor approval and won't reflect in balances until approved.

                </div>

              )}



              <div className="form-actions" style={{ marginTop: '0.5rem' }}>

                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjModal(false)}>Cancel</button>

                <button type="submit" className="btn btn-primary">Post Adjustment</button>

              </div>

            </form>

            </div>

          </div>

        </div>

      )}



      {/* ── Partner Add/Edit Modal (reused modal layout) ── */}

      {isPartnerModalOpen && (

        <div className="modal-overlay" onClick={() => setIsPartnerModalOpen(false)}>

          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            <div className="modal-header">

              <h3 className="modal-title">{editingPartner ? 'Modify Account Profile' : 'Register New Business Partner'}</h3>

              <button type="button" className="modal-close" onClick={() => setIsPartnerModalOpen(false)}>&times;</button>

            </div>

            <div className="modal-form-content" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>



            <form onSubmit={handlePartnerSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Partner ID</label>

                <input 

                  type="text" 

                  readOnly 

                  value={partnerForm.id} 

                  style={{ ...inputStyle, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}

                />

              </div>



              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Full Name *</label>

                <input type="text" required placeholder="Habib Electronics" value={partnerForm.name} onChange={e => setPartnerForm({ ...partnerForm, name: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

              </div>



              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Company / Brand</label>

                  <input type="text" placeholder="Acme Ltd" value={partnerForm.company} onChange={e => setPartnerForm({ ...partnerForm, company: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Contact Person</label>

                  <input type="text" placeholder="Manager Name" value={partnerForm.contact} onChange={e => setPartnerForm({ ...partnerForm, contact: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                </div>

              </div>



              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Phone Number</label>

                  <input type="text" placeholder="017xxxxxxxx" value={partnerForm.phone} onChange={e => setPartnerForm({ ...partnerForm, phone: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address</label>

                  <input type="email" placeholder="partner@gmail.com" value={partnerForm.email} onChange={e => setPartnerForm({ ...partnerForm, email: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                </div>

              </div>



              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Billing Address</label>

                <input type="text" placeholder="Dhaka, Bangladesh" value={partnerForm.address} onChange={e => setPartnerForm({ ...partnerForm, address: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

              </div>



              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Opening Balance (৳)</label>

                  <input type="number" placeholder="0.00" value={partnerForm.currentBalance} onChange={e => setPartnerForm({ ...partnerForm, currentBalance: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{tab === 'customers' ? 'AR Credit Limit (৳)' : 'AP Credit Terms'}</label>

                  {tab === 'customers' ? (

                    <input type="number" placeholder="100000" value={partnerForm.creditLimit} onChange={e => setPartnerForm({ ...partnerForm, creditLimit: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />

                  ) : (

                    <select value={partnerForm.creditTerms} onChange={e => setPartnerForm({ ...partnerForm, creditTerms: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput}>

                      <option value="Net 15">Net 15</option>

                      <option value="Net 30">Net 30</option>

                      <option value="Net 45">Net 45</option>

                      <option value="Net 60">Net 60</option>

                    </select>

                  )}

                </div>

              </div>



              {/* Custom Metadata Fields */}

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Additional Metadata Fields</label>

                  <button 

                    type="button" 

                    onClick={handleAddCustomField} 

                    className="btn btn-secondary btn-sm"

                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem' }}

                  >

                    ➕ Add New Field

                  </button>

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>

                  {partnerForm.customFields && partnerForm.customFields.map((field, idx) => (

                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

                      <input 

                        type="text" 

                        required

                        placeholder="Heading (e.g. TIN No)" 

                        value={field.label}

                        onChange={e => handleCustomFieldChange(idx, 'label', e.target.value)}

                        style={inputStyle}

                        onFocus={onFocus}

                        onBlur={onBlurInput}

                      />

                      <input 

                        type="text" 

                        required

                        placeholder="Value Information" 

                        value={field.value}

                        onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)}

                        style={inputStyle}

                        onFocus={onFocus}

                        onBlur={onBlurInput}

                      />

                      <button 

                        type="button" 

                        onClick={() => handleRemoveCustomField(idx)}

                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.25rem', cursor: 'pointer', padding: '0 4px' }}

                      >

                        &times;

                      </button>

                    </div>

                  ))}

                  {(!partnerForm.customFields || partnerForm.customFields.length === 0) && (

                    <div style={{ fontStyle: 'italic', fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>

                      No custom metadata fields added yet.

                    </div>

                  )}

                </div>

              </div>



              <div className="form-actions" style={{ marginTop: '0.5rem' }}>

                <button type="button" className="btn btn-secondary" onClick={() => setIsPartnerModalOpen(false)}>Cancel</button>

                <button type="submit" className="btn btn-primary" disabled={loading}>

                  {loading ? 'Saving...' : 'Save Partner Profile'}

                </button>

              </div>

            </form>

            </div>

          </div>

        </div>

      )}



      {/* ── Statement PDF Modal View ── */}

      {isStatementOpen && statementParty && (() => {

        const isCustomer = statementParty.id.startsWith('cust');

        const statementLines = compileStatements(statementParty).filter(l => {

          if (statementFromDate && l.date < statementFromDate) return false;

          if (statementToDate && l.date > statementToDate) return false;

          return true;

        });

        const statementClosing = statementLines[statementLines.length - 1]?.balance || 0;



        return (

          <div className="modal-overlay" onClick={() => setIsStatementOpen(false)}>

            <div onClick={e => e.stopPropagation()} style={{ width: '95%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', color: '#000', padding: '1.75rem', borderRadius: '20px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.4)', animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem', marginBottom: '1rem' }}>

                <div>

                  <h2 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.25rem' }}>ERP for EL ENTERPRISE</h2>

                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>House 12, Road 5, Dhanmondi, Dhaka-1205, Bangladesh</div>

                </div>

                <div style={{ textAlign: 'right' }}>

                  <span style={{ background: '#0f172a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.65rem' }}>OFFICIAL LEDGER</span>

                  <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 3 }}>Date: {new Date().toLocaleDateString('en-GB')}</div>

                </div>

              </div>



              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>

                <h3 style={{ margin: 0, fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', fontSize: '1rem', borderBottom: '1px solid #e2e8f0', display: 'inline-block', paddingBottom: 2 }}>{isCustomer ? 'Customer' : 'Supplier'} Account Statement</h3>

              </div>



              {/* Date Filter */}

              <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '0.6rem', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: '1rem', alignItems: 'center' }}>

                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Filter Statement Dates:</span>

                <input type="date" value={statementFromDate} onChange={e => setStatementFromDate(e.target.value)} style={{ padding: '0.2rem 0.4rem', fontSize: '0.78rem', width: '130px', border: '1px solid #cbd5e1', borderRadius: 6 }} />

                <span style={{ fontSize: '0.78rem' }}>to</span>

                <input type="date" value={statementToDate} onChange={e => setStatementToDate(e.target.value)} style={{ padding: '0.2rem 0.4rem', fontSize: '0.78rem', width: '130px', border: '1px solid #cbd5e1', borderRadius: 6 }} />

                <button onClick={() => { setStatementFromDate(''); setStatementToDate(''); }} style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Reset</button>

              </div>



              {/* Metadata */}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.78rem', marginBottom: '1rem', color: '#1e293b' }}>

                <div>

                  <div><strong>Account Profile:</strong> {statementParty.name}</div>

                  <div><strong>Company/Brand:</strong> {statementParty.company || 'N/A'}</div>

                  <div><strong>Contact Info:</strong> {statementParty.phone || 'N/A'} | {statementParty.email || 'N/A'}</div>

                </div>

                <div style={{ textAlign: 'right' }}>

                  <div><strong>Report Period:</strong> {statementFromDate || 'Opening'} to {statementToDate || 'Today'}</div>

                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#000', marginTop: 4 }}>Closing Balance: {fmt(statementClosing)}</div>

                </div>

              </div>



              <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#000' }}>

                  <thead>

                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>

                      <th style={{ textAlign: 'left', padding: '0.45rem' }}>Date</th>

                      <th style={{ textAlign: 'left', padding: '0.45rem' }}>Reference</th>

                      <th style={{ textAlign: 'left', padding: '0.45rem' }}>Type</th>

                      <th style={{ textAlign: 'left', padding: '0.45rem' }}>Description</th>

                      <th style={{ textAlign: 'right', padding: '0.45rem', width: '90px' }}>Debit (DR)</th>

                      <th style={{ textAlign: 'right', padding: '0.45rem', width: '90px' }}>Credit (CR)</th>

                      <th style={{ textAlign: 'right', padding: '0.45rem', width: '100px' }}>Balance BDT</th>

                    </tr>

                  </thead>

                  <tbody>

                    {statementLines.map((line, idx) => (

                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>

                        <td style={{ padding: '0.45rem' }}>{window.formatDate(line.date)}</td>

                        <td style={{ padding: '0.45rem', fontFamily: 'monospace', fontWeight: 700 }}>{line.refNo}</td>

                        <td style={{ padding: '0.45rem', textTransform: 'capitalize' }}>{line.type}</td>

                        <td style={{ padding: '0.45rem', fontStyle: 'italic', color: '#475569' }}>{line.desc}</td>

                        <td style={{ textAlign: 'right', padding: '0.45rem', fontFamily: 'monospace' }}>{line.debit > 0 ? fmt(line.debit) : '—'}</td>

                        <td style={{ textAlign: 'right', padding: '0.45rem', fontFamily: 'monospace' }}>{line.credit > 0 ? fmt(line.credit) : '—'}</td>

                        <td style={{ textAlign: 'right', padding: '0.45rem', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(line.balance)}</td>

                      </tr>

                    ))}

                    {statementLines.length === 0 && (

                      <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>No statement records logged for selected parameters.</td></tr>

                    )}

                  </tbody>

                </table>

              </div>



              <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: 6, border: '1px dashed #cbd5e1', fontSize: '0.78rem', marginBottom: '2rem', color: '#1e293b' }}>

                <strong>Amount in Words:</strong> {numberToWords(Math.round(Math.abs(statementClosing)))}

              </div>



              {/* Signature Blocks */}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', fontSize: '0.72rem', color: '#475569' }}>

                <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #94a3b8', width: '130px', paddingTop: '0.25rem', fontWeight: 600 }}>Prepared By (Accounts)</div></div>

                <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #94a3b8', width: '130px', paddingTop: '0.25rem', fontWeight: 600 }}>Authorized Signature</div></div>

              </div>



              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>

                <button onClick={() => window.print()} style={{ padding: '0.45rem 1rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>🖨️ Print Statement</button>

                <button onClick={() => downloadStatementPDF(statementParty, statementFromDate, statementToDate)} style={{ background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, padding: '0.45rem 1rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem' }}>📥 Download PDF</button>

                <button onClick={() => setIsStatementOpen(false)} style={{ padding: '0.45rem 1rem', border: '1px solid #cbd5e1', background: 'transparent', color: '#475569', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem' }}>Close</button>

              </div>

            </div>

          </div>

        );

      })()}

    </div>

  );

}

