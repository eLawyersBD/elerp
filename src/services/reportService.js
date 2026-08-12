/**
 * REPORT SERVICE  —  All 12 financial reports for ACCOUNTICA Cloud ERP PLATFORM
 * Each report reads from localStorage (dual-mode, same data as services write to).
 *
 * Reports:
 *  1.  getGeneralLedger(accountId, fromDate, toDate)     → running balance per account
 *  2.  getTrialBalance(asOfDate)                          → all COA accounts, debit/credit snapshot
 *  3.  getProfitAndLoss(fromDate, toDate)                 → Revenue − COGS − Expenses
 *  4.  getBalanceSheet(asOfDate)                          → Assets = Liabilities + Equity
 *  5.  getCashFlow(fromDate, toDate)                      → Operating/Investing/Financing
 *  6.  getStockReport(filters)                            → inventory levels + AVCO values
 *  7.  getStockValuation()                                → total inventory value at AVCO cost
 *  8.  getSalesReport(fromDate, toDate, customerId)       → sales invoices with COGS & GP
 *  9.  getPurchaseReport(fromDate, toDate, supplierId)    → purchase invoices summary
 * 10.  getCustomerStatement(customerId, fromDate, toDate) → AR running balance per customer
 * 11.  getSupplierStatement(supplierId, fromDate, toDate) → AP running balance per supplier
 * 12.  getVATReturn(yearMonth)                            → VAT input vs output for NBR filing
 * 13.  getAgingReport(type, asOfDate)                     → AR/AP aging buckets
 */

import { vatService } from './vatService';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const getLocal = (key)     => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; } };
const getCOA   = ()        => getLocal('erp_coa');
const getJournals = ()     => getLocal('erp_journals');
const getProducts = ()     => getLocal('erp_products');
const getSalesInvoices = ()    => getLocal('erp_sales_invoices');
const getPurchaseInvoices = () => getLocal('erp_purchase_invoices');
const getCustomers = ()    => getLocal('erp_customers');
const getSuppliers = ()    => getLocal('erp_suppliers');
const getReceipts  = ()    => getLocal('erp_customer_receipts');
const getPayments  = ()    => getLocal('erp_supplier_payments');

const inRange = (dateStr, fromDate, toDate) => {
  const d = (dateStr || '').substring(0, 10);
  if (fromDate && d < fromDate) return false;
  if (toDate   && d > toDate)   return false;
  return true;
};

const round = (n) => +Number(n || 0).toFixed(2);

