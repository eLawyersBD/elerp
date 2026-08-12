import { useState, useEffect, useMemo } from 'react';
import { procurementService } from '../services/procurementService';
import { purchaseService } from '../services/purchaseService';
import { salesService } from '../services/salesService';
import { accountingService } from '../services/accountingService';
import { auditService } from '../services/auditService';
import { defaultSettings } from '../database/seedData';

// Constants and Helpers
const getSettings = () => {
  try {
    const s = localStorage.getItem('erp_settings');
    return s ? JSON.parse(s) : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

const generateRef = (prefix) => {
  const s = getSettings();
  const pfx = s.invoice?.[prefix] || prefix;
  const num = String(Math.floor(Math.random() * 900) + 100).padStart(4, '0');
  return `${pfx}${num}`;
};

const VOUCHER_TYPES = [
  { id: 'payment',  label: 'Payment Voucher',  icon: '💸', desc: 'Pay a supplier / settle AP', color: '#dc2626', bg: 'rgba(239,68,68,0.08)' },
  { id: 'receipt',  label: 'Receipt Voucher',  icon: '💰', desc: 'Receive from customer / settle AR', color: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
  { id: 'journal',  label: 'Journal Voucher',  icon: '⚖️', desc: 'Manual double-entry journal', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  { id: 'expense',  label: 'Expense Voucher',  icon: '🧾', desc: 'Record a business expense', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
];

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

export default function VoucherView({ currentUser, onRefresh }) {
  // 1. Core Layout & Simulator Role state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'create' | 'log' | 'approval'
  const [activeType, setActiveType] = useState('payment'); // 'payment' | 'receipt' | 'journal' | 'expense'
  const [currentUserRole, setCurrentUserRole] = useState('maker'); // 'maker' | 'dept_head' | 'accts_manager' | 'finance_controller'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Data states
  const [coa, setCoa] = useState([]);
  const [journals, setJournals] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [vendorDetails, setVendorDetails] = useState({});
  const [budgets, setBudgets] = useState({});
  const [employees] = useState(() => {
    try {
      const r = localStorage.getItem('erp_employees_v8');
      return r ? JSON.parse(r) : [];
    } catch {
      return [];
    }
  });

  // Filters State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterAttachment, setFilterAttachment] = useState('all');

  // Selected Voucher for detailed inspection drawer
  const [inspectedVoucher, setInspectedVoucher] = useState(null);
  
  // Feedback Messages
  const [postedMsg, setPostedMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Voucher Creation Form State
  const [form, setForm] = useState({
    date: new Date().toISOString().substring(0, 10),
    postingDate: new Date().toISOString().substring(0, 10),
    refNo: generateRef('paymentPrefix'),
    partyType: 'supplier', // 'supplier' | 'customer' | 'employee' | 'other'
    partyId: '',
    amount: '',
    taxAmount: '0',
    netAmount: '',
    narration: '',
    paymentMode: 'bank',
    accountId: 'acc-1020', // City Bank
    debitAccount: 'acc-6150', // Utility expense
    chequeNo: '',
    bankReference: '',
    tdsRate: '0', // e.g. '0', '5', '10'
    vatRate: '0', // e.g. '0', '5', '7.5', '15'
    expenseCategory: 'utility', // 'utility' | 'office' | 'transport' | 'travel' | 'fuel' | 'petty_cash'
    department: 'IT',
    costCenter: 'CC-IT',
    project: 'PRJ-General',
    journalType: 'adjustment', // 'accrual' | 'depreciation' | 'adjustment' | 'reclassification'
    reverseDate: '',
    attachments: [],
    linkedDocs: [], // e.g. [{ type: 'PO', ref: 'PO-001' }]
  });

  const [expLines, setExpLines] = useState([{ accountId: 'acc-6150', amount: '' }]);
  const [jLines, setJLines] = useState([
    { accountId: 'acc-1010', type: 'debit', amount: '' },
    { accountId: 'acc-4010', type: 'credit', amount: '' },
  ]);
  const [isSplitExpense, setIsSplitExpense] = useState(false);


  // Load datasets on mount & sync
  const loadAllData = async () => {
    try {
      // 1. Chart of Accounts
      const coaData = await accountingService.getChartOfAccounts();
      setCoa(coaData || []);
      
      // 2. Journal Log
      const journalData = await accountingService.getJournalEntries();
      setJournals(journalData || []);

      // 3. Requisitions, Invoices, Sales
      const prList = procurementService.getPRs();
      setRequisitions(prList || []);

      const pInvs = await purchaseService.getPurchaseInvoices();
      setPurchaseInvoices(pInvs || []);

      const sInvs = await salesService.getSalesInvoices();
      setSalesInvoices(sInvs || []);

      // 4. Party Details
      const sups = await purchaseService.getSuppliers();
      setSuppliers(sups || []);

      const custs = await salesService.getCustomers();
      setCustomers(custs || []);

      // 5. Procurement vendor scorecard details & budgets
      const vDetails = procurementService.getVendorDetails();
      setVendorDetails(vDetails || {});

      const deptBudgets = procurementService.getBudgets();
      setBudgets(deptBudgets || {});

      // 6. Manage Vouchers list & trigger auto migration from erp_journals
      loadVouchersList(journalData || []);
    } catch (e) {
      console.error('Error loading voucher assets: ', e);
    }
  };

  const loadVouchersList = (jList) => {
    try {
      const stored = localStorage.getItem('erp_vouchers');
      if (stored && stored !== 'null') {
        const parsed = JSON.parse(stored);
        setVouchers(Array.isArray(parsed) ? parsed : []);
      } else {
        // Build initial vouchers list by wrapping relevant journal entries
        const initialVouchers = jList.map(j => {
          const vType = getVTypeFromRef(j);
          const totalAmt = j.lines?.filter(l => l.type === 'debit').reduce((sum, l) => sum + Number(l.amount || 0), 0) || 0;
          return {
            id: j.id || `vouch-${Date.now()}-${Math.random()}`,
            refNo: j.refNo,
            date: j.date ? j.date.substring(0, 10) : new Date().toISOString().substring(0, 10),
            postingDate: j.date ? j.date.substring(0, 10) : new Date().toISOString().substring(0, 10),
            voucherType: vType,
            status: 'Posted',
            amount: totalAmt,
            taxAmount: 0,
            netAmount: totalAmt,
            narration: j.narration || '',
            paymentMode: j.paymentMethod || 'bank',
            chequeNo: j.chequeNo || '',
            accountId: j.lines?.find(l => l.type === 'credit')?.accountId || 'acc-1020',
            debitAccount: j.lines?.find(l => l.type === 'debit')?.accountId || 'acc-6150',
            lines: j.lines || [],
            history: [{ status: 'Posted', remark: 'Imported from ledger posting', updater: 'System', timestamp: j.createdAt || new Date().toISOString() }],
            linkedDocs: j.sourceRefId ? [{ type: 'Source', ref: j.sourceRefId }] : [],
            department: 'Finance',
            costCenter: 'CC-Finance',
            project: 'PRJ-General',
            attachments: []
          };
        });
        localStorage.setItem('erp_vouchers', JSON.stringify(initialVouchers));
        setVouchers(initialVouchers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getVTypeFromRef = (j) => {
    if (j.voucherType) return j.voucherType;
    const ref = (j.refNo || '').toUpperCase();
    if (ref.includes('PV') || ref.includes('PAY')) return 'payment';
    if (ref.includes('R') || ref.includes('REC')) return 'receipt';
    if (ref.includes('JV') || ref.includes('JRN')) return 'journal';
    const hasExpenseDebit = j.lines?.some(l => l.type === 'debit' && l.accountId.startsWith('acc-6'));
    if (hasExpenseDebit || ref.includes('EV') || ref.includes('EXP')) return 'expense';
    return 'journal';
  };
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    const openType = localStorage.getItem('voucher_open_type');
    if (openType) {
      setActiveType(openType);
      setIsCreateModalOpen(true);
      setActiveTab('create');
      localStorage.removeItem('voucher_open_type');
    }
  }, []);

  // Update Reference No & Defaults when active tab/type changes
  useEffect(() => {
    let prefixKey = 'paymentPrefix';
    let partyType = 'supplier';
    if (activeType === 'receipt') {
      prefixKey = 'receiptPrefix';
      partyType = 'customer';
    } else if (activeType === 'journal') {
      prefixKey = 'journalPrefix';
      partyType = 'other';
    } else if (activeType === 'expense') {
      prefixKey = 'paymentPrefix';
      partyType = 'employee';
    }
    
    setForm(f => ({
      ...f,
      refNo: generateRef(prefixKey),
      partyType,
      partyId: '',
      amount: '',
      taxAmount: '0',
      netAmount: '',
      narration: '',
      chequeNo: '',
      bankReference: '',
      linkedDocs: [],
      attachments: []
    }));

    setExpLines([{ accountId: 'acc-6150', amount: '' }]);
    setJLines([
      { accountId: 'acc-1010', type: 'debit', amount: '' },
      { accountId: 'acc-4010', type: 'credit', amount: '' },
    ]);
  }, [activeType]);

  const setFormVal = (key, val) => setForm(f => {
    const updated = { ...f, [key]: val };
    // Auto-calculate netAmount if amount or tax changes
    if (key === 'amount' || key === 'tdsRate' || key === 'vatRate') {
      const base = Number(updated.amount || 0);
      const tds = Number(updated.tdsRate || 0) / 100;
      const vat = Number(updated.vatRate || 0) / 100;
      const taxTotal = (base * vat) - (base * tds);
      updated.taxAmount = taxTotal.toFixed(2);
      updated.netAmount = (base + taxTotal).toFixed(2);
    }
    return updated;
  });

  // Reusable Local Vouchers Saver
  const saveVouchersState = (newVouchers) => {
    setVouchers(newVouchers);
    localStorage.setItem('erp_vouchers', JSON.stringify(newVouchers));
  };

  // Document Linking Helper
  const handleLinkDocument = (docType, docRef, docAmount) => {
    const isAlreadyLinked = form.linkedDocs.some(d => d.ref === docRef);
    let updatedDocs = [...form.linkedDocs];
    if (isAlreadyLinked) {
      updatedDocs = updatedDocs.filter(d => d.ref !== docRef);
    } else {
      updatedDocs.push({ type: docType, ref: docRef });
    }
    
    setForm(f => {
      const updated = { ...f, linkedDocs: updatedDocs };
      if (!isAlreadyLinked && docAmount) {
        updated.amount = String(docAmount);
        const base = Number(docAmount);
        const tds = Number(updated.tdsRate || 0) / 100;
        const vat = Number(updated.vatRate || 0) / 100;
        const taxTotal = (base * vat) - (base * tds);
        updated.taxAmount = taxTotal.toFixed(2);
        updated.netAmount = (base + taxTotal).toFixed(2);
        updated.narration = `Settle payment linked with ${docType} ${docRef}`;
      }
      return updated;
    });
  };

  // Rules Engine Compliance Evaluator
  const evaluatedRules = useMemo(() => {
    const rules = [];
    const amt = Number(form.amount || 0);

    // 1. Balance check for Journal Vouchers
    if (activeType === 'journal') {
      const drSum = jLines.filter(l => l.type === 'debit').reduce((sum, l) => sum + Number(l.amount || 0), 0);
      const crSum = jLines.filter(l => l.type === 'credit').reduce((sum, l) => sum + Number(l.amount || 0), 0);
      const isBalanced = Math.abs(drSum - crSum) < 0.01 && drSum > 0;
      rules.push({
        id: 'balanced',
        name: 'Double-Entry Balanced Check',
        desc: 'Debit total must match Credit total.',
        status: isBalanced ? 'passed' : 'failed',
        msg: isBalanced ? '✓ Journal entries balanced.' : `✗ Unbalanced by ৳${Math.abs(drSum - crSum).toLocaleString('en-BD')}`
      });
    }

    // 2. Vendor Check for Payments
    if (activeType === 'payment' && form.partyId) {
      const vendorScorecard = vendorDetails[form.partyId];
      const isBlacklisted = vendorScorecard?.contractStatus === 'Blacklisted' || vendorScorecard?.scores?.compliance < 5;
      const isExpired = vendorScorecard?.contractStatus === 'Suspended' || (vendorScorecard?.contractExpiry && new Date(vendorScorecard.contractExpiry) < new Date());
      
      rules.push({
        id: 'vendor_compliance',
        name: 'Vendor Compliance Audit',
        desc: 'Checks active contract and compliance ratings.',
        status: isBlacklisted ? 'failed' : isExpired ? 'warning' : 'passed',
        msg: isBlacklisted ? '❌ BLOCKED: Vendor compliance rating is critically low.' : isExpired ? '⚠️ Contract expired or suspended.' : '✓ Supplier compliance checklist passed.'
      });
    }

    // 3. Departmental Budget checker for Expense vouchers
    if (activeType === 'expense' && form.department) {
      const allocatedBudget = budgets[form.department] || { total: 0, spent: 0 };
      const expenseAmount = isSplitExpense 
        ? expLines.reduce((sum, l) => sum + Number(l.amount || 0), 0)
        : Number(form.amount || 0);
      const exceedsRemaining = (allocatedBudget.spent + expenseAmount) > allocatedBudget.total;
      const warnProximity = (allocatedBudget.spent + expenseAmount) / allocatedBudget.total > 0.85;

      rules.push({
        id: 'budget_compliance',
        name: 'Corporate Budget Check',
        desc: 'Validates department allocations before posting.',
        status: exceedsRemaining ? 'failed' : warnProximity ? 'warning' : 'passed',
        msg: exceedsRemaining 
          ? `❌ BLOCKED: Exceeds department budget by ৳${(allocatedBudget.spent + expenseAmount - allocatedBudget.total).toLocaleString()}` 
          : warnProximity 
            ? `⚠️ Warning: Department budget consumption will reach ${Math.round(((allocatedBudget.spent + expenseAmount)/allocatedBudget.total)*100)}%`
            : `✓ Budget within limits. Remaining: ৳${(allocatedBudget.total - allocatedBudget.spent - expenseAmount).toLocaleString()}`
      });
    }

    // 4. High value amount thresholds (maker checker routing rules)
    if (amt > 50000) {
      rules.push({
        id: 'high_value',
        name: 'High-Value Escalation Route',
        desc: 'Transactions over ৳50,000 require CFO / Managing Director authorization.',
        status: 'warning',
        msg: '⚠️ Requires Controller/CFO approval signature before posting.'
      });
    }

    // 5. Attachment Requirement Checklist
    if (amt > 10000 && form.attachments.length === 0) {
      rules.push({
        id: 'attachment_alert',
        name: 'Documentation Directive',
        desc: 'Official bills or receipt attachments required for vouchers exceeding ৳10,000.',
        status: 'warning',
        msg: '⚠️ Missing source bill document attachment.'
      });
    } else if (form.attachments.length > 0) {
      rules.push({
        id: 'attachment_alert',
        name: 'Documentation Directive',
        desc: 'Audit documents linked.',
        status: 'passed',
        msg: `✓ ${form.attachments.length} attachment(s) verified.`
      });
    }

    // 6. Bank account Balance Warning
    if (form.accountId && (activeType === 'payment' || activeType === 'expense')) {
      const targetAcc = coa.find(a => a.id === form.accountId);
      if (targetAcc) {
        const bal = Number(targetAcc.balance || 0);
        const isNeg = amt > bal;
        rules.push({
          id: 'bank_bal',
          name: 'Liquidity Check',
          desc: 'Ensures the cash/bank account contains sufficient funds.',
          status: isNeg ? 'failed' : 'passed',
          msg: isNeg 
            ? `❌ Balance Deficit: Will drive "${targetAcc.name}" balance to negative by ৳${(amt - bal).toLocaleString('en-BD')}`
            : `✓ Sufficient funds. Current balance: ৳${bal.toLocaleString('en-BD')}`
        });
      }
    }

    return rules;
  }, [form, activeType, jLines, expLines, isSplitExpense, budgets, coa, vendorDetails]);

  const rulesPassed = evaluatedRules.every(r => r.status !== 'failed');

  // Maker submission of a voucher
  const handleSubmitVoucherForm = async () => {
    if (!rulesPassed) {
      return alert('Compliance Failure: Please fix the failed validation rules before submitting.');
    }

    setLoading(true);
    try {
      let computedLines = [];
      let totalAmountVal = 0;

      if (activeType === 'journal') {
        const validLines = jLines.filter(l => l.accountId && Number(l.amount) > 0);
        computedLines = validLines.map(l => ({ ...l, amount: Number(l.amount) }));
        totalAmountVal = computedLines.filter(l => l.type === 'debit').reduce((sum, l) => sum + l.amount, 0);
      } else if (activeType === 'expense') {
        if (isSplitExpense) {
          const validSplit = expLines.filter(l => l.accountId && Number(l.amount) > 0);
          totalAmountVal = validSplit.reduce((s, l) => s + Number(l.amount), 0);
          computedLines = [
            ...validSplit.map(l => ({ accountId: l.accountId, type: 'debit', amount: Number(l.amount) })),
            { accountId: form.accountId, type: 'credit', amount: totalAmountVal }
          ];
        } else {
          totalAmountVal = Number(form.amount || 0);
          computedLines = [
            { accountId: form.debitAccount || 'acc-6150', type: 'debit', amount: totalAmountVal },
            { accountId: form.accountId, type: 'credit', amount: totalAmountVal }
          ];
        }
      } else if (activeType === 'payment') {
        totalAmountVal = Number(form.amount || 0);
        const netAmt = Number(form.netAmount || totalAmountVal);
        const tds = (totalAmountVal * Number(form.tdsRate || 0)) / 100;
        const vat = (totalAmountVal * Number(form.vatRate || 0)) / 100;

        // Debit Accounts Payable → Credit Cash/Bank, Credit TDS Payable, Debit VAT input
        computedLines = [
          { accountId: 'acc-2010', type: 'debit', amount: totalAmountVal }, // AP debit
          ...(vat > 0 ? [{ accountId: 'acc-1300', type: 'debit', amount: vat }] : []), // VAT Input asset debit (acc-1300)
          { accountId: form.accountId, type: 'credit', amount: netAmt }, // Net payment
          ...(tds > 0 ? [{ accountId: 'acc-2110', type: 'credit', amount: tds }] : []), // TDS Payable (acc-2110)
        ];
      } else if (activeType === 'receipt') {
        totalAmountVal = Number(form.amount || 0);
        // Debit Bank/Cash → Credit Accounts Receivable
        computedLines = [
          { accountId: form.accountId, type: 'debit', amount: totalAmountVal },
          { accountId: 'acc-1100', type: 'credit', amount: totalAmountVal }
        ];
      }

      const partyName = form.partyType === 'supplier'
        ? suppliers.find(s => s.id === form.partyId)?.name
        : form.partyType === 'customer'
          ? customers.find(c => c.id === form.partyId)?.name
          : form.partyType === 'employee'
            ? employees.find(e => e.id === form.partyId)?.name || 'Employee'
            : 'General Entity';

      const workflowSteps = [
        { role: 'dept_head', status: totalAmountVal > 20000 ? 'Pending' : 'Approved', updatedBy: '', timestamp: '' },
        { role: 'accts_manager', status: 'Pending', updatedBy: '', timestamp: '' },
        { role: 'finance_controller', status: 'Pending', updatedBy: '', timestamp: '' }
      ];

      const newVoucher = {
        id: `vouch-${Date.now()}`,
        refNo: form.refNo,
        date: form.date,
        postingDate: form.postingDate,
        voucherType: activeType,
        status: 'Submitted', // Start as Submitted for approval
        partyType: form.partyType,
        partyId: form.partyId,
        partyName: partyName || 'N/A',
        amount: totalAmountVal,
        taxAmount: Number(form.taxAmount || 0),
        netAmount: Number(form.netAmount || totalAmountVal),
        narration: form.narration || `${activeType.toUpperCase()} voucher reference ${form.refNo}`,
        paymentMode: form.paymentMode,
        chequeNo: form.chequeNo,
        bankReference: form.bankReference,
        accountId: form.accountId,
        debitAccount: form.debitAccount,
        lines: computedLines,
        costCenter: form.costCenter,
        department: form.department,
        project: form.project,
        attachments: form.attachments,
        linkedDocs: form.linkedDocs,
        workflow: workflowSteps,
        history: [{
          status: 'Submitted',
          remark: 'Voucher drafted and submitted for review',
          updater: currentUser?.displayName || 'Accounts Executive',
          timestamp: new Date().toISOString()
        }]
      };

      const updated = [newVoucher, ...vouchers];
      saveVouchersState(updated);

      await auditService.logCreate(currentUser, 'vouchers', form.refNo, form.refNo, `Submitted voucher ${form.refNo} — BDT ${totalAmountVal.toLocaleString()}`, null, newVoucher);
      
      setPostedMsg({
        refNo: form.refNo,
        narration: newVoucher.narration,
        amount: totalAmountVal,
        type: activeType,
        status: 'Submitted'
      });

      // Clear Form, close modal and move to Log
      setIsCreateModalOpen(false);
      setActiveTab('log');
    } catch (err) {
      alert('Voucher Creation Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Perform Maker Checker Action
  const handleApprovalAction = async (vId, action, remarks) => {
    const index = vouchers.findIndex(v => v.id === vId);
    if (index === -1) return;
    const v = { ...vouchers[index] };
    const updaterName = currentUser?.displayName || 'Authorizer';

    if (action === 'approve') {
      // Determine what workflow step matches the current active simulated role
      let updatedWorkflow = v.workflow ? [...v.workflow] : [];
      let allApproved = true;

      updatedWorkflow = updatedWorkflow.map(step => {
        if (step.role === currentUserRole) {
          return { ...step, status: 'Approved', updatedBy: updaterName, timestamp: new Date().toISOString() };
        }
        if (step.status !== 'Approved') allApproved = false;
        return step;
      });

      v.workflow = updatedWorkflow;
      v.history.push({
        status: 'Approved Step',
        remark: `Approved by ${currentUserRole.replace('_', ' ').toUpperCase()} (${updaterName}). Remarks: ${remarks || 'None'}`,
        updater: updaterName,
        timestamp: new Date().toISOString()
      });

      if (allApproved || currentUserRole === 'finance_controller') {
        v.status = 'Approved';
      }
      
      const newVouchers = vouchers.map((item, i) => i === index ? v : item);
      saveVouchersState(newVouchers);
      await auditService.logUpdate(currentUser, 'vouchers', v.refNo, v.refNo, `Approved voucher step by ${currentUserRole}`, null, v);
    } else if (action === 'reject') {
      v.status = 'Rejected';
      v.history.push({
        status: 'Rejected',
        remark: `Rejected by ${currentUserRole.replace('_', ' ').toUpperCase()} (${updaterName}). Reason: ${remarks}`,
        updater: updaterName,
        timestamp: new Date().toISOString()
      });
      const newVouchers = vouchers.map((item, i) => i === index ? v : item);
      saveVouchersState(newVouchers);
      await auditService.logUpdate(currentUser, 'vouchers', v.refNo, v.refNo, `Rejected voucher by ${currentUserRole}`, null, v);
    }
  };

  // Post Approved Voucher to Ledger & Chart of Accounts
  const handlePostVoucherToGL = async (vId) => {
    const index = vouchers.findIndex(v => v.id === vId);
    if (index === -1) return;
    const v = { ...vouchers[index] };
    
    setLoading(true);
    try {
      // Post actual journal to accounting service
      await accountingService.postJournalEntry({
        date: v.date,
        refNo: v.refNo,
        narration: v.narration,
        lines: v.lines,
        sourceModule: 'vouchers',
        sourceRefId: v.partyId || '',
        voucherType: v.voucherType,
        paymentMethod: v.paymentMode || '',
        chequeNo: v.chequeNo || '',
      });

      v.status = 'Posted';
      v.history.push({
        status: 'Posted',
        remark: 'Voucher posted to General Ledger and ledger balances synchronized.',
        updater: currentUser?.displayName || 'Finance Controller',
        timestamp: new Date().toISOString()
      });

      const newVouchers = vouchers.map((item, i) => i === index ? v : item);
      saveVouchersState(newVouchers);

      // Refresh Chart of Accounts & GL Log lists
      await loadAllData();
      onRefresh?.();

      setPostedMsg({
        refNo: v.refNo,
        narration: v.narration,
        amount: v.amount,
        type: v.voucherType,
        status: 'Posted'
      });
    } catch (err) {
      alert('Posting Failure: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reversal mechanism: Posts reversing double entry
  const handleReverseVoucher = async (vId, remarks) => {
    const index = vouchers.findIndex(v => v.id === vId);
    if (index === -1) return;
    const original = vouchers[index];

    if (!remarks) {
      return alert('Reversal Reason Required: Please explain why this voucher is being reversed.');
    }

    setLoading(true);
    try {
      const revRefNo = `REV-${original.refNo}`;
      
      // Invert debits and credits
      const reversedLines = original.lines.map(line => ({
        ...line,
        type: line.type === 'debit' ? 'credit' : 'debit'
      }));

      // Post reversing journal
      await accountingService.postJournalEntry({
        date: new Date().toISOString().substring(0, 10),
        refNo: revRefNo,
        narration: `Reversal of ${original.refNo}. Reason: ${remarks}`,
        lines: reversedLines,
        sourceModule: 'vouchers',
        sourceRefId: original.refNo,
        voucherType: original.voucherType
      });

      // Update original voucher status to Reversed
      const updatedOriginal = {
        ...original,
        status: 'Reversed',
        reversalReference: revRefNo,
        history: [
          ...original.history,
          {
            status: 'Reversed',
            remark: `Reversal transaction ${revRefNo} posted. Reason: ${remarks}`,
            updater: currentUser?.displayName || 'Finance Controller',
            timestamp: new Date().toISOString()
          }
        ]
      };

      // Create new Posted voucher representing the reversal transaction itself
      const reversalVoucher = {
        id: `vouch-${Date.now()}`,
        refNo: revRefNo,
        date: new Date().toISOString().substring(0, 10),
        postingDate: new Date().toISOString().substring(0, 10),
        voucherType: original.voucherType,
        status: 'Posted',
        partyType: original.partyType,
        partyId: original.partyId,
        partyName: original.partyName,
        amount: original.amount,
        taxAmount: original.taxAmount,
        netAmount: original.netAmount,
        narration: `Reversal Entry for Voucher ${original.refNo}. Reason: ${remarks}`,
        paymentMode: original.paymentMode,
        chequeNo: original.chequeNo,
        accountId: original.accountId,
        debitAccount: original.debitAccount,
        lines: reversedLines,
        costCenter: original.costCenter,
        department: original.department,
        project: original.project,
        attachments: [],
        linkedDocs: [{ type: 'Original Voucher', ref: original.refNo }],
        history: [{
          status: 'Posted',
          remark: `Reversal entry posted for ${original.refNo}`,
          updater: currentUser?.displayName || 'Finance Controller',
          timestamp: new Date().toISOString()
        }]
      };

      const updatedList = vouchers.map(item => item.id === original.id ? updatedOriginal : item);
      saveVouchersState([reversalVoucher, ...updatedList]);

      await auditService.logReverse(currentUser, 'vouchers', revRefNo, original.refNo, `Reversed voucher ${original.refNo}. Reason: ${remarks}`);
      
      setInspectedVoucher(null);
      await loadAllData();
      onRefresh?.();

      alert(`Reversal voucher ${revRefNo} posted successfully.`);
    } catch (err) {
      alert('Reversal Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto balance journal rows helper
  const handleAutoBalance = () => {
    const drTotal = jLines.filter(l => l.type === 'debit').reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const crTotal = jLines.filter(l => l.type === 'credit').reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const diff = Math.abs(drTotal - crTotal);
    if (diff < 0.01) return;
    const direction = drTotal > crTotal ? 'credit' : 'debit';
    setJLines(ls => [...ls, { accountId: 'acc-1010', type: direction, amount: diff.toFixed(2) }]);
  };

  // Mock Upload Billing Document Attachment
  const triggerMockUpload = () => {
    const filenames = ['Invoice_Scanned_Copy.pdf', 'VAT_Challan_6.3.pdf', 'PO_Signed_Final.pdf', 'Delivery_Receipt.pdf', 'Utility_Bill_June26.pdf'];
    const randomName = filenames[Math.floor(Math.random() * filenames.length)];
    setForm(f => ({
      ...f,
      attachments: [...f.attachments, { name: randomName, uploadedAt: new Date().toISOString(), size: '1.2 MB' }]
    }));
  };

  // Filter Vouchers List
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      // 1. Search Query
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchesRef = (v.refNo || '').toLowerCase().includes(q);
        const matchesNarr = (v.narration || '').toLowerCase().includes(q);
        const matchesParty = (v.partyName || '').toLowerCase().includes(q);
        const matchesAmt = String(v.amount).includes(q);
        if (!matchesRef && !matchesNarr && !matchesParty && !matchesAmt) return false;
      }
      // 2. Voucher Type
      if (filterType !== 'all' && v.voucherType !== filterType) return false;
      // 3. Status
      if (filterStatus !== 'all' && v.status !== filterStatus) return false;
      // 4. Date range
      if (filterFromDate && v.date < filterFromDate) return false;
      if (filterToDate && v.date > filterToDate) return false;
      // 5. Amount range
      if (filterMinAmount && v.amount < Number(filterMinAmount)) return false;
      if (filterMaxAmount && v.amount > Number(filterMaxAmount)) return false;
      // 6. Attachments filter
      if (filterAttachment === 'yes' && (!v.attachments || v.attachments.length === 0)) return false;
      if (filterAttachment === 'no' && v.attachments && v.attachments.length > 0) return false;

      return true;
    });
  }, [vouchers, filterSearch, filterType, filterStatus, filterFromDate, filterToDate, filterMinAmount, filterMaxAmount, filterAttachment]);

  // Aggregate KPI metrics based on current vouchers log
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayPostings = vouchers.filter(v => v.date === todayStr && v.status === 'Posted');
    
    const payToday = todayPostings.filter(v => v.voucherType === 'payment').reduce((s, v) => s + v.amount, 0);
    const rcptToday = todayPostings.filter(v => v.voucherType === 'receipt').reduce((s, v) => s + v.amount, 0);
    const expToday = todayPostings.filter(v => v.voucherType === 'expense').reduce((s, v) => s + v.amount, 0);
    
    const liqu = coa
      .filter(a => ['acc-1010', 'acc-1020', 'acc-1025', 'acc-1030', 'acc-1035', 'acc-1040'].includes(a.id))
      .reduce((s, a) => s + Number(a.balance || 0), 0);

    const pendingCount = vouchers.filter(v => v.status === 'Submitted').length;
    const pendingVal = vouchers.filter(v => v.status === 'Submitted').reduce((s, v) => s + v.amount, 0);
    
    const rejectedCount = vouchers.filter(v => v.status === 'Rejected').length;
    const highValCount = vouchers.filter(v => v.status === 'Submitted' && v.amount > 50000).length;

    // Sum of taxAmount on posted vouchers today
    const taxWithheldToday = todayPostings.reduce((s, v) => s + Number(v.taxAmount || 0), 0);

    return {
      payToday,
      rcptToday,
      expToday,
      liqu,
      pendingCount,
      pendingVal,
      rejectedCount,
      highValCount,
      taxWithheldToday
    };
  }, [vouchers, coa]);

  // Helper exporter for slip
  const handleDownloadPDF = (v) => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF failed to initialize.');
    const doc = new jsPDF();
    doc.rect(5, 5, 200, 287);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ACCOUNTICA', 105, 18, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Corporate Headquarters, Dhaka, Bangladesh', 105, 24, { align: 'center' });
    doc.line(10, 30, 200, 30);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text(`${(v.voucherType || '').toUpperCase()} VOUCHER SLIP`, 105, 40, { align: 'center' });

    doc.rect(10, 48, 190, 30);
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Voucher No: ${v.refNo}`, 12, 54);
    doc.text(`Voucher Date: ${v.date}`, 12, 60);
    doc.text(`Status: ${v.status}`, 12, 66);
    doc.text(`Entity: ${v.partyName || 'N/A'} (${v.partyType || 'other'})`, 12, 72);

    doc.text(`Cost Center: ${v.costCenter || 'N/A'}`, 110, 54);
    doc.text(`Department: ${v.department || 'N/A'}`, 110, 60);
    doc.text(`Project Code: ${v.project || 'N/A'}`, 110, 66);

    let y = 90;
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y, 190, 8, 'F');
    doc.rect(10, y, 190, 8);
    doc.setFont('Helvetica', 'bold');
    doc.text('Account Code & Description', 12, y + 6);
    doc.text('Debit (DR)', 135, y + 6);
    doc.text('Credit (CR)', 175, y + 6);

    doc.setFont('Helvetica', 'normal');
    v.lines?.forEach(line => {
      y += 8;
      doc.rect(10, y, 190, 8);
      const accName = coa.find(a => a.id === line.accountId)?.name || line.accountId;
      doc.text(accName, 12, y + 6);
      if (line.type === 'debit') {
        doc.text(Number(line.amount).toLocaleString('en-BD'), 135, y + 6);
      } else {
        doc.text(Number(line.amount).toLocaleString('en-BD'), 175, y + 6);
      }
    });

    y += 15;
    doc.setFont('Helvetica', 'bold');
    doc.text(`Total Amount: ৳${Number(v.amount).toLocaleString('en-BD')}`, 10, y);
    doc.text(`Amount in Words: ${numberToWords(Math.round(v.amount))}`, 10, y + 6);

    y += 30;
    doc.line(15, y, 50, y);
    doc.line(70, y, 105, y);
    doc.line(125, y, 160, y);
    doc.text('Prepared By', 25, y + 4);
    doc.text('Checked By', 80, y + 4);
    doc.text('Approved By', 135, y + 4);

    doc.save(`Voucher_${v.refNo}.pdf`);
  };

  return (
    <div style={{ padding: '0.5rem', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 1. PREMIUM VOUCHER MANAGEMENT HEADER */}
      <div style={{
        marginBottom: '1.5rem',
        borderRadius: 20,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #3b0764 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)'
      }}>
        {/* Background decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 200, width: 140, height: 140, borderRadius: '50%', background: 'rgba(139,92,246,0.07)' }} />

        {/* Top strip: Module Identity */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2rem 0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📋</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>Voucher Management System</div>
              <div style={{ fontSize: '0.76rem', opacity: 0.75, marginTop: 2 }}>Payment · Receipt · Journal · Expense · Maker-Checker Workflow</div>
            </div>
          </div>
          {/* Live summary pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Posted', val: vouchers.filter(v => v.status === 'Posted').length, color: '#10b981' },
              { label: 'In Review', val: vouchers.filter(v => v.status === 'Submitted').length, color: '#f59e0b' },
              { label: 'Approved', val: vouchers.filter(v => v.status === 'Approved').length, color: '#3b82f6' },
              { label: 'Rejected', val: vouchers.filter(v => v.status === 'Rejected').length, color: '#ef4444' },
            ].map(pill => (
              <div key={pill.label} style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${pill.color}40`, borderRadius: 10, padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}>
                <span style={{ color: pill.color, fontWeight: 900, fontSize: '0.9rem' }}>{pill.val}</span>
                <span style={{ opacity: 0.75, marginLeft: 4, fontWeight: 600 }}>{pill.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom strip: Simulator Roles */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a5f3fc', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>⚙️ Role Simulator:</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'maker', label: '🛠️ Maker', desc: 'Draft & Submit' },
              { id: 'dept_head', label: '👔 Dept Head', desc: 'Approve Expense' },
              { id: 'accts_manager', label: '💼 Accts Mgr', desc: 'Approve < 1L' },
              { id: 'finance_controller', label: '👑 Controller', desc: 'Post & Reverse' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => { setCurrentUserRole(r.id); setPostedMsg(null); }}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: 8,
                  border: currentUserRole === r.id ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                  background: currentUserRole === r.id ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.73rem' }}>{r.label}</div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. TOP KPI COCKPIT STATS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Payments Remitted Today', val: kpis.payToday, color: '#dc2626', icon: '💸', isAmt: true },
          { label: 'Collections Received Today', val: kpis.rcptToday, color: '#16a34a', icon: '💰', isAmt: true },
          { label: 'Expenses Posted Today', val: kpis.expToday, color: '#d97706', icon: '🧾', isAmt: true },
          { label: 'Active Cash & Bank Liquidity', val: kpis.liqu, color: kpis.liqu >= 0 ? '#2563eb' : '#ef4444', icon: '🏦', isAmt: true },
          { label: 'Submitted Gateway Queue', val: `৳${kpis.pendingVal.toLocaleString()} (${kpis.pendingCount})`, color: '#7c3aed', icon: '⏳', isAmt: false },
          { label: 'High-Value Escalations', val: `${kpis.highValCount} Vouchers`, color: '#e11d48', icon: '⚠️', isAmt: false },
          { label: 'Tax Deductions Withheld', val: kpis.taxWithheldToday, color: '#0891b2', icon: '✂️', isAmt: true },
          { label: 'Disputes / Rejected Logs', val: `${kpis.rejectedCount} Rejected`, color: '#4b5563', icon: '✕', isAmt: false }
        ].map((s, idx) => (
          <div key={idx} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 14,
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${s.color}18`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ height: 3, background: `linear-gradient(90deg, ${s.color}, ${s.color}80)` }} />
            <div style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: s.color, fontFamily: 'monospace', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.isAmt ? `৳${Number(s.val).toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : s.val}
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SUCCESS / FEEDBACK BANNER */}
      {postedMsg && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          borderRadius: 12,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: 'var(--font-size-lg)' }}>✓</span>
          <div>
            <div style={{ fontWeight: 600, color: '#16a34a' }}>
              Voucher successfully {postedMsg.status === 'Posted' ? 'posted to General Ledger!' : 'submitted for workflow review!'}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Ref: <strong>{postedMsg.refNo}</strong> — {postedMsg.narration} (Amount: ৳{postedMsg.amount.toLocaleString()})
            </div>
          </div>
          <button onClick={() => setPostedMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#16a34a', fontSize: 'var(--font-size-lg)', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* 3. MULTI-TAB WORKSPACE NAVIGATION */}
      <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: 14, marginBottom: '1.5rem', overflowX: 'auto' }}>
        {[
          { id: 'dashboard', label: '📊 Cockpit Dashboard', count: null },
          { id: 'create', label: '📝 Create Voucher', count: null },
          { id: 'log', label: '📋 Vouchers Log', count: filteredVouchers.length },
          { id: 'approval', label: '⏳ Approval Queue', count: vouchers.filter(v => v.status === 'Submitted' || v.status === 'Approved').length }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setPostedMsg(null); }}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: 10,
              border: 'none',
              background: activeTab === t.id ? 'var(--bg-primary, white)' : 'transparent',
              color: activeTab === t.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: activeTab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              transition: 'all 0.15s'
            }}
          >
            <span>{t.label}</span>
            {t.count !== null && (
              <span style={{
                fontSize: '0.65rem',
                background: activeTab === t.id ? 'var(--accent-color)' : 'var(--border-color)',
                color: activeTab === t.id ? '#fff' : 'var(--text-muted)',
                padding: '0.1rem 0.45rem',
                borderRadius: 20,
                fontWeight: 800,
                lineHeight: 1.5
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* 4. WORKSPACE TAB CONTENTS */}

      {/* TAB A: COCKPIT DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
          <div>
            {/* Pending actions alerts card */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'var(--card-bg)', borderRadius: 16 }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔥 Pending Operations Tasklist</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {vouchers.filter(v => v.status === 'Submitted').length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    🎉 No pending vouchers in approval queue. Ledgers are clean.
                  </div>
                ) : (
                  vouchers.filter(v => v.status === 'Submitted').slice(0, 4).map(v => (
                    <div key={v.id} style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 12,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-color)', fontSize: 'var(--font-size-sm)' }}>{v.refNo}</span>
                          <span style={{ fontSize: 'var(--font-size-xs)', background: 'rgba(217,119,6,0.1)', color: '#d97706', padding: '0.1rem 0.4rem', borderRadius: 6, fontWeight: 600, textTransform: 'uppercase' }}>
                            {v.voucherType}
                          </span>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {v.narration} | Prepared for: <strong>{v.partyName}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontFamily: 'monospace' }}>৳{v.amount.toLocaleString()}</div>
                        <button onClick={() => { setActiveTab('approval'); }} style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--accent-color)',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginTop: 4,
                          padding: 0
                        }}>Review Workflow →</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Departmental budgets status widget */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 16 }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊 Department Budget Consumptions</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {Object.entries(budgets).map(([dept, data]) => {
                  const percent = Math.min(100, Math.round((data.spent / data.total) * 100));
                  let barColor = '#6366f1';
                  let barBg = 'rgba(99,102,241,0.1)';
                  if (percent > 90) { barColor = '#ef4444'; barBg = 'rgba(239,68,68,0.08)'; }
                  else if (percent > 75) { barColor = '#f59e0b'; barBg = 'rgba(245,158,11,0.08)'; }
                  return (
                    <div key={dept} style={{ padding: '0.75rem 1rem', borderRadius: 12, background: barBg, border: `1px solid ${barColor}20` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{dept}</span>
                          {percent > 90 && <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 800 }}>CRITICAL</span>}
                          {percent > 75 && percent <= 90 && <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 800 }}>WARNING</span>}
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '0.88rem', color: barColor, fontFamily: 'monospace' }}>{percent}%</span>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.1)', height: 7, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`, height: '100%', width: `${percent}%`, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 5, fontWeight: 600 }}>
                        <span>Spent: ৳{(data.spent/1000).toFixed(0)}k</span>
                        <span>Remaining: ৳{((data.total - data.spent)/1000).toFixed(0)}k of ৳{(data.total/1000).toFixed(0)}k</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            {/* Quick Actions Panel */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>⚡ Quick Creation Cockpit</h4>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                {VOUCHER_TYPES.map(v => (
                  <button key={v.id} onClick={() => { setActiveType(v.id); setIsCreateModalOpen(true); }} style={{
                    padding: '0.9rem 0.5rem',
                    borderRadius: 12,
                    border: `1.5px solid ${v.color}22`,
                    background: v.bg,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = v.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 18px ${v.color}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${v.color}22`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{v.icon}</span>
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', color: v.color }}>{v.label}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Voucher Type Breakdown widget */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
              <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>📈 Voucher Type Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {VOUCHER_TYPES.map(vt => {
                  const count = vouchers.filter(v => v.voucherType === vt.id).length;
                  const total = Math.max(vouchers.length, 1);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={vt.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{vt.icon} {vt.label}</span>
                        <span style={{ fontWeight: 800, color: vt.color, fontFamily: 'monospace' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ background: 'var(--border-color)', height: 5, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ background: vt.color, height: '100%', width: `${pct}%`, borderRadius: 3, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit log updates */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
              <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>🔔 Maker-Checker Activity Log</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', maxHeight: '220px', overflowY: 'auto' }}>
                {vouchers.flatMap(v => v.history.map(h => ({ refNo: v.refNo, ...h }))).sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6).map((h, i) => (
                  <div key={i} style={{ fontSize: '0.7rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span style={{ fontFamily: 'monospace' }}>{h.refNo}</span>
                      <span style={{ fontSize: '0.62rem', background: h.status === 'Posted' ? 'rgba(16,185,129,0.1)' : h.status === 'Rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', color: h.status === 'Posted' ? '#10b981' : h.status === 'Rejected' ? '#ef4444' : '#6366f1', padding: '1px 5px', borderRadius: 5, fontWeight: 800 }}>{h.status}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.3 }}>{h.remark}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{new Date(h.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: CREATE VOUCHER SELECTION VIEW */}
      {activeTab === 'create' && (
        <div className="card" style={{ padding: '2.5rem', background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>Select Voucher Category to Create</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: '2rem' }}>
            Choose a specialized voucher type below. Clicking a category will open the creation console inside a pop-up window.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', maxWidth: '960px', margin: '0 auto' }}>
            {VOUCHER_TYPES.map(v => (
              <button
                key={v.id}
                onClick={() => {
                  setActiveType(v.id);
                  setIsCreateModalOpen(true);
                }}
                style={{
                  padding: '2rem 1.5rem',
                  borderRadius: 16,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = v.color;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '2.5rem', background: v.bg, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{v.icon}</span>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}>{v.label}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', lineHeight: 1.4 }}>{v.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VOUCHER CREATE POPUP MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setIsCreateModalOpen(false);
        }}
        >
          <div className="modal-content" style={{ maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div className="modal-header">
              <h3 className="modal-title">
                <span>{VOUCHER_TYPES.find(v => v.id === activeType)?.icon}</span>
                <span> Create New {VOUCHER_TYPES.find(v => v.id === activeType)?.label || 'Voucher'}</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="modal-close">✕</button>
            </div>
            <div className="modal-form-content">

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
          
          {/* Left Column: Core Voucher Form */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 16 }}>

            {/* General Metadata form row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="form-label">Voucher Date</label>
                <input type="date" className="form-control" value={form.date} onChange={e => setFormVal('date', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Posting Date</label>
                <input type="date" className="form-control" value={form.postingDate} onChange={e => setFormVal('postingDate', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Voucher Reference</label>
                <input type="text" className="form-control" value={form.refNo} onChange={e => setFormVal('refNo', e.target.value)} />
              </div>
            </div>

            {/* CONDITIONAL SECTION: PAYMENT VOUCHER */}
            {activeType === 'payment' && (
              <div style={{ borderTop: '1px dashed var(--border-color)', pt: '1rem', mt: '1rem' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Supplier (Vendor)</label>
                  <select className="form-control" value={form.partyId} onChange={e => setFormVal('partyId', e.target.value)}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Balance: ৳{Number(s.currentBalance || 0).toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">TDS (Tax Deducted at Source)</label>
                    <select className="form-control" value={form.tdsRate} onChange={e => setFormVal('tdsRate', e.target.value)}>
                      <option value="0">No Deduction (0%)</option>
                      <option value="2">2% Co-services Tax</option>
                      <option value="5">5% Standard Goods TDS</option>
                      <option value="7.5">7.5% Contractual TDS</option>
                      <option value="10">10% Professional Fees TDS</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">VAT Withheld (VDS)</label>
                    <select className="form-control" value={form.vatRate} onChange={e => setFormVal('vatRate', e.target.value)}>
                      <option value="0">No Deduction (0%)</option>
                      <option value="5">5% Standard VDS</option>
                      <option value="7.5">7.5% Services VDS</option>
                      <option value="15">15% Full Rate VAT</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Base Payment Amount</label>
                    <input type="number" className="form-control" placeholder="0.00" value={form.amount} onChange={e => setFormVal('amount', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Payment Mode</label>
                    <select className="form-control" value={form.paymentMode} onChange={e => setFormVal('paymentMode', e.target.value)}>
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash Payment</option>
                      <option value="cheque">Bank Cheque</option>
                      <option value="bkash">bKash Settlement</option>
                      <option value="nagad">Nagad Settlement</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Paid From (Cash/Bank Account)</label>
                    <select className="form-control" value={form.accountId} onChange={e => setFormVal('accountId', e.target.value)}>
                      {coa.filter(a => ['acc-1010','acc-1020','acc-1025','acc-1030','acc-1035','acc-1040'].includes(a.id)).map(a => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name} (৳{Number(a.balance || 0).toLocaleString('en-BD')})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {form.paymentMode === 'cheque' ? (
                      <div>
                        <label className="form-label">Cheque Details (No/Bank)</label>
                        <input type="text" className="form-control" placeholder="Cheque No." value={form.chequeNo} onChange={e => setFormVal('chequeNo', e.target.value)} />
                      </div>
                    ) : (
                      <div>
                        <label className="form-label">Bank Reference No</label>
                        <input type="text" className="form-control" placeholder="Ref/UTR code" value={form.bankReference} onChange={e => setFormVal('bankReference', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CONDITIONAL SECTION: RECEIPT VOUCHER */}
            {activeType === 'receipt' && (
              <div style={{ borderTop: '1px dashed var(--border-color)', pt: '1rem', mt: '1rem' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Customer (Debtor)</label>
                  <select className="form-control" value={form.partyId} onChange={e => setFormVal('partyId', e.target.value)}>
                    <option value="">— Select Customer —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Outstanding: ৳{Number(c.currentBalance || 0).toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Collection Amount (BDT)</label>
                    <input type="number" className="form-control" placeholder="0.00" value={form.amount} onChange={e => setFormVal('amount', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Receipt Mode</label>
                    <select className="form-control" value={form.paymentMode} onChange={e => setFormVal('paymentMode', e.target.value)}>
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash Collection</option>
                      <option value="cheque">Customer Cheque</option>
                      <option value="bkash">bKash Pay</option>
                      <option value="nagad">Nagad Pay</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Deposit to Cash/Bank Account</label>
                  <select className="form-control" value={form.accountId} onChange={e => setFormVal('accountId', e.target.value)}>
                    {coa.filter(a => ['acc-1010','acc-1020','acc-1025','acc-1030','acc-1035','acc-1040'].includes(a.id)).map(a => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name} (৳{Number(a.balance || 0).toLocaleString('en-BD')})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* CONDITIONAL SECTION: JOURNAL VOUCHER */}
            {activeType === 'journal' && (
              <div style={{ borderTop: '1px dashed var(--border-color)', pt: '1rem', mt: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label className="form-label">Posting Type</label>
                    <select className="form-control" value={form.journalType} onChange={e => setFormVal('journalType', e.target.value)}>
                      <option value="accrual">Accrual Adjustment</option>
                      <option value="depreciation">Asset Depreciation</option>
                      <option value="adjustment">General Correction Ledger</option>
                      <option value="reclassification">Reclassification Entry</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Auto-Reverse Schedule Date (Optional)</label>
                    <input type="date" className="form-control" value={form.reverseDate} onChange={e => setFormVal('reverseDate', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.4rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <span>Ledger Account Details</span><span>DR/CR</span><span>Amount (৳)</span><span />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {jLines.map((line, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                        <select className="form-control" value={line.accountId} onChange={e => setJLines(ls => ls.map((l, j) => j === idx ? { ...l, accountId: e.target.value } : l))}>
                          {coa.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name} (৳{Number(a.balance || 0).toLocaleString()})</option>)}
                        </select>
                        <select className="form-control" value={line.type} onChange={e => setJLines(ls => ls.map((l, j) => j === idx ? { ...l, type: e.target.value } : l))}>
                          <option value="debit">Debit</option>
                          <option value="credit">Credit</option>
                        </select>
                        <input type="number" className="form-control" placeholder="0.00" value={line.amount} onChange={e => setJLines(ls => ls.map((l, j) => j === idx ? { ...l, amount: e.target.value } : l))} />
                        <button onClick={() => setJLines(ls => ls.filter((_, j) => j !== idx))} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: '0.45rem 0.6rem', cursor: 'pointer', color: '#ef4444' }}>✕</button>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button onClick={() => setJLines(ls => [...ls, { accountId: coa[0]?.id || 'acc-1010', type: 'debit', amount: '' }])} className="btn btn-secondary btn-sm">+ Add Entry Row</button>
                    <button onClick={handleAutoBalance} className="btn btn-secondary btn-sm" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}>⚖️ Auto-Balance Rows</button>
                  </div>
                </div>
              </div>
            )}

            {/* CONDITIONAL SECTION: EXPENSE VOUCHER */}
            {activeType === 'expense' && (
              <div style={{ borderTop: '1px dashed var(--border-color)', pt: '1rem', mt: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ margin: 0 }}>Allocation Mode</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="radio" checked={!isSplitExpense} onChange={() => setIsSplitExpense(false)} /> Simple Cost
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="radio" checked={isSplitExpense} onChange={() => setIsSplitExpense(true)} /> Split Multi-Item
                      </label>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Employee / Recipient</label>
                    <select className="form-control" value={form.partyId} onChange={e => setFormVal('partyId', e.target.value)}>
                      <option value="">— Select Employee —</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!isSplitExpense ? (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Expense Account Head</label>
                    <select className="form-control" value={form.debitAccount} onChange={e => setFormVal('debitAccount', e.target.value)}>
                      <option value="">— Select Account —</option>
                      {coa.filter(a => a.type === 'expense').map(a => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name} (৳{Number(a.balance || 0).toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', marginBottom: '0.4rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      <span>Expense Account Head</span><span>Amount (৳)</span><span />
                    </div>
                    {expLines.map((line, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                        <select className="form-control" value={line.accountId} onChange={e => setExpLines(ls => ls.map((l, j) => j === idx ? { ...l, accountId: e.target.value } : l))}>
                          {coa.filter(a => a.type === 'expense').map(a => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name} (৳{Number(a.balance || 0).toLocaleString()})</option>
                          ))}
                        </select>
                        <input type="number" className="form-control" placeholder="0.00" value={line.amount} onChange={e => setExpLines(ls => ls.map((l, j) => j === idx ? { ...l, amount: e.target.value } : l))} />
                        <button onClick={() => setExpLines(ls => ls.filter((_, j) => j !== idx))} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: '0.4rem 0.5rem', cursor: 'pointer', color: '#ef4444' }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => setExpLines(ls => [...ls, { accountId: 'acc-6150', amount: '' }])} className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>+ Add Expense Row</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  {!isSplitExpense && (
                    <div>
                      <label className="form-label">Expense Amount</label>
                      <input type="number" className="form-control" placeholder="0.00" value={form.amount} onChange={e => setFormVal('amount', e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label className="form-label">Paid From Account</label>
                    <select className="form-control" value={form.accountId} onChange={e => setFormVal('accountId', e.target.value)}>
                      {coa.filter(a => ['acc-1010','acc-1020','acc-1025','acc-1030','acc-1035','acc-1040'].includes(a.id)).map(a => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name} (৳{Number(a.balance || 0).toLocaleString('en-BD')})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Department</label>
                    <select className="form-control" value={form.department} onChange={e => setFormVal('department', e.target.value)}>
                      <option value="IT">IT Department</option>
                      <option value="Operations">Operations</option>
                      <option value="Finance">Finance</option>
                      <option value="Marketing">Marketing</option>
                      <option value="HR">Human Resources</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Cost Center</label>
                    <select className="form-control" value={form.costCenter} onChange={e => setFormVal('costCenter', e.target.value)}>
                      <option value="CC-IT">IT Hardware/Services</option>
                      <option value="CC-Operations">Warehouse logistics</option>
                      <option value="CC-Finance">General Accounts</option>
                      <option value="CC-Marketing">Public Relations</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Linked Project</label>
                    <select className="form-control" value={form.project} onChange={e => setFormVal('project', e.target.value)}>
                      <option value="PRJ-General">General Overhead</option>
                      <option value="PRJ-ERP-UPGRADE">ERP system redesign</option>
                      <option value="PRJ-WAREHOUSE">Automation center</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Narration and Upload Mocks */}
            <div className="form-group" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
              <label className="form-label">Narration / Remarks</label>
              <textarea className="form-control" rows={3} placeholder="Detailed transaction explanation..." value={form.narration} onChange={e => setFormVal('narration', e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)' }}>📁 Support Document Uploads</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Upload bills, PO sheets, GRN slips, tax reports (Mocked)</div>
              </div>
              <button type="button" onClick={triggerMockUpload} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>+ Mock File Attach</button>
              {form.attachments.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: '100%', mt: 4 }}>
                  {form.attachments.map((file, i) => (
                    <span key={i} style={{ fontSize: 'var(--font-size-xs)', padding: '0.2rem 0.5rem', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 6, color: '#2563eb' }}>
                      📄 {file.name} (size: {file.size})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Form Submissions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', pt: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsCreateModalOpen(false); }} style={{ fontWeight: 600 }}>
                Close
              </button>
              
              {currentUserRole !== 'maker' && (
                <div style={{ fontSize: 'var(--font-size-xs)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem', borderRadius: 8, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  ⚠️ Simulated role is not "Maker". Set simulated role to "Maker" above to submit.
                </div>
              )}

              <button
                onClick={handleSubmitVoucherForm}
                disabled={loading || !rulesPassed || currentUserRole !== 'maker'}
                className="btn btn-primary"
                style={{
                  fontWeight: 600,
                  opacity: (!rulesPassed || currentUserRole !== 'maker') ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Submitting…' : (
                  <>
                    <span>📤</span>
                    <span>Submit Voucher for Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Links, Scorecards, & Realtime Rules Engine */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* WIDGET A: DOCUMENT LINKER MATRIX */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem 0', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔗 Related Source Documents</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: '#2563eb' }}>Auto-Linker Matrix</span>
              </h3>

              {!form.partyId ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px dashed var(--border-color)' }}>
                  Select a supplier or customer to view linkable invoices, purchase orders, or requisitions.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeType === 'payment' && (
                    <>
                      {/* 1. Requisitions (PR) */}
                      <div>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Approved Requisitions (PR)</div>
                        {requisitions.filter(pr => pr.status === 'Approved' && pr.items.some(item => !pr.poNumber)).length === 0 ? (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: 6 }}>No open requisitions.</div>
                        ) : (
                          requisitions.filter(pr => pr.status === 'Approved' && pr.items.some(item => !pr.poNumber)).map(pr => {
                            const isLinked = form.linkedDocs.some(d => d.ref === pr.prNumber);
                            return (
                              <div key={pr.id} onClick={() => handleLinkDocument('PR', pr.prNumber, pr.totalAmount)} style={{
                                padding: '0.5rem',
                                borderRadius: 8,
                                border: `1px solid ${isLinked ? '#2563eb' : 'var(--border-color)'}`,
                                background: isLinked ? 'rgba(37,99,235,0.06)' : 'var(--bg-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                justifySpace: 'space-between',
                                fontSize: 'var(--font-size-xs)',
                                marginBottom: 4
                              }}>
                                <span>📄 {pr.prNumber} ({pr.department})</span>
                                <span style={{ fontWeight: 600 }}>৳{pr.totalAmount.toLocaleString()}</span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* 2. Unpaid Supplier Bills (Vendor Invoices) */}
                      <div>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Unpaid Supplier Invoices (GRN Linked)</div>
                        {purchaseInvoices.filter(inv => inv.supplierId === form.partyId && inv.paymentStatus !== 'paid').length === 0 ? (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: 6 }}>No unpaid bills found.</div>
                        ) : (
                          purchaseInvoices.filter(inv => inv.supplierId === form.partyId && inv.paymentStatus !== 'paid').map(inv => {
                            const isLinked = form.linkedDocs.some(d => d.ref === inv.invoiceNo);
                            const total = (inv.grandTotal || 0) + (inv.landedCost?.total || 0);
                            const due = total - (inv.paidAmount || 0);
                            return (
                              <div key={inv.id} onClick={() => handleLinkDocument('Invoice', inv.invoiceNo, due)} style={{
                                padding: '0.5rem',
                                borderRadius: 8,
                                border: `1px solid ${isLinked ? '#2563eb' : 'var(--border-color)'}`,
                                background: isLinked ? 'rgba(37,99,235,0.06)' : 'var(--bg-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                justifySpace: 'space-between',
                                fontSize: 'var(--font-size-xs)',
                                marginBottom: 4
                              }}>
                                <div>
                                  <div style={{ fontWeight: 600 }}>🧾 {inv.invoiceNo} {inv.grnNumber && `(GRN: ${inv.grnNumber})`}</div>
                                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Due Date: {window.formatDate(inv.dueDate)}</span>
                                </div>
                                <span style={{ fontWeight: 600, color: '#dc2626' }}>৳{due.toLocaleString()}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}

                  {activeType === 'receipt' && (
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Outstanding Client Invoices</div>
                      {salesInvoices.filter(inv => inv.customerId === form.partyId && inv.paymentStatus !== 'paid').length === 0 ? (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: 6 }}>No unpaid client bills.</div>
                      ) : (
                        salesInvoices.filter(inv => inv.customerId === form.partyId && inv.paymentStatus !== 'paid').map(inv => {
                          const isLinked = form.linkedDocs.some(d => d.ref === inv.invoiceNo);
                          const due = inv.grandTotal - (inv.paidAmount || 0);
                          return (
                            <div key={inv.id} onClick={() => handleLinkDocument('Sales Invoice', inv.invoiceNo, due)} style={{
                              padding: '0.5rem',
                              borderRadius: 8,
                              border: `1px solid ${isLinked ? '#16a34a' : 'var(--border-color)'}`,
                              background: isLinked ? 'rgba(22,163,74,0.06)' : 'var(--bg-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifySpace: 'space-between',
                              fontSize: 'var(--font-size-xs)',
                              marginBottom: 4
                            }}>
                              <div>
                                <div style={{ fontWeight: 600 }}>🧾 {inv.invoiceNo}</div>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Due Date: {window.formatDate(inv.dueDate)}</span>
                              </div>
                              <span style={{ fontWeight: 600, color: '#16a34a' }}>৳{due.toLocaleString()}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WIDGET B: VENDOR ENRICHMENT COMPLIANCE SCORECARD */}
            {activeType === 'payment' && form.partyId && (
              <div className="card animate-fade-in" style={{ padding: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
                  🛡️ Vendor Scorecard & Compliance
                </h3>

                {(() => {
                  const card = vendorDetails[form.partyId] || {
                    code: 'VND-NEW-99',
                    bin: 'Unregistered',
                    currency: 'BDT',
                    paymentTerms: 'COD Only',
                    moq: 1,
                    leadTime: 10,
                    scores: { quality: 10, delivery: 10, price: 10, support: 5, compliance: 5 },
                    contractStatus: 'Unverified',
                    kyc: false,
                    bankVerified: false
                  };

                  const totalScore = Object.values(card.scores || {}).reduce((s, v) => s + v, 0);
                  const rating = Number((totalScore / 20).toFixed(1));

                  return (
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', pb: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{card.code}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>BIN: {card.bin}</div>
                        </div>
                        <div style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-xs)', padding: '0.2rem 0.5rem', borderRadius: 8, background: card.contractStatus === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: card.contractStatus === 'Active' ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                          {card.contractStatus}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div>📅 Lead Time: <strong>{card.leadTime} Days</strong></div>
                        <div>💳 Terms: <strong>{card.paymentTerms}</strong></div>
                        <div>🏦 Bank Verified: <strong>{card.bankVerified ? '✓ Verified' : '✗ Pending'}</strong></div>
                        <div>👤 KYC: <strong>{card.kyc ? '✓ Completed' : '✗ Incomplete'}</strong></div>
                      </div>

                      {/* Radar Scores Grid */}
                      <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Vendor Audit score</span>
                          <span style={{ color: '#16a34a' }}>Rating: {rating} ★</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', fontSize: 'var(--font-size-xs)' }}>
                          <div>On-Time: <strong>{card.scores?.delivery * 4}%</strong></div>
                          <div>Quality: <strong>{card.scores?.quality * 4}%</strong></div>
                          <div>Pricing: <strong>{card.scores?.price * 4}%</strong></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* WIDGET C: REAL-TIME RULES ENGINE */}
            <div className="card" style={{ padding: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
                🚦 Realtime Rules compliance
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {evaluatedRules.map(rule => (
                  <div key={rule.id} style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 10,
                    background: rule.status === 'passed' ? 'rgba(34,197,94,0.05)' : rule.status === 'warning' ? 'rgba(217,119,6,0.06)' : 'rgba(220,38,38,0.06)',
                    border: `1px solid ${rule.status === 'passed' ? 'rgba(34,197,94,0.2)' : rule.status === 'warning' ? 'rgba(217,119,6,0.25)' : 'rgba(220,38,38,0.2)'}`,
                    fontSize: 'var(--font-size-xs)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span>{rule.name}</span>
                      <span style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-xs)', color: rule.status === 'passed' ? '#16a34a' : rule.status === 'warning' ? '#d97706' : '#dc2626' }}>
                        {rule.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{rule.desc}</div>
                    <div style={{ fontWeight: 600, marginTop: 4, color: rule.status === 'passed' ? '#15803d' : rule.status === 'warning' ? '#b45309' : '#b91c1c' }}>{rule.msg}</div>
                  </div>
                ))}
              </div>
            </div>

            </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* TAB C: VOUCHERS LOG TABLE */}
      {activeTab === 'log' && (
        <div>
          {/* Advanced Search & Filtering Box */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--card-bg)', borderRadius: 16 }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              🔎 Advanced Filter Controls
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <input type="text" className="form-control" placeholder="Search ref, remarks, amount..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
              </div>
              
              <div>
                <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="payment">Payment Vouchers</option>
                  <option value="receipt">Receipt Vouchers</option>
                  <option value="journal">Journal Vouchers</option>
                  <option value="expense">Expense Vouchers</option>
                </select>
              </div>

              <div>
                <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted (Review)</option>
                  <option value="Approved">Approved</option>
                  <option value="Posted">Posted to GL</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Reversed">Reversed</option>
                </select>
              </div>

              <div>
                <select className="form-control" value={filterAttachment} onChange={e => setFilterAttachment(e.target.value)}>
                  <option value="all">All Attachments</option>
                  <option value="yes">Has Attachments</option>
                  <option value="no">No Attachments</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>From</span>
                <input type="date" className="form-control" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>To</span>
                <input type="date" className="form-control" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Min Amt</span>
                <input type="number" className="form-control" placeholder="0.00" value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Max Amt</span>
                <input type="number" className="form-control" placeholder="0.00" value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Vouchers table grid */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Voucher No</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Type</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Date</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Entity (Party)</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Dept / CC</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'center' }}>Docs</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                      No matching vouchers found. Click "Create Voucher" to draft new transactions.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map(v => {
                    const vInfo = VOUCHER_TYPES.find(t => t.id === v.voucherType) || { color: '#64748b', bg: 'rgba(100,116,139,0.08)', icon: '📄', label: v.voucherType };

                    let statusIcon = '●'; let statusColor = '#64748b'; let statusBg = 'rgba(100,116,139,0.08)';
                    if (v.status === 'Posted') { statusIcon = '✓'; statusColor = '#10b981'; statusBg = 'rgba(16,185,129,0.1)'; }
                    else if (v.status === 'Submitted') { statusIcon = '⏳'; statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.1)'; }
                    else if (v.status === 'Approved') { statusIcon = '✅'; statusColor = '#3b82f6'; statusBg = 'rgba(59,130,246,0.1)'; }
                    else if (v.status === 'Rejected') { statusIcon = '✕'; statusColor = '#ef4444'; statusBg = 'rgba(239,68,68,0.1)'; }
                    else if (v.status === 'Reversed') { statusIcon = '↩'; statusColor = '#8b5cf6'; statusBg = 'rgba(139,92,246,0.1)'; }

                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.12s', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-color)', fontSize: '0.82rem' }}>{v.refNo}</span>
                        </td>
                        <td style={{ padding: '0.8rem 0.75rem' }}>
                          <span style={{ color: vInfo.color, background: vInfo.bg, border: `1px solid ${vInfo.color}20`, padding: '0.2rem 0.55rem', borderRadius: 7, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            {vInfo.icon} {v.voucherType}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{window.formatDate(v.date)}</td>
                        <td style={{ padding: '0.8rem 0.75rem', fontWeight: 700, color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.partyName || '—'}</td>
                        <td style={{ padding: '0.8rem 0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{v.department || '—'}<br/><span style={{ opacity: 0.7 }}>{v.costCenter || '—'}</span></td>
                        <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: v.voucherType === 'receipt' ? '#10b981' : v.voucherType === 'payment' || v.voucherType === 'expense' ? '#ef4444' : 'var(--text-primary)' }}>৳{v.amount.toLocaleString()}</td>
                        <td style={{ padding: '0.8rem 0.75rem' }}>
                          <span style={{ color: statusColor, background: statusBg, border: `1px solid ${statusColor}20`, padding: '0.22rem 0.55rem', borderRadius: 7, fontWeight: 700, fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                            {statusIcon} {v.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                          {v.attachments && v.attachments.length > 0
                            ? <span style={{ fontSize: '0.65rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>📁 {v.attachments.length}</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                          <button onClick={() => setInspectedVoucher(v)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.68rem', fontWeight: 700, border: '1.5px solid var(--border-color)', borderRadius: 8, background: 'transparent', color: 'var(--accent-color)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'transparent'; }}
                          >🔍 Inspect</button>
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

      {/* TAB D: APPROVAL QUEUE & MAKER CHECKER GATEWAY */}
      {activeTab === 'approval' && (
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
          
          {/* Left panel: list of unapproved */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>⏳ Awaiting Authorization</h3>
              <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 8px', borderRadius: 8, fontWeight: 800 }}>{vouchers.filter(v => v.status === 'Submitted' || v.status === 'Approved').length} pending</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {vouchers.filter(v => v.status === 'Submitted' || v.status === 'Approved').length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
                  No vouchers require approval at this time.
                </div>
              ) : (
                vouchers.filter(v => v.status === 'Submitted' || v.status === 'Approved').map(v => {
                  const vInfo = VOUCHER_TYPES.find(t => t.id === v.voucherType) || { color: '#64748b', bg: 'rgba(100,116,139,0.08)', icon: '📄' };
                  const step = v.workflow?.find(s => s.role === currentUserRole);
                  const isAlreadyApproved = step?.status === 'Approved';
                  const approvedSteps = v.workflow?.filter(s => s.status === 'Approved').length || 0;
                  const totalSteps = v.workflow?.length || 3;

                  return (
                    <div
                      key={v.id}
                      onClick={() => setInspectedVoucher(v)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 12,
                        background: inspectedVoucher?.id === v.id ? 'rgba(99,102,241,0.06)' : 'var(--bg-primary, #fff)',
                        border: `1.5px solid ${inspectedVoucher?.id === v.id ? '#6366f1' : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: inspectedVoucher?.id === v.id ? '0 4px 12px rgba(99,102,241,0.12)' : 'none'
                      }}
                      onMouseEnter={e => { if (inspectedVoucher?.id !== v.id) e.currentTarget.style.borderColor = '#6366f1'; }}
                      onMouseLeave={e => { if (inspectedVoucher?.id !== v.id) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-color)', fontSize: '0.82rem' }}>{v.refNo}</span>
                          <span style={{ marginLeft: 6, color: vInfo.color, background: vInfo.bg, padding: '1px 5px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>{vInfo.icon} {v.voucherType}</span>
                        </div>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{window.formatDate(v.date)}</span>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 6 }}>৳{v.amount.toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.partyName || 'General Entity'}</div>
                      {/* Mini progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, background: 'var(--border-color)', height: 4, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ background: isAlreadyApproved ? '#10b981' : '#f59e0b', height: '100%', width: `${(approvedSteps / totalSteps) * 100}%`, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isAlreadyApproved ? '#10b981' : '#f59e0b', whiteSpace: 'nowrap' }}>
                          {isAlreadyApproved ? '✓ Approved' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: detail reviewer and action board */}
          <div>
            {!inspectedVoucher ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: 16 }}>
                Select a voucher from the queue to view audit history and trigger approvals.
              </div>
            ) : (
              <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', pb: '0.75rem', mb: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 600, fontSize: 'var(--font-size-md)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📄 Voucher Inspection: {inspectedVoucher.refNo}</span>
                    </h3>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Current Status: <strong>{inspectedVoucher.status}</strong></span>
                  </div>
                  <button onClick={() => setInspectedVoucher(null)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 'var(--font-size-lg)', cursor: 'pointer' }}>×</button>
                </div>

                {/* Voucher lines detail grid */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ledger Impact Splitting</div>
                  <table style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: 4 }}>Account Name</th>
                        <th style={{ padding: 4, textAlign: 'right' }}>Debit (DR)</th>
                        <th style={{ padding: 4, textAlign: 'right' }}>Credit (CR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectedVoucher.lines?.map((l, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                          <td style={{ padding: 4 }}>{coa.find(a => a.id === l.accountId)?.name || l.accountId}</td>
                          <td style={{ padding: 4, textAlign: 'right', fontFamily: 'monospace' }}>{l.type === 'debit' ? `৳${l.amount.toLocaleString()}` : '—'}</td>
                          <td style={{ padding: 4, textAlign: 'right', fontFamily: 'monospace' }}>{l.type === 'credit' ? `৳${l.amount.toLocaleString()}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ borderTop: '1px solid var(--border-color)', mt: '0.5rem', pt: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                    <span>Total Net Amount:</span>
                    <span>৳{inspectedVoucher.amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Workflow Status matrix - visual stepper */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>⚙️ Approval Workflow Progress</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
                    {inspectedVoucher.workflow?.map((step, idx) => {
                      const roleLabels = { dept_head: 'Dept Head', accts_manager: 'Accts Mgr', finance_controller: 'Controller' };
                      const isApproved = step.status === 'Approved';
                      const isCurrent = step.role === currentUserRole && !isApproved;
                      return (
                        <div key={step.role} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                          {/* Connector line */}
                          {idx > 0 && <div style={{ position: 'absolute', top: 16, right: '50%', width: '100%', height: 2, background: isApproved ? '#10b981' : 'var(--border-color)', zIndex: 0 }} />}
                          {/* Step circle */}
                          <div style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${isApproved ? '#10b981' : isCurrent ? '#f59e0b' : 'var(--border-color)'}`, background: isApproved ? '#10b981' : isCurrent ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: isApproved ? '#fff' : isCurrent ? '#f59e0b' : 'var(--text-muted)', zIndex: 1, position: 'relative', transition: 'all 0.3s' }}>
                            {isApproved ? '✓' : isCurrent ? '●' : idx + 1}
                          </div>
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: isApproved ? '#10b981' : isCurrent ? '#f59e0b' : 'var(--text-muted)', marginTop: 4, textAlign: 'center', lineHeight: 1.3 }}>
                            {roleLabels[step.role] || step.role}
                          </div>
                          <div style={{ fontSize: '0.55rem', color: isApproved ? '#10b981' : 'var(--text-muted)', fontWeight: isApproved ? 800 : 600, marginTop: 1 }}>
                            {isApproved ? step.updatedBy || '✓ Done' : step.status}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Input for remarks and Action Buttons */}
                {inspectedVoucher.status !== 'Posted' && inspectedVoucher.status !== 'Reversed' && (
                  <div style={{ borderTop: '1px solid var(--border-color)', pt: '1rem' }}>
                    <label className="form-label">Approver/Reviewer Action Notes</label>
                    <textarea id="app-remarks" className="form-control" rows={2} placeholder="Explain approval decision or rejection reasons..." />
                    
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button onClick={() => {
                        const r = document.getElementById('app-remarks')?.value || '';
                        if (!r) return alert('Rejection reason required.');
                        handleApprovalAction(inspectedVoucher.id, 'reject', r);
                      }} className="btn btn-secondary" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'transparent', fontWeight: 600 }}>
                        ❌ Reject Voucher
                      </button>

                      <button onClick={() => {
                        const r = document.getElementById('app-remarks')?.value || '';
                        handleApprovalAction(inspectedVoucher.id, 'approve', r);
                      }} className="btn btn-primary" style={{ background: '#2563eb', color: '#fff', fontWeight: 600 }}>
                        ✓ Sign & Approve
                      </button>

                      {currentUserRole === 'finance_controller' && inspectedVoucher.status === 'Approved' && (
                        <button onClick={() => handlePostVoucherToGL(inspectedVoucher.id)} className="btn" style={{ background: '#16a34a', color: '#fff', fontWeight: 600, padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer' }}>
                          ⚡ Post to General Ledger
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. INSPECTION DETAIL VIEW DRAWER */}
      {inspectedVoucher && activeTab !== 'approval' && (
        <div className="modal-overlay">
          <div className="modal-content print-voucher-modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Voucher Slip Title */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {inspectedVoucher.voucherType.toUpperCase()} VOUCHER DETAIL
                </h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255,255,255,0.7)' }}>Voucher ID: {inspectedVoucher.id}</span>
              </div>
              <button onClick={() => setInspectedVoucher(null)} className="modal-close">×</button>
            </div>
            <div className="modal-form-content">

            {/* General Info list */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)' }}>
              <div>
                <div><strong>Voucher No:</strong> {inspectedVoucher.refNo}</div>
                <div><strong>Voucher Date:</strong> {window.formatDate(inspectedVoucher.date)}</div>
                <div><strong>Posting Date:</strong> {window.formatDate(inspectedVoucher.postingDate || inspectedVoucher.date)}</div>
                <div><strong>Entity (Recipient):</strong> {inspectedVoucher.partyName || 'N/A'}</div>
              </div>
              <div>
                <div><strong>Department:</strong> {inspectedVoucher.department || 'Finance'}</div>
                <div><strong>Cost Center:</strong> {inspectedVoucher.costCenter || 'CC-Finance'}</div>
                <div><strong>Project Link:</strong> {inspectedVoucher.project || 'PRJ-General'}</div>
                <div><strong>Voucher Status:</strong> <span style={{ fontWeight: 600 }}>{inspectedVoucher.status}</span></div>
              </div>
            </div>

            {inspectedVoucher.linkedDocs && inspectedVoucher.linkedDocs.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 10, fontSize: 'var(--font-size-sm)' }}>
                <strong>Linked Documents:</strong> {inspectedVoucher.linkedDocs.map((d, i) => (
                  <span key={i} style={{ marginLeft: 6, padding: '0.15rem 0.4rem', background: 'rgba(37,99,235,0.1)', color: '#2563eb', borderRadius: 6, fontWeight: 600 }}>
                    {d.type}: {d.ref}
                  </span>
                ))}
              </div>
            )}

            {/* Line Items Splitting rows */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>General Ledger Entries</div>
              <table style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Ledger Account Details</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '120px' }}>Debit (DR)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '120px' }}>Credit (CR)</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectedVoucher.lines?.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem' }}>{coa.find(a => a.id === line.accountId)?.name || line.accountId}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                        {line.type === 'debit' ? `৳${line.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                        {line.type === 'credit' ? `৳${line.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 600, background: 'var(--bg-tertiary)' }}>
                    <td style={{ padding: '0.5rem' }}>Subtotal BDT</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      ৳{inspectedVoucher.lines?.filter(l => l.type === 'debit').reduce((sum, l) => sum + Number(l.amount), 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      ৳{inspectedVoucher.lines?.filter(l => l.type === 'credit').reduce((sum, l) => sum + Number(l.amount), 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {inspectedVoucher.narration && (
              <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', marginBottom: '1rem' }}>
                <strong>Voucher Narration:</strong> {inspectedVoucher.narration}
              </div>
            )}

            {/* Change tracking logs */}
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Audit Trail History</div>
              {inspectedVoucher.history?.map((h, idx) => (
                <div key={idx} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  • [{new Date(h.timestamp).toLocaleString()}] — <strong>{h.status}</strong>: {h.remark} (by: {h.updater})
                </div>
              ))}
            </div>

            {/* Reversal action for posted entries */}
            {inspectedVoucher.status === 'Posted' && currentUserRole === 'finance_controller' && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px dashed rgba(239,68,68,0.25)', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: '#dc2626' }}>⚖️ Reversal Correction Console</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Reversing this voucher will post an exact offsetting entry to the General Ledger.</div>
                
                <input id="rev-reason" type="text" className="form-control" placeholder="Input reversal reason code..." style={{ marginTop: '0.5rem', maxWidth: '350px' }} />
                <button onClick={() => {
                  const reason = document.getElementById('rev-reason')?.value || '';
                  handleReverseVoucher(inspectedVoucher.id, reason);
                }} className="btn btn-secondary btn-sm" style={{ background: '#dc2626', color: '#fff', marginTop: '0.5rem', fontWeight: 600 }}>
                  Execute Reversing Transaction
                </button>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="form-actions" style={{ marginTop: '0.5rem' }}>
              <button onClick={() => handleDownloadPDF(inspectedVoucher)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, background: '#10b981', borderColor: 'transparent' }}>
                📥 Download Slip PDF
              </button>
              <button onClick={() => setInspectedVoucher(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
