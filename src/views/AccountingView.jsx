import { useState, useEffect, useMemo } from 'react';
import { reportService } from '../services/reportService';
import { accountingService } from '../services/accountingService';

const fmt = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n) => Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_COLORS = {
  asset:     { color: '#2563eb', bg: 'rgba(37,99,235,0.08)'  },
  liability: { color: '#dc2626', bg: 'rgba(239,68,68,0.08)'  },
  equity:    { color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  revenue:   { color: '#059669', bg: 'rgba(5,150,105,0.08)'  },
  expense:   { color: '#d97706', bg: 'rgba(217,119,6,0.08)'  },
};

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const DEFAULT_DIMENSIONS = {
  departments: ['IT', 'Operations', 'Finance', 'Marketing', 'HR'],
  costCenters: ['CC-IT', 'CC-Operations', 'CC-Finance', 'CC-Marketing'],
  projects: ['PRJ-General', 'PRJ-ERP-UPGRADE', 'PRJ-WAREHOUSE']
};

export default function AccountingView() {
  const [tab, setTab] = useState('coa'); // 'coa' | 'journals' | 'ledger' | 'trial' | 'reconciliation' | 'closing'
  
  // Data States
  const [coa, setCoa] = useState(() => {
    try {
      const val = localStorage.getItem('erp_coa');
      if (val && val !== 'null') {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [journals, setJournals] = useState(() => {
    try {
      const val = localStorage.getItem('erp_journals');
      if (val && val !== 'null') {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [vouchers, setVouchers] = useState(() => {
    try {
      const val = localStorage.getItem('erp_vouchers');
      if (val && val !== 'null') {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  
  // COA tree collapse states
  const [expandedNodes, setExpandedNodes] = useState(new Set(['asset', 'liability', 'equity', 'revenue', 'expense']));
  const [showAddCOA, setShowAddCOA] = useState(false);
  const [newAcc, setNewAcc] = useState({
    code: '',
    name: '',
    type: 'asset',
    classification: 'current_asset',
    parentCode: '',
    normalBalance: 'debit',
    costCenterAllowed: true,
    departmentAllowed: true,
    projectAllowed: true,
    reconciliationRequired: false
  });
  const [editingAccount, setEditingAccount] = useState(null);
  const [coaSearch, setCoaSearch] = useState('');

  // General Ledger States
  const [glAccount, setGlAccount] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem('erp_coa') || '[]');
      return c[0]?.id || '';
    } catch {
      return '';
    }
  });
  const [glFrom, setGlFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().substring(0, 10));
  const [glTo, setGlTo] = useState(new Date().toISOString().substring(0, 10));
  const [glData, setGlData] = useState(null);
  const [glDimensionFilter, setGlDimensionFilter] = useState({ costCenter: 'all', department: 'all', project: 'all' });

  // Trial Balance States
  const [tbDate, setTbDate] = useState(new Date().toISOString().substring(0, 10));
  const [tbData, setTbData] = useState(null);

  // Journal View states
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journalSearch, setJournalSearch] = useState('');
  const [journalFrom, setJournalFrom] = useState('');
  const [journalTo, setJournalTo] = useState('');
  const [journalModule, setJournalModule] = useState('all');

  // Bank Reconciliation States
  const [reconAccount, setReconAccount] = useState('acc-1020'); // City Bank A/C
  const [bankStatement, setBankStatement] = useState([]);
  const [reconMatches, setReconMatches] = useState([]);
  const [statementEndingBalance, setStatementEndingBalance] = useState('');
  const [matchingStatementRow, setMatchingStatementRow] = useState(null);
  const [manualMatches, setManualMatches] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_manual_matches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAdjustment, setShowAdjustment] = useState(null);
  const [adjNarration, setAdjNarration] = useState('');
  const [adjAccount, setAdjAccount] = useState('acc-6070'); // Bank Charges

  // Settings & Closing States
  const [fiscalSettings, setFiscalSettings] = useState(() => {
    try {
      const s = localStorage.getItem('erp_settings');
      if (s) {
        const parsed = JSON.parse(s);
        const fiscal = parsed.fiscal || {};
        return {
          lockedPeriods: [],
          softLockedPeriods: [],
          ...fiscal
        };
      }
      return { lockedPeriods: [], softLockedPeriods: [] };
    } catch {
      return { lockedPeriods: [], softLockedPeriods: [] };
    }
  });
  const [selectedLockYear, setSelectedLockYear] = useState('2026');

  /* ─────────── Simulated Role ─────────── */
  const [simulatedRole, setSimulatedRole] = useState(() => localStorage.getItem('erp_accounting_simulated_role') || 'Manager');

  // 1. Initial Data Fetch & Synchronization
  const loadData = async () => {
    const [c, j] = await Promise.all([
      accountingService.getChartOfAccounts(),
      accountingService.getJournalEntries()
    ]);
    setCoa(c || []);
    setJournals(j || []);
    
    try {
      const v = localStorage.getItem('erp_vouchers');
      if (v && v !== 'null') {
        const parsed = JSON.parse(v);
        setVouchers(Array.isArray(parsed) ? parsed : []);
      } else {
        setVouchers([]);
      }
    } catch (e) {
      console.error(e);
      setVouchers([]);
    }
  };

  const reload = async () => {
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update localStorage helper
  const saveManualMatches = (matches) => {
    setManualMatches(matches);
    localStorage.setItem('erp_manual_matches', JSON.stringify(matches));
  };

  // Run ledger with dimension filters
  const runGL = () => {
    if (!glAccount) return;
    const baseResult = reportService.getGeneralLedger(glAccount, glFrom, glTo);
    if (!baseResult) return;

    // Apply dimensions sub-filter on gl lines
    let filteredLines = [...baseResult.lines];
    if (glDimensionFilter.costCenter !== 'all') {
      filteredLines = filteredLines.filter(l => l.costCenter === glDimensionFilter.costCenter);
    }
    if (glDimensionFilter.department !== 'all') {
      filteredLines = filteredLines.filter(l => l.department === glDimensionFilter.department);
    }
    if (glDimensionFilter.project !== 'all') {
      filteredLines = filteredLines.filter(l => l.project === glDimensionFilter.project);
    }

    // Recalculate running balance
    let currentBalance = baseResult.openingBalance;
    const isDebitIncrease = ['asset', 'expense'].includes(baseResult.account?.type);

    const calculatedLines = filteredLines.map(line => {
      if (line.type === 'debit') {
        currentBalance += isDebitIncrease ? line.amount : -line.amount;
      } else {
        currentBalance += isDebitIncrease ? -line.amount : line.amount;
      }
      return { ...line, balance: currentBalance };
    });

    setGlData({
      ...baseResult,
      lines: calculatedLines,
      closingBalance: currentBalance
    });
  };

  const runTB = () => {
    const result = reportService.getTrialBalance(tbDate);
    setTbData(result);
  };

  const downloadGLPDF = () => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF is not loaded.');
    if (!glData) return alert('No ledger data loaded.');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.rect(5, 5, 200, 287);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text('ACCOUNTICA', 105, 18, { align: 'center' });
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text('House-12, Road-05, Dhanmondi, Dhaka-1205, Bangladesh', 105, 23, { align: 'center' });
    doc.text('BIN: 001234567-0101 | info@erpforu.com', 105, 27, { align: 'center' });
    doc.setLineWidth(0.5); doc.setDrawColor(37, 99, 235); doc.line(10, 31, 200, 31);
    
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(37, 99, 235);
    doc.text(`GENERAL LEDGER STATEMENT`, 105, 41, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(10, 47, 190, 25, 'FD');
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    
    doc.setFont('Helvetica', 'bold'); doc.text('Account Head:', 12, 53); doc.setFont('Helvetica', 'normal');
    doc.text(`${glData.account?.code || ''} — ${glData.account?.name || ''}`, 38, 53);
    doc.setFont('Helvetica', 'bold'); doc.text('Category Group:', 12, 59); doc.setFont('Helvetica', 'normal');
    doc.text(glData.account?.classification || 'N/A', 38, 59);
    
    doc.setFont('Helvetica', 'bold'); doc.text('Report Period:', 110, 53); doc.setFont('Helvetica', 'normal');
    doc.text(`${glFrom || 'Opening'} to ${glTo || 'Today'}`, 135, 53);
    doc.setFont('Helvetica', 'bold'); doc.text('Closing Balance:', 110, 59);
    doc.text(`BDT ${Number(glData.closingBalance || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`, 135, 59);
    doc.setFont('Helvetica', 'bold'); doc.text('Prepared On:', 110, 65); doc.setFont('Helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-GB'), 135, 65);

    let tableY = 77;
    doc.setFillColor(241, 245, 249); doc.rect(10, tableY, 190, 8, 'F'); doc.rect(10, tableY, 190, 8);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('Date', 12, tableY + 5.5); 
    doc.text('Ref No', 32, tableY + 5.5);
    doc.text('Narration', 58, tableY + 5.5); 
    doc.text('Debit (DR)', 120, tableY + 5.5, { align: 'right' });
    doc.text('Credit (CR)', 150, tableY + 5.5, { align: 'right' }); 
    doc.text('Balance', 188, tableY + 5.5, { align: 'right' });

    doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59); 
    let y = tableY + 8;
    
    doc.rect(10, y, 190, 8);
    doc.setFont('Helvetica', 'italic');
    doc.text('Opening Balance', 58, y + 5.5);
    doc.setFont('Helvetica', 'normal');
    doc.text(Number(glData.openingBalance || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 }), 188, y + 5.5, { align: 'right' });
    y += 8;

    glData.lines.forEach((line) => {
      if (y > 270) {
        doc.addPage();
        doc.rect(5, 5, 200, 287);
        y = 15;
        doc.setFillColor(241, 245, 249); doc.rect(10, y, 190, 8, 'F'); doc.rect(10, y, 190, 8);
        doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('Date', 12, y + 5.5); 
        doc.text('Ref No', 32, y + 5.5);
        doc.text('Narration', 58, y + 5.5); 
        doc.text('Debit (DR)', 120, y + 5.5, { align: 'right' });
        doc.text('Credit (CR)', 150, y + 5.5, { align: 'right' }); 
        doc.text('Balance', 188, y + 5.5, { align: 'right' });
        doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59);
        y += 8;
      }
      doc.rect(10, y, 190, 8);
      doc.text(line.date || '', 12, y + 5.5);
      doc.text(line.refNo || '', 32, y + 5.5);
      
      let narr = line.narration || '';
      if (narr.length > 32) narr = narr.substring(0, 30) + '...';
      doc.text(narr, 58, y + 5.5);
      
      doc.text(line.debit > 0 ? Number(line.debit).toLocaleString('en-BD') : '-', 120, y + 5.5, { align: 'right' });
      doc.text(line.credit > 0 ? Number(line.credit).toLocaleString('en-BD') : '-', 150, y + 5.5, { align: 'right' });
      doc.text(Number(line.balance).toLocaleString('en-BD', { minimumFractionDigits: 2 }), 188, y + 5.5, { align: 'right' });
      y += 8;
    });

    if (y > 240) {
      doc.addPage();
      doc.rect(5, 5, 200, 287);
      y = 15;
    }
    
    y += 20; doc.setLineWidth(0.3); doc.setDrawColor(148, 163, 184); doc.line(15, y, 65, y); doc.line(140, y, 190, y);
    doc.setFontSize(8.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(71, 85, 105);
    doc.text('Prepared By (Finance)', 40, y + 4, { align: 'center' }); doc.text('Authorized Seal & Signature', 165, y + 4, { align: 'center' });
    doc.setFont('Helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('Note: This is an official system-generated general ledger report powered by ACCOUNTICA.', 105, 275, { align: 'center' });
    
    doc.save(`General_Ledger_${glData.account?.code || 'GL'}_${new Date().toISOString().substring(0, 10)}.pdf`);
  };

  const downloadTBPDF = () => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF is not loaded.');
    if (!tbData) return alert('No trial balance data loaded.');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.rect(5, 5, 200, 287);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text('ACCOUNTICA', 105, 18, { align: 'center' });
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text('House-12, Road-05, Dhanmondi, Dhaka-1205, Bangladesh', 105, 23, { align: 'center' });
    doc.text('BIN: 001234567-0101 | info@erpforu.com', 105, 27, { align: 'center' });
    doc.setLineWidth(0.5); doc.setDrawColor(37, 99, 235); doc.line(10, 31, 200, 31);
    
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(37, 99, 235);
    doc.text(`TRIAL BALANCE VALIDATION REPORT`, 105, 41, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.rect(10, 47, 190, 25, 'FD');
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    
    doc.setFont('Helvetica', 'bold'); doc.text('Evaluation Date:', 12, 53); doc.setFont('Helvetica', 'normal');
    doc.text(tbDate || 'Current Date', 38, 53);
    doc.setFont('Helvetica', 'bold'); doc.text('Overall Status:', 12, 59); doc.setFont('Helvetica', 'bold');
    if (tbData.isBalanced) doc.setTextColor(22, 163, 74); else doc.setTextColor(220, 38, 38);
    doc.text(tbData.isBalanced ? '✓ ZERO-DIFFERENCE BALANCED' : '✗ UNBALANCED WARNING', 38, 59);
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    
    doc.setFont('Helvetica', 'bold'); doc.text('Total Debit:', 110, 53); doc.setFont('Helvetica', 'normal');
    doc.text(`BDT ${Number(tbData.totalDebit || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`, 135, 53);
    doc.setFont('Helvetica', 'bold'); doc.text('Total Credit:', 110, 59);
    doc.text(`BDT ${Number(tbData.totalCredit || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`, 135, 59);
    doc.setFont('Helvetica', 'bold'); doc.text('Prepared On:', 110, 65); doc.setFont('Helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-GB'), 135, 65);

    let tableY = 77;
    doc.setFillColor(241, 245, 249); doc.rect(10, tableY, 190, 8, 'F'); doc.rect(10, tableY, 190, 8);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('Account Code', 12, tableY + 5.5); 
    doc.text('Account Head Name', 38, tableY + 5.5);
    doc.text('Category', 98, tableY + 5.5); 
    doc.text('Debit (BDT)', 148, tableY + 5.5, { align: 'right' });
    doc.text('Credit (BDT)', 188, tableY + 5.5, { align: 'right' });

    doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59); 
    let y = tableY + 8;

    tbData.rows.forEach((row) => {
      if (y > 270) {
        doc.addPage();
        doc.rect(5, 5, 200, 287);
        y = 15;
        doc.setFillColor(241, 245, 249); doc.rect(10, y, 190, 8, 'F'); doc.rect(10, y, 190, 8);
        doc.setFont('Helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('Account Code', 12, y + 5.5); 
        doc.text('Account Head Name', 38, y + 5.5);
        doc.text('Category', 98, y + 5.5); 
        doc.text('Debit (BDT)', 148, y + 5.5, { align: 'right' });
        doc.text('Credit (BDT)', 188, y + 5.5, { align: 'right' });
        doc.setFont('Helvetica', 'normal'); doc.setTextColor(30, 41, 59);
        y += 8;
      }
      doc.rect(10, y, 190, 8);
      doc.text(row.code || '', 12, y + 5.5);
      
      let name = row.name || '';
      if (name.length > 25) name = name.substring(0, 23) + '...';
      doc.text(name, 38, y + 5.5);
      
      doc.text((row.classification || '').replace(/_/g, ' ').toUpperCase(), 98, y + 5.5);
      doc.text(row.debit > 0 ? Number(row.debit).toLocaleString('en-BD') : '-', 148, y + 5.5, { align: 'right' });
      doc.text(row.credit > 0 ? Number(row.credit).toLocaleString('en-BD') : '-', 188, y + 5.5, { align: 'right' });
      y += 8;
    });

    if (y > 240) {
      doc.addPage();
      doc.rect(5, 5, 200, 287);
      y = 15;
    }
    
    y += 20; doc.setLineWidth(0.3); doc.setDrawColor(148, 163, 184); doc.line(15, y, 65, y); doc.line(140, y, 190, y);
    doc.setFontSize(8.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(71, 85, 105);
    doc.text('Prepared By (Finance)', 40, y + 4, { align: 'center' }); doc.text('Authorized Seal & Signature', 165, y + 4, { align: 'center' });
    doc.setFont('Helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('Note: This is an official system-generated trial balance validation report powered by ACCOUNTICA.', 105, 275, { align: 'center' });
    
    doc.save(`Trial_Balance_${tbDate || new Date().toISOString().substring(0, 10)}.pdf`);
  };

  // Protect system-critical account ids
  const isSystemAccount = (acc) => {
    return acc.isSystem === true || [
      'acc-1010', // Cash on Hand
      'acc-1020', // City Bank
      'acc-1100', // Accounts Receivable
      'acc-2010', // Accounts Payable
      'acc-1050', // Inventory Asset
      'acc-4010', // Sales Revenue
      'acc-5010', // Cost of Goods Sold
      'acc-3010', // Retained Earnings
      'acc-9999'  // Suspense Account
    ].includes(acc.id);
  };

  // Hierarchy COA compiler helper (returns parent-child sorted array)
  const buildCOATree = useMemo(() => {
    const q = coaSearch.toLowerCase().trim();
    
    // Filter base accounts first
    const filteredCoa = coa.filter(a => {
      const matchesSearch = !q ||
        (a.code || '').toLowerCase().includes(q) ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.classification || '').toLowerCase().replace(/_/g, ' ').includes(q) ||
        (a.parentCode || '').toLowerCase().includes(q);
      return matchesSearch;
    });

    // Group accounts by parent code
    const parentMap = {};
    const topLevelList = { asset: [], liability: [], equity: [], revenue: [], expense: [] };

    filteredCoa.forEach(acc => {
      if (acc.parentCode) {
        if (!parentMap[acc.parentCode]) parentMap[acc.parentCode] = [];
        parentMap[acc.parentCode].push(acc);
      } else {
        const typeKey = (acc.type || '').toLowerCase().trim();
        if (topLevelList[typeKey]) {
          topLevelList[typeKey].push(acc);
        } else {
          console.warn(`[AccountingView] Account code ${acc.code} has unexpected type: ${acc.type}`);
        }
      }
    });

    // Recursive tree compiler
    const compileSubTree = (accList) => {
      const list = [];
      accList.forEach(acc => {
        list.push(acc);
        const children = parentMap[acc.code];
        if (children && children.length > 0) {
          const sortedChildren = children.sort((a,b) => (a.code || '').localeCompare(b.code || ''));
          list.push(...compileSubTree(sortedChildren));
        }
      });
      return list;
    };

    const finalTree = { asset: [], liability: [], equity: [], revenue: [], expense: [] };
    TYPE_ORDER.forEach(t => {
      const topLevelSorted = (topLevelList[t] || []).sort((a,b) => (a.code || '').localeCompare(b.code || ''));
      finalTree[t] = compileSubTree(topLevelSorted);
    });

    return finalTree;
  }, [coa, coaSearch]);

  // Recursively determine account nesting depth
  const getAccountDepth = (accCode) => {
    let depth = 0;
    let current = coa.find(a => a.code === accCode);
    while (current && current.parentCode) {
      depth++;
      current = coa.find(a => a.code === current.parentCode);
    }
    return depth;
  };

  // Generate next incremental account code under a parent
  const getNextAccountCode = (parentCode, currentCoa) => {
    if (!parentCode) return '';
    const children = currentCoa.filter(a => a.parentCode === parentCode);
    if (children.length > 0) {
      // Sort children by code ascending to get the last one
      const sorted = [...children].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      const lastChild = sorted[sorted.length - 1];
      const lastCode = lastChild.code;
      
      // Match a numeric suffix, e.g., 102001 -> 1020, 01 or 1020-01 -> 1020-, 01
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
      // No children under this parent. If parent is fully numeric, e.g., "1020" -> "102001"
      if (/^\d+$/.test(parentCode)) {
        return parentCode + '01';
      }
      return parentCode + '-01';
    }
  };

  // Determine if a node is a parent (has children)
  const isParentNode = (code) => {
    return coa.some(a => a.parentCode === code);
  };

  // Toggle tree nodes set
  const toggleNode = (nodeId) => {
    const next = new Set(expandedNodes);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    setExpandedNodes(next);
  };

  // Reconciliations Auto matcher (within 3 days variance)
  const runReconciliation = (statementData) => {
    const bankJournalLines = [];
    journals.forEach(j => {
      const targetLines = (j.lines || []).filter(l => l.accountId === reconAccount);
      targetLines.forEach(l => {
        bankJournalLines.push({
          date: j.date?.substring(0, 10),
          refNo: j.refNo,
          narration: j.narration,
          type: l.type,
          amount: Number(l.amount),
          journal: j
        });
      });
    });

    const matches = statementData.map(st => {
      // 1. Manual matches lookup
      const manualMatch = manualMatches.find(m => m.statementRefNo === st.refNo && Math.abs(m.statementAmount - st.amount) < 0.01);
      if (manualMatch) {
        const glLine = bankJournalLines.find(gl => gl.refNo === manualMatch.ledgerRefNo);
        if (glLine) {
          return { statement: st, ledger: glLine, status: 'Matched' };
        }
      }

      // 2. Auto-match matching logic
      const matchedLedger = bankJournalLines.find(gl => {
        const stDate = new Date(st.date);
        const glDate = new Date(gl.date);
        const diffDays = Math.abs(stDate - glDate) / (1000 * 60 * 60 * 24);
        const amountMatch = Math.abs(Math.abs(st.amount) - gl.amount) < 0.01;
        const directionMatch = (st.amount > 0 && gl.type === 'debit') || (st.amount < 0 && gl.type === 'credit');
        const isManuallyClaimed = manualMatches.some(m => m.ledgerRefNo === gl.refNo && m.statementRefNo !== st.refNo);

        return diffDays <= 3 && amountMatch && directionMatch && !isManuallyClaimed;
      });

      return {
        statement: st,
        ledger: matchedLedger || null,
        status: matchedLedger ? 'Matched' : 'Unmatched'
      };
    });

    setReconMatches(matches);
  };

  useEffect(() => {
    if (bankStatement.length > 0) {
      runReconciliation(bankStatement);
    } else {
      setReconMatches([]);
    }
  }, [reconAccount, journals, bankStatement, manualMatches]);

  // Post fees adjustment entries
  const handlePostAdjustment = async () => {
    if (!showAdjustment) return;
    const { amount, refNo, description, date } = showAdjustment;
    const amt = Math.abs(amount);

    const journalLines = amount > 0 
      ? [
          { accountId: reconAccount, type: 'debit', amount: amt },
          { accountId: adjAccount, type: 'credit', amount: amt }
        ]
      : [
          { accountId: adjAccount, type: 'debit', amount: amt },
          { accountId: reconAccount, type: 'credit', amount: amt }
        ];

    try {
      await accountingService.postJournalEntry({
        date: date || new Date().toISOString().substring(0, 10),
        refNo: `ADJ-${Date.now().toString().slice(-6)}`,
        narration: adjNarration || `Bank reconciliation adjustment: ${description}`,
        lines: journalLines,
        sourceModule: 'reconciliation',
        sourceRefId: refNo
      });

      alert('Adjustment posted successfully!');
      setShowAdjustment(null);
      setAdjNarration('');
      await reload();
    } catch (err) {
      alert('Error posting adjustment: ' + err.message);
    }
  };

  // Add COA with parent-child validations
  const handleAddAccount = async () => {
    if (!newAcc.code || !newAcc.name) return alert('Code and Name are required.');
    if (coa.find(a => a.code === newAcc.code)) return alert(`Account code ${newAcc.code} already exists.`);

    // Hierarchy rule check
    if (newAcc.parentCode) {
      const parent = coa.find(p => p.code === newAcc.parentCode);
      if (!parent) return alert('Invalid Parent Account.');
      if (parent.type !== newAcc.type) {
        return alert(`Hierarchy Mismatch: The parent account category (${parent.type}) must match child category (${newAcc.type}).`);
      }
    }

    const account = {
      id: `acc-${newAcc.code}`,
      code: newAcc.code,
      name: newAcc.name,
      type: newAcc.type,
      classification: newAcc.classification,
      balance: 0,
      isSystem: false,
      parentCode: newAcc.parentCode || null,
      status: 'Active',
      costCenterAllowed: newAcc.costCenterAllowed,
      departmentAllowed: newAcc.departmentAllowed,
      projectAllowed: newAcc.projectAllowed,
      reconciliationRequired: newAcc.reconciliationRequired
    };

    await accountingService.createChartOfAccount(account);
    await reload();
    setNewAcc({
      code: '',
      name: '',
      type: 'asset',
      classification: 'current_asset',
      parentCode: '',
      normalBalance: 'debit',
      costCenterAllowed: true,
      departmentAllowed: true,
      projectAllowed: true,
      reconciliationRequired: false
    });
    setShowAddCOA(false);
  };

  // Save edits with validations
  const handleSaveChangesAccount = async () => {
    if (!editingAccount) return;
    if (editingAccount.parentCode) {
      const parent = coa.find(p => p.code === editingAccount.parentCode);
      if (parent && parent.type !== editingAccount.type) {
        return alert('Hierarchy Mismatch: Parent account type must match child account type.');
      }
    }

    await accountingService.updateChartOfAccount(editingAccount);
    setEditingAccount(null);
    await reload();
  };

  // Manage period soft/hard closing
  const handleTogglePeriodLock = (periodStr, lockType) => {
    const settingsStr = localStorage.getItem('erp_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    if (!settings.fiscal) settings.fiscal = { lockedPeriods: [], softLockedPeriods: [] };

    let locked = [...(settings.fiscal.lockedPeriods || [])];
    let softLocked = [...(settings.fiscal.softLockedPeriods || [])];

    if (lockType === 'hard') {
      const isCurrentlyLocked = locked.includes(periodStr);
      if (isCurrentlyLocked) {
        locked = locked.filter(p => p !== periodStr);
      } else {
        // Enforce validations before closing
        const diff = tbData?.isBalanced === false;
        const unposted = vouchers.some(v => v.status === 'Submitted' && (v.date || '').substring(0, 7) === periodStr);
        const unreconciled = bankStatement.length > 0 && reconMatches.some(m => m.status === 'Unmatched');
        
        if (unposted || diff || unreconciled) {
          const proceed = confirm(`⚠️ Month-End Checklist Warnings:\n${diff ? '• Trial Balance contains discrepancies\n' : ''}${unposted ? '• There are unposted vouchers in the queue\n' : ''}${unreconciled ? '• Unreconciled bank statement entries exist\n' : ''}\nDo you still wish to Hard Close and lock this period?`);
          if (!proceed) return;
        }

        locked.push(periodStr);
        softLocked = softLocked.filter(p => p !== periodStr); // clear soft lock if hard locked
      }
    } else if (lockType === 'soft') {
      const isCurrentlySoft = softLocked.includes(periodStr);
      if (isCurrentlySoft) {
        softLocked = softLocked.filter(p => p !== periodStr);
      } else {
        softLocked.push(periodStr);
        locked = locked.filter(p => p !== periodStr); // clear hard lock if soft locked
      }
    } else {
      // Unlock all
      locked = locked.filter(p => p !== periodStr);
      softLocked = softLocked.filter(p => p !== periodStr);
    }

    settings.fiscal = {
      ...settings.fiscal,
      lockedPeriods: locked,
      softLockedPeriods: softLocked
    };
    localStorage.setItem('erp_settings', JSON.stringify(settings));
    setFiscalSettings(settings.fiscal);
    alert(`Period status updated successfully for ${periodStr}`);
  };

  const generateMockStatement = () => {
    const bankJournalLines = [];
    journals.forEach(j => {
      const targetLines = (j.lines || []).filter(l => l.accountId === reconAccount);
      targetLines.forEach(l => {
        bankJournalLines.push({
          date: j.date?.substring(0, 10),
          refNo: j.refNo,
          narration: j.narration,
          type: l.type,
          amount: Number(l.amount)
        });
      });
    });

    const mockRows = [];
    bankJournalLines.slice(0, 3).forEach(gl => {
      mockRows.push({
        date: gl.date,
        refNo: gl.refNo,
        description: `BANK TRANS: ${gl.narration}`,
        amount: gl.type === 'debit' ? gl.amount : -gl.amount
      });
    });

    if (mockRows.length < 3) {
      const today = new Date().toISOString().substring(0, 10);
      mockRows.push({ date: today, refNo: 'PV-8872', description: 'City Bank Transfer Ref 1008271', amount: -12500 });
      mockRows.push({ date: today, refNo: 'ERP-S-0004', description: 'bKash/Bank Transfer Customer Payment', amount: 8700 });
    }

    const today = new Date().toISOString().substring(0, 10);
    mockRows.push({ date: today, refNo: 'SC-9982', description: 'Monthly Maintenance Charge City/DBBL', amount: -450 });
    mockRows.push({ date: today, refNo: 'INT-8831', description: 'Quarterly Savings Interest Credit', amount: 150 });

    setBankStatement(mockRows);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        if (cols.length >= 4) {
          parsed.push({
            date: cols[0].trim(),
            refNo: cols[1].trim(),
            description: cols[2].trim(),
            amount: Number(cols[3].trim())
          });
        }
      }
      setBankStatement(parsed);
    };
    reader.readAsText(file);
  };

  // Exporters for logs and registers
  const handleExportJournalsCSV = (filteredJournals) => {
    const headers = ['Ref No', 'Date', 'Narration', 'Source Module', 'Account Code', 'Account Name', 'Type (DR/CR)', 'Amount', 'Cost Center', 'Department', 'Project'];
    const rows = [];
    filteredJournals.forEach(j => {
      j.lines?.forEach(l => {
        const acc = coa.find(a => a.id === l.accountId);
        rows.push([
          j.refNo || '',
          (j.date || '').substring(0, 10),
          j.narration || '',
          j.sourceModule || '',
          acc ? acc.code : l.accountId,
          acc ? acc.name : '',
          l.type === 'debit' ? 'DR' : 'CR',
          l.amount || 0,
          j.costCenter || 'CC-General',
          j.department || 'Finance',
          j.project || 'PRJ-General'
        ]);
      });
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `journal_entries_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trial Balance validate issues detector
  const trialBalanceIssues = useMemo(() => {
    const alerts = [];
    if (!tbData) return [];

    if (!tbData.isBalanced) {
      alerts.push({ type: 'danger', msg: `Trial Balance Out of Balance by ৳${Math.abs(tbData.totalDebit - tbData.totalCredit).toLocaleString('en-BD')}` });
    }

    const unpostedCount = vouchers.filter(v => v.status === 'Submitted').length;
    if (unpostedCount > 0) {
      alerts.push({ type: 'warning', msg: `Workflow Alert: ${unpostedCount} unposted vouchers are in the queue awaiting authorization.` });
    }

    const suspenseAcc = coa.find(a => a.id === 'acc-9999');
    if (suspenseAcc && Number(suspenseAcc.balance) !== 0) {
      alerts.push({ type: 'warning', msg: `Suspense balance outstanding: ৳${Number(suspenseAcc.balance).toLocaleString()} remains in the Suspense Account. Clear before closing.` });
    }

    const unreconciledCount = reconMatches.filter(m => m.status === 'Unmatched').length;
    if (unreconciledCount > 0) {
      alerts.push({ type: 'warning', msg: `Bank Variance: ${unreconciledCount} statement entries are unreconciled.` });
    }

    // High expense alert rule (expense account unusually high > 10L)
    const highExpenses = coa.filter(a => a.type === 'expense' && Number(a.balance) > 1000000);
    highExpenses.forEach(exp => {
      alerts.push({ type: 'info', msg: `Anomaly Warning: Expense head "${exp.name}" is unusually high at ৳${Number(exp.balance).toLocaleString()}` });
    });

    return alerts;
  }, [tbData, vouchers, coa, reconMatches]);

  return (
    <div style={{ padding: '0.5rem', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* ── Accounting Cockpit Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
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
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 70%)',
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#93c5fd' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="13" x2="15" y2="13"></line>
              <line x1="9" y1="17" x2="15" y2="17"></line>
              <line x1="9" y1="5" x2="9" y2="5.01"></line>
              <line x1="15" y1="5" x2="15" y2="5.01"></line>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>Accounting Cockpit</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500 }}>
              Double-Entry Ledgers, Bank Reconciliation, Trial Balances & Period Locks
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
              onChange={e => { setSimulatedRole(e.target.value); localStorage.setItem('erp_accounting_simulated_role', e.target.value); }}
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
              <option value="Agent" style={{ background: '#0f172a', color: '#fff' }}>Agent (Junior)</option>
              <option value="Manager" style={{ background: '#0f172a', color: '#fff' }}>Manager (Senior)</option>
              <option value="CFO" style={{ background: '#0f172a', color: '#fff' }}>CFO (Executive)</option>
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

          {/* Pending Vouchers Review Required Badge */}
          {vouchers.filter(v => v.status === 'Submitted').length > 0 && (
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
              ⏳ {vouchers.filter(v => v.status === 'Submitted').length} Review Required
            </div>
          )}

          {/* Tab Actions Toggles */}
          {tab === 'coa' && (
            <button
              onClick={() => setShowAddCOA(s => !s)}
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
                transition: 'transform 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              {showAddCOA ? '✕ Close Form' : '➕ Add Account Head'}
            </button>
          )}
        </div>
      </div>

      {/* ── 8 Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total General Accounts', val: coa.length, sub: `${coa.filter(a => a.status === 'Active').length} Active heads`, color: '#2563eb', icon: '📋' },
          { label: 'Base System Accounts', val: coa.filter(a => isSystemAccount(a)).length, sub: 'Strict protection locks', color: '#1e1b4b', icon: '🔒' },
          { label: 'Unposted Vouchers', val: vouchers.filter(v => v.status === 'Submitted').length, sub: 'Pending review queue', color: '#d97706', icon: '⏳' },
          { label: 'Ledger Audit trail logs', val: journals.length, sub: 'Posted GL entries', color: '#16a34a', icon: '📓' },
          { label: 'Trial Balance status', val: tbData?.isBalanced ? 'Balanced' : 'Mismatch', sub: tbData ? `Diff: ৳${Math.abs(tbData.totalDebit - tbData.totalCredit).toFixed(0)}` : 'Run validation', color: tbData?.isBalanced ? '#16a34a' : '#dc2626', icon: '⚖️' },
          { label: 'Uncleared Statements', val: reconMatches.filter(m => m.status === 'Unmatched').length, sub: bankStatement.length > 0 ? `${reconMatches.filter(m => m.status === 'Matched').length} matched` : 'DBBL/City bank', color: '#0891b2', icon: '🏦' },
          { label: 'Suspense Account balance', val: `৳${Number(coa.find(a => a.id === 'acc-9999')?.balance || 0).toLocaleString()}`, sub: 'Requires zero clear', color: '#e11d48', icon: '✂️' },
          { label: 'Period status lock', val: fiscalSettings.lockedPeriods.length > 0 ? 'Closed' : 'Open', sub: `${fiscalSettings.lockedPeriods.length} lock(s) active`, color: '#4b5563', icon: '🔑' }
        ].map((s, idx) => (
          <div key={idx}
            style={{
              background: `linear-gradient(135deg, ${s.color}12, ${s.color}05)`,
              border: `1px solid ${s.color}25`,
              borderRadius: 14,
              padding: '0.85rem 1rem',
              cursor: 'default',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${s.color}15`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color, marginTop: 6, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>



      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto', pb: '0.5rem' }}>
        {[
          { id: 'coa', label: '📋 Chart of Accounts' },
          { id: 'journals', label: '📓 Journal Register' },
          { id: 'ledger', label: '📖 General Ledger' },
          { id: 'trial', label: '⚖️ Trial Balance Validate' },
          { id: 'reconciliation', label: '🏦 Bank Reconciliation' },
          { id: 'closing', label: '🏁 Month-End Closing' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'trial') setTimeout(runTB, 50); }}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '12px 12px 0 0',
              border: 'none',
              background: tab === t.id ? 'var(--card-bg)' : 'transparent',
              color: tab === t.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              borderTop: tab === t.id ? '3px solid var(--accent-color)' : '3px solid transparent',
              borderLeft: tab === t.id ? '1px solid var(--border-color)' : 'none',
              borderRight: tab === t.id ? '1px solid var(--border-color)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB A: CHART OF ACCOUNTS (Interactive Tree Layout) ══ */}
      {tab === 'coa' && (
        <div>
          {/* ── COA Composition Share Bar ── */}
          {(() => {
            const typeBalances = TYPE_ORDER.map(type => ({
              type,
              total: Math.abs(coa.filter(a => a.type === type).reduce((s, a) => s + Number(a.balance || 0), 0)),
              count: coa.filter(a => a.type === type).length,
              color: TYPE_COLORS[type].color,
              bg: TYPE_COLORS[type].bg
            }));
            const grandTotal = typeBalances.reduce((s, t) => s + t.total, 0);
            return (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>📊 Ledger Composition Overview</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{coa.length} total accounts</span>
                </div>
                {/* Segmented bar */}
                <div style={{ display: 'flex', height: 12, borderRadius: 8, overflow: 'hidden', gap: 2, marginBottom: '0.85rem' }}>
                  {typeBalances.map(t => (
                    <div key={t.type} title={`${t.type}: ${grandTotal > 0 ? ((t.total / grandTotal) * 100).toFixed(1) : 0}%`}
                      style={{
                        flex: grandTotal > 0 ? t.total / grandTotal : 1 / 5,
                        background: t.color,
                        minWidth: 4,
                        transition: 'flex 0.4s ease'
                      }} />
                  ))}
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {typeBalances.map(t => (
                    <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{t.type}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({t.count})</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: t.color }}>{grandTotal > 0 ? ((t.total / grandTotal) * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Search Row */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input type="text" className="form-control" placeholder="🔍 Search COA tree by code, name, parent or classification..." value={coaSearch} onChange={e => setCoaSearch(e.target.value)} />
            </div>
            <button onClick={() => {
              const headers = ['Code', 'Account Name', 'Type', 'Classification', 'Parent Code', 'Balance', 'Status', 'System'];
              const rows = coa.map(a => [a.code, a.name, a.type, a.classification, a.parentCode || '—', a.balance || 0, a.status || 'Active', isSystemAccount(a) ? 'System' : 'Custom']);
              const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "chart_of_accounts.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} className="btn btn-secondary" style={{ margin: 0 }}>📥 Export COA CSV</button>
          </div>

          {/* Add account form drawer */}
          {showAddCOA && (
            <div id="add-coa-form" className="card animate-slide-down" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-color)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>➕ Add New Ledger Account</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label">Account Code</label>
                  <input className="form-control" placeholder="e.g. 1045" value={newAcc.code} onChange={e => setNewAcc(a => ({ ...a, code: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Account Name</label>
                  <input className="form-control" placeholder="e.g. Petty Cash Dhaka" value={newAcc.name} onChange={e => setNewAcc(a => ({ ...a, name: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Account Type</label>
                  <select className="form-control" value={newAcc.type} onChange={e => setNewAcc(a => ({ ...a, type: e.target.value, classification: e.target.value === 'asset' ? 'current_asset' : e.target.value === 'liability' ? 'current_liability' : e.target.value === 'revenue' ? 'revenue' : e.target.value === 'expense' ? 'operating_expense' : 'equity' }))}>
                    {TYPE_ORDER.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Classification Group</label>
                  <select className="form-control" value={newAcc.classification} onChange={e => setNewAcc(a => ({ ...a, classification: e.target.value }))}>
                    <option value="current_asset">Current Asset</option>
                    <option value="fixed_asset">Fixed Asset</option>
                    <option value="current_liability">Current Liability</option>
                    <option value="long_term_liability">Long-term Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="cost_of_sales">Cost of Goods Sold</option>
                    <option value="operating_expense">Operating Expense</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Parent Account Code</label>
                  <select className="form-control" value={newAcc.parentCode} onChange={e => {
                    const pCode = e.target.value;
                    const parent = coa.find(p => p.code === pCode);
                    setNewAcc(a => {
                      const updated = {
                        ...a,
                        parentCode: pCode,
                        code: getNextAccountCode(pCode, coa)
                      };
                      if (parent) {
                        updated.type = parent.type;
                        updated.classification = parent.classification;
                      }
                      return updated;
                    });
                  }}>
                    <option value="">None (Top-Level Category)</option>
                    {coa.filter(a => a.type === newAcc.type).map(a => (
                      <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                  <input type="checkbox" checked={newAcc.costCenterAllowed} onChange={e => setNewAcc(a => ({ ...a, costCenterAllowed: e.target.checked }))} />
                  Allow Cost Center tracking
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                  <input type="checkbox" checked={newAcc.departmentAllowed} onChange={e => setNewAcc(a => ({ ...a, departmentAllowed: e.target.checked }))} />
                  Allow Department logging
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                  <input type="checkbox" checked={newAcc.projectAllowed} onChange={e => setNewAcc(a => ({ ...a, projectAllowed: e.target.checked }))} />
                  Allow Project dimensions
                </label>
              </div>

              <button onClick={handleAddAccount} className="btn btn-primary btn-sm">✅ Register Account</button>
            </div>
          )}

          {/* Hierarchical tree layout lists */}
          {TYPE_ORDER.map(type => {
            const list = buildCOATree[type] || [];
            if (list.length === 0) return null;
            const style = TYPE_COLORS[type];
            const isExpanded = expandedNodes.has(type);

            return (
              <div key={type} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
                {/* Header for group */}
                <div onClick={() => toggleNode(type)} style={{
                  padding: '0.85rem 1.25rem',
                  background: style.bg,
                  borderBottom: `2px solid ${style.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: style.color,
                  fontSize: 'var(--font-size-sm)'
                }}>
                  <span>{isExpanded ? '▼' : '▶'}</span>
                  <span style={{ marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{type} ACCOUNTS</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                    {list.length} items | Balance: {fmt(list.reduce((sum, item) => sum + (item.parentCode ? 0 : item.balance || 0), 0))}
                  </span>
                </div>

                {isExpanded && (
                  <div className="table-container" style={{ marginBottom: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr style={{ textAlign: 'left', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ paddingLeft: '1.5rem' }}>Account Code & Name</th>
                          <th>Classification</th>
                          <th>Dimensions Allowed</th>
                          <th style={{ textAlign: 'right' }}>Current Balance</th>
                          <th>Type</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map(acc => {
                          const depth = getAccountDepth(acc.code);
                          const isParent = isParentNode(acc.code);
                          const isAccExpanded = expandedNodes.has(acc.code);

                          return (
                            <tr key={acc.id} style={{
                              background: depth === 0 ? 'var(--bg-secondary)' : 'transparent',
                              opacity: acc.status === 'Disabled' ? 0.6 : 1
                            }}>
                              <td style={{
                                paddingLeft: `${1.5 + depth * 1.5}rem`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                border: 'none'
                              }}>
                                {isParent ? (
                                  <button onClick={() => toggleNode(acc.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-xs)', padding: 0 }}>
                                    {isAccExpanded ? '▼' : '▶'}
                                  </button>
                                ) : (
                                  <span style={{ width: 12, display: 'inline-block' }} />
                                )}
                                <code style={{
                                  fontSize: 'var(--font-size-sm)',
                                  background: style.bg,
                                  color: style.color,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontWeight: 600
                                }}>{acc.code}</code>
                                <span style={{ fontWeight: depth === 0 ? 600 : 500, color: 'var(--text-primary)' }}>{acc.name}</span>
                              </td>
                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  background: style.bg,
                                  color: style.color,
                                  padding: '2px 8px',
                                  borderRadius: 9999,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em'
                                }}>
                                  {(acc.classification || '').replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {acc.costCenterAllowed && <span style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>CC</span>}
                                  {acc.departmentAllowed && <span style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>Dept</span>}
                                  {acc.projectAllowed && <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>Proj</span>}
                                </div>
                              </td>
                              <td style={{
                                textAlign: 'right',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: Number(acc.balance) !== 0 ? style.color : 'var(--text-muted)',
                                fontSize: '0.82rem'
                              }}>
                                {fmt(acc.balance || 0)}
                              </td>
                              <td>
                                {isSystemAccount(acc) ? (
                                  <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(37,99,235,0.08)', color: '#2563eb', padding: '2px 7px', borderRadius: 6 }}>🔒 SYSTEM</span>
                                ) : (
                                  <span style={{ fontSize: '0.62rem', fontWeight: 600, background: 'rgba(100,116,139,0.08)', color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 6 }}>CUSTOM</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => {
                                      setNewAcc({
                                        code: getNextAccountCode(acc.code, coa),
                                        name: '',
                                        type: acc.type || 'asset',
                                        classification: acc.classification || 'current_asset',
                                        parentCode: acc.code || '',
                                        normalBalance: acc.normalBalance || 'debit',
                                        costCenterAllowed: acc.costCenterAllowed !== undefined ? acc.costCenterAllowed : true,
                                        departmentAllowed: acc.departmentAllowed !== undefined ? acc.departmentAllowed : true,
                                        projectAllowed: acc.projectAllowed !== undefined ? acc.projectAllowed : true,
                                        reconciliationRequired: acc.reconciliationRequired !== undefined ? acc.reconciliationRequired : false
                                      });
                                      setShowAddCOA(true);
                                      setTimeout(() => {
                                        const formEl = document.getElementById('add-coa-form');
                                        if (formEl) {
                                          formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        } else {
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                      }, 100);
                                    }}
                                    style={{
                                      background: 'rgba(16,185,129,0.1)',
                                      border: '1px solid rgba(16,185,129,0.2)',
                                      color: '#10b981',
                                      borderRadius: 6,
                                      padding: '3px 8px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                    title="Add sub-account / service head under this account"
                                  >
                                    ➕ Service Head
                                  </button>
                                  <button onClick={() => setEditingAccount(acc)}
                                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', borderRadius: 6, padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                                    ✏️ Edit
                                  </button>
                                  {!isSystemAccount(acc) && (
                                    <button onClick={async () => {
                                      if (!confirm(`Delete "${acc.name}"? This cannot be undone.`)) return;
                                      await accountingService.deleteChartOfAccount(acc.id);
                                      await reload();
                                    }}
                                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 6, padding: '3px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ TAB B: JOURNAL REGISTER ══ */}
      {tab === 'journals' && (() => {
        const filteredJournals = journals.filter(j => {
          const q = journalSearch.toLowerCase().trim();
          const matchesSearch = !q ||
            (j.refNo || '').toLowerCase().includes(q) ||
            (j.narration || '').toLowerCase().includes(q) ||
            (j.lines || []).some(l => {
              const acc = coa.find(a => a.id === l.accountId);
              return l.accountId.toLowerCase().includes(q) || 
                (acc && (acc.name || '').toLowerCase().includes(q)) || 
                (acc && (acc.code || '').toLowerCase().includes(q));
            });

          const jDate = (j.date || '').substring(0, 10);
          const matchesFrom = !journalFrom || jDate >= journalFrom;
          const matchesTo = !journalTo || jDate <= journalTo;
          const matchesModule = journalModule === 'all' || 
            (j.sourceModule || '').toLowerCase() === journalModule.toLowerCase() ||
            (j.sourceModule === 'voucher' && journalModule === 'vouchers');

          return matchesSearch && matchesFrom && matchesTo && matchesModule;
        });

        return (
          <div>
            {/* Filter controls */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <input type="text" className="form-control" placeholder="Ref No, narration, account..." value={journalSearch} onChange={e => setJournalSearch(e.target.value)} />
                </div>
                <div>
                  <input type="date" className="form-control" value={journalFrom} onChange={e => setJournalFrom(e.target.value)} title="From Date" />
                </div>
                <div>
                  <input type="date" className="form-control" value={journalTo} onChange={e => setJournalTo(e.target.value)} title="To Date" />
                </div>
                <div>
                  <select className="form-control" value={journalModule} onChange={e => setJournalModule(e.target.value)}>
                    <option value="all">All Modules</option>
                    <option value="sales">Sales Ledger</option>
                    <option value="purchases">Purchases Ledger</option>
                    <option value="vouchers">Vouchers module</option>
                    <option value="reconciliation">Reconciled adjustments</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                Showing <strong>{filteredJournals.length}</strong> journal postings
              </span>
              <button onClick={() => handleExportJournalsCSV(filteredJournals)} className="btn btn-secondary btn-sm">📥 Export Journals CSV</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
              {filteredJournals.map(j => (
                <div key={j.id} className="card hover-glow" onClick={() => setSelectedJournal(j)} style={{ padding: '1rem', cursor: 'pointer', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-color)', marginRight: '0.5rem' }}>{j.refNo}</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{j.narration}</span>
                    </div>
                    <div style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-xs)', padding: '0.2rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 6, color: 'var(--text-muted)' }}>
                      {j.sourceModule}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {j.lines?.map((line, li) => {
                      const acc = coa.find(a => a.id === line.accountId);
                      return (
                        <div key={li} style={{ display: 'grid', gridTemplateColumns: '2rem 2fr 1fr 1fr', gap: '0.5rem', fontSize: 'var(--font-size-sm)', paddingLeft: line.type === 'credit' ? '1.5rem' : 0 }}>
                          <span style={{ color: line.type === 'debit' ? '#2563eb' : '#7c3aed', fontWeight: 600 }}>{line.type === 'debit' ? 'DR' : 'CR'}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{acc ? `${acc.code} — ${acc.name}` : line.accountId}</span>
                          <span style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{line.type === 'debit' ? fmt(line.amount) : ''}</span>
                          <span style={{ textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600 }}>{line.type === 'credit' ? fmt(line.amount) : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══ TAB C: GENERAL LEDGER ══ */}
      {tab === 'ledger' && (
        <div>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label">Select Account</label>
                <select className="form-control" value={glAccount} onChange={e => setGlAccount(e.target.value)}>
                  {TYPE_ORDER.map(type => (
                    <optgroup key={type} label={type.toUpperCase()}>
                      {coa.filter(a => a.type === type).map(a => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">From Date</label>
                <input type="date" className="form-control" value={glFrom} onChange={e => setGlFrom(e.target.value)} />
              </div>

              <div>
                <label className="form-label">To Date</label>
                <input type="date" className="form-control" value={glTo} onChange={e => setGlTo(e.target.value)} />
              </div>

              {/* Dimensions filters */}
              <div>
                <label className="form-label">Cost Center</label>
                <select className="form-control" value={glDimensionFilter.costCenter} onChange={e => setGlDimensionFilter(prev => ({ ...prev, costCenter: e.target.value }))}>
                  <option value="all">All Cost Centers</option>
                  {DEFAULT_DIMENSIONS.costCenters.map(cc => <option key={cc} value={cc}>{cc}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">Department</label>
                <select className="form-control" value={glDimensionFilter.department} onChange={e => setGlDimensionFilter(prev => ({ ...prev, department: e.target.value }))}>
                  <option value="all">All Departments</option>
                  {DEFAULT_DIMENSIONS.departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">Project Dimension</label>
                <select className="form-control" value={glDimensionFilter.project} onChange={e => setGlDimensionFilter(prev => ({ ...prev, project: e.target.value }))}>
                  <option value="all">All Projects</option>
                  {DEFAULT_DIMENSIONS.projects.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button onClick={runGL} className="btn btn-primary" style={{ margin: 0 }}>Run GL Ledger</button>
                {glData && (
                  <button onClick={downloadGLPDF} className="btn btn-secondary" style={{ margin: 0 }}>📄 PDF</button>
                )}
              </div>
            </div>
          </div>

          {glData && (
            <>
              {/* Balances panel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '3px solid #2563eb' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Period Opening Balance</div>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(glData.openingBalance)}</div>
                </div>
                <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Transactions Count</div>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{glData.lines.length} lines</div>
                </div>
                <div className="card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '3px solid #16a34a' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Closing Balance</div>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: '#16a34a' }}>{fmt(glData.closingBalance)}</div>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref No</th>
                      <th>Narration / Remarks</th>
                      <th>Cost Center</th>
                      <th style={{ textAlign: 'right' }}>Debit (DR)</th>
                      <th style={{ textAlign: 'right' }}>Credit (CR)</th>
                      <th style={{ textAlign: 'right' }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'var(--bg-tertiary)', fontStyle: 'italic' }}>
                      <td colSpan={6} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', paddingLeft: '1rem' }}>Opening Balance</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, paddingRight: '1rem' }}>{fmt(glData.openingBalance)}</td>
                    </tr>

                    {glData.lines.map((line, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>{line.date}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontWeight: 600 }}>{line.refNo}</td>
                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{line.narration}</td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{line.costCenter || '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2563eb', fontWeight: line.debit > 0 ? 800 : 400 }}>
                          {line.debit > 0 ? fmt(line.debit) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: line.credit > 0 ? 800 : 400 }}>
                          {line.credit > 0 ? fmt(line.credit) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: line.balance >= 0 ? '#16a34a' : '#dc2626' }}>
                          {fmt(Math.abs(line.balance))} {line.balance < 0 ? 'Cr' : 'Dr'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ TAB D: TRIAL BALANCE VALIDATE ══ */}
      {tab === 'trial' && (
        <div>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'var(--card-bg)', borderRadius: 16 }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label">Evaluate As Of Date</label>
                <input type="date" className="form-control" value={tbDate} onChange={e => setTbDate(e.target.value)} />
              </div>
              <button onClick={runTB} className="btn btn-primary" style={{ margin: 0 }}>▶ Validate Ledgers</button>
              {tbData && (
                <button onClick={downloadTBPDF} className="btn btn-secondary" style={{ margin: 0 }}>📄 Export Trial Balance PDF</button>
              )}
            </div>
          </div>

          {/* Real-time Validation Exception Alerts Panel */}
          {tbData && trialBalanceIssues.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {trialBalanceIssues.map((issue, idx) => (
                <div key={idx} style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: 12,
                  background: issue.type === 'danger' ? 'rgba(220,38,38,0.06)' : issue.type === 'warning' ? 'rgba(217,119,6,0.06)' : 'rgba(37,99,235,0.05)',
                  border: `1px solid ${issue.type === 'danger' ? 'rgba(220,38,38,0.2)' : issue.type === 'warning' ? 'rgba(217,119,6,0.2)' : 'rgba(37,99,235,0.18)'}`,
                  color: issue.type === 'danger' ? '#b91c1c' : issue.type === 'warning' ? '#b45309' : '#1d4ed8',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600
                }}>
                  {issue.msg}
                </div>
              ))}
            </div>
          )}

          {tbData && (
            <>
              {/* ── Premium Double-Entry Balance Status Badge ── */}
              <div style={{
                borderRadius: 16,
                padding: '1.5rem 2rem',
                marginBottom: '1.25rem',
                background: tbData.isBalanced
                  ? 'linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(22,163,74,0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(220,38,38,0.03) 100%)',
                border: `2px solid ${tbData.isBalanced ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: tbData.isBalanced ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', flexShrink: 0
                }}>
                  {tbData.isBalanced ? '✅' : '🛑'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: tbData.isBalanced ? '#15803d' : '#b91c1c', letterSpacing: '-0.02em' }}>
                    {tbData.isBalanced ? 'Ledgers Balanced — Dr = Cr' : 'Trial Balance Mismatch Detected'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {tbData.isBalanced
                      ? 'All double-entry posting rules verified. No discrepancies found in this ledger period.'
                      : `Debit/Credit difference of ৳${Math.abs(tbData.totalDebit - tbData.totalCredit).toLocaleString('en-BD', { minimumFractionDigits: 2 })} — review unposted vouchers and suspense entries.`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Debits (DR)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2563eb', fontFamily: 'monospace' }}>{fmt(tbData.totalDebit)}</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--border-color)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Credits (CR)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace' }}>{fmt(tbData.totalCredit)}</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--border-color)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: tbData.isBalanced ? '#15803d' : '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Difference</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: tbData.isBalanced ? '#15803d' : '#b91c1c', fontFamily: 'monospace' }}>
                      {tbData.isBalanced ? '৳0.00' : fmt(Math.abs(tbData.totalDebit - tbData.totalCredit))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account Code</th>
                      <th>Account Head Name</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Debit balance (DR)</th>
                      <th style={{ textAlign: 'right' }}>Credit balance (CR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TYPE_ORDER.map(type => {
                      const rows = tbData.rows.filter(r => r.type === type);
                      if (rows.length === 0) return null;
                      const style = TYPE_COLORS[type];

                      return [
                        <tr key={`head-${type}`} style={{ background: style.bg }}>
                          <td colSpan={5} style={{ fontWeight: 600, textTransform: 'uppercase', color: style.color, fontSize: 'var(--font-size-xs)', paddingLeft: '1rem' }}>{type} Accounts</td>
                        </tr>,
                        ...rows.map(r => (
                          <tr key={r.id}>
                            <td><code>{r.code}</code></td>
                            <td style={{ fontWeight: 600 }}>{r.name}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>{(r.classification || '').replace(/_/g, ' ')}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2563eb', fontWeight: r.debit > 0 ? 800 : 400 }}>
                              {r.debit > 0 ? fmt(r.debit) : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: r.credit > 0 ? 800 : 400 }}>
                              {r.credit > 0 ? fmt(r.credit) : '—'}
                            </td>
                          </tr>
                        ))
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ TAB E: BANK RECONCILIATION MATCHER ══ */}
      {tab === 'reconciliation' && (() => {
        const bankJournalLines = [];
        journals.forEach(j => {
          const targetLines = (j.lines || []).filter(l => l.accountId === reconAccount);
          targetLines.forEach(l => {
            bankJournalLines.push({
              date: j.date?.substring(0, 10),
              refNo: j.refNo,
              narration: j.narration,
              type: l.type,
              amount: Number(l.amount)
            });
          });
        });

        const glBankBalance = coa.find(a => a.id === reconAccount)?.balance || 0;
        const targetEnding = Number(statementEndingBalance) || 0;

        const matchedLedgerKeys = reconMatches
          .filter(m => m.ledger)
          .map(m => `${m.ledger.refNo}-${m.ledger.type}-${m.ledger.amount}`);

        const unmatchedLedger = bankJournalLines.filter(gl => 
          !matchedLedgerKeys.includes(`${gl.refNo}-${gl.type}-${gl.amount}`)
        );

        const depositsInTransit = unmatchedLedger.filter(gl => gl.type === 'debit').reduce((s, gl) => s + gl.amount, 0);
        const outstandingChecks = unmatchedLedger.filter(gl => gl.type === 'credit').reduce((s, gl) => s + gl.amount, 0);

        const adjustedBankBalance = targetEnding + depositsInTransit - outstandingChecks;
        const difference = glBankBalance - adjustedBankBalance;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* ── Reconciliation KPI Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'GL Ledger Balance', val: fmt(glBankBalance), color: '#2563eb', icon: '📒' },
                { label: 'Statement Ending Bal', val: fmt(targetEnding), color: '#7c3aed', icon: '🏦' },
                { label: 'Deposits in Transit', val: `+${fmt(depositsInTransit)}`, color: '#16a34a', icon: '⬆️' },
                { label: 'Outstanding Cheques', val: `-${fmt(outstandingChecks)}`, color: '#dc2626', icon: '⬇️' },
                { label: 'Unreconciled Diff', val: fmt(Math.abs(difference)), color: Math.abs(difference) < 0.02 ? '#16a34a' : '#dc2626', icon: Math.abs(difference) < 0.02 ? '✅' : '❌' }
              ].map((k, i) => (
                <div key={i} style={{ background: `linear-gradient(135deg, ${k.color}10, ${k.color}04)`, border: `1px solid ${k.color}25`, borderRadius: 14, padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: '1rem' }}>{k.icon}</span>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: k.color, fontFamily: 'monospace' }}>{k.val}</div>
                </div>
              ))}
            </div>

            {/* ── Bank Account & Statement Upload Controls ── */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', fontWeight: 700 }}>🏦 Bank Statement Parser</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label className="form-label">Bank Account</label>
                  <select className="form-control" value={reconAccount} onChange={e => setReconAccount(e.target.value)}>
                    {coa.filter(a => a.classification === 'current_asset' && a.name.toLowerCase().includes('bank')).map(a => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Statement Ending Balance</label>
                  <input type="number" className="form-control" placeholder="e.g. 50000" value={statementEndingBalance} onChange={e => setStatementEndingBalance(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={generateMockStatement} className="btn btn-secondary" style={{ margin: 0 }}>Generate Mock</button>
                  <div style={{ position: 'relative' }}>
                    <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                    <button className="btn btn-primary" style={{ margin: 0 }}>📤 Upload CSV</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Side-by-Side Matching Engine ── */}
            {bankStatement.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'start' }}>
                {/* Left: Bank Statement */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '0.85rem 1.25rem', background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02))', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🏦</span>
                    <strong style={{ fontSize: '0.82rem', fontWeight: 700 }}>Bank Statement</strong>
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 9999, fontWeight: 700 }}>
                      {bankStatement.length} entries
                    </span>
                  </div>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {bankStatement.map((row, i) => {
                      const isMatched = reconMatches.some(m => m.statement.refNo === row.refNo && m.status === 'Matched');
                      const isSelected = matchingStatementRow?.refNo === row.refNo;
                      return (
                        <div key={i}
                          onClick={() => !isMatched && setMatchingStatementRow(isSelected ? null : row)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: isMatched ? 'default' : 'pointer',
                            background: isMatched ? 'rgba(22,163,74,0.05)' : isSelected ? 'rgba(124,58,237,0.08)' : 'transparent',
                            borderLeft: `3px solid ${isMatched ? '#16a34a' : isSelected ? '#7c3aed' : 'transparent'}`,
                            transition: 'background 0.15s'
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.description}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{row.date} · {row.refNo}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', color: row.amount >= 0 ? '#16a34a' : '#dc2626' }}>
                                {row.amount >= 0 ? '+' : ''}{fmtN(row.amount)}
                              </div>
                              {isMatched && <span style={{ fontSize: '0.6rem', color: '#16a34a', fontWeight: 700 }}>✓ Matched</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Center: Match Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', paddingTop: '3rem' }}>
                  <div style={{ width: 2, height: 40, background: 'var(--border-color)' }} />
                  <button
                    disabled={!matchingStatementRow}
                    style={{
                      background: matchingStatementRow ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--bg-secondary)',
                      color: matchingStatementRow ? '#fff' : 'var(--text-muted)',
                      border: 'none', borderRadius: 9999, padding: '10px 14px',
                      fontSize: '0.75rem', fontWeight: 700, cursor: matchingStatementRow ? 'pointer' : 'default',
                      boxShadow: matchingStatementRow ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                      transition: 'all 0.2s', whiteSpace: 'nowrap'
                    }}
                    onClick={() => {
                      if (!matchingStatementRow) return;
                      const newMatch = { statement: matchingStatementRow, ledger: null, status: 'Unmatched' };
                      const exists = reconMatches.find(m => m.statement.refNo === matchingStatementRow.refNo);
                      if (!exists) {
                        const updated = [...reconMatches, newMatch];
                        setReconMatches(updated);
                      }
                      setMatchingStatementRow(null);
                    }}
                  >
                    🔗 Add to<br/>Matcher
                  </button>
                  <div style={{ width: 2, height: 40, background: 'var(--border-color)' }} />
                </div>

                {/* Right: ERP Cash Book */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '0.85rem 1.25rem', background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02))', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📒</span>
                    <strong style={{ fontSize: '0.82rem', fontWeight: 700 }}>ERP Cash Book</strong>
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 9999, fontWeight: 700 }}>
                      {bankJournalLines.length} lines
                    </span>
                  </div>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {bankJournalLines.map((gl, i) => {
                      const isMatched = reconMatches.some(m => m.ledger?.refNo === gl.refNo && m.status === 'Matched');
                      return (
                        <div key={i} style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid var(--border-color)',
                          background: isMatched ? 'rgba(22,163,74,0.05)' : 'transparent',
                          borderLeft: `3px solid ${isMatched ? '#16a34a' : 'transparent'}`,
                          cursor: matchingStatementRow && !isMatched ? 'pointer' : 'default',
                          transition: 'background 0.15s'
                        }}
                          onClick={() => {
                            if (!matchingStatementRow || isMatched) return;
                            const updated = reconMatches.map(m =>
                              m.statement.refNo === matchingStatementRow.refNo
                                ? { ...m, ledger: gl, status: 'Matched' }
                                : m
                            );
                            setReconMatches(updated);
                            const newManual = [...manualMatches, { statementRefNo: matchingStatementRow.refNo, ledgerRefNo: gl.refNo }];
                            saveManualMatches(newManual);
                            setMatchingStatementRow(null);
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{gl.narration}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{gl.date} · {gl.refNo}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', color: gl.type === 'debit' ? '#16a34a' : '#dc2626' }}>
                                {gl.type === 'debit' ? '+' : '-'}{fmtN(gl.amount)}
                              </div>
                              {isMatched && <span style={{ fontSize: '0.6rem', color: '#16a34a', fontWeight: 700 }}>✓ Matched</span>}
                              {matchingStatementRow && !isMatched && <span style={{ fontSize: '0.6rem', color: '#2563eb', fontWeight: 700 }}>Click to match →</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Matched Results Table ── */}
            {reconMatches.length > 0 && (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '0.85rem 1.25rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: '0.85rem', fontWeight: 700 }}>🔗 Reconciliation Match Results</strong>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>
                    {reconMatches.filter(m => m.status === 'Matched').length}/{reconMatches.length} matched
                  </span>
                </div>
                <table className="data-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                      <th colSpan={3} style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Bank Statement Item</th>
                      <th colSpan={3} style={{ textAlign: 'center' }}>ERP Ledger Match</th>
                      <th>Status</th>
                    </tr>
                    <tr>
                      <th>Date</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Ref No</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconMatches.map((m, idx) => (
                      <tr key={idx}>
                        <td>{window.formatDate(m.statement.date)}</td>
                        <td>{m.statement.description}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: m.statement.amount > 0 ? '#16a34a' : '#dc2626' }}>
                          {m.statement.amount > 0 ? `+${fmtN(m.statement.amount)}` : fmtN(m.statement.amount)}
                        </td>
                        {m.ledger ? (
                          <>
                            <td style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontWeight: 700 }}>{m.ledger.refNo}</td>
                            <td>{window.formatDate(m.ledger.date)}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: m.ledger.type === 'debit' ? '#16a34a' : '#dc2626' }}>
                              {m.ledger.type === 'debit' ? `+${fmtN(m.ledger.amount)}` : `-${fmtN(m.ledger.amount)}`}
                            </td>
                          </>
                        ) : (
                          <td colSpan={3} style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            — Click ERP Cash Book entry to match —
                          </td>
                        )}
                        <td>
                          {m.status === 'Matched' ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 9999, background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontWeight: 700 }}>✓ MATCHED</span>
                              <button onClick={() => { setReconMatches(reconMatches.filter((_, i2) => i2 !== idx)); saveManualMatches(manualMatches.filter(mm => mm.statementRefNo !== m.statement.refNo)); }}
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 6, padding: '2px 7px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>
                                ✕ Undo
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', color: '#d97706', fontWeight: 700 }}>⚠ PENDING</span>
                              <button onClick={() => { setShowAdjustment(m.statement); setAdjNarration(`Recon adj: ${m.statement.description}`); }}
                                style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', borderRadius: 6, padding: '2px 7px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>
                                ⚡ Adjust
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ TAB F: MONTH-END PERIOD CLOSING ══ */}
      {tab === 'closing' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
          
          {/* ── Fiscal Period Lock Calendar Grid ── */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>🗓️ Fiscal Year {selectedLockYear} — Period Lock Board</h3>
              {simulatedRole !== 'CFO' && (
                <span style={{ fontSize: '0.65rem', color: '#d97706', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', padding: '3px 10px', borderRadius: 9999, fontWeight: 700 }}>
                  CFO access required to lock periods
                </span>
              )}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              {[['🟢 Open', '#16a34a', 'rgba(22,163,74,0.08)'], ['🟡 Soft Lock', '#d97706', 'rgba(217,119,6,0.08)'], ['🔴 Hard Lock', '#dc2626', 'rgba(239,68,68,0.08)']].map(([label, color]) => (
                <span key={label} style={{ fontSize: '0.65rem', fontWeight: 700, color }}>{label}</span>
              ))}
            </div>
            {/* 3x4 Month Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              {[
                ['January', '01'], ['February', '02'], ['March', '03'],
                ['April', '04'], ['May', '05'], ['June', '06'],
                ['July', '07'], ['August', '08'], ['September', '09'],
                ['October', '10'], ['November', '11'], ['December', '12']
              ].map(([monthName, monthNum]) => {
                const period = `${selectedLockYear}-${monthNum}`;
                const isHard = fiscalSettings.lockedPeriods.includes(period);
                const isSoft = fiscalSettings.softLockedPeriods.includes(period);
                const color = isHard ? '#dc2626' : isSoft ? '#d97706' : '#16a34a';
                const bg = isHard ? 'rgba(239,68,68,0.06)' : isSoft ? 'rgba(217,119,6,0.06)' : 'transparent';
                const borderColor = isHard ? 'rgba(239,68,68,0.3)' : isSoft ? 'rgba(217,119,6,0.3)' : 'var(--border-color)';
                const icon = isHard ? '🔒' : isSoft ? '⚠️' : '🔓';
                const label = isHard ? 'Locked' : isSoft ? 'Soft' : 'Open';

                return (
                  <div key={period} style={{
                    borderRadius: 12,
                    background: bg,
                    border: `1.5px solid ${borderColor}`,
                    padding: '0.7rem 0.85rem',
                    transition: 'transform 0.15s, box-shadow 0.15s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>{monthName}</div>
                      <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    {simulatedRole === 'CFO' ? (
                      <div style={{ display: 'flex', gap: 3 }}>
                        {isHard || isSoft ? (
                          <button onClick={() => handleTogglePeriodLock(period, 'unlock')}
                            style={{ flex: 1, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', color: '#16a34a', borderRadius: 6, padding: '3px 0', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer' }}>
                            🔓 Open
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleTogglePeriodLock(period, 'soft')}
                              style={{ flex: 1, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', color: '#d97706', borderRadius: 6, padding: '3px 0', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer' }}>
                              ⚠ Soft
                            </button>
                            <button onClick={() => handleTogglePeriodLock(period, 'hard')}
                              style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', borderRadius: 6, padding: '3px 0', fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer' }}>
                              🔒 Lock
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>CFO only</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month end closing checklist verification board */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>🏁 Month-End Closing Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 'var(--font-size-lg)' }}>{vouchers.filter(v => v.status === 'Submitted').length === 0 ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Check A: Voucher Posting Gate</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    All vouchers must be posted or resolved. Current unposted count: <strong>{vouchers.filter(v => v.status === 'Submitted').length} pending</strong>.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 'var(--font-size-lg)' }}>{tbData?.isBalanced ? '✅' : '❌'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Check B: Trial Balance Engine Verify</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Debits must match Credits exactly in the cache. Current mismatch: <strong>{tbData?.isBalanced ? '৳0.00' : 'Ledgers out of balance'}</strong>.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 'var(--font-size-lg)' }}>{Number(coa.find(a => a.id === 'acc-9999')?.balance || 0) === 0 ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Check C: Suspense Account Clearing</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    The Suspense Account (acc-9999) must be fully cleared. Current outstanding balance: <strong>৳{Number(coa.find(a => a.id === 'acc-9999')?.balance || 0).toLocaleString()}</strong>.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: 'var(--font-size-lg)' }}>{reconMatches.filter(m => m.status === 'Unmatched').length === 0 ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Check D: Bank Statements Reconciliation</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    All imported statement lines must be reconciled. Unmatched statement entries: <strong>{reconMatches.filter(m => m.status === 'Unmatched').length} unreconciled</strong>.
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── TRANSACTION DETAIL DRILL-DOWN MODAL ── */}
      {selectedJournal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                📖 Transaction Entry Details — {selectedJournal.refNo}
              </h3>
              <button onClick={() => setSelectedJournal(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-form-content">

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: 'var(--font-size-sm)' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Posting Date:</div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{window.formatDate(selectedJournal.date)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Source Ledger:</div>
                <div style={{ fontWeight: 600, marginTop: 2, textTransform: 'uppercase', color: 'var(--accent-color)' }}>{selectedJournal.sourceModule || 'VOUCHERS'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Entry Remarks:</div>
                <div style={{ fontWeight: 600, marginTop: 2, color: 'var(--text-secondary)' }}>{selectedJournal.narration}</div>
              </div>
            </div>

            {/* Split rows */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.5rem', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <span>Account Name</span>
                <span style={{ textAlign: 'right' }}>Debit (DR)</span>
                <span style={{ textAlign: 'right' }}>Credit (CR)</span>
              </div>
              {selectedJournal.lines?.map((line, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.5rem', fontSize: 'var(--font-size-sm)', padding: '0.25rem 0' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: line.type === 'credit' ? '1rem' : 0 }}>
                    {coa.find(a => a.id === line.accountId)?.name || line.accountId}
                  </span>
                  <span style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                    {line.type === 'debit' ? fmt(line.amount) : '—'}
                  </span>
                  <span style={{ textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600 }}>
                    {line.type === 'credit' ? fmt(line.amount) : '—'}
                  </span>
                </div>
              ))}
            </div>

            <div className="form-actions" style={{ marginTop: '0.5rem' }}>
              <button onClick={() => setSelectedJournal(null)} className="btn btn-secondary">Close</button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT CHART OF ACCOUNT MODAL ── */}
      {editingAccount && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                ✏️ Edit Ledger Account: {editingAccount.code}
              </h3>
              <button onClick={() => setEditingAccount(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-form-content">

            {/* Protections alert if system account */}
            {isSystemAccount(editingAccount) && (
              <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: '0.72rem', fontWeight: 600, marginBottom: '1rem' }}>
                🔒 Protected System Account: Account code and parent category mapping cannot be modified to protect transaction histories.
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Account Code</label>
              <input className="form-control" value={editingAccount.code} onChange={e => setEditingAccount({ ...editingAccount, code: e.target.value })} disabled={isSystemAccount(editingAccount)} />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Account Name</label>
              <input className="form-control" value={editingAccount.name} onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })} />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Classification Group</label>
              <select className="form-control" value={editingAccount.classification} onChange={e => setEditingAccount({ ...editingAccount, classification: e.target.value })} disabled={isSystemAccount(editingAccount)}>
                <option value="current_asset">Current Asset</option>
                <option value="fixed_asset">Fixed Asset</option>
                <option value="current_liability">Current Liability</option>
                <option value="long_term_liability">Long-term Liability</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="cost_of_sales">Cost of Goods Sold</option>
                <option value="operating_expense">Operating Expense</option>
              </select>
            </div>

            {!isSystemAccount(editingAccount) && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Parent Account</label>
                <select className="form-control" value={editingAccount.parentCode || ''} onChange={e => setEditingAccount({ ...editingAccount, parentCode: e.target.value || null })}>
                  <option value="">None (Top Level)</option>
                  {coa.filter(a => a.type === editingAccount.type && a.id !== editingAccount.id).map(a => (
                    <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Account Status</label>
              <select className="form-control" value={editingAccount.status || 'Active'} onChange={e => setEditingAccount({ ...editingAccount, status: e.target.value })} disabled={isSystemAccount(editingAccount)}>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled (Block Postings)</option>
              </select>
            </div>

            <div className="form-actions" style={{ marginTop: '0.5rem' }}>
              {!isSystemAccount(editingAccount) && (
                <button
                  onClick={async () => {
                    if (Number(editingAccount.balance || 0) !== 0) {
                      return alert(`Cannot delete account ${editingAccount.code} because it has a non-zero balance of ${fmt(editingAccount.balance)}. Please clear this balance first.`);
                    }
                    const hasTransactions = journals.some(j => (j.lines || []).some(l => l.accountId === editingAccount.id));
                    if (hasTransactions) {
                      return alert(`Cannot delete account ${editingAccount.code} because it has historical transactions. Set its status to "Disabled" instead.`);
                    }
                    if (confirm(`Are you sure you want to delete account ${editingAccount.code}?`)) {
                      await accountingService.deleteChartOfAccount(editingAccount.id);
                      setEditingAccount(null);
                      await reload();
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ color: '#dc2626', borderColor: '#dc2626', marginRight: 'auto' }}
                >
                  🗑️ Delete Account
                </button>
              )}
              <button onClick={() => setEditingAccount(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveChangesAccount} className="btn btn-primary">💾 Save changes</button>
            </div>
            </div>

          </div>
        </div>
      )}

      {/* ── RECONCILIATION ADJUSTMENT MODAL ── */}
      {showAdjustment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                ⚡ Post Reconciliation Adjustment
              </h3>
              <button onClick={() => setShowAdjustment(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-form-content">

            <div style={{ marginBottom: '1.25rem', fontSize: 'var(--font-size-sm)', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <div><strong>Statement Ref No:</strong> {showAdjustment.refNo}</div>
              <div><strong>Statement Narration:</strong> {showAdjustment.description}</div>
              <div><strong>Statement Amount:</strong> <strong style={{ color: showAdjustment.amount > 0 ? '#16a34a' : '#dc2626' }}>{fmt(showAdjustment.amount)}</strong></div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Offsetting Account head</label>
              <select className="form-control" value={adjAccount} onChange={e => setAdjAccount(e.target.value)}>
                {coa.filter(a => ['expense', 'revenue'].includes(a.type)).map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Adjustment Narration</label>
              <input className="form-control" value={adjNarration} onChange={e => setAdjNarration(e.target.value)} />
            </div>

            <div className="form-actions" style={{ marginTop: '0.5rem' }}>
              <button onClick={() => setShowAdjustment(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handlePostAdjustment} className="btn btn-primary">Post Adjustment Entry</button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL MATCH WIZARD MODAL ── */}
      {matchingStatementRow && (() => {
        const bankJournalLines = [];
        journals.forEach(j => {
          const targetLines = (j.lines || []).filter(l => l.accountId === reconAccount);
          targetLines.forEach(l => {
            bankJournalLines.push({
              date: j.date?.substring(0, 10),
              refNo: j.refNo,
              narration: j.narration,
              type: l.type,
              amount: Number(l.amount)
            });
          });
        });

        const matchedLedgerKeys = reconMatches
          .filter(m => m.ledger)
          .map(m => `${m.ledger.refNo}-${m.ledger.type}-${m.ledger.amount}`);

        const unmatchedLedgerOptions = bankJournalLines.filter(gl => 
          !matchedLedgerKeys.includes(`${gl.refNo}-${gl.type}-${gl.amount}`)
        );

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h3 className="modal-title">
                  🔗 Manually Reconcile Statement entry
                </h3>
                <button onClick={() => setMatchingStatementRow(null)} className="modal-close">✕</button>
              </div>
              <div className="modal-form-content">

              <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: '1.25rem', fontSize: 'var(--font-size-sm)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div><strong>Statement Date:</strong> {matchingStatementRow.date}</div>
                <div><strong>Statement Description:</strong> {matchingStatementRow.description}</div>
                <div><strong>Statement Amount:</strong> <strong style={{ color: matchingStatementRow.amount > 0 ? '#16a34a' : '#dc2626' }}>{fmt(matchingStatementRow.amount)}</strong></div>
              </div>

              <h4 style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Select matching entry in General Ledger:</h4>
              
              <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                {unmatchedLedgerOptions.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    No unmatched bank ledger entries in GL.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Ref No</th>
                        <th>Narration / Remarks</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmatchedLedgerOptions.map((gl, gi) => (
                        <tr key={gi}>
                          <td>{window.formatDate(gl.date)}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-color)' }}>{gl.refNo}</td>
                          <td>{gl.narration}</td>
                          <td><span className={`chip ${gl.type === 'debit' ? 'chip-blue' : 'chip-purple'}`} style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-xs)' }}>{gl.type === 'debit' ? 'DR' : 'CR'}</span></td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(gl.amount)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                const newPair = {
                                  statementRefNo: matchingStatementRow.refNo,
                                  statementAmount: matchingStatementRow.amount,
                                  ledgerRefNo: gl.refNo
                                };
                                saveManualMatches([...manualMatches, newPair]);
                                setMatchingStatementRow(null);
                              }}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                            >
                              Confirm Match Pair
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button onClick={() => setMatchingStatementRow(null)} className="btn btn-secondary">Close</button>
              </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