/* ══════════════════════════════════════════════════════════════════════════ */
export const reportService = {

  /* ── 1. GENERAL LEDGER ── */
  getGeneralLedger: (accountId, fromDate, toDate) => {
    const account  = getCOA().find(a => a.id === accountId);
    if (!account) return { account: null, lines: [], openingBalance: 0, closingBalance: 0 };

    const journals = getJournals();
    const isDebitInc = ['asset', 'expense'].includes(account.type);

    // Compute opening balance = all journal lines BEFORE fromDate for this account
    let openingBalance = 0;
    if (fromDate) {
      journals
        .filter(j => (j.date || '').substring(0, 10) < fromDate)
        .forEach(j => {
          (j.lines || []).filter(l => l.accountId === accountId).forEach(l => {
            const amt = Number(l.amount);
            openingBalance += (l.type === 'debit')
              ? (isDebitInc ?  amt : -amt)
              : (isDebitInc ? -amt :  amt);
          });
        });
    }

    // Filter journals in range
    const filtered = journals.filter(j => inRange(j.date, fromDate, toDate));
    const lines = [];
    let runningBalance = openingBalance;

    filtered.forEach(journal => {
      (journal.lines || [])
        .filter(l => l.accountId === accountId)
        .forEach(l => {
          const amt    = Number(l.amount);
          const effect = (l.type === 'debit')
            ? (isDebitInc ?  amt : -amt)
            : (isDebitInc ? -amt :  amt);
          runningBalance += effect;
          lines.push({
            date:        (journal.date || '').substring(0, 10),
            refNo:       journal.refNo       || '',
            narration:   journal.narration   || '',
            debit:       l.type === 'debit'  ? amt : 0,
            credit:      l.type === 'credit' ? amt : 0,
            balance:     round(runningBalance),
            sourceModule:journal.sourceModule || '',
          });
        });
    });

    lines.sort((a, b) => a.date.localeCompare(b.date));

    return {
      account,
      openingBalance: round(openingBalance),
      closingBalance: round(runningBalance),
      lines,
    };
  },

  /* ── 2. TRIAL BALANCE ── */
  getTrialBalance: (asOfDate) => {
    const coa      = getCOA();
    const journals = getJournals().filter(j => !asOfDate || (j.date || '').substring(0, 10) <= asOfDate);

    // Build balance map from journals (pure re-computation from scratch)
    const balanceMap = {};
    coa.forEach(a => { balanceMap[a.id] = 0; });
    const isDebitInc = (type) => ['asset', 'expense'].includes(type);

    journals.forEach(journal => {
      (journal.lines || []).forEach(l => {
        const acc = coa.find(a => a.id === l.accountId);
        if (!acc) return;
        const amt    = Number(l.amount);
        const effect = (l.type === 'debit')
          ? (isDebitInc(acc.type) ?  amt : -amt)
          : (isDebitInc(acc.type) ? -amt :  amt);
        balanceMap[l.accountId] = (balanceMap[l.accountId] || 0) + effect;
      });
    });

    const rows = coa.map(acc => {
      const balance = round(balanceMap[acc.id] || 0);
      const isDebit = isDebitInc(acc.type);
      
      let debit = 0;
      let credit = 0;
      
      if (isDebit) {
        if (balance > 0) debit = balance;
        else if (balance < 0) credit = Math.abs(balance);
      } else {
        if (balance > 0) credit = balance;
        else if (balance < 0) debit = Math.abs(balance);
      }

      return {
        ...acc,
        debit,
        credit,
        balance,
      };
    }).filter(a => a.debit !== 0 || a.credit !== 0);

    rows.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

    const totalDebit  = round(rows.reduce((s, r) => s + r.debit,  0));
    const totalCredit = round(rows.reduce((s, r) => s + r.credit, 0));
    const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.02;

    return { rows, totalDebit, totalCredit, isBalanced, asOfDate };
  },

  /* ── 3. PROFIT & LOSS ── */
  getProfitAndLoss: (fromDate, toDate) => {
    const coa      = getCOA();
    const journals = getJournals().filter(j => inRange(j.date, fromDate, toDate));

    const accBalance = {};
    journals.forEach(j => {
      (j.lines || []).forEach(l => {
        const acc = coa.find(a => a.id === l.accountId);
        if (!acc) return;
        const amt = Number(l.amount);
        const isDebitInc = ['asset', 'expense'].includes(acc.type);
        const effect = (l.type === 'debit')
          ? (isDebitInc ?  amt : -amt)
          : (isDebitInc ? -amt :  amt);
        accBalance[l.accountId] = (accBalance[l.accountId] || 0) + effect;
      });
    });

    const sumGroup = (cls) => {
      const isExpType = ['expense'].includes(coa.find(a => a.classification === cls)?.type);
      return round(
        coa.filter(a => a.classification === cls)
           .reduce((s, a) => {
             const bal = accBalance[a.id] || 0;
             // Expense accounts: positive signed balance = debit = cost
             // Revenue accounts: negative signed balance = credit = income → negate
             const isExpenseAcc = ['asset', 'expense'].includes(a.type);
             return s + (isExpenseAcc ? bal : -bal);
           }, 0)
      );
    };

    // Revenue group
    const revenueAccounts  = coa.filter(a => a.type === 'revenue' && a.classification === 'revenue');
    const contraRevAccounts= coa.filter(a => a.classification === 'contra_revenue');
    // Revenue accounts are credit-normal, so signed balance is negative — negate for positive display
    const grossRevenue     = round(revenueAccounts.reduce((s, a) => s + -(accBalance[a.id] || 0), 0));
    // Contra-revenue (e.g. Sales Returns) are debit-normal — positive balance = return amount
    const salesReturns     = round(contraRevAccounts.reduce((s, a) => s + (accBalance[a.id] || 0), 0));
    const netRevenue       = round(grossRevenue - salesReturns);

    // COGS group — expense-type accounts, positive signed balance = cost
    const cogs = sumGroup('cost_of_sales');

    // Gross profit
    const grossProfit = round(netRevenue - cogs);
    const gpMargin    = netRevenue > 0 ? round((grossProfit / netRevenue) * 100) : 0;

    // Operating expenses — expense-type accounts, positive signed balance = cost
    const opExpAccounts = coa.filter(a => a.classification === 'operating_expense');
    const opExpTotal    = round(opExpAccounts.reduce((s, a) => s + (accBalance[a.id] || 0), 0));

    // Net profit
    const netProfit = round(grossProfit - opExpTotal);
    const npMargin  = netRevenue > 0 ? round((netProfit  / netRevenue) * 100) : 0;

    return {
      fromDate, toDate,
      grossRevenue,
      salesReturns,
      netRevenue,
      cogs,
      grossProfit,
      gpMargin,
      operatingExpenses: opExpTotal,
      netProfit,
      npMargin,
      // Detailed lines for display (always positive amounts)
      revenueLines:  revenueAccounts.map(a => ({ ...a, amount: round(-(accBalance[a.id] || 0)) })).filter(a => a.amount !== 0),
      cogsLines:     coa.filter(a => a.classification === 'cost_of_sales').map(a => ({ ...a, amount: round(accBalance[a.id] || 0) })).filter(a => a.amount !== 0),
      expenseLines:  opExpAccounts.map(a => ({ ...a, amount: round(accBalance[a.id] || 0) })).filter(a => a.amount !== 0),
    };
  },

  /* ── 4. BALANCE SHEET ── */
  getBalanceSheet: (asOfDate) => {
    const tb = reportService.getTrialBalance(asOfDate);

    const group = (cls) => tb.rows.filter(r => r.classification === cls);

    const sumRows = (rows) => round(rows.reduce((s, r) => s + r.balance, 0));

    const currentAssets   = group('current_asset');
    const fixedAssets     = group('fixed_asset');
    const totalAssets     = round(sumRows(currentAssets) + sumRows(fixedAssets));

    const currentLiab     = group('current_liability');
    const longTermLiab    = group('long_term_liability');
    const equity          = group('equity');
    const totalLiab       = round(sumRows(currentLiab) + sumRows(longTermLiab));
    const totalEquity     = sumRows(equity);
    const totalLiabEquity = round(totalLiab + totalEquity);

    const isBalanced = Math.abs(totalAssets - totalLiabEquity) < 1;

    return {
      asOfDate,
      currentAssets, fixedAssets, totalAssets,
      currentLiab, longTermLiab, totalLiab,
      equity, totalEquity,
      totalLiabEquity,
      isBalanced,
      difference: round(totalAssets - totalLiabEquity),
    };
  },

  /* ── 5. CASH FLOW (simplified operating method) ── */
  getCashFlow: (fromDate, toDate) => {
    const journals = getJournals().filter(j => inRange(j.date, fromDate, toDate));
    const cashAccountIds = ['acc-1010', 'acc-1020', 'acc-1025', 'acc-1030', 'acc-1035', 'acc-1040'];

    let cashIn = 0, cashOut = 0;
    const details = [];

    journals.forEach(j => {
      (j.lines || []).forEach(l => {
        if (!cashAccountIds.includes(l.accountId)) return;
        const amt = Number(l.amount);
        if (l.type === 'debit') {
          cashIn  += amt;
          details.push({ date: j.date?.substring(0, 10), refNo: j.refNo, narration: j.narration, direction: 'in', amount: amt, module: j.sourceModule });
        } else {
          cashOut += amt;
          details.push({ date: j.date?.substring(0, 10), refNo: j.refNo, narration: j.narration, direction: 'out', amount: amt, module: j.sourceModule });
        }
      });
    });

    details.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return {
      fromDate, toDate,
      cashIn:      round(cashIn),
      cashOut:     round(cashOut),
      netCashFlow: round(cashIn - cashOut),
      details,
      operatingCashIn:  round(details.filter(d => ['sales','vouchers'].includes(d.module) && d.direction === 'in').reduce((s, d) => s + d.amount, 0)),
      operatingCashOut: round(details.filter(d => ['purchases','vouchers'].includes(d.module) && d.direction === 'out').reduce((s, d) => s + d.amount, 0)),
    };
  },

  /* ── 6. STOCK REPORT ── */
  getStockReport: (filters = {}) => {
    let products = getProducts();
    if (filters.category)  products = products.filter(p => p.category === filters.category || p.categoryId === filters.category);
    if (filters.lowStock)  products = products.filter(p => Number(p.qty) <= Number(p.minStock || 5));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      products = products.filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    return products.map(p => ({
      ...p,
      qty:          Number(p.qty     || 0),
      avgCost:      Number(p.purchasePrice || p.price || 0),
      stockValue:   round(Number(p.qty || 0) * Number(p.purchasePrice || p.price || 0)),
      salePrice:    Number(p.salePrice || p.price || 0),
      potentialRevenue: round(Number(p.qty || 0) * Number(p.salePrice || p.price || 0)),
    }));
  },

  /* ── 7. STOCK VALUATION ── */
  getStockValuation: () => {
    const products = getProducts();
    const lines = products.map(p => ({
      id:          p.id,
      sku:         p.sku || '—',
      name:        p.name,
      qty:         Number(p.qty || 0),
      avgCost:     Number(p.purchasePrice || p.price || 0),
      stockValue:  round(Number(p.qty || 0) * Number(p.purchasePrice || p.price || 0)),
    }));
    const totalValue = round(lines.reduce((s, l) => s + l.stockValue, 0));
    return { lines, totalValue, productCount: lines.length, totalUnits: lines.reduce((s, l) => s + l.qty, 0) };
  },

  /* ── 8. SALES REPORT ── */
  getSalesReport: (fromDate, toDate, customerId) => {
    let invoices = getSalesInvoices().filter(i => inRange(i.date, fromDate, toDate));
    if (customerId) invoices = invoices.filter(i => i.customerId === customerId);
    const customers = getCustomers();

    const lines = invoices.map(inv => {
      const cust = customers.find(c => c.id === inv.customerId);
      return {
        invoiceNo:   inv.invoiceNo,
        date:        inv.date,
        customerName:cust?.name || inv.customerId,
        itemCount:   inv.items?.length || 0,
        subtotal:    round(inv.subtotal),
        vatAmount:   round(inv.vatAmount),
        grandTotal:  round(inv.grandTotal),
        cogs:        round(inv.totalCogs || 0),
        grossProfit: round(inv.subtotal - (inv.totalCogs || 0)),
        gpPct:       inv.subtotal > 0 ? round(((inv.subtotal - (inv.totalCogs || 0)) / inv.subtotal) * 100) : 0,
        paymentStatus: inv.paymentStatus,
      };
    });

    lines.sort((a, b) => a.date.localeCompare(b.date));

    return {
      fromDate, toDate,
      lines,
      summary: {
        count:       lines.length,
        totalRev:    round(lines.reduce((s, l) => s + l.grandTotal, 0)),
        totalCOGS:   round(lines.reduce((s, l) => s + l.cogs, 0)),
        grossProfit: round(lines.reduce((s, l) => s + l.grossProfit, 0)),
        totalVAT:    round(lines.reduce((s, l) => s + l.vatAmount, 0)),
        avgGPPct:    lines.length > 0 ? round(lines.reduce((s, l) => s + l.gpPct, 0) / lines.length) : 0,
      },
    };
  },

  /* ── 9. PURCHASE REPORT ── */
  getPurchaseReport: (fromDate, toDate, supplierId) => {
    let invoices = getPurchaseInvoices().filter(i => inRange(i.date, fromDate, toDate));
    if (supplierId) invoices = invoices.filter(i => i.supplierId === supplierId);
    const suppliers = getSuppliers();

    const lines = invoices.map(inv => {
      const sup = suppliers.find(s => s.id === inv.supplierId);
      return {
        invoiceNo:    inv.invoiceNo,
        date:         inv.date,
        supplierName: sup?.name || inv.supplierId,
        itemCount:    inv.items?.length || 0,
        subtotal:     round(inv.subtotal),
        vatAmount:    round(inv.vatAmount),
        grandTotal:   round(inv.grandTotal),
        paymentStatus:inv.paymentStatus,
      };
    });

    lines.sort((a, b) => a.date.localeCompare(b.date));

    return {
      fromDate, toDate,
      lines,
      summary: {
        count:      lines.length,
        totalPurch: round(lines.reduce((s, l) => s + l.grandTotal, 0)),
        totalVAT:   round(lines.reduce((s, l) => s + l.vatAmount,  0)),
        outstanding:round(lines.filter(l => l.paymentStatus === 'unpaid').reduce((s, l) => s + l.grandTotal, 0)),
      },
    };
  },

  /* ── 10. CUSTOMER STATEMENT ── */
  getCustomerStatement: (customerId, fromDate, toDate) => {
    const customer = getCustomers().find(c => c.id === customerId);
    const invoices = getSalesInvoices().filter(i => i.customerId === customerId && inRange(i.date, fromDate, toDate));
    const receipts = getReceipts().filter(r => r.customerId === customerId && inRange(r.date, fromDate, toDate));
    const returns  = getLocal('erp_sales_returns');

    const txns = [
      ...invoices.map(i => ({ date: i.date, refNo: i.invoiceNo,  type: 'Invoice',  debit: i.grandTotal, credit: 0,       desc: i.narration })),
      ...receipts.map(r => ({ date: r.date, refNo: r.receiptNo,  type: 'Receipt',  debit: 0,            credit: r.amount, desc: r.narration })),
      ...returns.map(r  => ({ date: r.date, refNo: r.returnNo,   type: 'Return',   debit: 0,            credit: r.grandTotal, desc: `Return against ${r.originalInvoiceNo}` })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    let balance = 0;
    const lines = txns.map(t => {
      balance += t.debit - t.credit;
      return { ...t, balance: round(balance) };
    });

    return { customer, lines, closingBalance: round(balance), fromDate, toDate };
  },

  /* ── 11. SUPPLIER STATEMENT ── */
  getSupplierStatement: (supplierId, fromDate, toDate) => {
    const supplier = getSuppliers().find(s => s.id === supplierId);
    const invoices = getPurchaseInvoices().filter(i => i.supplierId === supplierId && inRange(i.date, fromDate, toDate));
    const payments = getPayments().filter(p => p.supplierId === supplierId && inRange(p.date, fromDate, toDate));
    const returns  = getLocal('erp_purchase_returns');

    const txns = [
      ...invoices.map(i => ({ date: i.date, refNo: i.invoiceNo,  type: 'Invoice',  debit: 0,       credit: i.grandTotal, desc: i.narration })),
      ...payments.map(p => ({ date: p.date, refNo: p.paymentNo,  type: 'Payment',  debit: p.amount, credit: 0,           desc: p.narration })),
      ...returns.map(r  => ({ date: r.date, refNo: r.returnNo,   type: 'Return',   debit: r.grandTotal, credit: 0,       desc: `Return against ${r.originalInvoiceNo}` })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    let balance = 0;
    const lines = txns.map(t => {
      balance += t.credit - t.debit;
      return { ...t, balance: round(balance) };
    });

    return { supplier, lines, closingBalance: round(balance), fromDate, toDate };
  },

  /* ── 12. VAT RETURN ── */
  getVATReturn: (yearMonth) => vatService.generateVATReturn(yearMonth),

  /* ── 13. AGING REPORT ── */
  getAgingReport: (type = 'ar', asOfDate) => {
    const cutoff = asOfDate || new Date().toISOString().substring(0, 10);
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const lines   = [];

    if (type === 'ar') {
      const customers = getCustomers();
      const invoices  = getSalesInvoices().filter(i => i.paymentStatus === 'unpaid' && i.date <= cutoff);

      customers.forEach(cust => {
        const custInv = invoices.filter(i => i.customerId === cust.id);
        if (custInv.length === 0) return;

        const row = { id: cust.id, name: cust.name, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
        custInv.forEach(inv => {
          const daysDue = Math.floor((new Date(cutoff) - new Date(inv.date)) / 86400000);
          const amt = inv.grandTotal || 0;
          row.total += amt;
          if      (daysDue <= 30)  { row.current += amt; buckets.current += amt; }
          else if (daysDue <= 60)  { row.days30  += amt; buckets.days30  += amt; }
          else if (daysDue <= 90)  { row.days60  += amt; buckets.days60  += amt; }
          else if (daysDue <= 120) { row.days90  += amt; buckets.days90  += amt; }
          else                     { row.over90  += amt; buckets.over90  += amt; }
        });
        Object.keys(row).forEach(k => { if (typeof row[k] === 'number') row[k] = round(row[k]); });
        lines.push(row);
      });
    } else {
      // AP aging
      const suppliers = getSuppliers();
      const invoices  = getPurchaseInvoices().filter(i => i.paymentStatus === 'unpaid' && i.date <= cutoff);

      suppliers.forEach(sup => {
        const supInv = invoices.filter(i => i.supplierId === sup.id);
        if (supInv.length === 0) return;

        const row = { id: sup.id, name: sup.name, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
        supInv.forEach(inv => {
          const daysDue = Math.floor((new Date(cutoff) - new Date(inv.date)) / 86400000);
          const amt = inv.grandTotal || 0;
          row.total += amt;
          if      (daysDue <= 30)  { row.current += amt; buckets.current += amt; }
          else if (daysDue <= 60)  { row.days30  += amt; buckets.days30  += amt; }
          else if (daysDue <= 90)  { row.days60  += amt; buckets.days60  += amt; }
          else if (daysDue <= 120) { row.days90  += amt; buckets.days90  += amt; }
          else                     { row.over90  += amt; buckets.over90  += amt; }
        });
        Object.keys(row).forEach(k => { if (typeof row[k] === 'number') row[k] = round(row[k]); });
        lines.push(row);
      });
    }

    lines.sort((a, b) => b.total - a.total);
    Object.keys(buckets).forEach(k => { buckets[k] = round(buckets[k]); });
    const totalOutstanding = round(Object.values(buckets).reduce((s, v) => s + v, 0));

    return { type, asOfDate: cutoff, lines, buckets, totalOutstanding };
  },

  /* ── 14. FINANCIAL RATIOS ── */
  getFinancialRatios: (asOfDate) => {
    const today = new Date().toISOString().substring(0, 10);
    const cutoff = asOfDate || today;
    const bs = reportService.getBalanceSheet(cutoff);
    const year = new Date(cutoff).getFullYear();
    const pl = reportService.getProfitAndLoss(`${year}-01-01`, cutoff);

    const sumRows = (rows) => rows.reduce((s, r) => s + r.balance, 0);
    
    const currentAssets = sumRows(bs.currentAssets);
    const currentLiab = sumRows(bs.currentLiab);
    
    const inventory = sumRows(bs.currentAssets.filter(a => a.id.includes('1200') || a.id.includes('1210') || a.id.includes('1220') || a.name.toLowerCase().includes('inventory')));
    const quickAssets = currentAssets - inventory;

    const currentRatio = currentLiab > 0 ? round(currentAssets / currentLiab) : 0;
    const quickRatio = currentLiab > 0 ? round(quickAssets / currentLiab) : 0;

    const grossMargin = pl.netRevenue > 0 ? round((pl.grossProfit / pl.netRevenue) * 100) : 0;
    const netMargin = pl.netRevenue > 0 ? round((pl.netProfit / pl.netRevenue) * 100) : 0;
    const roa = bs.totalAssets > 0 ? round((pl.netProfit / bs.totalAssets) * 100) : 0;

    const debtToEquity = bs.totalEquity > 0 ? round(bs.totalLiab / bs.totalEquity) : 0;
    const equityRatio = bs.totalAssets > 0 ? round(bs.totalEquity / bs.totalAssets) : 0;

    return {
      asOfDate: cutoff,
      currentRatio,
      quickRatio,
      grossMargin,
      netMargin,
      roa,
      debtToEquity,
      equityRatio,
      currentAssets,
      currentLiab,
      quickAssets,
      totalAssets: bs.totalAssets,
      totalLiab: bs.totalLiab,
      totalEquity: bs.totalEquity,
      netRevenue: pl.netRevenue,
      netProfit: pl.netProfit
    };
  },

  /* ── 15. COMPARATIVE STATEMENTS ── */
  getComparativeProfitAndLoss: (fromDate, toDate) => {
    const shiftYear = (dateStr, years) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      d.setFullYear(d.getFullYear() + years);
      return d.toISOString().substring(0, 10);
    };

    const prevFromDate = shiftYear(fromDate, -1);
    const prevToDate = shiftYear(toDate, -1);

    const currentPL = reportService.getProfitAndLoss(fromDate, toDate);
    const prevPL = reportService.getProfitAndLoss(prevFromDate, prevToDate);

    return {
      current: currentPL,
      previous: prevPL,
      fromDate,
      toDate,
      prevFromDate,
      prevToDate
    };
  },

  getComparativeBalanceSheet: (asOfDate) => {
    const shiftYear = (dateStr, years) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      d.setFullYear(d.getFullYear() + years);
      return d.toISOString().substring(0, 10);
    };

    const prevAsOfDate = shiftYear(asOfDate, -1);

    const currentBS = reportService.getBalanceSheet(asOfDate);
    const prevBS = reportService.getBalanceSheet(prevAsOfDate);

    return {
      current: currentBS,
      previous: prevBS,
      asOfDate,
      prevAsOfDate
    };
  },
};
