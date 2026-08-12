import { accountingService } from './accountingService';
import { auditService } from './auditService';

const BACKEND_URL = '/api';

const getLocal = (key, fallback = []) => {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
};

const saveLocal = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const MOCK_LCS = [
  {
    id: 'lc-1',
    lcNumber: 'LC-2026-0045',
    lcDate: '2026-06-01',
    supplierId: 'sup-1',
    country: 'Japan',
    currency: 'USD',
    exchangeRate: 118.50,
    lcAmountForeign: 32000,
    marginPercent: 15,
    issuingBank: 'City Bank Ltd',
    advisingBank: 'Bank of Tokyo',
    expiryDate: '2026-09-30',
    status: 'Opened',
    marginDeposits: [
      { id: 'm-1', date: '2026-06-01', amount: 568800, type: 'Opening', ref: 'Margin Chq #1192' }
    ],
    shipments: [
      {
        id: 's-1',
        invoiceNo: 'INV-APX-998',
        invoiceDate: '2026-06-10',
        blNo: 'BL-TOK-5521',
        blDate: '2026-06-12',
        vesselName: 'Pacific Mercury',
        eta: '2026-06-28',
        containerNo: 'TGBU-90291-0',
        gitPosted: true
      }
    ],
    costs: [
      { id: 'c-1', type: 'Insurance', amount: 45000, ref: 'Ins Premium #INS-772', date: '2026-06-08', category: 'Foreign' },
      { id: 'c-2', type: 'Freight Inward', amount: 150000, ref: 'Vessel Bill #SH-9092', date: '2026-06-10', category: 'Foreign' },
      { id: 'c-3', type: 'Customs Duty', amount: 350000, ref: 'Challan #CUST-9892', date: '2026-06-18', category: 'Local' }
    ],
    items: [
      { id: 'i-1', itemName: 'Developer Laptops', itemType: 'Inventory', hsCode: '8471.30.00', qty: 20, unit: 'Pcs', weight: 40, volume: 0.8, unitCostForeign: 1000, totalCostForeign: 20000, allocatedCost: 0, landedUnitCost: 0 },
      { id: 'i-2', itemName: 'Cloud Server Parts', itemType: 'Inventory', hsCode: '8473.30.00', qty: 10, unit: 'Pcs', weight: 15, volume: 0.3, unitCostForeign: 1200, totalCostForeign: 12000, allocatedCost: 0, landedUnitCost: 0 }
    ],
    padLoans: [],
    customs: {
      assessableValue: 3792000,
      cd: 10,
      rd: 3,
      sd: 0,
      vat: 15,
      ait: 5,
      at: 5,
      totalDutyPaid: 350000
    },
    createdAt: '2026-06-01T10:00:00.000Z'
  }
];

