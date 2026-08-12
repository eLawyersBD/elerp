import { inventoryService } from './inventoryService';
import { accountingService } from './accountingService';
import { auditService } from './auditService';
import { vatService } from './vatService';
import { taxService } from './taxService';
import { defaultSettings, defaultAccountMap } from '../database/seedData';
import { syncQueueService } from './syncQueueService';
import { isFirebaseConfigured } from '../config/firebase';
import { saveToFirestore, fetchCollectionFromFirestore, deleteFromFirestore } from '../utils/hrmsFirebase';
import { findNamePhoneDuplicate, customerDuplicateMessage } from '../utils/duplicateChecker';

const BACKEND_URL = '/api';

/* ── Local storage helpers ───────────────────────────────────────────────── */
const getLocal  = (key)       => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const getLocalCustomers = () => {
  const r = localStorage.getItem('erp_customers');
  return r ? JSON.parse(r) : [];
};
const saveLocalCustomers = (c) => localStorage.setItem('erp_customers', JSON.stringify(c));

/* ── Invoice number generator ────────────────────────────────────────────── */
const nextSalesNo = () => {
  try {
    const s = localStorage.getItem('erp_settings');
    const settings = s ? JSON.parse(s) : defaultSettings;
    const prefix = settings.invoice?.salesPrefix || 'ERP-S-';
    let num = Number(settings.invoice?.nextSalesNum || 1);
    const refNo = `${prefix}${String(num).padStart(4, '0')}`;
    settings.invoice = { ...settings.invoice, nextSalesNum: num + 1 };
    localStorage.setItem('erp_settings', JSON.stringify(settings));
    return refNo;
  } catch {
    return `ERP-S-${Date.now().toString().slice(-6)}`;
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   SALES SERVICE
   ══════════════════════════════════════════════════════════════════════════ */
export const salesService = {

  // Fetch Customers list from MySQL / LocalStorage / Firestore
  getCustomers: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/customers`);
      if (res.ok) {
        const data = await res.json();
        saveLocalCustomers(data);
        return data;
      }
    } catch (err) {
      console.warn('[salesService] MySQL customers fetch failed, trying Firestore', err.message);
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('customers');
        if (data && data.length > 0) {
          saveLocalCustomers(data);
          return data;
        }
      }
    }
    return getLocalCustomers();
  },

  /* ── Post a Sales Invoice (full flow) ── */
  postSalesInvoice: async (invoice, currentUser) => {
    const { customerId, branchId, items, narration, date, discountTotal, quoteNo, soNumber, dueDate, salesperson, branch, chalanNo } = invoice;

    if (!items || items.length === 0) throw new Error('Invoice must have at least one line item.');

    // 1. Calculate VAT & Tax (AIT)
    const vatCalc   = vatService.calculateInvoiceVAT(items);
    const subtotal  = vatCalc.subtotal;
    const vatAmount = vatCalc.totalVat;
    const grandTotal= vatCalc.grandTotal;

    const taxRates = taxService.getTaxRates();
    let totalTaxAmount = 0;
    
    // Calculate total tax deducted from the selling price after VAT
    const linesWithTax = vatCalc.lines.map((l, index) => {
      const originalItem = items[index] || {};
      const taxRateObj = taxRates.find(r => r.id === originalItem.taxRateId) || taxRates.find(r => r.isDefault) || { rate: 0 };
      const taxRate = taxRateObj.rate || 0;
      
      const lineVatTotal = l.taxableAmt + l.vatAmount;
      const lineTaxAmt = +(lineVatTotal * (taxRate / 100)).toFixed(2);
      totalTaxAmount += lineTaxAmt;
      
      return {
        type:        originalItem.type || 'product',
        productId:   l.productId,
        productName: l.productName || '',
        qty:         l.qty,
        unitPrice:   l.unitPrice,
        vatRateId:   l.vatRateId,
        vatRate:     l.vatRate,
        taxableAmt:  l.taxableAmt,
        vatAmount:   l.vatAmount,
        lineTotal:   l.lineTotal,
        taxRateId:   originalItem.taxRateId || 'tax-exempt',
        taxRate,
        taxAmount:   lineTaxAmt,
        narration:   originalItem.narration || '',
      };
    });
    totalTaxAmount = +totalTaxAmount.toFixed(2);
    const netReceivable = +(grandTotal - totalTaxAmount).toFixed(2);

    if (grandTotal <= 0) throw new Error('Invoice total must be greater than zero.');

    // 2. Check stock availability
    const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
    const settings = JSON.parse(localStorage.getItem('erp_settings') || '{}');
    const allowNeg = settings?.accounting?.allowNegativeStock === true;

    for (const item of items) {
      if (item.type === 'service') continue;
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found in system.`);
      if (!allowNeg && !chalanNo && product.qty < item.qty) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.qty} ${product.unit}, Requested: ${item.qty}.`);
      }
    }

    // 3. Calculate COGS using current AVCO cost
    const cogsLines = items.map(item => {
      if (item.type === 'service') {
        return { productId: item.productId, qty: item.qty, avgCost: 0, cogsAmt: 0 };
      }
      const product  = products.find(p => p.id === item.productId);
      const avgCost  = Number(product?.purchasePrice || product?.price || 0);
      return { productId: item.productId, qty: item.qty, avgCost, cogsAmt: +(item.qty * avgCost).toFixed(2) };
    });
    const totalCogs = cogsLines.reduce((s, l) => s + l.cogsAmt, 0);

    // 4. Build invoice
    const invoiceNo   = invoice.invoiceNo || nextSalesNo();
    const invoiceDate = date || new Date().toISOString().substring(0, 10);

    const grossProfit = subtotal - totalCogs;
    const grossMargin = subtotal > 0 ? +((grossProfit / subtotal) * 100).toFixed(2) : 0;

    const invoiceData = {
      invoiceNo,
      date:            invoiceDate,
      dueDate:         dueDate || new Date(new Date(invoiceDate).setDate(new Date(invoiceDate).getDate() + 30)).toISOString().substring(0, 10),
      customerId,
      branchId:        branchId || 'br-1',
      branch:          branch  || 'Main Branch',
      salesperson:     salesperson || '',
      quoteNo:         quoteNo || '',
      soNumber:        soNumber || '',
      items:           linesWithTax,
      subtotal,
      vatAmount,
      totalTaxAmount,
      netReceivable,
      discountTotal:   discountTotal || 0,
      grandTotal,
      totalCogs,
      grossProfit,
      grossMargin,
      paidAmount:      0,
      narration:       narration || `Sales invoice`,
      paymentStatus:   'unpaid',
      deliveryStatus:  chalanNo ? 'delivered' : 'pending',
      approvalStatus:  grandTotal > 50000 ? 'pending' : 'auto_approved',
      approvedBy:      grandTotal <= 50000 ? 'System (Auto)' : '',
      approvedAt:      grandTotal <= 50000 ? new Date().toISOString() : '',
      chalanNo:        chalanNo || '',
      status:          'posted',
      postedBy:        currentUser?.uid || 'system',
      createdAt:       new Date().toISOString(),
    };

    const productSubtotal = linesWithTax
      .filter(l => l.type !== 'service')
      .reduce((sum, l) => sum + l.taxableAmt, 0);

    const serviceSubtotal = linesWithTax
      .filter(l => l.type === 'service')
      .reduce((sum, l) => sum + l.taxableAmt, 0);

    const journalLines = [
      { accountId: defaultAccountMap.accountsReceivable, type: 'debit',  amount: netReceivable },
      ...(totalTaxAmount > 0 ? [{ accountId: 'acc-1310', type: 'debit', amount: totalTaxAmount }] : []),
      ...(productSubtotal > 0 ? [{ accountId: defaultAccountMap.salesRevenue, type: 'credit', amount: Number(productSubtotal.toFixed(2)) }] : []),
      ...(serviceSubtotal > 0 ? [{ accountId: 'acc-4030', type: 'credit', amount: Number(serviceSubtotal.toFixed(2)) }] : []),
      ...(vatAmount > 0 ? [{ accountId: defaultAccountMap.vatOutput, type: 'credit', amount: vatAmount }] : []),
      ...(discountTotal > 0 ? [{ accountId: 'acc-4060', type: 'debit', amount: discountTotal }] : []),
    ];

    const cogsJournalLines = totalCogs > 0 ? [
      { accountId: defaultAccountMap.cogs,          type: 'debit',  amount: totalCogs },
      { accountId: defaultAccountMap.inventoryAsset,type: 'credit', amount: totalCogs },
    ] : [];

    // Try posting to MySQL
    let postedToMySQL = false;
    try {
      const res = await fetch(`${BACKEND_URL}/erp/sales-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `sinv-${Date.now()}`, ...invoiceData })
      });

      if (res.ok) {
        postedToMySQL = true;
        // Update customer balance in MySQL
        const custRes = await fetch(`${BACKEND_URL}/erp/customers`);
        if (custRes.ok) {
          const customersList = await custRes.json();
          const c = customersList.find(x => x.id === customerId);
          if (c) {
            const newBal = (c.currentBalance || 0) + grandTotal;
            await fetch(`${BACKEND_URL}/erp/customers/${customerId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...c, currentBalance: newBal })
            });
          }
        }
      }
    } catch (err) {
      console.warn('[salesService] MySQL postSalesInvoice failed, trying Firestore', err.message);
    }

    if (!postedToMySQL && isFirebaseConfigured()) {
      try {
        const invId = `sinv-${Date.now()}`;
        await saveToFirestore('sales_invoices', invId, { id: invId, ...invoiceData });
        
        // Fetch and update customer balance in Firestore
        const customers = await fetchCollectionFromFirestore('customers');
        const c = customers.find(x => x.id === customerId);
        if (c) {
          const newBal = (c.currentBalance || 0) + grandTotal;
          await saveToFirestore('customers', customerId, { ...c, currentBalance: newBal });
        }
      } catch (fbErr) {
        console.warn('[salesService] Firestore postSalesInvoice failed', fbErr.message);
      }
    }

    // Offline LocalStorage updates
    const customers = getLocalCustomers();
    saveLocalCustomers(customers.map(c => c.id === customerId ? { ...c, currentBalance: (c.currentBalance || 0) + grandTotal } : c));

    const invoices = getLocal('erp_sales_invoices');
    saveLocal('erp_sales_invoices', [{ id: `sinv-${Date.now()}`, ...invoiceData }, ...invoices]);

    // Stock reduction - ONLY if no Chalan is linked (otherwise stock was already reduced when the Chalan was dispatched!)
    if (!chalanNo) {
      for (const item of items) {
        if (item.type === 'service') continue;
        await inventoryService.sellStockOut(item.productId, null, item.qty, invoiceNo);
      }
    }

    // Revenue journal entry
    await accountingService.postJournalEntry({ date: invoiceDate, refNo: invoiceNo, narration: invoiceData.narration, lines: journalLines, sourceModule: 'sales', sourceRefId: invoiceNo });

    // COGS journal entry
    if (cogsJournalLines.length > 0) {
      await accountingService.postJournalEntry({ date: invoiceDate, refNo: `${invoiceNo}-COGS`, narration: `COGS for ${invoiceNo}`, lines: cogsJournalLines, sourceModule: 'sales', sourceRefId: invoiceNo });
    }

    // Trigger auto-task rule engine
    try {
      const { taskService } = await import('./taskService');
      await taskService.triggerAutoTaskRules('sales', invoiceData, currentUser);
    } catch (err) {
      console.warn('Auto-task rules trigger failed:', err);
    }

    await auditService.logCreate(currentUser, 'sales', invoiceNo, invoiceNo, `Sales invoice ${invoiceNo} — BDT ${grandTotal.toLocaleString()} | COGS BDT ${totalCogs.toLocaleString()}`, null, invoiceData);
    return invoiceNo;
  },

  /* ── Sales Return (reversal) ── */
  postSalesReturn: async (originalInvoiceNo, returnItems, returnNarration, currentUser) => {
    const vatCalc   = vatService.calculateInvoiceVAT(returnItems);
    const subtotal  = vatCalc.subtotal;
    const vatAmount = vatCalc.totalVat;
    const grandTotal= vatCalc.grandTotal;

    const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
    const totalCogs = returnItems.reduce((s, item) => {
      if (item.type === 'service') return s;
      const p = products.find(x => x.id === item.productId);
      return s + item.qty * (p?.purchasePrice || p?.price || 0);
    }, 0);

    const returnNo = `SR-${Date.now().toString().slice(-6)}`;
    const date     = new Date().toISOString().substring(0, 10);

    const revenueReversalLines = [
      { accountId: defaultAccountMap.salesReturns,       type: 'debit',  amount: subtotal   },
      ...(vatAmount > 0 ? [{ accountId: defaultAccountMap.vatOutput, type: 'debit', amount: vatAmount }] : []),
      { accountId: defaultAccountMap.accountsReceivable, type: 'credit', amount: grandTotal  },
    ];

    const cogsReversalLines = totalCogs > 0 ? [
      { accountId: defaultAccountMap.inventoryAsset, type: 'debit',  amount: totalCogs },
      { accountId: defaultAccountMap.cogs,           type: 'credit', amount: totalCogs },
    ] : [];

    // Try posting sales return to MySQL
    let postedToMySQL = false;
    try {
      const res = await fetch(`${BACKEND_URL}/erp/sales-returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `sret-${Date.now()}`,
          returnNo,
          originalInvoiceNo,
          date,
          items: vatCalc.lines,
          subtotal,
          vatAmount,
          grandTotal,
          narration: returnNarration,
          postedBy: currentUser?.uid || 'system',
          createdAt: new Date().toISOString()
        })
      });
      if (res.ok) {
        postedToMySQL = true;
      }
    } catch (err) {
      console.warn('[salesService] MySQL postSalesReturn failed, trying Firestore', err.message);
    }

    if (!postedToMySQL && isFirebaseConfigured()) {
      try {
        const sretId = `sret-${Date.now()}`;
        await saveToFirestore('sales_returns', sretId, {
          id: sretId,
          returnNo,
          originalInvoiceNo,
          date,
          items: vatCalc.lines,
          subtotal,
          vatAmount,
          grandTotal,
          narration: returnNarration,
          postedBy: currentUser?.uid || 'system',
          createdAt: new Date().toISOString()
        });
      } catch (fbErr) {
        console.warn('[salesService] Firestore postSalesReturn failed', fbErr.message);
      }
    }

    // Restore stock
    for (const item of returnItems) {
      if (item.type === 'service') continue;
      await inventoryService.purchaseStockIn(item.productId, null, item.qty, item.unitPrice || 0, returnNo);
    }

    await accountingService.postJournalEntry({ date, refNo: returnNo, narration: returnNarration || `Sales return for ${originalInvoiceNo}`, lines: revenueReversalLines, sourceModule: 'sales', sourceRefId: returnNo });

    if (cogsReversalLines.length > 0) {
      await accountingService.postJournalEntry({ date, refNo: `${returnNo}-COGS`, narration: `COGS reversal for ${returnNo}`, lines: cogsReversalLines, sourceModule: 'sales', sourceRefId: returnNo });
    }

    // Reduce customer balance in MySQL/Firestore
    const customerId = returnItems[0]?.customerId;
    if (customerId) {
      let updatedInMySQL = false;
      try {
        const custRes = await fetch(`${BACKEND_URL}/erp/customers`);
        if (custRes.ok) {
          const customersList = await custRes.json();
          const c = customersList.find(x => x.id === customerId);
          if (c) {
            const newBal = Math.max(0, (c.currentBalance || 0) - grandTotal);
            await fetch(`${BACKEND_URL}/erp/customers/${customerId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...c, currentBalance: newBal })
            });
            updatedInMySQL = true;
          }
        }
      } catch (err) {
        console.warn('[salesService] MySQL salesReturn customer balance update failed, trying Firestore', err.message);
      }

      if (!updatedInMySQL && isFirebaseConfigured()) {
        try {
          const customers = await fetchCollectionFromFirestore('customers');
          const c = customers.find(x => x.id === customerId);
          if (c) {
            const newBal = Math.max(0, (c.currentBalance || 0) - grandTotal);
            await saveToFirestore('customers', customerId, { ...c, currentBalance: newBal });
          }
        } catch (fbErr) {
          console.warn('[salesService] Firestore salesReturn customer balance update failed', fbErr.message);
        }
      }

      // Local mirror
      const customers = getLocalCustomers();
      saveLocalCustomers(customers.map(c => c.id === customerId ? { ...c, currentBalance: Math.max(0, (c.currentBalance || 0) - grandTotal) } : c));
    }

    // Save return record locally
    const returns = getLocal('erp_sales_returns');
    saveLocal('erp_sales_returns', [{ id: `sret-${Date.now()}`, returnNo, originalInvoiceNo, date, items: vatCalc.lines, subtotal, vatAmount, grandTotal, totalCogs }, ...returns]);

    await auditService.logReverse(currentUser, 'sales', returnNo, returnNo, `Sales return ${returnNo} against ${originalInvoiceNo}`);
    return returnNo;
  },

  /* ── Receive Payment from Customer ── */
  receiveFromCustomer: async ({ customerId, amount, method, accountId, narration, chequeNo, invoiceNo }, currentUser) => {
    if (!amount || Number(amount) <= 0) throw new Error('Receipt amount must be greater than zero.');
    const amt       = Number(amount);
    const receiptNo = `RV-${Date.now().toString().slice(-6)}`;
    const date      = new Date().toISOString().substring(0, 10);

    const bankAccount = accountId || defaultAccountMap.bank;
    await accountingService.postJournalEntry({
      date, refNo: receiptNo,
      narration: narration || `Customer receipt — ${receiptNo}`,
      lines: [
        { accountId: bankAccount,                         type: 'debit',  amount: amt },
        { accountId: defaultAccountMap.accountsReceivable,type: 'credit', amount: amt },
      ],
      sourceModule: 'sales', sourceRefId: receiptNo,
    });

    // Try updating customer balance & invoice status in MySQL
    let updatedInMySQL = false;
    try {
      const custRes = await fetch(`${BACKEND_URL}/erp/customers`);
      if (custRes.ok) {
        const customersList = await custRes.json();
        const c = customersList.find(x => x.id === customerId);
        if (c) {
          const newBal = Math.max(0, (c.currentBalance || 0) - amt);
          await fetch(`${BACKEND_URL}/erp/customers/${customerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...c, currentBalance: newBal })
          });
          updatedInMySQL = true;
        }
      }

      if (invoiceNo) {
        const invRes = await fetch(`${BACKEND_URL}/erp/sales-invoices`);
        if (invRes.ok) {
          const invList = await invRes.json();
          const targetInv = invList.find(i => i.invoiceNo === invoiceNo);
          if (targetInv) {
            await fetch(`${BACKEND_URL}/erp/sales-invoices/${targetInv.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...targetInv, paymentStatus: 'paid' })
            });
          }
        }
      }
    } catch (err) {
      console.warn('[salesService] MySQL customer receipt balance update failed, trying Firestore', err.message);
    }

    if (!updatedInMySQL && isFirebaseConfigured()) {
      try {
        const customers = await fetchCollectionFromFirestore('customers');
        const c = customers.find(x => x.id === customerId);
        if (c) {
          const newBal = Math.max(0, (c.currentBalance || 0) - amt);
          await saveToFirestore('customers', customerId, { ...c, currentBalance: newBal });
        }

        if (invoiceNo) {
          const invoices = await fetchCollectionFromFirestore('sales_invoices');
          const targetInv = invoices.find(i => i.invoiceNo === invoiceNo);
          if (targetInv) {
            await saveToFirestore('sales_invoices', targetInv.id, { ...targetInv, paymentStatus: 'paid' });
          }
        }
        
        const rcptId = `rcpt-${Date.now()}`;
        await saveToFirestore('payments', rcptId, {
          id: rcptId,
          receiptNo,
          customerId,
          amount: amt,
          method: method || 'bank',
          accountId: bankAccount,
          chequeNo: chequeNo || '',
          date,
          narration,
          invoiceNo: invoiceNo || '',
          type: 'receipt'
        });
      } catch (fbErr) {
        console.warn('[salesService] Firestore customer receipt balance update/payment save failed', fbErr.message);
      }
    }

    // Reduce customer AR balance locally
    const customers = getLocalCustomers();
    saveLocalCustomers(customers.map(c => c.id === customerId ? { ...c, currentBalance: Math.max(0, (c.currentBalance || 0) - amt) } : c));

    // Update invoice paidAmount and paymentStatus locally (partial payment support)
    if (invoiceNo) {
      const invoices = getLocal('erp_sales_invoices');
      saveLocal('erp_sales_invoices', invoices.map(i => {
        if (i.invoiceNo !== invoiceNo) return i;
        const newPaid = (i.paidAmount || 0) + amt;
        const total = i.grandTotal || 0;
        const remaining = total - newPaid;
        return { ...i, paidAmount: +newPaid.toFixed(2), paymentStatus: remaining <= 0.01 ? 'paid' : 'partial' };
      }));
    }

    // Save receipt record locally
    const receipts = getLocal('erp_customer_receipts');
    saveLocal('erp_customer_receipts', [{ id: `rcpt-${Date.now()}`, receiptNo, customerId, amount: amt, method: method || 'bank', accountId: bankAccount, chequeNo: chequeNo || '', date, narration, invoiceNo: invoiceNo || '' }, ...receipts]);

    await auditService.logPost(currentUser, 'sales', receiptNo, receiptNo, `Customer receipt BDT ${amt.toLocaleString()}${invoiceNo ? ` for invoice ${invoiceNo}` : ''}`);
    return receiptNo;
  },

  /* ── Queries ── */
  getSalesInvoices: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/sales-invoices`);
      if (res.ok) {
        const data = await res.json();
        saveLocal('erp_sales_invoices', data);
        return data;
      }
    } catch (err) {
      console.warn('[salesService] MySQL salesInvoices fetch failed, trying Firestore', err.message);
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('sales_invoices');
        if (data && data.length > 0) {
          saveLocal('erp_sales_invoices', data);
          return data;
        }
      }
    }
    return getLocal('erp_sales_invoices');
  },

  getSalesInvoice: async (invoiceNo) => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/sales-invoices`);
      if (res.ok) {
        const data = await res.json();
        return data.find(i => i.invoiceNo === invoiceNo) || null;
      }
    } catch (err) {
      console.warn('[salesService] MySQL getSalesInvoice failed, using LocalStorage', err.message);
    }
    const invoices = getLocal('erp_sales_invoices');
    return invoices.find(i => i.invoiceNo === invoiceNo) || null;
  },

  getCustomerStatement: (customerId, fromDate, toDate) => {
    const invoices = getLocal('erp_sales_invoices').filter(i => i.customerId === customerId);
    const receipts = getLocal('erp_customer_receipts').filter(r => r.customerId === customerId);
    const returns  = getLocal('erp_sales_returns');

    const transactions = [
      ...invoices.map(i => ({ date: i.date, refNo: i.invoiceNo,  type: 'Invoice',  debit: i.grandTotal, credit: 0,       description: i.narration })),
      ...receipts.map(r => ({ date: r.date, refNo: r.receiptNo,  type: 'Receipt',  debit: 0,            credit: r.amount, description: r.narration })),
      ...returns.map(r  => ({ date: r.date, refNo: r.returnNo,   type: 'Return',   debit: 0,            credit: r.grandTotal, description: `Return against ${r.originalInvoiceNo}` })),
    ]
      .filter(t => (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate))
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = 0;
    return transactions.map(t => {
      runningBalance += t.debit - t.credit;
      return { ...t, balance: +runningBalance.toFixed(2) };
    });
  },

  /* ── Sales Summary for Dashboard ── */
  getSalesSummary: (days = 30) => {
    const since = new Date(Date.now() - days * 86400000).toISOString().substring(0, 10);
    const invoices = getLocal('erp_sales_invoices').filter(i => i.date >= since);
    return {
      count:      invoices.length,
      revenue:    +invoices.reduce((s, i) => s + i.grandTotal, 0).toFixed(2),
      cogs:       +invoices.reduce((s, i) => s + (i.totalCogs || 0), 0).toFixed(2),
      grossProfit:+invoices.reduce((s, i) => s + (i.subtotal - (i.totalCogs || 0)), 0).toFixed(2),
      vatCollected:+invoices.reduce((s, i) => s + i.vatAmount, 0).toFixed(2),
    };
  },

  /* ── Customer Management ── */
  saveCustomer: async (customer, isEdit, currentUser) => {
    // ── Layer 2: Service guard (name + phone combination) ─────────────────
    if (!isEdit) {
      const existingCustomers = getLocalCustomers();
      const dup = findNamePhoneDuplicate(existingCustomers, customer.name, customer.phone, customer.id);
      if (dup) throw new Error(customerDuplicateMessage(dup));
    }
    // ────────────────────────────────────────────────────────────────────────
    const url = isEdit ? `${BACKEND_URL}/erp/customers/${customer.id}` : `${BACKEND_URL}/erp/customers`;
    const method = isEdit ? 'PUT' : 'POST';
    let savedInMySQL = false;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      });
      if (res.ok) {
        savedInMySQL = true;
        const local = getLocalCustomers();
        const updated = isEdit ? local.map(c => c.id === customer.id ? customer : c) : [...local, customer];
        saveLocalCustomers(updated);
        await auditService.logPost(currentUser, 'sales', customer.id, customer.id, `${isEdit ? 'Updated' : 'Registered'} customer: ${customer.name}`);
        return true;
      }
    } catch (err) {
      console.warn('[salesService] Customer save failed, trying Firestore', err.message);
    }

    if (!savedInMySQL && isFirebaseConfigured()) {
      try {
        await saveToFirestore('customers', customer.id, customer);
        await auditService.logPost(currentUser, 'sales', customer.id, customer.id, `${isEdit ? 'Updated' : 'Registered'} customer (Firestore): ${customer.name}`);
      } catch (fbErr) {
        console.warn('[salesService] Firestore customer save failed, queuing offline', fbErr.message);
        syncQueueService.addToQueue(url, method, customer, 'Customers');
      }
    }

    // local fallback
    const local = getLocalCustomers();
    const updated = isEdit ? local.map(c => c.id === customer.id ? customer : c) : [...local, customer];
    saveLocalCustomers(updated);
    return true;
  },

  /* ── AR Aging Report ── */
  getARAgingReport: (invoices = []) => {
    const today = new Date();
    const buckets = [
      { key: 'current', label: '0–15 Days',  min: 0,  max: 15,       invoices: [], total: 0, color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
      { key: 'b30',     label: '16–30 Days', min: 16, max: 30,       invoices: [], total: 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      { key: 'b60',     label: '31–60 Days', min: 31, max: 60,       invoices: [], total: 0, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
      { key: 'b90',     label: '61–90 Days', min: 61, max: 90,       invoices: [], total: 0, color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
      { key: 'over90',  label: '90+ Days',   min: 91, max: Infinity, invoices: [], total: 0, color: '#7f1d1d', bg: 'rgba(127,29,29,0.15)' },
    ];
    invoices.filter(i => i.paymentStatus !== 'paid').forEach(inv => {
      const dueDate = inv.dueDate
        ? new Date(inv.dueDate)
        : new Date(new Date(inv.date || new Date()).setDate(new Date(inv.date || new Date()).getDate() + 30));
      const daysPast = Math.max(0, Math.floor((today - dueDate) / 86400000));
      const remaining = (inv.grandTotal || 0) - (inv.paidAmount || 0);
      const bucket = buckets.find(b => daysPast >= b.min && daysPast <= b.max) || buckets[buckets.length - 1];
      bucket.invoices.push({ ...inv, daysOverdue: daysPast, remaining });
      bucket.total += remaining;
    });
    return buckets;
  },

  /* ── Dashboard Aggregations ── */
  getDashboardStats: (invoices = [], returnsList = [], receiptsList = []) => {
    const totalRevenue = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
    const totalVAT    = invoices.reduce((s, i) => s + (i.vatAmount  || 0), 0);
    const outstandingAR = invoices.filter(i => i.paymentStatus !== 'paid').reduce((s, i) => s + Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0)), 0);
    const paidCount    = invoices.filter(i => i.paymentStatus === 'paid').length;
    const partialCount = invoices.filter(i => i.paymentStatus === 'partial').length;
    const pendingApprovalCount = invoices.filter(i => i.approvalStatus === 'pending').length;
    const returnValue  = returnsList.reduce((s, r) => s + (r.grandTotal || 0), 0);
    const today        = new Date();
    const overdueCount = invoices.filter(i => {
      if (i.paymentStatus === 'paid') return false;
      const due = i.dueDate ? new Date(i.dueDate) : new Date(new Date(i.date || new Date()).setDate(new Date(i.date || new Date()).getDate() + 30));
      return due < today;
    }).length;
    const totalCogs    = invoices.reduce((s, i) => s + (i.totalCogs   || 0), 0);
    const totalSubtotal= invoices.reduce((s, i) => s + (i.subtotal    || 0), 0);
    const grossProfit  = totalSubtotal - totalCogs;
    const grossMargin  = totalSubtotal > 0 ? ((grossProfit / totalSubtotal) * 100).toFixed(1) : '0';

    const monthlySpend = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setMonth(d.getMonth() - m);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthlyInvs = invoices.filter(i => (i.date || '').startsWith(key));
      const value = monthlyInvs.reduce((s, i) => s + (i.grandTotal || 0), 0);
      const cogs = monthlyInvs.reduce((s, i) => s + (i.totalCogs || 0), 0);
      monthlySpend.push({ key, label, value, cogs });
    }

    const customerSpend = {};
    invoices.forEach(i => { customerSpend[i.customerId] = (customerSpend[i.customerId] || 0) + (i.grandTotal || 0); });
    const topCustomers  = Object.entries(customerSpend).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, value]) => ({ id, value }));

    const productSales = {};
    invoices.forEach(i => {
      (i.items || []).forEach(item => {
        if (!productSales[item.productId]) productSales[item.productId] = { id: item.productId, name: item.productName || item.productId, qty: 0, value: 0 };
        productSales[item.productId].qty   += item.qty       || 0;
        productSales[item.productId].value += item.lineTotal || 0;
      });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.value - a.value).slice(0, 5);

    return { totalInvoices: invoices.length, totalRevenue, totalVAT, outstandingAR, paidCount, partialCount, pendingApprovalCount, overdueCount, returnValue, grossProfit, grossMargin, monthlySpend, topCustomers, topProducts };
  },

  /* ── Receipt History ── */
  getReceiptHistory: (customerId = null) => {
    const receipts = getLocal('erp_customer_receipts');
    return customerId ? receipts.filter(r => r.customerId === customerId) : receipts;
  },

  /* ── Customer Intelligence ── */
  getCustomerIntelligence: (customerId) => {
    if (!customerId) return null;
    const invoices = getLocal('erp_sales_invoices').filter(i => i.customerId === customerId);
    const receipts = getLocal('erp_customer_receipts').filter(r => r.customerId === customerId);
    const returns  = getLocal('erp_sales_returns').filter(r => invoices.some(i => i.invoiceNo === r.originalInvoiceNo));
    const totalRevenue  = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
    const totalReceived = receipts.reduce((s, r) => s + (r.amount    || 0), 0);
    const returnValue   = returns.reduce((s,  r) => s + (r.grandTotal || 0), 0);
    const sorted     = [...invoices].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const sortedRcpt = [...receipts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const today = new Date();
    const overdueCount = invoices.filter(i => {
      if (i.paymentStatus === 'paid') return false;
      const due = i.dueDate ? new Date(i.dueDate) : new Date(new Date(i.date || new Date()).setDate(new Date(i.date || new Date()).getDate() + 30));
      return due < today;
    }).length;
    return {
      totalInvoices: invoices.length, totalRevenue, totalReceived,
      outstandingBalance: Math.max(0, totalRevenue - totalReceived),
      returnValue,
      returnRate: invoices.length > 0 ? ((returns.length / invoices.length) * 100).toFixed(1) : '0',
      avgInvoiceSize: invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0,
      lastSaleDate:    sorted[0]?.date    || '—',
      lastPaymentDate: sortedRcpt[0]?.date || '—',
      overdueCount,
    };
  },

  /* ── Approve Invoice ── */
  approveInvoice: (invoiceNo, approverName) => {
    const invoices = getLocal('erp_sales_invoices');
    saveLocal('erp_sales_invoices', invoices.map(i =>
      i.invoiceNo === invoiceNo
        ? { ...i, approvalStatus: 'approved', approvedBy: approverName, approvedAt: new Date().toISOString() }
        : i
    ));
    return true;
  },

  /* ── Update Delivery Status ── */
  updateDeliveryStatus: (invoiceNo, deliveryStatus, chalanNo = '') => {
    const invoices = getLocal('erp_sales_invoices');
    const invoice = invoices.find(inv => inv.invoiceNo === invoiceNo);
    
    saveLocal('erp_sales_invoices', invoices.map(i =>
      i.invoiceNo === invoiceNo
        ? { ...i, deliveryStatus, chalanNo: chalanNo || i.chalanNo || '',
            ...(deliveryStatus === 'dispatched' ? { dispatchedAt: new Date().toISOString() } : {}),
            ...(deliveryStatus === 'delivered'  ? { deliveredAt:  new Date().toISOString() } : {}) }
        : i
    ));

    // Auto-create FSM Asset records if status changes to delivered
    if (deliveryStatus === 'delivered' && invoice && invoice.items) {
      try {
        const assets = JSON.parse(localStorage.getItem('erp_fsm_assets') || '[]');
        const customers = JSON.parse(localStorage.getItem('erp_customers') || '[]');
        const targetCust = customers.find(c => c.id === invoice.customerId);
        
        invoice.items.forEach(item => {
          const qty = Number(item.qty || 1);
          const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
          const prod = products.find(p => p.id === item.productId);
          const warrantyMonths = prod?.warrantyMonths !== undefined ? prod.warrantyMonths : 12;

          for (let q = 1; q <= qty; q++) {
            const assetId = `asset-${Date.now()}-${item.productId}-${q}`;
            const purchaseDate = invoice.date || new Date().toISOString().substring(0, 10);
            const exp = new Date(purchaseDate);
            exp.setMonth(exp.getMonth() + warrantyMonths);
            const warrantyExpiry = exp.toISOString().substring(0, 10);

            const newAsset = {
              id: assetId,
              serialNo: `${prod?.sku || 'SN'}-${String(Date.now()).slice(-4)}-${q}`,
              productId: item.productId,
              productName: item.productName || prod?.name || '',
              customerId: invoice.customerId,
              customerName: targetCust?.name || 'Customer',
              purchaseDate,
              warrantyExpiry,
              installationDate: new Date().toISOString().substring(0, 10),
              calibrationDueDate: new Date(Date.now() + 180 * 86400000).toISOString().substring(0, 10),
              amcContractId: '',
              serviceHistory: [],
              partsChanged: [],
              modelConfig: prod?.description || '',
              firmwareVersion: 'v1.0.0',
              softwareLicense: 'OEM',
              gpsCoordinates: '23.8103, 90.4125',
              commissioningReport: 'Auto registered on delivery.',
              atrStatus: 'Passed',
              healthScore: 100,
              attachments: []
            };
            assets.push(newAsset);
          }
        });
        localStorage.setItem('erp_fsm_assets', JSON.stringify(assets));
      } catch (err) {
        console.error('Error auto-creating assets: ', err);
      }
    }
    return true;
  },

  /* ── Sales Quotations (QT) ── */
  getQuotations: () => {
    const list = getLocal('erp_quotations');
    if (list.length === 0) {
      const seed = [
        {
          id: 'QT-2026-0001',
          date: '2026-06-28',
          customerId: 'cust-1',
          salesperson: 'Imtiaz Ahmed',
          items: [{ productId: 'prod-1', productName: 'Dell Latitude 5420 Laptop', qty: 5, unitPrice: 75000 }],
          status: 'draft',
          justification: 'Corporate office tech refresh.'
        },
        {
          id: 'QT-2026-0002',
          date: '2026-07-01',
          customerId: 'cust-2',
          salesperson: 'Karim Rahman',
          items: [{ productId: 'prod-2', productName: 'GNSS Antenna Connector', qty: 10, unitPrice: 2800 }],
          status: 'accepted',
          justification: 'Calibrator field trial kits.'
        }
      ];
      saveLocal('erp_quotations', seed);
      return seed;
    }
    return list;
  },

  saveQuotation: (quote, currentUser) => {
    const list = getLocal('erp_quotations');
    const existingIdx = list.findIndex(q => q.id === quote.id);
    if (existingIdx !== -1) {
      list[existingIdx] = quote;
    } else {
      list.unshift(quote);
    }
    saveLocal('erp_quotations', list);
    if (currentUser) {
      auditService.logCreate(currentUser, 'sales', quote.id, quote.id, `Created quotation ${quote.id} for Customer ID: ${quote.customerId}`, null, quote);
    }
    return quote.id;
  },

  acceptQuotation: (quoteId) => {
    const list = getLocal('erp_quotations');
    const quote = list.find(q => q.id === quoteId);
    saveLocal('erp_quotations', list.map(q => q.id === quoteId ? { ...q, status: 'accepted' } : q));

    if (quote) {
      // Trigger auto-task rule engine for quotation acceptance (CRM stage)
      import('./taskService').then(({ taskService }) => {
        taskService.triggerAutoTaskRules('crm', quote, null);
      }).catch(err => {
        console.warn('Auto-task rules trigger for quotation failed:', err);
      });
    }
    return true;
  },

  /* ── Sales Orders (SO) ── */
  getSalesOrders: () => {
    const list = getLocal('erp_sales_orders');
    if (list.length === 0) {
      const seed = [
        {
          id: 'SO-2026-0001',
          quoteId: 'QT-2026-0002',
          customerId: 'cust-2',
          date: '2026-07-01',
          items: [{ productId: 'prod-2', productName: 'GNSS Antenna Connector', qty: 10, unitPrice: 2800 }],
          status: 'approved',
          paymentTerms: 'Net 30',
          approvedBy: 'Sales Manager',
          approvedAt: '2026-07-01T15:30:00.000Z'
        }
      ];
      saveLocal('erp_sales_orders', seed);
      return seed;
    }
    return list;
  },

  saveSalesOrder: (order, currentUser) => {
    const list = getLocal('erp_sales_orders');
    const existingIdx = list.findIndex(o => o.id === order.id);
    if (existingIdx !== -1) {
      list[existingIdx] = order;
    } else {
      list.unshift(order);
    }
    saveLocal('erp_sales_orders', list);
    if (currentUser) {
      auditService.logCreate(currentUser, 'sales', order.id, order.id, `Created Sales Order ${order.id} (Ref Quote: ${order.quoteId || 'None'})`, null, order);
    }
    return order.id;
  },

  approveSalesOrder: async (orderId, approverName, currentUser) => {
    const list = getLocal('erp_sales_orders');
    const order = list.find(o => o.id === orderId);
    if (!order) throw new Error(`Sales Order ${orderId} not found.`);

    // 1. Mark SO as approved first
    saveLocal('erp_sales_orders', list.map(o => o.id === orderId
      ? { ...o, status: 'approved', approvedBy: approverName, approvedAt: new Date().toISOString() }
      : o));

    // 2. Auto-create Sales Invoice (pre-delivery billing)
    let invoiceNo = null;
    let invoiceWarning = null;
    try {
      const payTermDays = parseInt((order.paymentTerms || 'Net 30').replace(/\D/g, '') || '30', 10);

      // Detect item types: if productId is NOT in the products list, treat it as a service
      const localProducts = JSON.parse(localStorage.getItem('erp_products') || '[]');

      invoiceNo = await salesService.postSalesInvoice({
        customerId:    order.customerId,
        soNumber:      order.id,
        quoteNo:       order.quoteId || '',
        date:          new Date().toISOString().substring(0, 10),
        dueDate:       new Date(Date.now() + payTermDays * 86400000).toISOString().substring(0, 10),
        narration:     `Auto-invoice for Sales Order ${order.id}`,
        branchId:      'br-1',
        items:         (order.items || []).map(i => {
          // If type is already set, use it. Otherwise detect by presence in products list.
          const isProduct = localProducts.some(p => p.id === i.productId);
          const resolvedType = i.type || (isProduct ? 'product' : 'service');
          return {
            type:        resolvedType,
            productId:   i.productId,
            productName: i.productName,
            qty:         i.qty,
            unitPrice:   i.unitPrice,
            vatRateId:   i.vatRateId  || 'vat-std',
            taxRateId:   i.taxRateId  || 'tax-exempt',
            discount:    i.discount   || 0,
            narration:   i.narration  || i.productName || '',
          };
        }),
      }, currentUser);
    } catch (err) {
      // Soft-fail: SO remains approved, invoice is skipped with a warning
      invoiceWarning = err.message;
      console.warn(`[salesService] Auto-invoice for ${orderId} skipped:`, err.message);
    }

    // 3. Store invoiceNo / status back on SO
    const finalStatus = invoiceNo ? 'invoiced' : 'approved';
    const updatedList = getLocal('erp_sales_orders');
    saveLocal('erp_sales_orders', updatedList.map(o => o.id === orderId
      ? { ...o, status: finalStatus, invoiceNo: invoiceNo || '', invoiceWarning: invoiceWarning || '' }
      : o));

    // 4. Persist SO status to MySQL backend (best-effort)
    try {
      await fetch(`${BACKEND_URL}/erp/sales-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: finalStatus, approvedBy: approverName, invoiceNo: invoiceNo || '' })
      });
    } catch (err) {
      console.warn('[salesService] MySQL SO status update failed (offline ok):', err.message);
    }

    return { invoiceNo, warning: invoiceWarning };
  },

  rejectSalesOrder: (orderId) => {
    const list = getLocal('erp_sales_orders');
    saveLocal('erp_sales_orders', list.map(o => o.id === orderId ? { ...o, status: 'rejected' } : o));
    return true;
  },

  /* ── Delivery Chalans (CH) ── */
  getChalans: () => {
    const list = getLocal('erp_chalans');
    if (list.length === 0) {
      const seed = [
        {
          id: 'CH-2026-0001',
          soId: 'SO-2026-0001',
          date: '2026-07-02',
          driverName: 'Abul Hussain',
          vehicleNo: 'Dhaka Metro-Ta-11-2233',
          items: [{ productId: 'prod-2', productName: 'GNSS Antenna Connector', qtyDispatched: 8, unitPrice: 2800 }],
          status: 'dispatched'
        }
      ];
      saveLocal('erp_chalans', seed);
      return seed;
    }
    return list;
  },

  saveChalan: async (chalan, currentUser) => {
    const list = getLocal('erp_chalans');
    list.unshift(chalan);
    saveLocal('erp_chalans', list);

    // CRITICAL CONTROL: Reduce physical stock level when Chalan is dispatched
    for (const item of chalan.items) {
      await inventoryService.sellStockOut(item.productId, null, item.qtyDispatched, chalan.id);
    }

    // Update Sales Order status to reflect shipment
    const orders = getLocal('erp_sales_orders');
    saveLocal('erp_sales_orders', orders.map(o => {
      if (o.id === chalan.soId) {
        return { ...o, status: 'processing' };
      }
      return o;
    }));

    if (currentUser) {
      auditService.logCreate(currentUser, 'sales', chalan.id, chalan.id, `Dispatched Delivery Chalan ${chalan.id} against Sales Order ${chalan.soId}`, null, chalan);
    }
    return chalan.id;
  },

  deleteCustomer: async (id, currentUser) => {
    const url = `${BACKEND_URL}/erp/customers/${id}`;
    let deletedInMySQL = false;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        deletedInMySQL = true;
        const local = getLocalCustomers();
        saveLocalCustomers(local.filter(c => c.id !== id));
        await auditService.logPost(currentUser, 'sales', id, id, `Deleted customer ID: ${id}`);
        return true;
      }
    } catch (err) {
      console.warn('[salesService] Customer delete failed, trying Firestore', err.message);
    }

    if (!deletedInMySQL && isFirebaseConfigured()) {
      try {
        await deleteFromFirestore('customers', id);
        await auditService.logPost(currentUser, 'sales', id, id, `Deleted customer ID: ${id} (Firestore)`);
      } catch (fbErr) {
        console.warn('[salesService] Firestore customer delete failed, queueing offline', fbErr.message);
        syncQueueService.addToQueue(url, 'DELETE', null, 'Customers');
      }
    }

    // local fallback
    const local = getLocalCustomers();
    saveLocalCustomers(local.filter(c => c.id !== id));
    return true;
  },
};
