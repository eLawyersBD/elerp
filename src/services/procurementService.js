import { auditService } from './auditService';
import { purchaseService } from './purchaseService';

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

const DEFAULT_BUDGETS = {
  'IT': { total: 2500000, spent: 0 },
  'Operations': { total: 5000000, spent: 0 },
  'Finance': { total: 1000000, spent: 0 },
  'Marketing': { total: 800000, spent: 0 },
  'HR': { total: 500000, spent: 0 }
};

const DEFAULT_PLAN_ITEMS = [
  { id: 'plan-1', planYear: '2026', department: 'IT', budgetHead: 'Hardware Assets', itemName: 'Developer Laptops', specification: 'Core i7, 16GB RAM, 512GB SSD', unit: 'Pcs', annualQty: 10, estimatedUnitCost: 120000.00, estimatedTotalCost: 1200000.00, requiredMonth: '2026-03', priority: 'High', convertedQty: 0, status: 'Approved' },
  { id: 'plan-2', planYear: '2026', department: 'IT', budgetHead: 'Software Licenses', itemName: 'Cloud Hosting Subscriptions', specification: 'AWS Enterprise Support', unit: 'Month', annualQty: 12, estimatedUnitCost: 80000.00, estimatedTotalCost: 960000.00, requiredMonth: '2026-01', priority: 'Medium', convertedQty: 0, status: 'Approved' },
  { id: 'plan-3', planYear: '2026', department: 'Operations', budgetHead: 'Warehouse Equipment', itemName: 'Electric Forklift', specification: '2-ton capacity, lithium battery', unit: 'Pcs', annualQty: 2, estimatedUnitCost: 450000.00, estimatedTotalCost: 900000.00, requiredMonth: '2026-04', priority: 'High', convertedQty: 0, status: 'Approved' }
];

