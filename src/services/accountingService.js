import { defaultChartOfAccounts } from '../database/seedData';
import { isFirebaseConfigured } from '../config/firebase';
import { saveToFirestore, fetchCollectionFromFirestore, deleteFromFirestore } from '../utils/hrmsFirebase';

const BACKEND_URL = '/api';

// Fetch Local Storage Chart of Accounts
const getLocalCOA = () => {
  try {
    const local = localStorage.getItem('erp_coa');
    if (local && local !== 'null') {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('[accountingService] getLocalCOA error:', e);
  }
  localStorage.setItem('erp_coa', JSON.stringify(defaultChartOfAccounts));
  return defaultChartOfAccounts;
};

// Save Local Storage Chart of Accounts
const saveLocalCOA = (coa) => {
  localStorage.setItem('erp_coa', JSON.stringify(coa || defaultChartOfAccounts));
};

// Fetch Local Storage Journals
const getLocalJournals = () => {
  try {
    const local = localStorage.getItem('erp_journals');
    if (local && local !== 'null') {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('[accountingService] getLocalJournals error:', e);
  }
  return [];
};

// Save Local Storage Journals
const saveLocalJournals = (journals) => {
  localStorage.setItem('erp_journals', JSON.stringify(journals || []));
};

export const accountingService = {
  // Post a Journal Entry
  postJournalEntry: async (entry) => {
    const { date, refNo, narration, lines, sourceModule, sourceRefId } = entry;

    // 0. Locked Period Validation
    const settingsStr = localStorage.getItem('erp_settings');
    if (settingsStr) {
      try {
        const s = JSON.parse(settingsStr);
        const lockedList = s.fiscal?.lockedPeriods || [];
        const txPeriod = (date || new Date().toISOString()).substring(0, 7); // 'YYYY-MM'
        if (lockedList.includes(txPeriod)) {
          throw new Error(`Period Lock Alert: The ledger period "${txPeriod}" has been closed by the administrator. Modifications are blocked.`);
        }
      } catch (e) {
        if (e.message.includes('Period Lock Alert')) throw e;
      }
    }

    // 1. Validation - Balanced Entry
    const totalDebits = lines
      .filter(l => l.type === 'debit')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    const totalCredits = lines
      .filter(l => l.type === 'credit')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    // Prevent floating point check issues
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Double-Entry Failure: Journal is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
    }

    const journalId = entry.id || `tx-${Date.now()}`;
    const journalData = {
      id: journalId,
      date: date || new Date().toISOString(),
      refNo,
      narration,
      lines: lines.map(l => ({ ...l, amount: Number(l.amount) })),
      sourceModule,
      sourceRefId: sourceRefId || '',
      voucherType: entry.voucherType || '',
      paymentMethod: entry.paymentMethod || '',
      chequeNo: entry.chequeNo || '',
      createdAt: new Date().toISOString()
    };

    let postedToMySQL = false;

    // Try posting to MySQL backend first
    try {
      const res = await fetch(`${BACKEND_URL}/erp/journals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journalData)
      });
      if (res.ok) {
        postedToMySQL = true;
        console.log(`✅ Posted MySQL journal entry: ${refNo}`);
        
        // Also update COA balances in MySQL for all impacted accounts
        const coaRes = await fetch(`${BACKEND_URL}/erp/coa`);
        if (coaRes.ok) {
          const coaData = await coaRes.json();
          for (const line of lines) {
            const acc = coaData.find(a => a.id === line.accountId);
            if (acc) {
              let newBalance = Number(acc.balance);
              const isDebitIncrease = ['asset', 'expense'].includes(acc.type);
              if (line.type === 'debit') {
                newBalance += isDebitIncrease ? Number(line.amount) : -Number(line.amount);
              } else {
                newBalance += isDebitIncrease ? -Number(line.amount) : Number(line.amount);
              }
              await fetch(`${BACKEND_URL}/erp/coa/${acc.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...acc, balance: newBalance })
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[accountingService] MySQL post failed, trying Firestore', err.message);
    }

    if (!postedToMySQL && isFirebaseConfigured()) {
      try {
        await saveToFirestore('journal_entries', journalId, journalData);
        
        // Also update COA balances in Firestore
        const coaData = await fetchCollectionFromFirestore('chart_of_accounts');
        if (coaData && coaData.length > 0) {
          for (const line of lines) {
            const acc = coaData.find(a => a.id === line.accountId);
            if (acc) {
              let newBalance = Number(acc.balance);
              const isDebitIncrease = ['asset', 'expense'].includes(acc.type);
              if (line.type === 'debit') {
                newBalance += isDebitIncrease ? Number(line.amount) : -Number(line.amount);
              } else {
                newBalance += isDebitIncrease ? -Number(line.amount) : Number(line.amount);
              }
              await saveToFirestore('chart_of_accounts', acc.id, { ...acc, balance: newBalance });
            }
          }
        }
      } catch (fbErr) {
        console.warn('[accountingService] Firestore journal/COA update failed', fbErr.message);
      }
    }

    // Always update LocalStorage as offline sync mirror
    const coa = getLocalCOA();
    const updatedCoa = coa.map(acc => {
      const matchingLines = lines.filter(l => l.accountId === acc.id);
      if (matchingLines.length === 0) return acc;

      let newBalance = Number(acc.balance);
      const isDebitIncrease = ['asset', 'expense'].includes(acc.type);

      matchingLines.forEach(line => {
        if (line.type === 'debit') {
          newBalance += isDebitIncrease ? Number(line.amount) : -Number(line.amount);
        } else {
          newBalance += isDebitIncrease ? -Number(line.amount) : Number(line.amount);
        }
      });

      return { ...acc, balance: newBalance };
    });

    saveLocalCOA(updatedCoa);
    
    const journals = getLocalJournals();
    saveLocalJournals([journalData, ...journals]);

    return true;
  },

  // Setup/Post Opening Balances
  // Each balance entry: { accountId, amount }
  // Positive amount = Debit (for Assets/Expenses), Negative amount = Credit (for Liabilities/Equity/Revenue)
  // A balancing equity plug is auto-calculated and posted to acc-3020 (Retained Earnings)
  postOpeningBalance: async (balances) => {
    const lines = balances.map(b => ({
      accountId: b.accountId,
      type: b.amount >= 0 ? 'debit' : 'credit',
      amount: Math.abs(b.amount)
    }));

    // Calculate net imbalance: totalDebits - totalCredits
    // Plug the difference into Retained Earnings (acc-3020) so the entry is always balanced
    const totalDebits  = lines.filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0);
    const totalCredits = lines.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
    const diff = +(totalDebits - totalCredits).toFixed(2);

    if (Math.abs(diff) > 0.01) {
      // diff > 0 means assets > liabilities+equity → need a Credit to equity to balance
      // diff < 0 means liabilities+equity > assets → need a Debit to equity (rare — opening deficit)
      lines.push({
        accountId: 'acc-3020', // Retained Earnings
        type: diff > 0 ? 'credit' : 'debit',
        amount: Math.abs(diff),
        memo: 'Opening balance equity plug (auto-calculated)'
      });
    }

    return accountingService.postJournalEntry({
      date: new Date().toISOString(),
      refNo: `OB-${Date.now().toString().slice(-6)}`,
      narration: 'Opening balance setup entry — equity offset to Retained Earnings (acc-3020)',
      lines,
      sourceModule: 'adjustment',
      sourceRefId: 'opening-balance'
    });
  },

  // Get current chart of accounts
  getChartOfAccounts: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/coa`);
      if (res.ok) {
        const data = await res.json();
        saveLocalCOA(data);
        return data;
      }
    } catch (err) {
      console.warn('[accountingService] MySQL COA fetch failed, trying Firestore', err.message);
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('chart_of_accounts');
        if (data && data.length > 0) {
          saveLocalCOA(data);
          return data;
        }
      }
    }
    return getLocalCOA();
  },

  // Get all journal entries
  getJournalEntries: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/journals`);
      if (res.ok) {
        const data = await res.json();
        saveLocalJournals(data);
        return data;
      }
    } catch (err) {
      console.warn('[accountingService] MySQL journals fetch failed, trying Firestore', err.message);
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('journal_entries');
        if (data && data.length > 0) {
          saveLocalJournals(data);
          return data;
        }
      }
    }
    return getLocalJournals();
  },

  // Create a COA account
  createChartOfAccount: async (account) => {
    let savedInMySQL = false;
    try {
      const res = await fetch(`${BACKEND_URL}/erp/coa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      });
      if (res.ok) {
        savedInMySQL = true;
        console.log(`✅ Created MySQL COA: ${account.code}`);
      }
    } catch (err) {
      console.warn('[accountingService] MySQL COA create failed, trying Firestore', err.message);
    }

    if (!savedInMySQL && isFirebaseConfigured()) {
      try {
        await saveToFirestore('chart_of_accounts', account.id, account);
        console.log(`[Firebase Firestore] Created COA: ${account.code}`);
      } catch (fbErr) {
        console.warn('[accountingService] Firestore COA create failed', fbErr.message);
      }
    }
    
    // Always update local cache
    const coa = getLocalCOA();
    saveLocalCOA([...coa, account]);
    return true;
  },

  // Update a COA account
  updateChartOfAccount: async (account) => {
    let updatedInMySQL = false;
    try {
      const res = await fetch(`${BACKEND_URL}/erp/coa/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      });
      if (res.ok) {
        updatedInMySQL = true;
        console.log(`✅ Updated MySQL COA: ${account.code}`);
      }
    } catch (err) {
      console.warn('[accountingService] MySQL COA update failed, trying Firestore', err.message);
    }

    if (!updatedInMySQL && isFirebaseConfigured()) {
      try {
        await saveToFirestore('chart_of_accounts', account.id, account);
        console.log(`[Firebase Firestore] Updated COA: ${account.code}`);
      } catch (fbErr) {
        console.warn('[accountingService] Firestore COA update failed', fbErr.message);
      }
    }
    
    // Always update local cache
    const coa = getLocalCOA();
    const updated = coa.map(a => a.id === account.id ? account : a);
    saveLocalCOA(updated);
    return true;
  },

  // Delete a custom COA account
  deleteChartOfAccount: async (accountId) => {
    let deletedInMySQL = false;
    try {
      const res = await fetch(`${BACKEND_URL}/erp/coa/${accountId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        deletedInMySQL = true;
        console.log(`✅ Deleted MySQL COA: ${accountId}`);
      }
    } catch (err) {
      console.warn('[accountingService] MySQL COA delete failed, trying Firestore', err.message);
    }

    if (!deletedInMySQL && isFirebaseConfigured()) {
      try {
        await deleteFromFirestore('chart_of_accounts', accountId);
        console.log(`[Firebase Firestore] Deleted COA: ${accountId}`);
      } catch (fbErr) {
        console.warn('[accountingService] Firestore COA delete failed', fbErr.message);
      }
    }

    // Always update local cache
    const coa = getLocalCOA();
    const updated = coa.filter(a => a.id !== accountId);
    saveLocalCOA(updated);
    return true;
  }
};


