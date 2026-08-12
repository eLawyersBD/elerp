import { isFirebaseConfigured } from '../config/firebase';
import { saveToFirestore } from '../utils/hrmsFirebase';

const BACKEND_URL = '/api';

export const migrationService = {
  // Helper to format values safely
  cleanString: (val) => (val || '').trim(),
  cleanNumber: (val, def = 0) => {
    const num = Number(val);
    return isNaN(num) ? def : num;
  },

  // Client-side validations
  validateImportData: (type, data, context = {}) => {
    const errors = [];
    const validatedData = [];
    const seenUniqueKeys = new Set();

    if (!Array.isArray(data) || data.length === 0) {
      return { isValid: false, errors: ['No records found in the import file.'], validatedData: [] };
    }

    const {
      existingCustomerCodes = new Set(),
      existingSupplierCodes = new Set(),
      existingProductSkus = new Set(),
      existingCoaCodes = new Map(), // code -> id mapping
      existingCategories = new Set(),
      existingUnits = new Set()
    } = context;

    if (type === 'customers') {
      data.forEach((row, index) => {
        const rowNum = index + 2; // +1 for header, +1 for 1-based indexing
        const code = (row.Code || '').trim();
        const name = (row.Name || '').trim();
        const email = (row.Email || '').trim();
        const phone = (row.Phone || '').trim();
        const openingBalance = Number(row.OpeningBalance || 0);
        const creditLimit = Number(row.CreditLimit || 500000);
        const paymentTermsDays = Number(row.PaymentTermsDays || 30);

        if (!code) errors.push(`Row ${rowNum}: Code is required.`);
        else if (seenUniqueKeys.has(code)) errors.push(`Row ${rowNum}: Duplicate code "${code}" found in this file.`);
        else seenUniqueKeys.add(code);

        if (!name) errors.push(`Row ${rowNum}: Name is required.`);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Row ${rowNum}: Invalid email format "${email}".`);
        if (isNaN(openingBalance)) errors.push(`Row ${rowNum}: Opening Balance must be a number.`);
        if (isNaN(creditLimit) || creditLimit < 0) errors.push(`Row ${rowNum}: Credit Limit must be a non-negative number.`);
        if (isNaN(paymentTermsDays) || paymentTermsDays < 0) errors.push(`Row ${rowNum}: Payment Terms Days must be a non-negative number.`);

        if (errors.length < 50) {
          validatedData.push({
            code,
            name,
            contact: (row.ContactPerson || '').trim(),
            phone,
            email,
            address: (row.Address || '').trim(),
            vatNo: (row.VatNo || '').trim(),
            tin: (row.Tin || '').trim(),
            currentBalance: isNaN(openingBalance) ? 0 : openingBalance,
            creditLimit: isNaN(creditLimit) ? 500000 : creditLimit,
            paymentTermDays: isNaN(paymentTermsDays) ? 30 : Math.round(paymentTermsDays),
            isActive: true
          });
        }
      });
    }

    else if (type === 'suppliers') {
      data.forEach((row, index) => {
        const rowNum = index + 2;
        const code = (row.Code || '').trim();
        const name = (row.Name || '').trim();
        const email = (row.Email || '').trim();
        const phone = (row.Phone || '').trim();
        const openingBalance = Number(row.OpeningBalance || 0);
        const creditLimit = Number(row.CreditLimit || 500000);
        const paymentTermsDays = Number(row.PaymentTermsDays || 30);

        if (!code) errors.push(`Row ${rowNum}: Code is required.`);
        else if (seenUniqueKeys.has(code)) errors.push(`Row ${rowNum}: Duplicate code "${code}" found in this file.`);
        else seenUniqueKeys.add(code);

        if (!name) errors.push(`Row ${rowNum}: Name is required.`);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Row ${rowNum}: Invalid email format "${email}".`);
        if (isNaN(openingBalance)) errors.push(`Row ${rowNum}: Opening Balance must be a number.`);
        if (isNaN(creditLimit) || creditLimit < 0) errors.push(`Row ${rowNum}: Credit Limit must be a non-negative number.`);
        if (isNaN(paymentTermsDays) || paymentTermsDays < 0) errors.push(`Row ${rowNum}: Payment Terms Days must be a non-negative number.`);

        if (errors.length < 50) {
          validatedData.push({
            code,
            name,
            contact: (row.ContactPerson || '').trim(),
            phone,
            email,
            address: (row.Address || '').trim(),
            vatNo: (row.VatNo || '').trim(),
            tin: (row.Tin || '').trim(),
            currentBalance: isNaN(openingBalance) ? 0 : openingBalance,
            creditLimit: isNaN(creditLimit) ? 500000 : creditLimit,
            paymentTermDays: isNaN(paymentTermsDays) ? 30 : Math.round(paymentTermsDays),
            isActive: true
          });
        }
      });
    }

    else if (type === 'products') {
      data.forEach((row, index) => {
        const rowNum = index + 2;
        const sku = (row.SKU || '').trim();
        const name = (row.Name || '').trim();
        const categoryCode = (row.CategoryCode || '').trim();
        const unitCode = (row.UnitCode || '').trim();
        const salesPrice = Number(row.SalesPrice || 0);
        const costPrice = Number(row.CostPrice || 0);
        const openingQty = Number(row.OpeningQty || 0);
        const minQty = Number(row.MinQty || 5);
        const warrantyMonths = Number(row.WarrantyMonths || 12);

        if (!sku) errors.push(`Row ${rowNum}: SKU is required.`);
        else if (seenUniqueKeys.has(sku)) errors.push(`Row ${rowNum}: Duplicate SKU "${sku}" found in this file.`);
        else seenUniqueKeys.add(sku);

        if (!name) errors.push(`Row ${rowNum}: Name is required.`);
        if (!categoryCode) errors.push(`Row ${rowNum}: CategoryCode is required.`);
        if (!unitCode) errors.push(`Row ${rowNum}: UnitCode is required.`);
        if (isNaN(salesPrice) || salesPrice < 0) errors.push(`Row ${rowNum}: Sales Price must be a non-negative number.`);
        if (isNaN(costPrice) || costPrice < 0) errors.push(`Row ${rowNum}: Cost Price must be a non-negative number.`);
        if (isNaN(openingQty) || openingQty < 0) errors.push(`Row ${rowNum}: Opening Qty must be a non-negative number.`);
        if (isNaN(minQty) || minQty < 0) errors.push(`Row ${rowNum}: Min Qty must be a non-negative number.`);
        if (isNaN(warrantyMonths) || warrantyMonths < 0) errors.push(`Row ${rowNum}: Warranty Months must be a non-negative number.`);

        if (errors.length < 50) {
          validatedData.push({
            sku,
            name,
            category: categoryCode,
            unit: unitCode,
            price: isNaN(salesPrice) ? 0 : salesPrice,
            purchasePrice: isNaN(costPrice) ? 0 : costPrice,
            qty: isNaN(openingQty) ? 0 : openingQty,
            minQty: isNaN(minQty) ? 5 : minQty,
            warrantyMonths: isNaN(warrantyMonths) ? 12 : Math.round(warrantyMonths),
            warehouseQtyMap: { 'wh-1': isNaN(openingQty) ? 0 : openingQty, 'wh-2': 0, 'wh-3': 0 },
            isActive: true
          });
        }
      });
    }

    else if (type === 'coa') {
      const coaTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
      const coaClassifications = [
        'current_asset', 'fixed_asset', 'current_liability', 'long_term_liability',
        'equity', 'revenue', 'other_income', 'contra_revenue', 'cost_of_sales', 'operating_expense'
      ];

      data.forEach((row, index) => {
        const rowNum = index + 2;
        const code = (row.Code || '').trim();
        const name = (row.Name || '').trim();
        const accountType = (row.Type || '').toLowerCase().trim();
        const classification = (row.Classification || '').toLowerCase().trim();
        const parentCode = (row.ParentCode || '').trim() || null;
        const openingBalance = Number(row.OpeningBalance || 0);

        if (!code) errors.push(`Row ${rowNum}: Code is required.`);
        else if (seenUniqueKeys.has(code)) errors.push(`Row ${rowNum}: Duplicate Code "${code}" found in this file.`);
        else seenUniqueKeys.add(code);

        if (!name) errors.push(`Row ${rowNum}: Name is required.`);
        if (!coaTypes.includes(accountType)) errors.push(`Row ${rowNum}: Invalid Type "${accountType}". Must be one of: ${coaTypes.join(', ')}.`);
        if (!coaClassifications.includes(classification)) errors.push(`Row ${rowNum}: Invalid Classification "${classification}".`);
        if (isNaN(openingBalance)) errors.push(`Row ${rowNum}: Opening Balance must be a number.`);

        if (errors.length < 50) {
          validatedData.push({
            code,
            name,
            type: accountType,
            classification,
            parentCode,
            balance: isNaN(openingBalance) ? 0 : openingBalance,
            isSystem: false
          });
        }
      });
    }

    else if (type === 'journals') {
      // Group by RefNo to validate balanced double-entry vouchers
      const vouchers = {};

      data.forEach((row, index) => {
        const rowNum = index + 2;
        const date = (row.Date || '').trim();
        const refNo = (row.RefNo || '').trim();
        const narration = (row.Narration || '').trim();
        const accountCode = (row.AccountCode || '').trim();
        const entryType = (row.Type || '').toLowerCase().trim();
        const amount = Number(row.Amount || 0);

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`Row ${rowNum}: Invalid Date format "${date}". Use YYYY-MM-DD.`);
        if (!refNo) errors.push(`Row ${rowNum}: RefNo is required.`);
        if (!accountCode) errors.push(`Row ${rowNum}: AccountCode is required.`);
        else if (existingCoaCodes.size > 0 && !existingCoaCodes.has(accountCode)) {
          errors.push(`Row ${rowNum}: Chart of Account code "${accountCode}" does not exist in the system.`);
        }
        if (entryType !== 'debit' && entryType !== 'credit') errors.push(`Row ${rowNum}: Type must be 'debit' or 'credit'.`);
        if (isNaN(amount) || amount <= 0) errors.push(`Row ${rowNum}: Amount must be a positive number greater than 0.`);

        if (refNo) {
          if (!vouchers[refNo]) {
            vouchers[refNo] = { date, narration, refNo, lines: [], rows: [] };
          }
          vouchers[refNo].lines.push({
            accountCode,
            type: entryType,
            amount: isNaN(amount) ? 0 : amount
          });
          vouchers[refNo].rows.push(rowNum);
        }
      });

      // Enforce double entry check
      Object.keys(vouchers).forEach(refNo => {
        const v = vouchers[refNo];
        const debits = v.lines.filter(l => l.type === 'debit').reduce((sum, l) => sum + l.amount, 0);
        const credits = v.lines.filter(l => l.type === 'credit').reduce((sum, l) => sum + l.amount, 0);

        if (Math.abs(debits - credits) > 0.01) {
          errors.push(`Voucher "${refNo}" (Rows: ${v.rows.join(', ')}): Entry is not balanced. Total Debits: ${debits.toFixed(2)}, Total Credits: ${credits.toFixed(2)}.`);
        } else {
          validatedData.push(v);
        }
      });
    }

    else if (type === 'services') {
      data.forEach((row, index) => {
        const rowNum = index + 2;
        const code = (row['Service Code'] || '').trim();
        const name = (row['Service Name'] || '').trim();
        const category = (row['Category'] || '').trim();
        const slaTarget = Number(row['SLA Target'] || 24);
        const vatRate = Number(row['VAT Rate'] !== undefined && row['VAT Rate'] !== '' ? row['VAT Rate'] : 15);
        const baseFee = Number(row['Base Fee'] || 0);
        const description = (row['Description'] || '').trim();

        if (!code) errors.push(`Row ${rowNum}: Service Code is required.`);
        else if (seenUniqueKeys.has(code)) errors.push(`Row ${rowNum}: Duplicate Service Code "${code}" found in this file.`);
        else seenUniqueKeys.add(code);

        if (!name) errors.push(`Row ${rowNum}: Service Name is required.`);
        if (isNaN(slaTarget) || slaTarget < 0) errors.push(`Row ${rowNum}: SLA Target must be a non-negative number.`);
        if (isNaN(vatRate) || vatRate < 0 || vatRate > 100) errors.push(`Row ${rowNum}: VAT Rate must be a number between 0 and 100.`);
        if (isNaN(baseFee) || baseFee < 0) errors.push(`Row ${rowNum}: Base Fee must be a non-negative number.`);

        if (errors.length < 50) {
          validatedData.push({
            code,
            name,
            category,
            slaTarget: isNaN(slaTarget) ? 24 : Math.round(slaTarget),
            vatRate: isNaN(vatRate) ? 15 : vatRate,
            baseFee: isNaN(baseFee) ? 0 : baseFee,
            description
          });
        }
      });
    }

    // Limit error logs to max 30 to avoid rendering overflow
    const trimmedErrors = errors.slice(0, 30);
    if (errors.length > 30) {
      trimmedErrors.push(`... and ${errors.length - 30} more errors detected.`);
    }

    return {
      isValid: errors.length === 0,
      errors: trimmedErrors,
      validatedData: errors.length === 0 ? validatedData : []
    };
  },

  // Save parsed data to DB
  importData: async (type, records, currentUser, onProgress) => {
    let successCount = 0;
    const total = records.length;

    // Load current storage configurations
    const firebaseActive = isFirebaseConfigured();

    // 1. IMPORT CUSTOMERS
    if (type === 'customers') {
      const local = JSON.parse(localStorage.getItem('erp_customers') || '[]');
      
      for (let i = 0; i < total; i++) {
        const item = records[i];
        
        // Find existing record by Code to merge/overwrite (Option A strategy)
        const existingLocal = local.find(c => c.code === item.code);
        const id = existingLocal ? existingLocal.id : `cust-${Date.now()}-${i}`;
        const newRecord = { id, ...item };

        let uploadedToMySQL = false;
        try {
          const res = await fetch(`${BACKEND_URL}/erp/customers${existingLocal ? '/' + id : ''}`, {
            method: existingLocal ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord)
          });
          if (res.ok) uploadedToMySQL = true;
        } catch {}

        if (!uploadedToMySQL && firebaseActive) {
          try {
            await saveToFirestore('customers', id, newRecord);
          } catch {}
        }

        // Local storage mirror updates
        const idx = local.findIndex(c => c.code === item.code);
        if (idx !== -1) local[idx] = newRecord;
        else local.push(newRecord);

        successCount++;
        if (onProgress) onProgress(successCount, total);
      }
      localStorage.setItem('erp_customers', JSON.stringify(local));
    }

    // 2. IMPORT SUPPLIERS
    else if (type === 'suppliers') {
      const local = JSON.parse(localStorage.getItem('erp_suppliers') || '[]');
      
      for (let i = 0; i < total; i++) {
        const item = records[i];
        const existingLocal = local.find(s => s.code === item.code);
        const id = existingLocal ? existingLocal.id : `sup-${Date.now()}-${i}`;
        const newRecord = { id, ...item };

        let uploadedToMySQL = false;
        try {
          const res = await fetch(`${BACKEND_URL}/erp/suppliers${existingLocal ? '/' + id : ''}`, {
            method: existingLocal ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord)
          });
          if (res.ok) uploadedToMySQL = true;
        } catch {}

        if (!uploadedToMySQL && firebaseActive) {
          try {
            await saveToFirestore('suppliers', id, newRecord);
          } catch {}
        }

        const idx = local.findIndex(s => s.code === item.code);
        if (idx !== -1) local[idx] = newRecord;
        else local.push(newRecord);

        successCount++;
        if (onProgress) onProgress(successCount, total);
      }
      localStorage.setItem('erp_suppliers', JSON.stringify(local));
    }

    // 3. IMPORT PRODUCTS
    else if (type === 'products') {
      const local = JSON.parse(localStorage.getItem('erp_products') || '[]');
      
      for (let i = 0; i < total; i++) {
        const item = records[i];
        const existingLocal = local.find(p => p.sku === item.sku);
        const id = existingLocal ? existingLocal.id : `prod-${Date.now()}-${i}`;
        const newRecord = { id, ...item };

        let uploadedToMySQL = false;
        try {
          const res = await fetch(`${BACKEND_URL}/erp/products${existingLocal ? '/' + id : ''}`, {
            method: existingLocal ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord)
          });
          if (res.ok) uploadedToMySQL = true;
        } catch {}

        if (!uploadedToMySQL && firebaseActive) {
          try {
            await saveToFirestore('products', id, newRecord);
          } catch {}
        }

        const idx = local.findIndex(p => p.sku === item.sku);
        if (idx !== -1) local[idx] = newRecord;
        else local.push(newRecord);

        successCount++;
        if (onProgress) onProgress(successCount, total);
      }
      localStorage.setItem('erp_products', JSON.stringify(local));
    }

    // 4. IMPORT CHART OF ACCOUNTS (COA)
    else if (type === 'coa') {
      const local = JSON.parse(localStorage.getItem('erp_coa') || '[]');
      
      for (let i = 0; i < total; i++) {
        const item = records[i];
        const existingLocal = local.find(a => a.code === item.code);
        const id = existingLocal ? existingLocal.id : `acc-${item.code}`;
        const newRecord = { id, ...item };

        let uploadedToMySQL = false;
        try {
          const res = await fetch(`${BACKEND_URL}/erp/coa${existingLocal ? '/' + id : ''}`, {
            method: existingLocal ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord)
          });
          if (res.ok) uploadedToMySQL = true;
        } catch {}

        if (!uploadedToMySQL && firebaseActive) {
          try {
            await saveToFirestore('chart_of_accounts', id, newRecord);
          } catch {}
        }

        const idx = local.findIndex(a => a.code === item.code);
        if (idx !== -1) local[idx] = newRecord;
        else local.push(newRecord);

        successCount++;
        if (onProgress) onProgress(successCount, total);
      }
      localStorage.setItem('erp_coa', JSON.stringify(local));
    }

    // 5. IMPORT JOURNAL ENTRIES
    else if (type === 'journals') {
      const localJournals = JSON.parse(localStorage.getItem('erp_journals') || '[]');
      const localCOA = JSON.parse(localStorage.getItem('erp_coa') || '[]');
      
      for (let i = 0; i < total; i++) {
        const voucher = records[i];
        const journalId = `tx-${Date.now()}-${i}`;
        
        // Resolve Account Codes into Account IDs
        const resolvedLines = voucher.lines.map(l => {
          const matchingAcc = localCOA.find(a => a.code === l.accountCode);
          return {
            accountId: matchingAcc ? matchingAcc.id : `acc-${l.accountCode}`,
            type: l.type,
            amount: l.amount
          };
        });

        const journalData = {
          id: journalId,
          date: voucher.date,
          refNo: voucher.refNo,
          narration: voucher.narration || 'Migration journal voucher',
          lines: resolvedLines,
          sourceModule: 'migration',
          sourceRefId: voucher.refNo,
          voucherType: 'journal',
          createdAt: new Date().toISOString()
        };

        // Post Journal Entry to DB
        let uploadedToMySQL = false;
        try {
          const res = await fetch(`${BACKEND_URL}/erp/journals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(journalData)
          });
          if (res.ok) uploadedToMySQL = true;
        } catch {}

        if (!uploadedToMySQL && firebaseActive) {
          try {
            await saveToFirestore('journal_entries', journalId, journalData);
          } catch {}
        }

        // Apply ledger changes to local Chart of Accounts balances
        resolvedLines.forEach(line => {
          const accIdx = localCOA.findIndex(a => a.id === line.accountId);
          if (accIdx !== -1) {
            const acc = localCOA[accIdx];
            let newBalance = Number(acc.balance || 0);
            const isDebitIncrease = ['asset', 'expense'].includes(acc.type);
            
            if (line.type === 'debit') {
              newBalance += isDebitIncrease ? line.amount : -line.amount;
            } else {
              newBalance += isDebitIncrease ? -line.amount : line.amount;
            }
            localCOA[accIdx] = { ...acc, balance: Number(newBalance.toFixed(2)) };
          }
        });

        // Add to local journal history
        localJournals.unshift(journalData);

        successCount++;
        if (onProgress) onProgress(successCount, total);
      }

      // Commit local logs
      localStorage.setItem('erp_coa', JSON.stringify(localCOA));
      localStorage.setItem('erp_journals', JSON.stringify(localJournals));
    }

    // 6. IMPORT SERVICES
    else if (type === 'services') {
      const local = JSON.parse(localStorage.getItem('erp_service_catalog') || '[]');
      
      for (let i = 0; i < total; i++) {
        const item = records[i];
        const existingLocal = local.find(s => s.code === item.code);
        const id = existingLocal ? existingLocal.id : `cat-srv-${Date.now()}-${i}`;
        const newRecord = { id, ...item };

        let uploadedToMySQL = false;
        try {
          const res = await fetch(`${BACKEND_URL}/erp/services${existingLocal ? '/' + id : ''}`, {
            method: existingLocal ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord)
          });
          if (res.ok) uploadedToMySQL = true;
        } catch {}

        if (!uploadedToMySQL && firebaseActive) {
          try {
            await saveToFirestore('services', id, newRecord);
          } catch {}
        }

        const idx = local.findIndex(s => s.code === item.code);
        if (idx !== -1) local[idx] = newRecord;
        else local.push(newRecord);

        successCount++;
        if (onProgress) onProgress(successCount, total);
      }
      localStorage.setItem('erp_service_catalog', JSON.stringify(local));
    }

    return { successCount };
  }
};