export const procurementService = {
  // Budget Head management (recalculated based on PR database)
  getBudgets: () => {
    const updatedBudgets = JSON.parse(JSON.stringify(DEFAULT_BUDGETS));
    const prs = procurementService.getPRs();
    prs.forEach(pr => {
      if (pr.status !== 'Rejected' && pr.status !== 'Draft') {
        const dept = pr.department;
        if (updatedBudgets[dept]) {
          updatedBudgets[dept].spent += Number(pr.totalAmount);
        }
      }
    });
    return updatedBudgets;
  },

  // Annual Procurement Plan CRUD
  getPlans: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/procurement/plans`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_procurement_plans', data);
      })
      .catch(err => console.warn('[procurementService] MySQL fetch plans background failed', err.message));

    return getLocal('erp_procurement_plans', DEFAULT_PLAN_ITEMS);
  },

  savePlanItem: (item) => {
    const totalCost = Number(item.annualQty || 0) * Number(item.estimatedUnitCost || 0);
    const itemData = {
      ...item,
      annualQty: Number(item.annualQty),
      estimatedUnitCost: Number(item.estimatedUnitCost),
      estimatedTotalCost: totalCost,
      convertedQty: Number(item.convertedQty || 0)
    };

    if (!itemData.id) {
      itemData.id = `plan-${Date.now()}`;
      itemData.status = 'Approved';
    }

    const plans = getLocal('erp_procurement_plans', DEFAULT_PLAN_ITEMS);
    const updated = item.id 
      ? plans.map(p => p.id === item.id ? { ...p, ...itemData } : p)
      : [itemData, ...plans];
    saveLocal('erp_procurement_plans', updated);

    // Background MySQL save
    fetch(`${BACKEND_URL}/erp/procurement/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    }).catch(err => console.warn(err));

    return true;
  },

  deletePlanItem: (id) => {
    const plans = getLocal('erp_procurement_plans', DEFAULT_PLAN_ITEMS);
    const updated = plans.filter(p => p.id !== id);
    saveLocal('erp_procurement_plans', updated);

    // Background MySQL delete
    fetch(`${BACKEND_URL}/erp/procurement/plans/${id}`, {
      method: 'DELETE'
    }).catch(err => console.warn(err));

    return true;
  },

  // Requisition List Queries
  getPRs: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/procurement/requisitions`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_purchase_requisitions', data);
      })
      .catch(err => console.warn('[procurementService] MySQL fetch PRs background failed', err.message));

    return getLocal('erp_purchase_requisitions', []);
  },

  // Pre-submission budget checking
  verifyBudget: (department, prAmount) => {
    const budgets = procurementService.getBudgets();
    const deptBudget = budgets[department] || { total: 0, spent: 0 };
    const remaining = deptBudget.total - deptBudget.spent;
    return {
      isAvailable: remaining >= prAmount,
      total: deptBudget.total,
      spent: deptBudget.spent,
      remaining
    };
  },

  // Duplicate Check Helper
  detectDuplicateRequest: (department, items) => {
    const prs = procurementService.getPRs();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentPrs = prs.filter(pr => 
      pr.department === department && 
      new Date(pr.requisitionDate).getTime() >= oneDayAgo &&
      pr.status !== 'Rejected'
    );

    for (const pr of recentPrs) {
      if (pr.items.length === items.length) {
        let matchCount = 0;
        pr.items.forEach(oldItem => {
          const matched = items.find(newItem => 
            newItem.itemName.trim().toLowerCase() === oldItem.itemName.trim().toLowerCase() && 
            Number(newItem.qty) === Number(oldItem.qty)
          );
          if (matched) matchCount++;
        });
        if (matchCount === items.length) {
          return pr;
        }
      }
    }
    return null;
  },

  // Create Requisition
  createPR: async (prData, currentUser) => {
    const prs = procurementService.getPRs();
    
    const itemsWithTotals = prData.items.map(item => ({
      ...item,
      qty: Number(item.qty),
      estimatedRate: Number(item.estimatedRate),
      totalCost: Number(item.qty) * Number(item.estimatedRate)
    }));
    
    const totalAmount = itemsWithTotals.reduce((sum, it) => sum + it.totalCost, 0);

    // Verify budget
    const budgetCheck = procurementService.verifyBudget(prData.department, totalAmount);
    if (!budgetCheck.isAvailable && prData.status !== 'Draft') {
      throw new Error(`Insufficient budget. Department has only ৳${budgetCheck.remaining.toLocaleString()} budget remaining.`);
    }

    const year = new Date().getFullYear();
    const count = prs.filter(p => new Date(p.requisitionDate).getFullYear() === year).length + 1;
    const prNumber = `PR-${year}-${String(count).padStart(4, '0')}`;

    const approvalWorkflow = [
      { levelIndex: 0, approverRole: 'Department Head', status: 'Pending', remarks: '', updatedAt: '' }
    ];
    
    if (totalAmount > 50000) {
      approvalWorkflow.push({ levelIndex: 1, approverRole: 'Finance Manager', status: 'Pending', remarks: '', updatedAt: '' });
    }
    if (totalAmount > 200000) {
      approvalWorkflow.push({ levelIndex: 2, approverRole: 'CFO', status: 'Pending', remarks: '', updatedAt: '' });
    }
    if (totalAmount > 500000) {
      approvalWorkflow.push({ levelIndex: 3, approverRole: 'Managing Director', status: 'Pending', remarks: '', updatedAt: '' });
    }

    const newPR = {
      id: `pr-${Date.now()}`,
      prNumber,
      requisitionDate: new Date().toISOString().substring(0, 10),
      requesterId: currentUser?.uid || 'guest',
      requesterName: currentUser?.displayName || 'System Requester',
      department: prData.department,
      costCenter: prData.costCenter || 'CC-General',
      requiredDeliveryDate: prData.requiredDeliveryDate,
      justification: prData.justification || '',
      items: itemsWithTotals,
      totalAmount,
      budgetVerified: budgetCheck.isAvailable,
      status: prData.status || 'Pending Approval',
      currentApprovalLevel: 0,
      approvalWorkflow,
      attachmentName: prData.attachmentName || null,
      history: [{ status: prData.status || 'Pending Approval', remark: 'Requisition submitted', updater: currentUser?.displayName || 'System', timestamp: new Date().toISOString() }]
    };

    saveLocal('erp_purchase_requisitions', [newPR, ...prs]);

    // Background save to MySQL
    fetch(`${BACKEND_URL}/erp/procurement/requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPR)
    }).catch(err => console.warn('[procurementService] MySQL create PR sync failed', err.message));

    // Update converted quantities in planning
    const plans = procurementService.getPlans();
    itemsWithTotals.forEach(item => {
      if (item.sourcePlanItemId) {
        const pIndex = plans.findIndex(p => p.id === item.sourcePlanItemId);
        if (pIndex !== -1) {
          plans[pIndex].convertedQty += item.qty;
          procurementService.savePlanItem(plans[pIndex]);
        }
      }
    });

    await auditService.logCreate(currentUser, 'purchases', prNumber, prNumber, `Created purchase requisition ${prNumber} — BDT ${totalAmount.toLocaleString()}`, null, newPR);
    return prNumber;
  },

  submitPR: async (prId, currentUser) => {
    const prs = procurementService.getPRs();
    const prIndex = prs.findIndex(p => p.id === prId);
    if (prIndex === -1) throw new Error('Requisition not found.');
    
    const pr = prs[prIndex];
    if (pr.status !== 'Draft') throw new Error('Requisition is already submitted.');

    const budgetCheck = procurementService.verifyBudget(pr.department, pr.totalAmount);
    if (!budgetCheck.isAvailable) {
      throw new Error(`Insufficient budget. Department has only ৳${budgetCheck.remaining.toLocaleString()} budget remaining.`);
    }

    pr.status = 'Pending Approval';
    pr.budgetVerified = true;
    pr.history.push({
      status: 'Pending Approval',
      remark: 'Draft submitted for approval workflow',
      updater: currentUser?.displayName || 'System',
      timestamp: new Date().toISOString()
    });

    prs[prIndex] = pr;
    saveLocal('erp_purchase_requisitions', prs);

    // Background sync to MySQL
    fetch(`${BACKEND_URL}/erp/procurement/requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pr)
    }).catch(err => console.warn(err));

    return true;
  },

  approvePR: async (prId, currentApproverName, remarks, currentUser) => {
    const prs = procurementService.getPRs();
    const prIndex = prs.findIndex(p => p.id === prId);
    if (prIndex === -1) throw new Error('Requisition not found.');
    
    const pr = prs[prIndex];
    const currentLevel = pr.currentApprovalLevel;
    const workflow = pr.approvalWorkflow;

    workflow[currentLevel].status = 'Approved';
    workflow[currentLevel].remarks = remarks;
    workflow[currentLevel].updatedAt = new Date().toISOString();

    if (currentLevel < workflow.length - 1) {
      pr.currentApprovalLevel += 1;
      pr.status = `Pending Approval (${workflow[currentLevel + 1].approverRole})`;
    } else {
      pr.status = 'Approved';
    }

    pr.history.push({
      status: pr.status,
      remark: remarks || `Level ${currentLevel + 1} Approved.`,
      updater: currentApproverName,
      timestamp: new Date().toISOString()
    });

    prs[prIndex] = pr;
    saveLocal('erp_purchase_requisitions', prs);

    // Background sync to MySQL
    fetch(`${BACKEND_URL}/erp/procurement/requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pr)
    }).catch(err => console.warn(err));

    await auditService.logUpdate(currentUser, 'purchases', pr.prNumber, pr.prNumber, `Approved Requisition: ${pr.prNumber} (New status: ${pr.status})`, null, pr);
    return true;
  },

  rejectPR: async (prId, currentApproverName, remarks, currentUser) => {
    const prs = procurementService.getPRs();
    const prIndex = prs.findIndex(p => p.id === prId);
    if (prIndex === -1) throw new Error('Requisition not found.');
    
    const pr = prs[prIndex];
    const currentLevel = pr.currentApprovalLevel;
    const workflow = pr.approvalWorkflow;

    workflow[currentLevel].status = 'Rejected';
    workflow[currentLevel].remarks = remarks;
    workflow[currentLevel].updatedAt = new Date().toISOString();

    pr.status = 'Rejected';
    pr.history.push({
      status: 'Rejected',
      remark: remarks || 'Requisition rejected by management.',
      updater: currentApproverName,
      timestamp: new Date().toISOString()
    });

    prs[prIndex] = pr;
    saveLocal('erp_purchase_requisitions', prs);

    // Background sync to MySQL
    fetch(`${BACKEND_URL}/erp/procurement/requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pr)
    }).catch(err => console.warn(err));

    await auditService.logUpdate(currentUser, 'purchases', pr.prNumber, pr.prNumber, `Rejected Requisition: ${pr.prNumber}`, null, pr);
    return true;
  },

  getRFQQuotes: (prId) => {
    return getLocal(`quotes_${prId}`, []);
  },

  saveRFQQuotes: (prId, quotes) => {
    saveLocal(`quotes_${prId}`, quotes);
  },

  selectVendorAndGeneratePO: async (prId, supplierId, currentUser) => {
    const prs = procurementService.getPRs();
    const prIndex = prs.findIndex(p => p.id === prId);
    if (prIndex === -1) throw new Error('Requisition not found.');
    const pr = prs[prIndex];
    if (pr.status !== 'Approved') throw new Error('Requisition is not fully approved.');

    const quotes = procurementService.getRFQQuotes(prId);
    const selectedQuote = quotes.find(q => q.supplierId === supplierId);
    if (!selectedQuote) throw new Error('Quote details not found.');

    const poItems = selectedQuote.items.map(item => ({
      productId: item.productId || 'custom',
      qty: item.qty,
      unitPrice: item.quotedRate,
      vatRateId: 'vat-std',
      discount: 0
    }));

    const poNumber = await purchaseService.postPurchaseInvoice({
      supplierId,
      date: new Date().toISOString().substring(0, 10),
      narration: `PO generated from Requisition ${pr.prNumber}`,
      items: poItems,
      landedCost: { freight: 0, customs: 0, insurance: 0 },
      allocationMethod: 'value'
    }, currentUser);

    pr.status = 'PO Created';
    pr.poNumber = poNumber;
    pr.history.push({
      status: 'PO Created',
      remark: `Purchase Order ${poNumber} generated for supplier: ${selectedQuote.supplierName}`,
      updater: currentUser?.displayName || 'Procurement Agent',
      timestamp: new Date().toISOString()
    });

    prs[prIndex] = pr;
    saveLocal('erp_purchase_requisitions', prs);

    // Background sync to MySQL
    fetch(`${BACKEND_URL}/erp/procurement/requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pr)
    }).catch(err => console.warn(err));

    return poNumber;
  },

  getDashboardStats: () => {
    const plans = procurementService.getPlans();
    const prs = procurementService.getPRs();
    const budgets = procurementService.getBudgets();

    const departments = Object.keys(budgets);
    const budgetTotal = departments.reduce((sum, d) => sum + budgets[d].total, 0);
    const budgetSpent = departments.reduce((sum, d) => sum + budgets[d].spent, 0);

    const pendingCount = prs.filter(p => p.status.startsWith('Pending') || p.status.includes('approv') || p.status.includes('Approv')).length;
    const approvedCount = prs.filter(p => p.status === 'Approved').length;
    const draftCount = prs.filter(p => p.status === 'Draft').length;

    const deptActuals = departments.map(d => ({
      name: d,
      budget: budgets[d].total,
      actual: budgets[d].spent,
      percent: budgets[d].total > 0 ? Math.round((budgets[d].spent / budgets[d].total) * 100) : 0
    }));

    const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
    const suggestions = procurementService.getAutoReorderSuggestions(products);

    return {
      budgetTotal,
      budgetSpent,
      pendingCount,
      approvedCount,
      draftCount,
      deptActuals,
      autoSuggestionsCount: suggestions.length
    };
  },

  getVendorDetails: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/procurement/vendor-details`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_procurement_vendor_details', data);
      })
      .catch(err => console.warn('[procurementService] MySQL getVendorDetails background sync failed', err.message));

    return getLocal('erp_procurement_vendor_details', {});
  },

  saveVendorDetails: (supplierId, details) => {
    const vendorMap = getLocal('erp_procurement_vendor_details', {});
    vendorMap[supplierId] = details;
    saveLocal('erp_procurement_vendor_details', vendorMap);

    // Background save to MySQL
    fetch(`${BACKEND_URL}/erp/procurement/vendor-details/${supplierId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    }).catch(err => console.warn(err));
  },

  getReorderRules: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/procurement/reorder-rules`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_procurement_reorder_rules', data);
      })
      .catch(err => console.warn('[procurementService] MySQL getReorderRules background sync failed', err.message));

    return getLocal('erp_procurement_reorder_rules', {});
  },

  saveReorderRule: (productId, rule) => {
    const reorderMap = getLocal('erp_procurement_reorder_rules', {});
    reorderMap[productId] = rule;
    saveLocal('erp_procurement_reorder_rules', reorderMap);

    // Background save to MySQL
    fetch(`${BACKEND_URL}/erp/procurement/reorder-rules/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    }).catch(err => console.warn(err));
  },

  getAutoReorderSuggestions: (productsList = []) => {
    // Keep client-side matching logic
    return [];
  }
};
