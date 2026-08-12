import { inventoryService } from './inventoryService';
import { accountingService } from './accountingService';
import { auditService } from './auditService';
import { vatService } from './vatService';
import { defaultSettings, defaultAccountMap } from '../database/seedData';
import { syncQueueService } from './syncQueueService';
import { isFirebaseConfigured } from '../config/firebase';
import { saveToFirestore, fetchCollectionFromFirestore, deleteFromFirestore } from '../utils/hrmsFirebase';
import { findNamePhoneDuplicate, supplierDuplicateMessage } from '../utils/duplicateChecker';

const BACKEND_URL = '/api';

/* ── Local storage helpers ───────────────────────────────────────────────── */
const getLocal  = (key)       => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveLocal = (key, data)   => localStorage.setItem(key, JSON.stringify(data));

const getLocalSuppliers = () => {
  const r = localStorage.getItem('erp_suppliers');
  return r ? JSON.parse(r) : [];
};
const saveLocalSuppliers = (s) => localStorage.setItem('erp_suppliers', JSON.stringify(s));

/* ── Invoice number generator ────────────────────────────────────────────── */
const nextInvoiceNo = () => {
  try {
    const s = localStorage.getItem('erp_settings');
    const settings = s ? JSON.parse(s) : defaultSettings;
    const prefix = settings.invoice?.purchasePrefix || 'ERP-P-';
    let num = Number(settings.invoice?.nextPurchaseNum || 1);
    const refNo = `${prefix}${String(num).padStart(4, '0')}`;
    settings.invoice = { ...settings.invoice, nextPurchaseNum: num + 1 };
    localStorage.setItem('erp_settings', JSON.stringify(settings));
    return refNo;
  } catch {
    return `ERP-P-${Date.now().toString().slice(-6)}`;
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   PURCHASE SERVICE
   ══════════════════════════════════════════════════════════════════════════ */
export const purchaseService = {

  // Fetch Suppliers list from MySQL / LocalStorage / Firestore
  getSuppliers: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/suppliers`);
      if (res.ok) {
        const data = await res.json();
        saveLocalSuppliers(data);
        return data;
      }
    } catch (err) {
      console.warn('[purchaseService] MySQL suppliers fetch failed, trying Firestore', err.message);
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('suppliers');
        if (data && data.length > 0) {
          saveLocalSuppliers(data);
          return data;
        }
      }
    }
    return getLocalSuppliers();
  },

  /* ── Post a Purchase Invoice ── */
  postPurchaseInvoice: async (invoice, currentUser) => {
    const { supplierId, branchId, warehouseId, items, narration, date, landedCost, allocationMethod } = invoice;

    const freight = Number(landedCost?.freight || 0);
    const customs = Number(landedCost?.customs || 0);
    const insurance = Number(landedCost?.insurance || 0);
    const totalLanded = freight + customs + insurance;

    // 1. Calculate VAT per line
    const vatCalc   = vatService.calculateInvoiceVAT(items);
    const subtotal  = vatCalc.subtotal;
    const vatAmount = vatCalc.totalVat;
    const grandTotal= vatCalc.grandTotal;

    // 2. Guard: no zero invoices
    if (grandTotal <= 0) throw new Error('Invoice total must be greater than zero.');

    // 3. Build invoice ref no
    const invoiceNo = nextInvoiceNo();
    const invoiceDate = date || new Date().toISOString().substring(0, 10);

    // Calculate landed cost allocation per item
    const totalQty = items.reduce((sum, item) => sum + Number(item.qty), 0);
    const totalValue = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);

    const adjustedLines = vatCalc.lines.map(l => {
      let lineShare = 0;
      if (totalLanded > 0) {
        if (allocationMethod === 'quantity' && totalQty > 0) {
          lineShare = (Number(l.qty) / totalQty) * totalLanded;
        } else if (allocationMethod === 'value' && totalValue > 0) {
          lineShare = ((Number(l.qty) * Number(l.unitPrice)) / totalValue) * totalLanded;
        }
      }
      const landedPerUnit = Number(l.qty) > 0 ? lineShare / Number(l.qty) : 0;
      const adjustedPrice = Number(l.unitPrice) + landedPerUnit;
      return {
        productId:  l.productId,
        productName:l.productName || '',
        qty:        l.qty,
        unitPrice:  l.unitPrice,
        adjustedUnitPrice: Number(adjustedPrice.toFixed(2)),
        landedAllocation: Number(lineShare.toFixed(2)),
        vatRateId:  l.vatRateId,
        vatRate:    l.vatRate,
        taxableAmt: l.taxableAmt,
        vatAmount:  l.vatAmount,
        lineTotal:  l.lineTotal,
      };
    });

    const invoiceData = {
      invoiceNo,
      date:            invoiceDate,
      dueDate:         invoice.dueDate || new Date(new Date(invoiceDate).setDate(new Date(invoiceDate).getDate() + 30)).toISOString().substring(0, 10),
      supplierId,
      branchId:        branchId    || 'br-1',
      warehouseId:     warehouseId || 'wh-1',
      branch:          invoice.branch || 'Main Branch',
      items:           adjustedLines,
      subtotal,
      vatAmount,
      grandTotal,
      landedCost:      { freight, customs, insurance, total: totalLanded },
      allocationMethod: allocationMethod || 'value',
      narration:       narration || `Purchase from supplier`,
      paymentStatus:   'unpaid',
      paidAmount:      0,
      poNumber:        invoice.poNumber || '',
      grnNumber:       invoice.grnNumber || '',
      supplierInvoiceNo: invoice.supplierInvoiceNo || '',
      attachmentName:  invoice.attachmentName || null,
      approvalStatus:  (grandTotal + totalLanded) > 50000 ? 'pending' : 'auto_approved',
      approvedBy:      (grandTotal + totalLanded) <= 50000 ? 'System (Auto)' : '',
      approvedAt:      (grandTotal + totalLanded) <= 50000 ? new Date().toISOString() : '',
      threeWayMatchStatus: (invoice.poNumber || invoice.grnNumber) ? 'pending' : 'na',
      status:          'posted',
      postedBy:        currentUser?.uid || 'system',
      createdAt:       new Date().toISOString(),
    };

    const journalLines = [
      { accountId: defaultAccountMap.inventoryAsset, type: 'debit',  amount: subtotal + totalLanded  },
      ...(vatAmount > 0 ? [{ accountId: defaultAccountMap.vatInput, type: 'debit', amount: vatAmount }] : []),
      { accountId: defaultAccountMap.accountsPayable, type: 'credit', amount: grandTotal + totalLanded },
    ];

    // Try posting to MySQL backend
    let postedToMySQL = false;
    try {
      const res = await fetch(`${BACKEND_URL}/erp/purchase-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `inv-${Date.now()}`, ...invoiceData })
      });

      if (res.ok) {
        postedToMySQL = true;
        // Update supplier balance in MySQL
        const supRes = await fetch(`${BACKEND_URL}/erp/suppliers`);
        if (supRes.ok) {
          const suppliersList = await supRes.json();
          const s = suppliersList.find(x => x.id === supplierId);
          if (s) {
            const newBal = (s.currentBalance || 0) + grandTotal + totalLanded;
            await fetch(`${BACKEND_URL}/erp/suppliers/${supplierId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...s, currentBalance: newBal })
            });
          }
        }
      }
    } catch (err) {
      console.warn('[purchaseService] MySQL postPurchaseInvoice failed, trying Firestore', err.message);
    }

    if (!postedToMySQL && isFirebaseConfigured()) {
      try {
        const invId = `inv-${Date.now()}`;
        await saveToFirestore('purchase_invoices', invId, { id: invId, ...invoiceData });
        
        // Fetch and update supplier balance in Firestore
        const suppliers = await fetchCollectionFromFirestore('suppliers');
        const s = suppliers.find(x => x.id === supplierId);
        if (s) {
          const newBal = (s.currentBalance || 0) + grandTotal + totalLanded;
          await saveToFirestore('suppliers', supplierId, { ...s, currentBalance: newBal });
        }
      } catch (fbErr) {
        console.warn('[purchaseService] Firestore postPurchaseInvoice failed', fbErr.message);
      }
    }

    // Always update offline local cache
    const suppliers = getLocalSuppliers();
    saveLocalSuppliers(suppliers.map(s => s.id === supplierId ? { ...s, currentBalance: (s.currentBalance || 0) + grandTotal + totalLanded } : s));

    const invoices = getLocal('erp_purchase_invoices');
    saveLocal('erp_purchase_invoices', [{ id: `inv-${Date.now()}`, ...invoiceData }, ...invoices]);

    for (const item of adjustedLines) {
      await inventoryService.purchaseStockIn(item.productId, null, item.qty, item.adjustedUnitPrice, invoiceNo);
    }

    // Reverse GRN accrual if linked to a posted GRN
    if (invoice.grnNumber) {
      let grnTotalCost = 0;
      try {
        const grns = getLocal('erp_grns');
        const targetGrn = grns.find(g => g.id === invoice.grnNumber);
        if (targetGrn) {
          for (const item of targetGrn.items) {
            const qtyOk = Number(item.qtyReceived || 0) - Number(item.qtyRejected || 0);
            const price = Number(item.unitPrice || 0);
            grnTotalCost += qtyOk * price;
          }
        }
      } catch (err) {
        console.warn('[purchaseService] Error calculating GRN total cost for reversal:', err);
      }

      if (grnTotalCost > 0) {
        try {
          await accountingService.postJournalEntry({
            date: invoiceDate,
            refNo: `${invoice.grnNumber}-REV`,
            narration: `Reverse GRN Accrual on Supplier Invoice. Ref GRN: ${invoice.grnNumber}`,
            lines: [
              { accountId: defaultAccountMap.accountsPayable, type: 'debit',  amount: +grnTotalCost.toFixed(2) },
              { accountId: defaultAccountMap.inventoryAsset,  type: 'credit', amount: +grnTotalCost.toFixed(2) }
            ],
            sourceModule: 'purchases',
            sourceRefId: invoiceNo,
            voucherType: 'GRN_REV'
          });
        } catch (revErr) {
          console.warn('[purchaseService] Reversing GRN accrual journal failed:', revErr.message);
        }
      }
    }

    await accountingService.postJournalEntry({ date: invoiceDate, refNo: invoiceNo, narration: invoiceData.narration, lines: journalLines, sourceModule: 'purchases', sourceRefId: invoiceNo });

    await auditService.logCreate(currentUser, 'purchases', invoiceNo, invoiceNo, `Purchase invoice ${invoiceNo} — BDT ${(grandTotal + totalLanded).toLocaleString()}`, null, invoiceData);
    return invoiceNo;
  },

  /* ── Purchase Return (reversal) ── */
  postPurchaseReturn: async (originalInvoiceNo, returnItems, returnNarration, currentUser) => {
    const vatCalc   = vatService.calculateInvoiceVAT(returnItems);
    const subtotal  = vatCalc.subtotal;
    const vatAmount = vatCalc.totalVat;
    const grandTotal= vatCalc.grandTotal;

    const returnNo = `PR-${Date.now().toString().slice(-6)}`;
    const date     = new Date().toISOString().substring(0, 10);

    const journalLines = [
      { accountId: defaultAccountMap.accountsPayable, type: 'debit',  amount: grandTotal },
      { accountId: defaultAccountMap.inventoryAsset,  type: 'credit', amount: subtotal   },
      ...(vatAmount > 0 ? [{ accountId: defaultAccountMap.vatInput, type: 'credit', amount: vatAmount }] : []),
    ];

    // Try posting purchase return to MySQL
    let postedToMySQL = false;
    try {
      const res = await fetch(`${BACKEND_URL}/erp/purchase-returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `pret-${Date.now()}`,
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
      console.warn('[purchaseService] MySQL postPurchaseReturn failed, trying Firestore', err.message);
    }

    if (!postedToMySQL && isFirebaseConfigured()) {
      try {
        const pretId = `pret-${Date.now()}`;
        await saveToFirestore('purchase_returns', pretId, {
          id: pretId,
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
        console.warn('[purchaseService] Firestore postPurchaseReturn failed', fbErr.message);
      }
    }

    // Reduce stock for returned items
    for (const item of vatCalc.lines) {
      await inventoryService.adjustStock(item.productId, -item.qty, `Return: ${returnNo}`, currentUser);
    }

    await accountingService.postJournalEntry({ date, refNo: returnNo, narration: returnNarration || `Purchase return for ${originalInvoiceNo}`, lines: journalLines, sourceModule: 'purchases', sourceRefId: returnNo });

    // Save return record locally
    const returns = getLocal('erp_purchase_returns');
    saveLocal('erp_purchase_returns', [{ id: `ret-${Date.now()}`, returnNo, originalInvoiceNo, date, items: vatCalc.lines, subtotal, vatAmount, grandTotal }, ...returns]);

    await auditService.logReverse(currentUser, 'purchases', returnNo, returnNo, `Purchase return ${returnNo} against ${originalInvoiceNo}`);
    return returnNo;
  },

  /* ── Pay a Supplier (AP reduction) ── */
  paySupplier: async ({ supplierId, amount, method, accountId, narration, chequeNo, invoiceNo }, currentUser) => {
    if (!amount || Number(amount) <= 0) throw new Error('Payment amount must be greater than zero.');
    const amt       = Number(amount);
    const paymentNo = `PV-${Date.now().toString().slice(-6)}`;
    const date      = new Date().toISOString().substring(0, 10);

    const cashAccount = accountId || defaultAccountMap.bank;
    await accountingService.postJournalEntry({
      date, refNo: paymentNo,
      narration: narration || `Supplier payment — ${paymentNo}`,
      lines: [
        { accountId: defaultAccountMap.accountsPayable, type: 'debit',  amount: amt },
        { accountId: cashAccount,                        type: 'credit', amount: amt },
      ],
      sourceModule: 'purchases', sourceRefId: paymentNo,
    });

    // Try updating supplier balance & invoice payment status in MySQL
    let updatedInMySQL = false;
    try {
      const supRes = await fetch(`${BACKEND_URL}/erp/suppliers`);
      if (supRes.ok) {
        const suppliersList = await supRes.json();
        const s = suppliersList.find(x => x.id === supplierId);
        if (s) {
          const newBal = Math.max(0, (s.currentBalance || 0) - amt);
          await fetch(`${BACKEND_URL}/erp/suppliers/${supplierId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...s, currentBalance: newBal })
          });
          updatedInMySQL = true;
        }
      }

      if (invoiceNo) {
        const invRes = await fetch(`${BACKEND_URL}/erp/purchase-invoices`);
        if (invRes.ok) {
          const invList = await invRes.json();
          const targetInv = invList.find(i => i.invoiceNo === invoiceNo);
          if (targetInv) {
            await fetch(`${BACKEND_URL}/erp/purchase-invoices/${targetInv.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...targetInv, paymentStatus: 'paid' })
            });
          }
        }
      }
    } catch (err) {
      console.warn('[purchaseService] MySQL paySupplier balance update failed, trying Firestore', err.message);
    }

    if (!updatedInMySQL && isFirebaseConfigured()) {
      try {
        const suppliers = await fetchCollectionFromFirestore('suppliers');
        const s = suppliers.find(x => x.id === supplierId);
        if (s) {
          const newBal = Math.max(0, (s.currentBalance || 0) - amt);
          await saveToFirestore('suppliers', supplierId, { ...s, currentBalance: newBal });
        }

        if (invoiceNo) {
          const invoices = await fetchCollectionFromFirestore('purchase_invoices');
          const targetInv = invoices.find(i => i.invoiceNo === invoiceNo);
          if (targetInv) {
            await saveToFirestore('purchase_invoices', targetInv.id, { ...targetInv, paymentStatus: 'paid' });
          }
        }
        
        // Also save payment record in payments collection in Firestore
        const payId = `pay-${Date.now()}`;
        await saveToFirestore('payments', payId, {
          id: payId,
          paymentNo,
          supplierId,
          amount: amt,
          method: method || 'bank',
          accountId: cashAccount,
          chequeNo: chequeNo || '',
          date,
          narration,
          invoiceNo: invoiceNo || '',
          type: 'payment'
        });
      } catch (fbErr) {
        console.warn('[purchaseService] Firestore supplier payment balance update/payment save failed', fbErr.message);
      }
    }

    // Reduce supplier balance locally
    const suppliers = getLocalSuppliers();
    saveLocalSuppliers(suppliers.map(s => s.id === supplierId ? { ...s, currentBalance: Math.max(0, (s.currentBalance || 0) - amt) } : s));

    // Update purchase invoice paidAmount and paymentStatus locally
    if (invoiceNo) {
      const invoices = getLocal('erp_purchase_invoices');
      saveLocal('erp_purchase_invoices', invoices.map(i => {
        if (i.invoiceNo !== invoiceNo) return i;
        const newPaid = (i.paidAmount || 0) + amt;
        const total = (i.grandTotal || 0) + (i.landedCost?.total || 0);
        const remaining = total - newPaid;
        return { ...i, paidAmount: +newPaid.toFixed(2), paymentStatus: remaining <= 0.01 ? 'paid' : 'partial' };
      }));
    }

    // Save payment record locally
    const payments = getLocal('erp_supplier_payments');
    saveLocal('erp_supplier_payments', [{ id: `pay-${Date.now()}`, paymentNo, supplierId, amount: amt, method: method || 'bank', accountId: cashAccount, chequeNo: chequeNo || '', date, narration, invoiceNo: invoiceNo || '' }, ...payments]);

    await auditService.logPost(currentUser, 'purchases', paymentNo, paymentNo, `Supplier payment BDT ${amt.toLocaleString()}${invoiceNo ? ` for invoice ${invoiceNo}` : ''}`);
    return paymentNo;
  },

  /* ── Queries ── */
  getPurchaseInvoices: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/purchase-invoices`);
      if (res.ok) {
        const data = await res.json();
        saveLocal('erp_purchase_invoices', data);
        return data;
      }
    } catch (err) {
      console.warn('[purchaseService] MySQL purchase-invoices fetch failed, trying Firestore', err.message);
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('purchase_invoices');
        if (data && data.length > 0) {
          saveLocal('erp_purchase_invoices', data);
          return data;
        }
      }
    }
    return getLocal('erp_purchase_invoices');
  },

  getPurchaseInvoice: async (invoiceNo) => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/purchase-invoices`);
      if (res.ok) {
        const data = await res.json();
        return data.find(i => i.invoiceNo === invoiceNo) || null;
      }
    } catch (err) {
      console.warn('[purchaseService] MySQL getPurchaseInvoice failed, using LocalStorage', err.message);
    }
    const invoices = getLocal('erp_purchase_invoices');
    return invoices.find(i => i.invoiceNo === invoiceNo) || null;
  },

  getPurchaseReturns: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/purchase-returns`);
      if (res.ok) {
        const data = await res.json();
        saveLocal('erp_purchase_returns', data);
        return data;
      }
    } catch (err) {
      console.warn('[purchaseService] MySQL purchase-returns fetch failed, trying Firestore', err.message);
      if (isFirebaseConfigured()) {
        const data = await fetchCollectionFromFirestore('purchase_returns');
        if (data && data.length > 0) {
          saveLocal('erp_purchase_returns', data);
          return data;
        }
      }
    }
    return getLocal('erp_purchase_returns');
  },

  getSupplierStatement: (supplierId, fromDate, toDate) => {
    const invoices = getLocal('erp_purchase_invoices').filter(i => i.supplierId === supplierId);
    const payments = getLocal('erp_supplier_payments').filter(p => p.supplierId === supplierId);
    const returns  = getLocal('erp_purchase_returns');

    const transactions = [
      ...invoices.map(i => ({ date: i.date, refNo: i.invoiceNo,  type: 'Invoice',  debit: 0,      credit: i.grandTotal, description: i.narration })),
      ...payments.map(p => ({ date: p.date, refNo: p.paymentNo,  type: 'Payment',  debit: p.amount, credit: 0,          description: p.narration })),
      ...returns.map(r  => ({ date: r.date, refNo: r.returnNo,   type: 'Return',   debit: r.grandTotal, credit: 0,      description: `Return against ${r.originalInvoiceNo}` })),
    ]
      .filter(t => (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate))
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = 0;
    return transactions.map(t => {
      runningBalance += t.credit - t.debit;
      return { ...t, balance: +runningBalance.toFixed(2) };
    });
  },

  /* ── Supplier Management ── */
  saveSupplier: async (supplier, isEdit, currentUser) => {
    // ── Layer 2: Service guard (name + phone combination) ─────────────────
    if (!isEdit) {
      const existingSuppliers = getLocalSuppliers();
      const dup = findNamePhoneDuplicate(existingSuppliers, supplier.name, supplier.phone, supplier.id);
      if (dup) throw new Error(supplierDuplicateMessage(dup));
    }
    // ────────────────────────────────────────────────────────────────────────
    const url = isEdit ? `${BACKEND_URL}/erp/suppliers/${supplier.id}` : `${BACKEND_URL}/erp/suppliers`;
    const method = isEdit ? 'PUT' : 'POST';
    let savedInMySQL = false;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier)
      });
      if (res.ok) {
        savedInMySQL = true;
        const local = getLocalSuppliers();
        const updated = isEdit ? local.map(s => s.id === supplier.id ? supplier : s) : [...local, supplier];
        saveLocalSuppliers(updated);
        await auditService.logPost(currentUser, 'purchases', supplier.id, supplier.id, `${isEdit ? 'Updated' : 'Registered'} supplier: ${supplier.name}`);
        return true;
      }
    } catch (err) {
      console.warn('[purchaseService] Supplier save failed, trying Firestore', err.message);
    }

    if (!savedInMySQL && isFirebaseConfigured()) {
      try {
        await saveToFirestore('suppliers', supplier.id, supplier);
        await auditService.logPost(currentUser, 'purchases', supplier.id, supplier.id, `${isEdit ? 'Updated' : 'Registered'} supplier (Firestore): ${supplier.name}`);
      } catch (fbErr) {
        console.warn('[purchaseService] Firestore supplier save failed, queuing offline', fbErr.message);
        syncQueueService.addToQueue(url, method, supplier, 'Suppliers');
      }
    }

    // local fallback
    const local = getLocalSuppliers();
    const updated = isEdit ? local.map(s => s.id === supplier.id ? supplier : s) : [...local, supplier];
    saveLocalSuppliers(updated);
    return true;
  },

  /* ── AP Aging Report ── */
  getAPAgingReport: (invoices = []) => {
    const today = new Date();
    const buckets = [
      { key: 'current', label: '0–15 Days',  min: 0,  max: 15,       invoices: [], total: 0, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
      { key: 'b30',     label: '16–30 Days', min: 16, max: 30,       invoices: [], total: 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      { key: 'b60',     label: '31–60 Days', min: 31, max: 60,       invoices: [], total: 0, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
      { key: 'b90',     label: '61–90 Days', min: 61, max: 90,       invoices: [], total: 0, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      { key: 'over90',  label: '90+ Days',   min: 91, max: Infinity, invoices: [], total: 0, color: '#7f1d1d', bg: 'rgba(127,29,29,0.15)' },
    ];
    const unpaid = invoices.filter(i => i.paymentStatus !== 'paid');
    unpaid.forEach(inv => {
      const dueDate = inv.dueDate
        ? new Date(inv.dueDate)
        : new Date(new Date(inv.date || new Date()).setDate(new Date(inv.date || new Date()).getDate() + 30));
      const daysPast = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
      const total = (inv.grandTotal || 0) + (inv.landedCost?.total || 0);
      const remaining = total - (inv.paidAmount || 0);
      const invExt = { ...inv, daysOverdue: daysPast, remaining };
      const bucket = buckets.find(b => daysPast >= b.min && daysPast <= b.max) || buckets[buckets.length - 1];
      bucket.invoices.push(invExt);
      bucket.total += remaining;
    });
    return buckets;
  },

  /* ── Dashboard Aggregations ── */
  getDashboardStats: (invoices = [], returnsList = [], paymentsList = []) => {
    const totalPurchaseValue = invoices.reduce((s, i) => s + (i.grandTotal || 0) + (i.landedCost?.total || 0), 0);
    const totalVAT = invoices.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const outstandingAP = invoices.filter(i => i.paymentStatus !== 'paid').reduce((s, i) => s + Math.max(0, (i.grandTotal || 0) + (i.landedCost?.total || 0) - (i.paidAmount || 0)), 0);
    const paidCount = invoices.filter(i => i.paymentStatus === 'paid').length;
    const pendingApprovalCount = invoices.filter(i => i.approvalStatus === 'pending').length;
    const partialCount = invoices.filter(i => i.paymentStatus === 'partial').length;
    const returnValue = returnsList.reduce((s, r) => s + (r.grandTotal || 0), 0);

    const monthlySpend = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const value = invoices.filter(i => (i.date || '').startsWith(key)).reduce((s, i) => s + (i.grandTotal || 0), 0);
      monthlySpend.push({ key, label, value });
    }

    const supplierSpend = {};
    invoices.forEach(i => { supplierSpend[i.supplierId] = (supplierSpend[i.supplierId] || 0) + (i.grandTotal || 0); });
    const topSuppliers = Object.entries(supplierSpend).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, value]) => ({ id, value }));

    return { totalInvoices: invoices.length, totalPurchaseValue, totalVAT, outstandingAP, paidCount, pendingApprovalCount, partialCount, returnValue, monthlySpend, topSuppliers };
  },

  /* ── Payment History Query ── */
  getPaymentHistory: (supplierId = null) => {
    const payments = getLocal('erp_supplier_payments');
    return supplierId ? payments.filter(p => p.supplierId === supplierId) : payments;
  },

  /* ── Supplier Intelligence Aggregator ── */
  getSupplierIntelligence: (supplierId) => {
    if (!supplierId) return null;
    const invoices = getLocal('erp_purchase_invoices').filter(i => i.supplierId === supplierId);
    const payments = getLocal('erp_supplier_payments').filter(p => p.supplierId === supplierId);
    const returns = getLocal('erp_purchase_returns').filter(r => invoices.some(i => i.invoiceNo === r.originalInvoiceNo));
    const totalValue = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const returnValue = returns.reduce((s, r) => s + (r.grandTotal || 0), 0);
    const sorted = [...invoices].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const sortedPay = [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return {
      totalInvoices: invoices.length,
      totalValue,
      totalPaid,
      outstandingBalance: Math.max(0, totalValue - totalPaid),
      returnValue,
      returnRate: invoices.length > 0 ? ((returns.length / invoices.length) * 100).toFixed(1) : '0',
      avgInvoiceSize: invoices.length > 0 ? Math.round(totalValue / invoices.length) : 0,
      lastPurchaseDate: sorted[0]?.date || '—',
      lastPaymentDate: sortedPay[0]?.date || '—',
    };
  },

  /* ── Approve Invoice ── */
  approveInvoice: (invoiceNo, approverName) => {
    const invoices = getLocal('erp_purchase_invoices');
    saveLocal('erp_purchase_invoices', invoices.map(i =>
      i.invoiceNo === invoiceNo
        ? { ...i, approvalStatus: 'approved', approvedBy: approverName, approvedAt: new Date().toISOString() }
        : i
    ));
    return true;
  },

  /* ── Purchase Requisitions (PR) ── */
  getRequisitions: () => {
    const list = getLocal('erp_prs');
    if (list.length === 0) {
      const seed = [
        { id: 'PR-2026-0001', date: '2026-06-25', department: 'Engineering', requestedBy: 'Imtiaz Ahmed', items: [{ productId: 'prod-1', productName: 'GNSS Antenna Connector', qty: 5, estimatedCost: 15000 }], status: 'approved' },
        { id: 'PR-2026-0002', date: '2026-06-28', department: 'Sales', requestedBy: 'Karim Rahman', items: [{ productId: 'prod-2', productName: 'Standard Tripod Mounts', qty: 10, estimatedCost: 35000 }], status: 'pending_approval' }
      ];
      saveLocal('erp_prs', seed);
      return seed;
    }
    return list;
  },

  saveRequisition: (pr, currentUser) => {
    const list = getLocal('erp_prs');
    const isEdit = list.some(x => x.id === pr.id);
    const updated = isEdit ? list.map(x => x.id === pr.id ? pr : x) : [pr, ...list];
    saveLocal('erp_prs', updated);
    return pr.id;
  },

  approveRequisition: (prId, approverName) => {
    const list = getLocal('erp_prs');
    saveLocal('erp_prs', list.map(x => x.id === prId ? { ...x, status: 'approved', approvedBy: approverName, approvedAt: new Date().toISOString() } : x));
    return true;
  },

  rejectRequisition: (prId) => {
    const list = getLocal('erp_prs');
    saveLocal('erp_prs', list.map(x => x.id === prId ? { ...x, status: 'rejected' } : x));
    return true;
  },

  /* ── Purchase Orders (PO) ── */
  getPurchaseOrders: () => {
    const list = getLocal('erp_pos');
    if (list.length === 0) {
      const seed = [
        { id: 'PO-2026-0001', prId: 'PR-2026-0001', supplierId: 'sup-1', date: '2026-06-26', items: [{ productId: 'prod-1', productName: 'GNSS Antenna Connector', qty: 5, unitPrice: 2800 }], status: 'received', paymentTerms: 'Net 30' }
      ];
      saveLocal('erp_pos', seed);
      return seed;
    }
    return list;
  },

  savePurchaseOrder: (po, currentUser) => {
    const list = getLocal('erp_pos');
    const isEdit = list.some(x => x.id === po.id);
    const updated = isEdit ? list.map(x => x.id === po.id ? po : x) : [po, ...list];
    saveLocal('erp_pos', updated);

    // If this PO is converted from a PR, update the PR status to 'ordered'
    if (po.prId) {
      const prs = getLocal('erp_prs');
      saveLocal('erp_prs', prs.map(x => x.id === po.prId ? { ...x, status: 'ordered' } : x));
    }
    return po.id;
  },

  updatePurchaseOrderStatus: (poId, status) => {
    const list = getLocal('erp_pos');
    saveLocal('erp_pos', list.map(x => x.id === poId ? { ...x, status } : x));
    return true;
  },

  /* ── Goods Received Notes (GRN) ── */
  getGoodsReceivedNotes: () => {
    const list = getLocal('erp_grns');
    if (list.length === 0) {
      const seed = [
        { id: 'GRN-2026-0001', poId: 'PO-2026-0001', date: '2026-06-27', receivedBy: 'Warehouse Team', items: [{ productId: 'prod-1', productName: 'GNSS Antenna Connector', qtyReceived: 5, qtyRejected: 0, unitPrice: 2800 }], status: 'completed' },
        { id: 'GRN-2026-0002', poId: 'PO-2026-0002', date: '2026-07-01', receivedBy: 'Warehouse Receiver', items: [{ productId: 'prod-3', productName: 'HP LaserJet Pro M404dn Printer', qtyReceived: 3, qtyRejected: 1, unitPrice: 2800 }], status: 'completed' }
      ];
      saveLocal('erp_grns', seed);
      return seed;
    }
    return list;
  },

  saveGoodsReceivedNote: async (grn, currentUser) => {
    const list = getLocal('erp_grns');
    saveLocal('erp_grns', [grn, ...list]);

    // 1. Update stock levels in inventory for all accepted items
    let grnTotalCost = 0;
    for (const item of grn.items) {
      const qtyOk = Number(item.qtyReceived || 0) - Number(item.qtyRejected || 0);
      if (qtyOk > 0) {
        const unitPrice = Number(item.unitPrice || 0);
        grnTotalCost += qtyOk * unitPrice;
        await inventoryService.purchaseStockIn(item.productId, null, qtyOk, unitPrice, grn.id);
      }
    }

    // 2. Post GRN Accrual Journal (GAP-4 fix — IFRS accruals basis)
    // DR Inventory Asset (acc-1200) — goods physically received into stock
    // CR Accounts Payable (acc-2010) — liability accrued, to be settled on invoice
    // This ensures balance sheet reflects physical stock as soon as it arrives at the warehouse.
    if (grnTotalCost > 0) {
      try {
        await accountingService.postJournalEntry({
          date: grn.date || new Date().toISOString().substring(0, 10),
          refNo: grn.id,
          narration: `GRN Accrual — Goods received at warehouse. GRN: ${grn.id}${grn.poId ? `, PO: ${grn.poId}` : ''}. Pending supplier invoice.`,
          lines: [
            { accountId: defaultAccountMap.inventoryAsset, type: 'debit',  amount: +grnTotalCost.toFixed(2) }, // Inventory Asset
            { accountId: defaultAccountMap.accountsPayable, type: 'credit', amount: +grnTotalCost.toFixed(2) }  // AP Accrued
          ],
          sourceModule: 'purchases',
          sourceRefId: grn.id,
          voucherType: 'GRN'
        });
      } catch (jeErr) {
        console.warn('[purchaseService] GRN journal accrual failed:', jeErr.message);
      }
    }

    // 3. Update PO status
    const pos = getLocal('erp_pos');
    const po = pos.find(x => x.id === grn.poId);
    if (po) {
      // Check if completely received
      let allReceived = true;
      po.items.forEach(poItem => {
        const receivedForProduct = grn.items
          .filter(gi => gi.productId === poItem.productId)
          .reduce((sum, gi) => sum + (Number(gi.qtyReceived || 0) - Number(gi.qtyRejected || 0)), 0);
        if (receivedForProduct < poItem.qty) {
          allReceived = false;
        }
      });
      const newStatus = allReceived ? 'received' : 'partially_received';
      saveLocal('erp_pos', pos.map(x => x.id === grn.poId ? { ...x, status: newStatus } : x));
    }

    return grn.id;
  },

  deleteSupplier: async (id, currentUser) => {
    const url = `${BACKEND_URL}/erp/suppliers/${id}`;
    let deletedInMySQL = false;
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        deletedInMySQL = true;
        const local = getLocalSuppliers();
        saveLocalSuppliers(local.filter(s => s.id !== id));
        await auditService.logPost(currentUser, 'purchases', id, id, `Deleted supplier ID: ${id}`);
        return true;
      }
    } catch (err) {
      console.warn('[purchaseService] Supplier delete failed, trying Firestore', err.message);
    }

    if (!deletedInMySQL && isFirebaseConfigured()) {
      try {
        await deleteFromFirestore('suppliers', id);
        await auditService.logPost(currentUser, 'purchases', id, id, `Deleted supplier ID: ${id} (Firestore)`);
      } catch (fbErr) {
        console.warn('[purchaseService] Firestore supplier delete failed, queueing offline', fbErr.message);
        syncQueueService.addToQueue(url, 'DELETE', null, 'Suppliers');
      }
    }

    // local fallback
    const local = getLocalSuppliers();
    saveLocalSuppliers(local.filter(s => s.id !== id));
    return true;
  },
};