export const lcService = {
  getLCList: () => {
    return getLocal('erp_lc_records', MOCK_LCS);
  },

  getLCs: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/lcs`);
      if (res.ok) {
        const data = await res.json();
        saveLocal('erp_lc_records', data);
        return data;
      }
    } catch (err) {
      console.warn('[lcService] MySQL lcs fetch failed, using local fallback', err.message);
    }
    return getLocal('erp_lc_records', MOCK_LCS);
  },

  saveLC: async (lc) => {
    const lcData = {
      ...lc,
      exchangeRate: Number(lc.exchangeRate || 0),
      lcAmountForeign: Number(lc.lcAmountForeign || 0),
      marginPercent: Number(lc.marginPercent || 0),
      marginDeposits: lc.marginDeposits || [],
      shipments: lc.shipments || [],
      costs: lc.costs || [],
      items: lc.items || [],
      padLoans: lc.padLoans || [],
      customs: lc.customs || {},
      createdAt: lc.createdAt || new Date().toISOString()
    };

    if (!lcData.id) {
      lcData.id = `lc-${Date.now()}`;
      lcData.status = 'Draft';
    }

    try {
      const res = await fetch(`${BACKEND_URL}/erp/lcs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lcData)
      });
      if (res.ok) {
        console.log(`[lcService] LC saved to MySQL: ${lcData.lcNumber}`);
      }
    } catch (err) {
      console.warn('[lcService] MySQL save lc failed, updating local', err.message);
    }

    const lcs = getLocal('erp_lc_records', MOCK_LCS);
    const updated = lc.id 
      ? lcs.map(item => item.id === lc.id ? { ...item, ...lcData } : item)
      : [lcData, ...lcs];
      
    saveLocal('erp_lc_records', updated);
    return lcData;
  },

  deleteLC: async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/lcs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        console.log(`[lcService] LC deleted from MySQL: ${id}`);
      }
    } catch (err) {
      console.warn('[lcService] MySQL delete lc failed', err.message);
    }

    const lcs = getLocal('erp_lc_records', MOCK_LCS);
    const updated = lcs.filter(item => item.id !== id);
    saveLocal('erp_lc_records', updated);
    return true;
  },

  postLCMargin: async (lcId, amount, type, refNo, bankAccountId, currentUser) => {
    const lcs = await lcService.getLCs();
    const lc = lcs.find(item => item.id === lcId);
    if (!lc) throw new Error('LC record not found');

    const marginAmtBDT = Number(amount);
    
    const journalEntry = {
      id: `jv-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      refNo: `MARG-${lc.lcNumber}-${Date.now().toString().slice(-4)}`,
      narration: `${type} Margin Deposit for LC: ${lc.lcNumber}. Ref: ${refNo}`,
      voucherType: 'Payment',
      paymentMethod: 'bank',
      sourceModule: 'LC Accounting',
      sourceRefId: lc.id,
      lines: [
        { accountId: 'acc-1110', type: 'debit', amount: marginAmtBDT, memo: `LC Margin Asset (${type})` },
        { accountId: bankAccountId, type: 'credit', amount: marginAmtBDT, memo: `Paid from Bank Account` }
      ]
    };

    await accountingService.postJournalEntry(journalEntry);

    lc.marginDeposits = lc.marginDeposits || [];
    lc.marginDeposits.push({
      id: `m-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      amount: marginAmtBDT,
      type,
      ref: refNo
    });

    lc.status = 'Opened';
    await lcService.saveLC(lc);

    await auditService.logCreate(currentUser || { uid: 'system', displayName: 'System' }, 'accounting', lc.id, lc.lcNumber, `Paid margin BDT ${marginAmtBDT.toLocaleString()} for LC ${lc.lcNumber}`);
  },

  postShipmentEntry: async (lcId, shipmentForm, currentUser) => {
    const lcs = await lcService.getLCs();
    const lc = lcs.find(item => item.id === lcId);
    if (!lc) throw new Error('LC record not found');

    const shipmentItem = {
      id: `s-${Date.now()}`,
      ...shipmentForm,
      gitPosted: false
    };

    lc.shipments = lc.shipments || [];
    lc.shipments.push(shipmentItem);
    
    const fobBDT = (lc.items || []).reduce((sum, item) => sum + (item.totalCostForeign * lc.exchangeRate), 0);
    
    const journalEntry = {
      id: `jv-${Date.now()}`,
      date: shipmentItem.blDate || new Date().toISOString().substring(0, 10),
      refNo: `GIT-${lc.lcNumber}-${Date.now().toString().slice(-4)}`,
      narration: `Goods in Transit (BL) shipment loaded under LC: ${lc.lcNumber}. Invoice: ${shipmentItem.invoiceNo}`,
      voucherType: 'Journal',
      sourceModule: 'LC Accounting',
      sourceRefId: lc.id,
      lines: [
        { accountId: 'acc-1230', type: 'debit', amount: fobBDT, memo: `Goods in Transit Assets` },
        { accountId: 'acc-2010', type: 'credit', amount: fobBDT, memo: `LC Trade Liabilities Payable` }
      ]
    };

    await accountingService.postJournalEntry(journalEntry);
    shipmentItem.gitPosted = true;
    
    lc.status = 'Shipment Received';
    await lcService.saveLC(lc);

    await auditService.logCreate(currentUser || { uid: 'system', displayName: 'System' }, 'accounting', lc.id, lc.lcNumber, `Shipment BL ${shipmentItem.blNo} registered under LC ${lc.lcNumber}. GIT posted.`);
  },

  postLCCost: async (lcId, costType, amount, refNo, date, category, bankAccountId, currentUser) => {
    const lcs = await lcService.getLCs();
    const lc = lcs.find(item => item.id === lcId);
    if (!lc) throw new Error('LC record not found');

    const costItem = {
      id: `c-${Date.now()}`,
      type: costType,
      amount: Number(amount),
      ref: refNo,
      date: date || new Date().toISOString().substring(0, 10),
      category
    };

    const creditAccount = costType === 'Supplier Invoice' ? 'acc-2010' : bankAccountId;
    
    const journalEntry = {
      id: `jv-${Date.now()}`,
      date: costItem.date,
      refNo: `COST-${lc.lcNumber}-${Date.now().toString().slice(-4)}`,
      narration: `Allocated Cost [${costType}] under LC: ${lc.lcNumber}. Ref: ${refNo}`,
      voucherType: 'Payment',
      paymentMethod: costType === 'Supplier Invoice' ? 'credit' : 'bank',
      sourceModule: 'LC Accounting',
      sourceRefId: lc.id,
      lines: [
        { accountId: 'acc-1230', type: 'debit', amount: costItem.amount, memo: `${costType} Landed additions` },
        { accountId: creditAccount, type: 'credit', amount: costItem.amount, memo: `Settlement via Bank/Payable` }
      ]
    };

    await accountingService.postJournalEntry(journalEntry);

    lc.costs = lc.costs || [];
    lc.costs.push(costItem);
    if (lc.status === 'Shipment Received') {
      lc.status = 'Documents Received';
    }
    await lcService.saveLC(lc);

    await auditService.logCreate(currentUser || { uid: 'system', displayName: 'System' }, 'accounting', lc.id, lc.lcNumber, `Logged landed expense ${costType} BDT ${costItem.amount.toLocaleString()} for LC ${lc.lcNumber}`);
  },

  runCostAllocation: async (lcId, allocationBasis) => {
    const lcs = await lcService.getLCs();
    const lc = lcs.find(item => item.id === lcId);
    if (!lc) throw new Error('LC record not found');

    const totalLandedCost = (lc.costs || []).reduce((sum, c) => sum + c.amount, 0);
    const productCostBDT = (lc.items || []).reduce((sum, item) => sum + (item.totalCostForeign * lc.exchangeRate), 0);

    let totalWeight = (lc.items || []).reduce((sum, item) => sum + (Number(item.weight || 0) * item.qty), 0);
    let totalVolume = (lc.items || []).reduce((sum, item) => sum + (Number(item.volume || 0) * item.qty), 0);
    let totalQty = (lc.items || []).reduce((sum, item) => sum + item.qty, 0);

    lc.items.forEach(item => {
      let ratio = 0;
      if (allocationBasis === 'Quantity') {
        ratio = totalQty > 0 ? (item.qty / totalQty) : 0;
      } else if (allocationBasis === 'FOB Value') {
        const itemFOB = item.totalCostForeign * lc.exchangeRate;
        ratio = productCostBDT > 0 ? (itemFOB / productCostBDT) : 0;
      } else if (allocationBasis === 'Weight') {
        const itemWeight = Number(item.weight || 0) * item.qty;
        ratio = totalWeight > 0 ? (itemWeight / totalWeight) : 0;
      } else if (allocationBasis === 'Volume') {
        const itemVolume = Number(item.volume || 0) * item.qty;
        ratio = totalVolume > 0 ? (itemVolume / totalVolume) : 0;
      }

      const allocated = totalLandedCost * ratio;
      item.allocatedCost = Number(allocated.toFixed(2));
      const totalItemLandedBDT = (item.totalCostForeign * lc.exchangeRate) + allocated;
      item.landedUnitCost = Number((totalItemLandedBDT / item.qty).toFixed(2));
    });

    await lcService.saveLC(lc);
    return lc.items;
  },

  createPADLoan: async (lcId, loanForm, currentUser) => {
    const lcs = await lcService.getLCs();
    const lc = lcs.find(item => item.id === lcId);
    if (!lc) throw new Error('LC record not found');

    const amountBDT = Number(loanForm.loanAmount);
    const settlementRate = Number(loanForm.settlementRate);

    const openingFobBDT = lc.lcAmountForeign * lc.exchangeRate;
    const settlementFobBDT = lc.lcAmountForeign * settlementRate;
    const forexDiff = settlementFobBDT - openingFobBDT;

    const lines = [
      { accountId: 'acc-2010', type: 'debit', amount: Number(openingFobBDT.toFixed(2)), memo: `Clear Import accounts payable` },
      { accountId: 'acc-2040', type: 'credit', amount: Number(settlementFobBDT.toFixed(2)), memo: `${loanForm.loanType} bank loan created` }
    ];

    if (forexDiff > 0.01) {
      lines.push({ accountId: 'acc-6160', type: 'debit', amount: Number(forexDiff.toFixed(2)), memo: `Forex loss on settlement` });
    } else if (forexDiff < -0.01) {
      lines.push({ accountId: 'acc-6160', type: 'credit', amount: Number(Math.abs(forexDiff).toFixed(2)), memo: `Forex gain on settlement` });
    }

    const journalEntry = {
      id: `jv-${Date.now()}`,
      date: loanForm.date || new Date().toISOString().substring(0, 10),
      refNo: `PAD-${lc.lcNumber}-${Date.now().toString().slice(-4)}`,
      narration: `Invoice Settlement by Bank via ${loanForm.loanType} for LC: ${lc.lcNumber}. Ex-Rate: ${settlementRate} BDT.`,
      voucherType: 'Journal',
      sourceModule: 'LC Accounting',
      sourceRefId: lc.id,
      lines
    };

    await accountingService.postJournalEntry(journalEntry);

    lc.padLoans = lc.padLoans || [];
    lc.padLoans.push({
      id: `p-${Date.now()}`,
      loanType: loanForm.loanType,
      loanAmount: amountBDT,
      interestRate: Number(loanForm.interestRate),
      settlementRate,
      status: 'Active',
      date: loanForm.date
    });

    lc.status = 'PAD Created';
    await lcService.saveLC(lc);

    await auditService.logCreate(currentUser || { uid: 'system', displayName: 'System' }, 'accounting', lc.id, lc.lcNumber, `Created ${loanForm.loanType} loan for BDT ${amountBDT.toLocaleString()} under LC ${lc.lcNumber}`);
  },

  saveCustomsAssessment: async (lcId, customsForm) => {
    const lcs = await lcService.getLCs();
    const lc = lcs.find(item => item.id === lcId);
    if (!lc) throw new Error('LC record not found');

    lc.customs = {
      assessableValue: Number(customsForm.assessableValue),
      cd: Number(customsForm.cd),
      rd: Number(customsForm.rd),
      sd: Number(customsForm.sd),
      vat: Number(customsForm.vat),
      ait: Number(customsForm.ait),
      at: Number(customsForm.at),
      totalDutyPaid: Number(customsForm.totalDutyPaid)
    };

    lc.status = 'Duty Paid';
    await lcService.saveLC(lc);
    return lc.customs;
  },

  capitalizeLC: async (lcId, warehouseId, currentUser) => {
    const lcs = await lcService.getLCs();
    const lc = lcs.find(item => item.id === lcId);
    if (!lc) throw new Error('LC record not found');
    if (lc.status === 'Capitalized') throw new Error('LC is already capitalized');

    const hasAllocated = (lc.items || []).every(it => it.landedUnitCost > 0);
    if (!hasAllocated) {
      await lcService.runCostAllocation(lcId, 'FOB Value');
      const reloaded = await lcService.getLCs();
      const reloadedLc = reloaded.find(item => item.id === lcId);
      lc.items = reloadedLc.items;
    }

    const inventoryItems = lc.items.filter(it => it.itemType === 'Inventory');
    const fixedAssetItems = lc.items.filter(it => it.itemType === 'Fixed Asset');

    const invValueBDT = inventoryItems.reduce((sum, it) => sum + (it.landedUnitCost * it.qty), 0);
    const faValueBDT = fixedAssetItems.reduce((sum, it) => sum + (it.landedUnitCost * it.qty), 0);
    
    const totalCapitalizedAmount = invValueBDT + faValueBDT;

    const journalEntry = {
      id: `jv-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      refNo: `CAP-${lc.lcNumber}-${Date.now().toString().slice(-4)}`,
      narration: `Final import capitalization under LC: ${lc.lcNumber}. Goods received at warehouse: ${warehouseId}`,
      voucherType: 'Journal',
      sourceModule: 'LC Accounting',
      sourceRefId: lc.id,
      lines: [
        { accountId: 'acc-1200', type: 'debit', amount: Number(invValueBDT.toFixed(2)), memo: `Inventory asset additions` },
        { accountId: 'acc-1500', type: 'debit', amount: Number(faValueBDT.toFixed(2)), memo: `Fixed asset capitalization` },
        { accountId: 'acc-1230', type: 'credit', amount: Number(totalCapitalizedAmount.toFixed(2)), memo: `Clear Goods in Transit balance` }
      ]
    };

    const activeLines = journalEntry.lines.filter(l => l.amount > 0);
    journalEntry.lines = activeLines;

    await accountingService.postJournalEntry(journalEntry);

    lc.status = 'Capitalized';
    await lcService.saveLC(lc);

    // Update products table on MySQL (fetch list, edit, post)
    try {
      const prodRes = await fetch(`${BACKEND_URL}/erp/products`);
      if (prodRes.ok) {
        const products = await prodRes.json();
        for (const lcItem of lc.items) {
          if (lcItem.itemType === 'Inventory') {
            const match = products.find(p => p.name.trim().toLowerCase() === lcItem.itemName.trim().toLowerCase());
            if (match) {
              match.qty = Number(match.qty || 0) + Number(lcItem.qty);
              match.purchasePrice = Number(lcItem.landedUnitCost);
              await fetch(`${BACKEND_URL}/erp/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(match)
              });
            }
          }
        }
      }
    } catch (pErr) {
      console.warn('[lcService] Failed to capitalize products in MySQL:', pErr.message);
    }

    await auditService.logCreate(currentUser || { uid: 'system', displayName: 'System' }, 'accounting', lc.id, lc.lcNumber, `Capitalized LC ${lc.lcNumber}. Inventory added BDT ${invValueBDT.toLocaleString()}. Fixed Assets BDT ${faValueBDT.toLocaleString()}`);
  }
};
