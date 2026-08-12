import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { initialProducts } from '../utils/mockData';

/* ══════════════════════════════════════════════════════════════════════════
   CHART OF ACCOUNTS  —  Full 60+ account COA for a Bangladesh trading co.
   Numbering convention:
     1000-1999 Assets
     2000-2999 Liabilities
     3000-3999 Equity
     4000-4999 Revenue
     5000-5999 Cost of Sales
     6000-6999 Operating Expenses
══════════════════════════════════════════════════════════════════════════ */
export const defaultChartOfAccounts = [

  /* ── ASSETS ── */
  // Cash & Bank
  { id: 'acc-1010', code: '1010', name: 'Cash on Hand',              type: 'asset', classification: 'current_asset', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-1020', code: '1020', name: 'City Bank Current A/C',     type: 'asset', classification: 'current_asset', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-1025', code: '1025', name: 'Dutch-Bangla Bank A/C',     type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1030', code: '1030', name: 'bKash Business Account',    type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1035', code: '1035', name: 'Nagad Business Account',    type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1040', code: '1040', name: 'Petty Cash',                type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },

  // Receivables
  { id: 'acc-1100', code: '1100', name: 'Accounts Receivable (A/R)', type: 'asset', classification: 'current_asset', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-1110', code: '1110', name: 'Advance to Suppliers',      type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1120', code: '1120', name: 'Staff Advances',            type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1130', code: '1130', name: 'Security Deposits',         type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },

  // Inventory
  { id: 'acc-1200', code: '1200', name: 'Inventory — Finished Goods',type: 'asset', classification: 'current_asset', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-1210', code: '1210', name: 'Inventory — Raw Materials', type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1220', code: '1220', name: 'Inventory — Packaging',     type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1230', code: '1230', name: 'Goods in Transit',          type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },

  // Tax Receivable
  { id: 'acc-1300', code: '1300', name: 'VAT Input Receivable',      type: 'asset', classification: 'current_asset', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-1310', code: '1310', name: 'AIT (Advance Income Tax)',   type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },

  // Prepaid / Other Current
  { id: 'acc-1400', code: '1400', name: 'Prepaid Expenses',          type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1410', code: '1410', name: 'Prepaid Rent',              type: 'asset', classification: 'current_asset', parentCode: null, isSystem: false, balance: 0 },

  // Fixed Assets
  { id: 'acc-1500', code: '1500', name: 'Computer & Equipment',      type: 'asset', classification: 'fixed_asset',   parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1510', code: '1510', name: 'Furniture & Fixtures',      type: 'asset', classification: 'fixed_asset',   parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1520', code: '1520', name: 'Motor Vehicles',            type: 'asset', classification: 'fixed_asset',   parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1530', code: '1530', name: 'Office Equipment',          type: 'asset', classification: 'fixed_asset',   parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-1590', code: '1590', name: 'Accumulated Depreciation',  type: 'asset', classification: 'fixed_asset',   parentCode: null, isSystem: false, balance: 0 },

  /* ── LIABILITIES ── */
  // Payables
  { id: 'acc-2010', code: '2010', name: 'Accounts Payable (A/P)',    type: 'liability', classification: 'current_liability', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-2015', code: '2015', name: 'LC Payable (FC Supplier)',  type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-2020', code: '2020', name: 'Customer Advances (Deposits)', type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-2030', code: '2030', name: 'Salary & Wages Payable',    type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-2040', code: '2040', name: 'Short-term Bank Loan',      type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-2045', code: '2045', name: 'PAD Loan Liability',        type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-2046', code: '2046', name: 'LTR Loan Liability',        type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-2047', code: '2047', name: 'LIM Loan Liability',        type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-2050', code: '2050', name: 'Credit Card Payable',       type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },

  // Tax Payable
  { id: 'acc-2100', code: '2100', name: 'VAT Output Payable',        type: 'liability', classification: 'current_liability', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-2110', code: '2110', name: 'TDS Payable (Tax Deducted)',  type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-2120', code: '2120', name: 'Corporate Income Tax Payable', type: 'liability', classification: 'current_liability', parentCode: null, isSystem: false, balance: 0 },

  // Long-term
  { id: 'acc-2500', code: '2500', name: 'Long-term Bank Loan',       type: 'liability', classification: 'long_term_liability', parentCode: null, isSystem: false, balance: 0 },

  /* ── EQUITY ── */
  { id: 'acc-3010', code: '3010', name: 'Share Capital',             type: 'equity', classification: 'equity', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-3020', code: '3020', name: 'Retained Earnings',         type: 'equity', classification: 'equity', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-3030', code: '3030', name: 'Current Year Profit / Loss',type: 'equity', classification: 'equity', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-3040', code: '3040', name: 'Drawings / Dividends Paid', type: 'equity', classification: 'equity', parentCode: null, isSystem: false, balance: 0 },

  /* ── REVENUE ── */
  { id: 'acc-4010', code: '4010', name: 'Sales Revenue — Domestic',  type: 'revenue', classification: 'revenue', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-4020', code: '4020', name: 'Sales Revenue — Export',    type: 'revenue', classification: 'revenue', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-4030', code: '4030', name: 'Service Income',            type: 'revenue', classification: 'revenue', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-4040', code: '4040', name: 'Other Income',              type: 'revenue', classification: 'other_income', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-4050', code: '4050', name: 'Sales Returns & Allowances',type: 'revenue', classification: 'contra_revenue', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-4060', code: '4060', name: 'Sales Discount Allowed',    type: 'revenue', classification: 'contra_revenue', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-4070', code: '4070', name: 'Exchange Gain (IAS 21)',    type: 'revenue', classification: 'other_income',    parentCode: null, isSystem: false, balance: 0 },

  /* ── COST OF SALES ── */
  { id: 'acc-5010', code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'expense', classification: 'cost_of_sales', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-5020', code: '5020', name: 'Purchase Returns',          type: 'expense', classification: 'cost_of_sales', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-5030', code: '5030', name: 'Freight & Carriage Inward', type: 'expense', classification: 'cost_of_sales', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-5040', code: '5040', name: 'Customs Duty & Import Tax', type: 'expense', classification: 'cost_of_sales', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-5050', code: '5050', name: 'Purchase Discount Received',type: 'expense', classification: 'cost_of_sales', parentCode: null, isSystem: false, balance: 0 },

  /* ── OPERATING EXPENSES ── */
  { id: 'acc-6010', code: '6010', name: 'Salary & Wages',            type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6020', code: '6020', name: 'Office Rent',               type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6030', code: '6030', name: 'Electricity & Utilities',   type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6040', code: '6040', name: 'Internet & Telephone',      type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6050', code: '6050', name: 'Marketing & Advertising',   type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6060', code: '6060', name: 'Depreciation Expense',      type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6070', code: '6070', name: 'Bank Charges & Fees',       type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6080', code: '6080', name: 'Stock Write-off / Loss',    type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-6090', code: '6090', name: 'Stock Adjustment Expense',  type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: true,  balance: 0 },
  { id: 'acc-6100', code: '6100', name: 'Travel & Conveyance',       type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6110', code: '6110', name: 'Repairs & Maintenance',     type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6120', code: '6120', name: 'Printing & Stationery',     type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6130', code: '6130', name: 'Legal & Professional Fees', type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6140', code: '6140', name: 'Insurance Expense',         type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6150', code: '6150', name: 'Miscellaneous Expenses',    type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6160', code: '6160', name: 'Exchange Loss (IAS 21)',     type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
  { id: 'acc-6170', code: '6170', name: 'Interest Expense - Trade Finance', type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: false, balance: 0 },
];

/* ══════════════════════════════════════════════════════════════════════════
   DEFAULT ACCOUNT MAPPING — used by services to auto-post to correct accounts
══════════════════════════════════════════════════════════════════════════ */
export const defaultAccountMap = {
  cash:              'acc-1010',
  bank:              'acc-1020',
  accountsReceivable:'acc-1100',
  advanceToSupplier: 'acc-1110',
  inventoryAsset:    'acc-1200',
  vatInput:          'acc-1300',
  accountsPayable:   'acc-2010',
  customerAdvance:   'acc-2020',
  vatOutput:         'acc-2100',
  shareCapital:      'acc-3010',
  retainedEarnings:  'acc-3020',
  currentYearPL:     'acc-3030',
  salesRevenue:      'acc-4010',
  salesReturns:      'acc-4050',
  cogs:              'acc-5010',
  purchaseReturns:   'acc-5020',
  freightInward:     'acc-5030',
  stockWriteOff:     'acc-6080',
  stockAdjustment:   'acc-6090',
};

/* ══════════════════════════════════════════════════════════════════════════
   VAT RATES
══════════════════════════════════════════════════════════════════════════ */
export const defaultVatRates = [
  { id: 'vat-std',    name: 'Standard VAT (15%)',     rate: 15,  isDefault: true,  isActive: true },
  { id: 'vat-reduce', name: 'Reduced VAT (5%)',        rate: 5,   isDefault: false, isActive: true },
  { id: 'vat-zero',   name: 'Zero Rated (0%)',         rate: 0,   isDefault: false, isActive: true },
  { id: 'vat-exempt', name: 'VAT Exempt',              rate: 0,   isDefault: false, isActive: true },
];

/* ══════════════════════════════════════════════════════════════════════════
   ROLES & PERMISSIONS
══════════════════════════════════════════════════════════════════════════ */
export const defaultRoles = [
  {
    id: 'role-superadmin',
    name: 'Super Admin',
    description: 'Full unrestricted access',
    permissions: { '*': ['read', 'write', 'delete', 'approve'] }
  },
  {
    id: 'role-admin',
    name: 'Administrator',
    description: 'Full business access, no system config',
    permissions: {
      inventory:  ['read', 'write', 'delete'],
      purchases:  ['read', 'write', 'delete', 'approve'],
      sales:      ['read', 'write', 'delete', 'approve'],
      purchase_requisitions: ['read', 'write', 'delete', 'approve'],
      purchase_orders:       ['read', 'write', 'delete', 'approve'],
      goods_receive_notes:   ['read', 'write', 'delete', 'approve'],
      quotations:            ['read', 'write', 'delete', 'approve'],
      sales_orders:          ['read', 'write', 'delete', 'approve'],
      accounting: ['read', 'write'],
      reports:    ['read'],
      ledgers:    ['read', 'write'],
      users:      ['read'],
      settings:   ['read', 'write'],
      audit:      ['read'],
      hr:         ['read', 'write', 'delete', 'approve'],
    }
  },
  {
    id: 'role-accountant',
    name: 'Accountant',
    description: 'Accounting, reports, payments',
    permissions: {
      inventory:  ['read'],
      purchases:  ['read'],
      sales:      ['read'],
      purchase_requisitions: ['read', 'approve'],
      purchase_orders:       ['read'],
      goods_receive_notes:   ['read'],
      quotations:            ['read'],
      sales_orders:          ['read'],
      accounting: ['read', 'write'],
      reports:    ['read'],
      ledgers:    ['read', 'write'],
      settings:   ['read'],
      audit:      ['read'],
      hr:         ['read'],
    }
  },
  {
    id: 'role-warehouse',
    name: 'Warehouse Manager',
    description: 'Inventory, stock movements, GRN',
    permissions: {
      inventory:  ['read', 'write'],
      purchases:  ['read', 'write'],
      sales:      ['read'],
      purchase_requisitions: ['read'],
      purchase_orders:       ['read'],
      goods_receive_notes:   ['read', 'write'],
      quotations:            [],
      sales_orders:          ['read'],
      hr:         ['read'],
    }
  },
  {
    id: 'role-sales',
    name: 'Sales Executive',
    description: 'Sales orders and customer management',
    permissions: {
      inventory:  ['read'],
      sales:      ['read', 'write'],
      purchase_requisitions: [],
      purchase_orders:       [],
      goods_receive_notes:   [],
      quotations:            ['read', 'write'],
      sales_orders:          ['read', 'write'],
      ledgers:    ['read'],
      hr:         ['read'],
    }
  },
  {
    id: 'role-employee',
    name: 'Employee (ESS)',
    description: 'Self-service HR portal access only — view own profile, payslips, attendance, and leaves',
    permissions: {
      hr: ['read'],
      purchase_requisitions: [],
      purchase_orders:       [],
      goods_receive_notes:   [],
      quotations:            [],
      sales_orders:          [],
    }
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   COMPANY SETTINGS  (stored in /settings collection)
══════════════════════════════════════════════════════════════════════════ */
export const defaultSettings = {
  company: {
    name:       'ACCOUNTICA Cloud ERP ENTERPRISE',
    legalName:  'ACCOUNTICA Cloud ERP ENTERPRISE Limited',
    address:    'House 12, Road 5, Dhanmondi, Dhaka-1205',
    phone:      '+880 2-9876543',
    email:      'info@erpforu.com',
    website:    'www.erpforu.com',
    tin:        '123-456-789-0001',
    bin:        '000123456-0201',   // VAT registration number
    logo:       '/logo.png',
    currency:   'BDT',
    currencySymbol: '৳',
    country:    'Bangladesh',
  },
  fiscal: {
    yearStart:  '2025-07-01',     // Bangladesh fiscal year July–June
    yearEnd:    '2026-06-30',
    currentPeriod: '2025-07',
  },
  invoice: {
    salesPrefix:    'ERP-S-',
    purchasePrefix: 'ERP-P-',
    receiptPrefix:  'ERP-R-',
    paymentPrefix:  'ERP-PV-',
    journalPrefix:  'JV-',
    nextSalesNum:   1,
    nextPurchaseNum:1,
    nextReceiptNum: 1,
    nextPaymentNum: 1,
    nextJournalNum: 1,
  },
  accounting: {
    defaultVatRate:       'vat-std',
    defaultCashAccount:   'acc-1010',
    defaultBankAccount:   'acc-1020',
    allowNegativeStock:   false,
    requireApprovalOnPO:  false,
    autoPostGRN:          true,
  },
  display: {
    dateFormat:   'DD-MM-YYYY',
    theme:        'light',
    language:     'en',
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   BRANCHES & WAREHOUSES
══════════════════════════════════════════════════════════════════════════ */
export const defaultBranches = [
  { id: 'br-1', name: 'Dhaka Headquarters',    code: 'HQ-DKA', address: 'House 12, Dhanmondi, Dhaka', phone: '+880 2-9876543', isActive: true },
  { id: 'br-2', name: 'Chittagong Branch',     code: 'BR-CTG', address: 'Agrabad C/A, Chittagong',    phone: '+880 31-123456', isActive: true },
];

export const defaultWarehouses = [
  { id: 'wh-1', name: 'Main Store — Dhaka',   code: 'WH-DKA-1', branchId: 'br-1', isActive: true },
  { id: 'wh-2', name: 'Safety Godown — Dhaka',code: 'WH-DKA-2', branchId: 'br-1', isActive: true },
  { id: 'wh-3', name: 'CTG Port Depot',        code: 'WH-CTG-1', branchId: 'br-2', isActive: true },
];

/* ══════════════════════════════════════════════════════════════════════════
   SUPPLIERS & CUSTOMERS
══════════════════════════════════════════════════════════════════════════ */
export const defaultSuppliers = [
  {
    id: 'sup-1', code: 'SUP-001',
    name: 'Apex Electronics Ltd.',        contact: 'Kamrul Hasan',
    phone: '+880 1711-223344',            email: 'info@apexelectronics.com',
    address: '12 Kawran Bazar, Dhaka 1215',
    vatNo: 'VAT-12345',                   tin: '123-456-789',
    accountId: null,                      currentBalance: 0,
    creditLimit: 500000,                  paymentTermDays: 30,
    isActive: true,
  },
  {
    id: 'sup-2', code: 'SUP-002',
    name: 'Bengal Tools & Hardware',      contact: 'M. A. Rahman',
    phone: '+880 1819-556677',            email: 'sales@bengaltools.com',
    address: '45 Nawabpur Road, Old Dhaka',
    vatNo: 'VAT-67890',                   tin: '987-654-321',
    accountId: null,                      currentBalance: 0,
    creditLimit: 300000,                  paymentTermDays: 45,
    isActive: true,
  },
];

export const defaultCustomers = [];

/* ══════════════════════════════════════════════════════════════════════════
   MASTER DATA
══════════════════════════════════════════════════════════════════════════ */
export const defaultCategories = [
  { id: 'cat-1', name: 'Electronics',      code: 'ELEC', isActive: true },
  { id: 'cat-2', name: 'Spare Parts',      code: 'SPAR', isActive: true },
  { id: 'cat-3', name: 'Office Supplies',  code: 'OFFC', isActive: true },
  { id: 'cat-4', name: 'Safety Gear',      code: 'SFTY', isActive: true },
  { id: 'cat-5', name: 'Packaging',        code: 'PACK', isActive: true },
  { id: 'cat-6', name: 'Tools',            code: 'TOOL', isActive: true },
];

export const defaultUnits = [
  { id: 'unit-1', name: 'Pieces',     code: 'pcs',    isActive: true },
  { id: 'unit-2', name: 'Reams',      code: 'reams',  isActive: true },
  { id: 'unit-3', name: 'Box',        code: 'box',    isActive: true },
  { id: 'unit-4', name: 'Meters',     code: 'mtr',    isActive: true },
  { id: 'unit-5', name: 'Pairs',      code: 'pairs',  isActive: true },
  { id: 'unit-6', name: 'Kilograms',  code: 'kg',     isActive: true },
  { id: 'unit-7', name: 'Liters',     code: 'ltr',    isActive: true },
  { id: 'unit-8', name: 'Dozen',      code: 'doz',    isActive: true },
  { id: 'unit-9', name: 'Set',        code: 'set',    isActive: true },
];

/* ══════════════════════════════════════════════════════════════════════════
   FIREBASE SEED FUNCTION  —  runs once on first load
══════════════════════════════════════════════════════════════════════════ */
export const seedFirestoreData = async () => {
  if (!isFirebaseConfigured()) return false;

  try {
    // 1. Sync roles to Firestore if roles collection is empty or missing Employee (ESS)
    try {
      const rolesSnap = await getDocs(collection(db, 'roles'));
      const existingRoles = rolesSnap.docs.map(d => d.id);
      if (rolesSnap.empty || !existingRoles.includes('role-employee')) {
        console.log('🌱 Seeding/updating roles in Firestore...');
        const rBatch = writeBatch(db);
        defaultRoles.forEach(r => {
          rBatch.set(doc(db, 'roles', r.id), r, { merge: true });
        });
        await rBatch.commit();
        console.log('✅ Roles collection updated in Firestore.');
      }
    } catch (roleErr) {
      console.warn('⚠️ Failed to sync roles to Firestore:', roleErr.message);
    }

    const coaSnap = await getDocs(collection(db, 'chart_of_accounts'));
    if (!coaSnap.empty) {
      console.log('ℹ️ Firestore already seeded — skipping.');
      return false;
    }

    console.log('🌱 Seeding Firestore collections...');
    const batch = writeBatch(db);

    // Chart of Accounts
    defaultChartOfAccounts.forEach(acc => {
      batch.set(doc(db, 'chart_of_accounts', acc.id), { ...acc, createdAt: new Date() });
    });

    // VAT Rates
    defaultVatRates.forEach(v => {
      batch.set(doc(db, 'vat_rates', v.id), v);
    });

    // Roles
    defaultRoles.forEach(r => {
      batch.set(doc(db, 'roles', r.id), r);
    });

    // Branches & Warehouses
    defaultBranches.forEach(b  => batch.set(doc(db, 'branches',   b.id),  b));
    defaultWarehouses.forEach(w => batch.set(doc(db, 'warehouses', w.id),  w));

    // Suppliers & Customers
    defaultSuppliers.forEach(s => batch.set(doc(db, 'suppliers', s.id), s));
    defaultCustomers.forEach(c => batch.set(doc(db, 'customers', c.id), c));

    // Categories & Units
    defaultCategories.forEach(c => batch.set(doc(db, 'categories', c.id), c));
    defaultUnits.forEach(u      => batch.set(doc(db, 'units',      u.id), u));

    // Products
    initialProducts.forEach(p => {
      batch.set(doc(db, 'products', p.id), p);
    });

    // Company Settings
    batch.set(doc(db, 'settings', 'company'),    defaultSettings.company);
    batch.set(doc(db, 'settings', 'fiscal'),     defaultSettings.fiscal);
    batch.set(doc(db, 'settings', 'invoice'),    defaultSettings.invoice);
    batch.set(doc(db, 'settings', 'accounting'), defaultSettings.accounting);
    batch.set(doc(db, 'settings', 'display'),    defaultSettings.display);

    await batch.commit();
    console.log('✅ Firestore seeding complete — 60+ accounts, VAT rates, roles, settings seeded.');
    return true;
  } catch (error) {
    console.error('❌ Firestore seeding failed:', error);
    throw error;
  }
};
