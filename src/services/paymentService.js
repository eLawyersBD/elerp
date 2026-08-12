import { accountingService } from './accountingService';
import { auditService } from './auditService';

const BACKEND_URL = '/api';

const getLocalCustomers = () => {
  const local = localStorage.getItem('erp_customers');
  return local ? JSON.parse(local) : [];
};

const saveLocalCustomers = (c) => {
  localStorage.setItem('erp_customers', JSON.stringify(c));
};

const getLocalSuppliers = () => {
  const local = localStorage.getItem('erp_suppliers');
  return local ? JSON.parse(local) : [];
};

const saveLocalSuppliers = (s) => {
  localStorage.setItem('erp_suppliers', JSON.stringify(s));
};

const getLocalPayments = () => {
  const local = localStorage.getItem('erp_payments');
  return local ? JSON.parse(local) : [];
};

const saveLocalPayments = (p) => {
  localStorage.setItem('erp_payments', JSON.stringify(p));
};

export const paymentService = {
  getPayments: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/payments`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocalPayments(data);
      })
      .catch(err => console.warn('[paymentService] MySQL fetch payments background failed', err.message));

    return getLocalPayments();
  },

  postCustomerReceipt: async (receipt, currentUser) => {
    const { customerId, amount, paymentMethod, ledgerAccountId, narration } = receipt;
    const refNo = `REC-${Date.now().toString().slice(-6)}`;
    const date = new Date().toISOString();

    const receiptData = {
      refNo,
      date,
      partyId: customerId,
      amount: Number(amount),
      paymentMethod,
      ledgerAccountId,
      type: 'receipt',
      narration
    };

    // Update customer local balance for offline fallback sync mirror
    const customers = getLocalCustomers();
    const updatedCusts = customers.map(c => {
      if (c.id === customerId) {
        return { ...c, currentBalance: Number(c.currentBalance || 0) - Number(amount) };
      }
      return c;
    });
    saveLocalCustomers(updatedCusts);

    const payments = getLocalPayments();
    saveLocalPayments([{ id: `pay-${Date.now()}`, ...receiptData }, ...payments]);

    // Background sync post to MySQL
    fetch(`${BACKEND_URL}/erp/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiptData)
    })
    .catch(err => console.warn('[paymentService] MySQL postCustomerReceipt background sync failed', err.message));

    // Post Journal: Debit Cash/Bank Asset, Credit Accounts Receivable Asset
    await accountingService.postJournalEntry({
      id: `jv-${Date.now()}`,
      date,
      refNo,
      narration: narration || `Customer payment receipt (${refNo})`,
      lines: [
        { accountId: ledgerAccountId, type: 'debit', amount: Number(amount) }, // Cash/Bank
        { accountId: 'acc-1100', type: 'credit', amount: Number(amount) }     // Accounts Receivable
      ],
      sourceModule: 'receipts',
      sourceRefId: refNo
    });

    await auditService.logCreate(currentUser, 'sales', refNo, refNo, narration || `Customer payment receipt of BDT ${Number(amount).toLocaleString()} (${paymentMethod})`);
    return refNo;
  },

  postSupplierPayment: async (payment, currentUser) => {
    const { supplierId, amount, paymentMethod, ledgerAccountId, narration } = payment;
    const refNo = `PAY-${Date.now().toString().slice(-6)}`;
    const date = new Date().toISOString();

    const paymentData = {
      refNo,
      date,
      partyId: supplierId,
      amount: Number(amount),
      paymentMethod,
      ledgerAccountId,
      type: 'payment',
      narration
    };

    // Update supplier local balance for offline fallback sync mirror
    const suppliers = getLocalSuppliers();
    const updatedSups = suppliers.map(s => {
      if (s.id === supplierId) {
        return { ...s, currentBalance: Number(s.currentBalance || 0) - Number(amount) };
      }
      return s;
    });
    saveLocalSuppliers(updatedSups);

    const payments = getLocalPayments();
    saveLocalPayments([{ id: `pay-${Date.now()}`, ...paymentData }, ...payments]);

    // Background sync post to MySQL
    fetch(`${BACKEND_URL}/erp/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    })
    .catch(err => console.warn('[paymentService] MySQL postSupplierPayment background sync failed', err.message));

    // Post Journal: Debit Accounts Payable Liability, Credit Cash/Bank Asset
    await accountingService.postJournalEntry({
      id: `jv-${Date.now()}`,
      date,
      refNo,
      narration: narration || `Supplier payment check issued (${refNo})`,
      lines: [
        { accountId: 'acc-2010', type: 'debit', amount: Number(amount) },  // Accounts Payable
        { accountId: ledgerAccountId, type: 'credit', amount: Number(amount) } // Cash/Bank
      ],
      sourceModule: 'payments',
      sourceRefId: refNo
    });

    await auditService.logCreate(currentUser, 'purchases', refNo, refNo, narration || `Supplier payment of BDT ${Number(amount).toLocaleString()} (${paymentMethod})`);
    return refNo;
  }
};
