import { useState, useEffect } from 'react';
import { procurementService } from '../services/procurementService';

const fmt = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getDeliveryDate = (days = 15) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
const getVendorCode = (name) => `VND-${name.replace(/ /g, '').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-2)}`;

export default function ProcurementPlanningView({ currentUser, products = [], onRefresh }) {
  const [tab, setTab] = useState('dashboard'); // dashboard | planning | requisitions | approvals | processing | vendors
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Service data states
  const [plans, setPlans] = useState([]);
  const [prs, setPrs] = useState([]);
  const [stats, setStats] = useState({});
  const [vendorDetails, setVendorDetails] = useState({});
  const [reorderRules, setReorderRules] = useState({});
  const [autoSuggestions, setAutoSuggestions] = useState([]);

  // Form states - Annual Planning
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    planYear: '2026', department: 'IT', budgetHead: 'Hardware Assets',
    itemName: '', specification: '', unit: 'Pcs', annualQty: '', estimatedUnitCost: '',
    requiredMonth: '2026-03', priority: 'Medium'
  });

  // Form states - Purchase Requisition
  const [showPrForm, setShowPrForm] = useState(false);
  const [prForm, setPrForm] = useState({
    department: 'IT', costCenter: 'CC-General', requiredDeliveryDate: '', justification: '',
    attachmentName: ''
  });
  const [prItems, setPrItems] = useState([
    { itemName: '', specification: '', qty: 1, estimatedRate: '', sourcePlanItemId: '' }
  ]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Filter states
  const [planFilterDept, setPlanFilterDept] = useState('all');
  const [prFilterStatus, setPrFilterStatus] = useState('all');

  // Approver role simulation state
  const [simulatedRole, setSimulatedRole] = useState('Department Head');
  const [approvalRemarks, setApprovalRemarks] = useState('');

  // Processing tab states
  const [selectedPrId, setSelectedPrId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // Detail side drawer and vendor editing states
  const [detailPr, setDetailPr] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorForm, setVendorForm] = useState({
    code: '', bin: '', currency: 'BDT', paymentTerms: 'Net 30', moq: 5, leadTime: 5,
    kyc: true, bankVerified: true, contractStatus: 'Active', contractExpiry: '',
    scores: { quality: 20, delivery: 20, price: 15, support: 8, compliance: 8, flexibility: 8 }
  });

  // Reorder Rule configuration state
  const [selectedRuleProduct, setSelectedRuleProduct] = useState(null);
  const [reorderForm, setReorderForm] = useState({
    reorderPoint: 10, minStock: 5, maxStock: 50, safetyStock: 5, leadTime: 7, avgMonthlyConsumption: 15, preferredSupplierId: ''
  });
  const [selectedShortageIds, setSelectedShortageIds] = useState([]);

  const loadData = () => {
    setPlans(procurementService.getPlans());
    setPrs(procurementService.getPRs());
    setStats(procurementService.getDashboardStats());
    setVendorDetails(procurementService.getVendorDetails());
    setReorderRules(procurementService.getReorderRules());
    setAutoSuggestions(procurementService.getAutoReorderSuggestions(products));
    setSelectedShortageIds([]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const handleSavePlanItem = (e) => {
    e.preventDefault();
    if (!planForm.itemName || !planForm.annualQty || !planForm.estimatedUnitCost) {
      return alert('Please fill in all required fields.');
    }
    procurementService.savePlanItem(planForm);
    setSuccessMsg('✅ Annual procurement plan item saved successfully.');
    setShowPlanForm(false);
    setPlanForm({
      planYear: '2026', department: 'IT', budgetHead: 'Hardware Assets',
      itemName: '', specification: '', unit: 'Pcs', annualQty: '', estimatedUnitCost: '',
      requiredMonth: '2026-03', priority: 'Medium'
    });
    loadData();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeletePlanItem = (id) => {
    if (confirm('Are you sure you want to delete this planned item?')) {
      procurementService.deletePlanItem(id);
      loadData();
    }
  };

  // Convert planned item to a requisition draft
  const handleConvertToRequisition = (planItem) => {
    setPrForm({
      department: planItem.department,
      costCenter: 'CC-' + planItem.budgetHead.replace(/ /g, ''),
      requiredDeliveryDate: getDeliveryDate(15),
      justification: `Procurement for planned item: ${planItem.itemName} (${planItem.planYear})`,
      attachmentName: ''
    });
    setPrItems([
      {
        itemName: planItem.itemName,
        specification: planItem.specification,
        qty: Number(planItem.annualQty) - Number(planItem.convertedQty || 0),
        estimatedRate: planItem.estimatedUnitCost,
        sourcePlanItemId: planItem.id
      }
    ]);
    setTab('requisitions');
    setShowPrForm(true);
    setDuplicateWarning(null);
  };

  // PR Item line handlers
  const addPrLine = () => {
    setPrItems([...prItems, { itemName: '', specification: '', qty: 1, estimatedRate: '', sourcePlanItemId: '' }]);
  };
  const removePrLine = (i) => {
    setPrItems(prItems.filter((_, j) => j !== i));
  };
  const setPrItemValue = (i, key, val) => {
    const updated = prItems.map((item, j) => {
      if (j !== i) return item;
      return { ...item, [key]: val };
    });
    setPrItems(updated);
    
    // Auto duplicate check on item list typing
    if (key === 'itemName' || key === 'qty') {
      const dup = procurementService.detectDuplicateRequest(prForm.department, updated);
      setDuplicateWarning(dup);
    }
  };

  // Upload attachment simulator
  const handleSimulateAttachment = () => {
    const filenames = ['Project_Specs_V2.pdf', 'Office_Budget_Quote_IT.xlsx', 'Procurement_Proposal.docx', 'Supplier_Bids_Approved.pdf'];
    const randomName = filenames[Math.floor(Math.random() * filenames.length)];
    setPrForm(f => ({ ...f, attachmentName: randomName }));
  };

  // Submit purchase requisition
  const handleSubmitPR = async (status = 'Pending Approval') => {
    if (prItems.some(it => !it.itemName || !it.qty || !it.estimatedRate)) {
      return alert('Please fill in item names, quantities, and estimated rates correctly.');
    }
    
    const prData = {
      ...prForm,
      items: prItems,
      status
    };

    setLoading(true);
    setErrorMsg('');
    try {
      const prNumber = await procurementService.createPR(prData, currentUser);
      setSuccessMsg(`✅ Purchase Requisition ${prNumber} created successfully.`);
      setShowPrForm(false);
      setPrForm({ department: 'IT', costCenter: 'CC-General', requiredDeliveryDate: '', justification: '', attachmentName: '' });
      setPrItems([{ itemName: '', specification: '', qty: 1, estimatedRate: '', sourcePlanItemId: '' }]);
      setDuplicateWarning(null);
      loadData();
      onRefresh?.();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit draft PR
  const handlePRSubmitFromDraft = async (prId) => {
    setLoading(true);
    try {
      const prNumber = await procurementService.submitPR(prId, currentUser);
      setSuccessMsg(`✅ Requisition ${prNumber} submitted for approval.`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Approve / Reject PR handlers
  const handleApprovePR = async (prId) => {
    setLoading(true);
    try {
      const nextStatus = await procurementService.approvePR(prId, currentUser?.displayName || simulatedRole, approvalRemarks, currentUser);
      setSuccessMsg(`✅ Requisition approved. Status: ${nextStatus}`);
      setApprovalRemarks('');
      loadData();
      onRefresh?.();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPR = async (prId) => {
    if (!approvalRemarks) return alert('Remarks/Justification are required when rejecting a requisition.');
    setLoading(true);
    try {
      await procurementService.rejectPR(prId, currentUser?.displayName || simulatedRole, approvalRemarks, currentUser);
      setSuccessMsg('❌ Requisition rejected.');
      setApprovalRemarks('');
      loadData();
      onRefresh?.();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Post PO from Selected Quote
  const handleSelectQuoteAndPostPO = async (prId, supplierId) => {
    setLoading(true);
    try {
      const poNum = await procurementService.selectVendorAndGeneratePO(prId, supplierId, currentUser);
      setSuccessMsg(`✅ Vendor Selected! PO ${poNum} successfully posted to Accounts Payable & Inventory.`);
      setSelectedPrId('');
      setSelectedSupplierId('');
      loadData();
      onRefresh?.();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert('Error converting quote to PO: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertShortageToPR = async (item) => {
    setLoading(true);
    try {
      const prData = {
        department: item.category === 'Office Supplies' ? 'Finance' : (item.category === 'Safety Gear' ? 'Operations' : 'IT'),
        costCenter: 'CC-AutoReplenish',
        requiredDeliveryDate: getDeliveryDate(item.leadTime || 7),
        justification: `Automated inventory shortage trigger: ${item.reason} for SKU ${item.sku}`,
        attachmentName: null,
        items: [{
          itemName: item.itemName,
          specification: `Replenish SKU: ${item.sku}. Current stock: ${item.currentStock} / Reorder Point: ${item.reorderPoint}`,
          qty: item.suggestedQty,
          estimatedRate: item.price,
          productId: item.productId
        }],
        status: 'Draft'
      };
      const prNumber = await procurementService.createPR(prData, currentUser);
      setSuccessMsg(`✅ Auto Suggestion converted to Draft Requisition ${prNumber} successfully.`);
      loadData();
      setTab('requisitions');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkConvertShortages = async () => {
    if (selectedShortageIds.length === 0) return;
    setLoading(true);
    let successCount = 0;
    
    // Group selected suggestions by department to make nice draft PRs
    const selectedSugs = autoSuggestions.filter(s => selectedShortageIds.includes(s.id));
    const byDept = {};
    selectedSugs.forEach(s => {
      const dept = s.category === 'Office Supplies' ? 'Finance' : (s.category === 'Safety Gear' ? 'Operations' : 'IT');
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(s);
    });

    try {
      for (const dept of Object.keys(byDept)) {
        const items = byDept[dept];
        const prData = {
          department: dept,
          costCenter: 'CC-AutoReplenish',
          requiredDeliveryDate: getDeliveryDate(7),
          justification: `Consolidated bulk replenishment of ${items.length} auto shortage suggestions`,
          attachmentName: null,
          items: items.map(item => ({
            itemName: item.itemName,
            specification: `Replenish SKU: ${item.sku}. Current stock: ${item.currentStock} / Reorder Point: ${item.reorderPoint}`,
            qty: item.suggestedQty,
            estimatedRate: item.price,
            productId: item.productId
          })),
          status: 'Draft'
        };
        await procurementService.createPR(prData, currentUser);
        successCount++;
      }
      setSuccessMsg(`✅ Successfully generated ${successCount} consolidated Draft Requisitions for selected items.`);
      setSelectedShortageIds([]);
      loadData();
      setTab('requisitions');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVendor = (supplier) => {
    const details = vendorDetails[supplier.id] || {
      code: getVendorCode(supplier.name),
      bin: '', currency: 'BDT', paymentTerms: 'Net 30', moq: 5, leadTime: 5,
      kyc: true, bankVerified: true, contractStatus: 'Active', contractExpiry: '',
      scores: { quality: 20, delivery: 20, price: 15, support: 8, compliance: 8, flexibility: 8 }
    };
    setEditingVendor(supplier);
    setVendorForm({
      ...details,
      scores: details.scores || { quality: 20, delivery: 20, price: 15, support: 8, compliance: 8, flexibility: 8 }
    });
  };

  const handleSaveVendorSubmit = (e) => {
    e.preventDefault();
    if (!editingVendor) return;
    procurementService.saveVendorDetails(editingVendor.id, vendorForm);
    setSuccessMsg(`✅ Enriched vendor master records saved for "${editingVendor.name}".`);
    setEditingVendor(null);
    loadData();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleConfigureReorderRule = (product) => {
    const rule = reorderRules[product.id] || {
      reorderPoint: product.minStock, minStock: product.minStock, maxStock: product.minStock * 4,
      safetyStock: Math.round(product.minStock * 0.5), leadTime: 7, avgMonthlyConsumption: product.minStock * 2,
      preferredSupplierId: product.supplierId || ''
    };
    setSelectedRuleProduct(product);
    setReorderForm({
      ...rule,
      preferredSupplierId: rule.preferredSupplierId || product.supplierId || ''
    });
  };

  const handleSaveReorderRuleSubmit = (e) => {
    e.preventDefault();
    if (!selectedRuleProduct) return;
    procurementService.saveReorderRule(selectedRuleProduct.id, {
      ...reorderForm,
      reorderPoint: Number(reorderForm.reorderPoint),
      minStock: Number(reorderForm.minStock),
      maxStock: Number(reorderForm.maxStock),
      safetyStock: Number(reorderForm.safetyStock),
      leadTime: Number(reorderForm.leadTime),
      avgMonthlyConsumption: Number(reorderForm.avgMonthlyConsumption)
    });
    setSuccessMsg(`✅ Inventory reorder rules updated for SKU: ${selectedRuleProduct.sku}.`);
    setSelectedRuleProduct(null);
    loadData();
    setTimeout(() => setSuccessMsg(''), 4000);
  };
  // Filter lists
  const filteredPlans = plans.filter(p => planFilterDept === 'all' || p.department === planFilterDept);
  const filteredPRs = prs.filter(pr => {
    if (prFilterStatus === 'all') return true;
    if (prFilterStatus === 'draft') return pr.status === 'Draft';
    if (prFilterStatus === 'pending') return pr.status.startsWith('Pending') || pr.status.includes('approv') || pr.status.includes('Approv');
    if (prFilterStatus === 'approved') return pr.status === 'Approved';
    if (prFilterStatus === 'pocreated') return pr.status === 'PO Created';
    if (prFilterStatus === 'rejected') return pr.status === 'Rejected';
    return true;
  });

  // Approvals filter list
  const pendingApprovalsList = prs.filter(pr => {
    if (pr.status === 'Draft' || pr.status === 'Approved' || pr.status === 'Rejected' || pr.status === 'PO Created') return false;
    const workflow = pr.approvalWorkflow;
    const levelIndex = pr.currentApprovalLevel;
    if (levelIndex < workflow.length) {
      return workflow[levelIndex].approverRole === simulatedRole;
    }
    return false;
  });

  return (
    <div>
      {/* successMsg Toast alert */}
      {successMsg && (
        <div style={{
          position: 'fixed', top: '2rem', right: '2rem',
          background: 'rgba(16, 185, 129, 0.95)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', padding: '1rem 1.5rem', borderRadius: 16,
          zIndex: 1000, fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(8px)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {successMsg}
        </div>
      )}
      {/* ── PREMIUM PROCUREMENT HEADER ── */}
      <div style={{
        marginBottom: '1.5rem',
        borderRadius: 24,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 12px 35px -5px rgba(30,27,75,0.35)',
        transition: 'all 0.3s ease'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -50, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(99,102,241,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 280, width: 120, height: 120, borderRadius: '50%', background: 'rgba(236,72,153,0.06)' }} />

        {/* Identity row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem 1.1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>📋</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-0.4px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Procurement Planning & Requisitions</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: 3, fontWeight: 500 }}>Budget Trackers · Workflows & Approvals · RFQ Comparative Statement · Vendor Evaluation</div>
            </div>
          </div>

          {/* Quick Actions & Role simulation pill */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Simulation role selection inside header */}
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 700 }}>🎭 Role Simulator:</span>
              <select 
                value={simulatedRole} 
                onChange={e => { setSimulatedRole(e.target.value); setApprovalRemarks(''); }}
                style={{
                  background: 'transparent', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 800, outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                <option value="Department Head" style={{ background: '#1e1b4b', color: '#fff' }}>👔 Dept Head</option>
                <option value="Finance Manager" style={{ background: '#1e1b4b', color: '#fff' }}>⚖️ Finance Mgr</option>
                <option value="CFO" style={{ background: '#1e1b4b', color: '#fff' }}>🏦 CFO</option>
                <option value="Managing Director" style={{ background: '#1e1b4b', color: '#fff' }}>🚀 MD</option>
              </select>
            </div>

            {/* Quick Action buttons */}
            {tab === 'planning' && (
              <button onClick={() => setShowPlanForm(!showPlanForm)} className="btn btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: 12, boxShadow: '0 4px 12px rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {showPlanForm ? '✕ Close Form' : '➕ Add Annual Plan Item'}
              </button>
            )}
            {tab === 'requisitions' && (
              <button onClick={() => { setShowPrForm(!showPrForm); setDuplicateWarning(null); }} className="btn btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: 12, boxShadow: '0 4px 12px rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {showPrForm ? '✕ Close Form' : '➕ New Purchase Requisition'}
              </button>
            )}
          </div>
        </div>
        
        {/* Info alerts banner inside header if critical shortages exist */}
        {stats.autoPrSuggestionsCount > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.6rem 2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em' }}>⚡ Alerts Dashboard:</span>
            <span style={{ fontSize: '0.75rem', color: '#fde68a', fontWeight: 700 }}>🚨 {stats.autoPrSuggestionsCount} inventory stock shortage reorders suggested</span>
            <span 
              style={{ fontSize: '0.75rem', color: '#a5f3fc', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'underline' }} 
              onClick={() => setTab('auto-generated')}
            >
              Take Action on Suggestions →
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation Tab Bar ── */}
      <div className="scrollable-tab-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-tertiary)', borderRadius: 12, padding: '0.3rem', width: 'fit-content', border: '1px solid var(--border-color)' }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'planning', label: '📅 Annual Planning' },
            { id: 'requisitions', label: '📝 Requisitions' },
            { id: 'auto-generated', label: `auto Suggestions`, badge: autoSuggestions.length, icon: '⚡' },
            { id: 'approvals', label: `Approval Inbox`, badge: pendingApprovalsList.length, icon: '📥' },
            { id: 'processing', label: '⚖️ RFQ Comparative' },
            { id: 'vendors', label: '🏢 Vendor Performance' }
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding: '0.55rem 1.15rem', borderRadius: 8,
                  border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 700 : 600,
                  background: active ? 'var(--accent-color)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.18s',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.icon || ''} {t.label} 
                {t.badge > 0 && (
                  <span style={{ 
                    background: active ? '#fff' : '#dc2626', 
                    color: active ? 'var(--accent-color)' : '#fff', 
                    borderRadius: 10, padding: '1px 6px', fontSize: '0.62rem', fontWeight: 800,
                    marginLeft: 2
                  }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
         TAB 1: DASHBOARD
         ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && stats.budgetTotal !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Stats widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '0.5rem' }}>
            {[
              { label: 'Total Requisitions',   value: prs.length, icon: '📋', color: '#2563eb' },
              { label: 'Pending Approvals',    value: stats.pendingCount, icon: '📥', color: '#f59e0b' },
              { label: 'Auto PR suggestions',  value: stats.autoPrSuggestionsCount, icon: '⚡', color: '#7c3aed' },
              { label: 'Budget Utilized',      value: `${((stats.budgetSpent / (stats.budgetTotal || 1)) * 100).toFixed(1)}%`, icon: '💳', color: '#10b981' },
              { label: 'Critical Shortages',   value: stats.autoPrSuggestionsCount, icon: '🚨', color: '#ef4444' },
              { label: 'Shortlisted Vendors',  value: stats.vendorShortlistCount, icon: '🏢', color: '#ec4899' },
            ].map(k => (
              <div key={k.label} 
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 16,
                  padding: 0,
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'default',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.transform = 'translateY(-4px)'; 
                  e.currentTarget.style.boxShadow = `0 12px 28px ${k.color}15`; 
                  e.currentTarget.style.borderColor = `${k.color}40`;
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.transform = 'none'; 
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; 
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                {/* Accent top bar */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${k.color}, ${k.color}80)`, borderRadius: '16px 16px 0 0' }} />
                <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Icon circle */}
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: 4 }}>{k.icon}</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: k.color, lineHeight: 1.1, letterSpacing: '-0.5px' }}>{k.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid-2">
            {/* Budget vs Actual Spent Chart */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📊</span> Departmental Budget Utilization
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Committed requisition totals against planned budget heads.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', marginTop: '0.5rem' }}>
                {stats.deptActuals.map(dept => {
                  const percent = dept.percent;
                  const isOverBudget = percent > 100;
                  const color = isOverBudget ? 'var(--danger)' : percent > 85 ? 'var(--warning)' : 'var(--success)';
                  const bg = isOverBudget ? 'var(--danger-light)' : percent > 85 ? 'var(--warning-light)' : 'var(--success-light)';
                  return (
                    <div key={dept.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{dept.name}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <strong>{fmt(dept.actual)}</strong> <span style={{ color: 'var(--text-muted)' }}>/ {fmt(dept.budget)}</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 10, background: 'var(--bg-tertiary)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, percent)}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: 5, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          padding: '2px 8px', 
                          borderRadius: 12, 
                          background: bg,
                          color: color,
                          minWidth: 42,
                          textAlign: 'center'
                        }}>{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Requisition Status Funnel */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⏳</span> Requisition Status Funnel
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Distribution of purchase requests through the workflow pipeline.</p>
              </div>

              {/* Funnel Layout */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'center' }}>
                {[
                  { label: 'Draft Requisitions', count: stats.draftCount, icon: '📝', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
                  { label: 'Pending Review & Approval', count: stats.pendingCount, icon: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                  { label: 'Approved Requisitions', count: stats.approvedCount, icon: '✅', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
                  { label: 'Converted to PO', count: prs.filter(p => p.status === 'PO Created').length, icon: '🛒', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                  { label: 'Rejected / Declined', count: prs.filter(p => p.status === 'Rejected').length, icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' }
                ].map((stage) => {
                  const total = prs.length || 1;
                  const share = Math.round((stage.count / total) * 100);
                  return (
                    <div key={stage.label} 
                      style={{
                        background: stage.bg,
                        border: `1.5px solid ${stage.border}`,
                        borderRadius: 14,
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        position: 'relative',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: '1.25rem' }}>{stage.icon}</div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stage.label}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{share}% of total pipeline</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: stage.color }}>{stage.count}</span>
                        <div style={{ height: 18, width: 1, background: 'var(--border-color)' }} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Reqs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
         TAB 2: ANNUAL PLANNING
         ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'planning' && (
        <div>
          {/* Plan Form */}
          {showPlanForm && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.25rem', fontWeight: 700, fontSize: 'var(--font-size-base)' }}>📅 Add Procurement Plan Requirement</h3>
              <form onSubmit={handleSavePlanItem}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Plan Year</label>
                    <select className="form-control" value={planForm.planYear} onChange={e => setPlanForm(f => ({ ...f, planYear: e.target.value }))}>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-control" value={planForm.department} onChange={e => setPlanForm(f => ({ ...f, department: e.target.value }))}>
                      <option value="IT">IT</option>
                      <option value="Operations">Operations</option>
                      <option value="Finance">Finance</option>
                      <option value="Marketing">Marketing</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Budget Head</label>
                    <select className="form-control" value={planForm.budgetHead} onChange={e => setPlanForm(f => ({ ...f, budgetHead: e.target.value }))}>
                      <option value="Hardware Assets">Hardware Assets</option>
                      <option value="Software Licenses">Software Licenses</option>
                      <option value="Warehouse Equipment">Warehouse Equipment</option>
                      <option value="Safety Equipment">Safety Equipment</option>
                      <option value="Office Equipment">Office Equipment</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Item / Resource Name *</label>
                    <input type="text" required className="form-control" placeholder="e.g. Dell Latitude 7440 Laptops..." value={planForm.itemName} onChange={e => setPlanForm(f => ({ ...f, itemName: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Specifications</label>
                    <input type="text" className="form-control" placeholder="Detailed configuration, specs, parameters..." value={planForm.specification} onChange={e => setPlanForm(f => ({ ...f, specification: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Annual Qty *</label>
                    <input type="number" required min="1" className="form-control" placeholder="0" value={planForm.annualQty} onChange={e => setPlanForm(f => ({ ...f, annualQty: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Unit Cost (৳) *</label>
                    <input type="number" required min="1" className="form-control" placeholder="0.00" value={planForm.estimatedUnitCost} onChange={e => setPlanForm(f => ({ ...f, estimatedUnitCost: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Est. Total Cost (৳)</label>
                    <input type="text" disabled className="form-control" value={fmt((Number(planForm.annualQty || 0) * Number(planForm.estimatedUnitCost || 0)))} />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Required Month</label>
                    <input type="month" className="form-control" value={planForm.requiredMonth} onChange={e => setPlanForm(f => ({ ...f, requiredMonth: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={planForm.priority} onChange={e => setPlanForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🟢 Low</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowPlanForm(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Plan Item</button>
                </div>
              </form>
            </div>
          )}

          {/* Planning Filter list */}
          <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Department</span>
            <select className="form-control" style={{ width: '200px' }} value={planFilterDept} onChange={e => setPlanFilterDept(e.target.value)}>
              <option value="all">All Departments</option>
              <option value="IT">IT</option>
              <option value="Operations">Operations</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
            </select>
          </div>

          {/* Planning Table */}
          <div className="table-container">
            {filteredPlans.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No planning records found.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Plan Year</th><th>Dept</th><th>Budget Head</th><th>Item Description</th><th>Specs</th><th>Priority</th>
                    <th style={{ textAlign: 'right' }}>Qty Required</th>
                    <th style={{ textAlign: 'right' }}>Est. Unit Rate</th>
                    <th style={{ textAlign: 'right' }}>Est. Total</th>
                    <th>Converted</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map(p => {
                    const remainingQty = p.annualQty - (p.convertedQty || 0);
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700 }}>{p.planYear}</td>
                        <td><span className="chip chip-blue">{p.department}</span></td>
                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{p.budgetHead}</td>
                        <td style={{ fontWeight: 600 }}>{p.itemName}</td>
                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{p.specification || '—'}</td>
                        <td>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 'var(--font-size-xs)', fontWeight: 800,
                            background: p.priority === 'High' ? 'var(--danger-light)' : (p.priority === 'Medium' ? 'var(--warning-light)' : 'var(--success-light)'),
                            color: p.priority === 'High' ? 'var(--danger)' : (p.priority === 'Medium' ? 'var(--warning)' : 'var(--success)')
                          }}>{p.priority}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.annualQty} {p.unit}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(p.estimatedUnitCost)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-color)' }}>{fmt(p.estimatedTotalCost)}</td>
                        <td style={{ fontSize: 'var(--font-size-sm)' }}>{p.convertedQty || 0} / {p.annualQty}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={() => handleConvertToRequisition(p)} disabled={remainingQty <= 0} className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}>
                              ⚡ PR Draft
                            </button>
                            <button onClick={() => handleDeletePlanItem(p.id)} className="btn btn-sm btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}>
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
         TAB 3: REQUISITIONS
         ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'requisitions' && (
        <div>
          {/* PR Submission Form */}
          {showPrForm && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.25rem', fontWeight: 700, fontSize: 'var(--font-size-base)' }}>📝 Create Purchase Requisition (PR)</h3>
              
              {/* Duplicate check warning */}
              {duplicateWarning && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 8, background: 'var(--warning-light)', border: '1px solid var(--warning)', color: 'var(--warning)', fontSize: 'var(--font-size-sm)' }}>
                  ⚠️ <strong>Potential Duplicate Detected:</strong> A similar requisition ({duplicateWarning.prNumber} - {fmt(duplicateWarning.totalAmount)}) was submitted for {duplicateWarning.department} recently.
                </div>
              )}

              {errorMsg && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 8, background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  ❌ {errorMsg}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-control" value={prForm.department} onChange={e => { setPrForm(f => ({ ...f, department: e.target.value })); setDuplicateWarning(null); }}>
                    <option value="IT">IT</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Center</label>
                  <input type="text" className="form-control" placeholder="CC-General" value={prForm.costCenter} onChange={e => setPrForm(f => ({ ...f, costCenter: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Required Delivery Date *</label>
                  <input type="date" required className="form-control" value={prForm.requiredDeliveryDate} onChange={e => setPrForm(f => ({ ...f, requiredDeliveryDate: e.target.value }))} />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '0.5rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Justification / Reason for Purchase *</label>
                  <input type="text" required className="form-control" placeholder="Explain the business necessity of the procurement..." value={prForm.justification} onChange={e => setPrForm(f => ({ ...f, justification: e.target.value }))} />
                </div>
              </div>

              {/* Attachment upload premium dotted dropzone */}
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Attachment Document (Optional)</label>
                <div 
                  onClick={handleSimulateAttachment}
                  style={{
                    border: prForm.attachmentName ? '2px dashed var(--success)' : '2px dashed var(--border-color)',
                    background: prForm.attachmentName ? 'rgba(34,197,94,0.02)' : 'var(--bg-tertiary)',
                    borderRadius: 14,
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.background = 'rgba(99,102,241,0.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = prForm.attachmentName ? 'var(--success)' : 'var(--border-color)'; e.currentTarget.style.background = prForm.attachmentName ? 'rgba(34,197,94,0.02)' : 'var(--bg-tertiary)'; }}
                >
                  <div style={{ fontSize: '2rem' }}>{prForm.attachmentName ? '📄' : '📤'}</div>
                  {prForm.attachmentName ? (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--success)' }}>✓ Document Attached Successfully</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{prForm.attachmentName} (Click to replace)</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Click to select or simulate file upload</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Supports PDF, XLSX, DOCX up to 10MB</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Detail Grid */}
              <div style={{ marginTop: '1.25rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Items to Requisition</div>
                
                <div className="invoice-lines-wrap">
                  <div className="invoice-lines-inner" style={{ minWidth: '700px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.2fr 1.2fr auto', gap: '0.5rem', marginBottom: '0.4rem', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>
                      <span>Item Name</span><span>Specs/Details</span><span>Qty</span><span>Est. Unit Rate</span><span>Total Cost</span><span />
                    </div>
                    {prItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.2fr 1.2fr auto', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                        <input type="text" className="form-control" required placeholder="Item description" value={item.itemName} onChange={e => setPrItemValue(idx, 'itemName', e.target.value)} />
                        <input type="text" className="form-control" placeholder="Specs, size, dimensions" value={item.specification} onChange={e => setPrItemValue(idx, 'specification', e.target.value)} />
                        <input type="number" className="form-control" min="1" value={item.qty} onChange={e => setPrItemValue(idx, 'qty', e.target.value)} />
                        <input type="number" className="form-control" min="1" placeholder="0.00" value={item.estimatedRate} onChange={e => setPrItemValue(idx, 'estimatedRate', e.target.value)} />
                        <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{fmt(Number(item.qty || 0) * Number(item.estimatedRate || 0))}</div>
                        <button type="button" onClick={() => removePrLine(idx)} disabled={prItems.length === 1} className="btn btn-danger btn-sm" style={{ padding: '0.45rem 0.6rem' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={addPrLine} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>+ Add Item Line</button>
              </div>

              {/* Summary Total & Cost Safety Meter */}
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 16,
                padding: '1.25rem',
                marginTop: '1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {(() => {
                  const total = prItems.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.estimatedRate || 0)), 0);
                  const check = procurementService.verifyBudget(prForm.department, total);
                  const budgetTotal = check.total || 1;
                  const spent = check.spent || 0;
                  const proposedPercent = Math.min(100, (total / budgetTotal) * 100);
                  const spentPercent = Math.min(100, (spent / budgetTotal) * 100);
                  const isExceeded = (spent + total) > budgetTotal;

                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Safety Meter ({prForm.department} Dept)</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                            Allocated: <strong>{fmt(budgetTotal)}</strong> | Spent: <strong>{fmt(spent)}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Estimated PR Total</div>
                          <div style={{ fontWeight: 900, fontSize: '1.3rem', color: isExceeded ? 'var(--danger)' : 'var(--accent-color)' }}>{fmt(total)}</div>
                        </div>
                      </div>

                      {/* Visual budget meter bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ height: 12, background: 'var(--bg-secondary)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', display: 'flex' }}>
                          {/* Spent Budget Bar */}
                          <div style={{ height: '100%', width: `${spentPercent}%`, background: 'rgba(99, 102, 241, 0.4)', transition: 'width 0.3s ease' }} />
                          {/* Proposed Requisition Cost Bar */}
                          <div style={{
                            height: '100%',
                            width: `${proposedPercent}%`,
                            background: isExceeded ? 'linear-gradient(90deg, #ef4444, #f43f5e)' : 'linear-gradient(90deg, var(--accent-color), #818cf8)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Spent: {spentPercent.toFixed(1)}%</span>
                          <span style={{ color: isExceeded ? 'var(--danger)' : 'var(--success)' }}>
                            {isExceeded ? `⚠️ Over-budget by ${fmt(spent + total - budgetTotal)}` : `Remaining safe balance: ${fmt(check.remaining - total)}`}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowPrForm(false)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={() => handleSubmitPR('Draft')} className="btn btn-secondary">Save Draft</button>
                <button type="button" onClick={() => handleSubmitPR('Pending Approval')} className="btn btn-primary">Submit PR</button>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter PR Status</span>
            <select className="form-control" style={{ width: '200px' }} value={prFilterStatus} onChange={e => setPrFilterStatus(e.target.value)}>
              <option value="all">All Requisitions</option>
              <option value="draft">Drafts</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="pocreated">PO Created</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Active Requisition Table */}
          <div className="table-container">
            {filteredPRs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No requisitions found.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PR Number</th><th>Date</th><th>Department</th><th>Cost Center</th><th>Delivery Date</th><th>Justification</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                    <th>Attachment</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPRs.map(pr => (
                    <tr key={pr.id} onClick={() => setDetailPr(pr)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontWeight: 700 }}>{pr.prNumber}</td>
                      <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{pr.requisitionDate}</td>
                      <td><span className="chip chip-blue">{pr.department}</span></td>
                      <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{pr.costCenter}</td>
                      <td style={{ fontSize: 'var(--font-size-sm)' }}>{pr.requiredDeliveryDate}</td>
                      <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{pr.justification?.substring(0, 40)}{pr.justification?.length > 40 && '...'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(pr.totalAmount)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {pr.attachmentName ? (
                          <a href="#attachment" onClick={(e) => { e.preventDefault(); alert(`Downloading simulated file: ${pr.attachmentName}`); }} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-color)', fontWeight: 600 }}>
                            📎 {pr.attachmentName}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>None</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 'var(--font-size-xs)', fontWeight: 800,
                          background: pr.status === 'Draft' ? 'var(--bg-tertiary)' : (pr.status === 'Approved' || pr.status === 'PO Created' ? 'var(--success-light)' : (pr.status === 'Rejected' ? 'var(--danger-light)' : 'var(--warning-light)')),
                          color: pr.status === 'Draft' ? 'var(--text-muted)' : (pr.status === 'Approved' || pr.status === 'PO Created' ? 'var(--success)' : (pr.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)'))
                        }}>{pr.status}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {pr.status === 'Draft' && (
                            <button onClick={() => handlePRSubmitFromDraft(pr.id)} className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}>
                              Submit
                            </button>
                          )}
                          <button onClick={() => setDetailPr(pr)} className="btn btn-sm btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}>
                            👁️ View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
         TAB 4: APPROVAL INBOX (Workflow)
         ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'approvals' && (
        <div>
          {/* Simulator role panel */}
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', background: 'rgba(37,99,235,0.04)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--accent-color)' }}>🎭 Switch Approval role Simulator</strong>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Mock different reviewer hierarchy profiles instantly to test amount thresholds.</div>
            </div>
            <select className="form-control" style={{ width: '220px' }} value={simulatedRole} onChange={e => { setSimulatedRole(e.target.value); setApprovalRemarks(''); }}>
              <option value="Department Head">👔 Department Head</option>
              <option value="Finance Manager">⚖️ Finance Manager</option>
              <option value="CFO">🏦 CFO</option>
              <option value="Managing Director">🚀 Managing Director</option>
            </select>
          </div>

          <div className="table-container">
            {pendingApprovalsList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                🎉 You have no requisitions waiting for your approval as <strong>{simulatedRole}</strong>.
              </div>
            ) : (
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, marginBottom: '1rem' }}>📥 Pending Review Inbox ({pendingApprovalsList.length})</h3>
                
                {pendingApprovalsList.map(pr => (
                  <div key={pr.id} className="card" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: 12, marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--accent-color)' }}>{pr.prNumber}</span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginLeft: 8 }}>Submitted by {pr.requesterName} ({pr.department})</span>
                      </div>
                      <div style={{ fontWeight: 900, color: 'var(--text-primary)' }}>{fmt(pr.totalAmount)}</div>
                    </div>

                    <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: '0.75rem' }}>
                      <div>Cost Center: <strong>{pr.costCenter}</strong> | Date: <strong>{pr.requisitionDate}</strong> | Required Date: <strong>{pr.requiredDeliveryDate}</strong></div>
                      <div style={{ marginTop: 4 }}>Justification: <em>"{pr.justification}"</em></div>
                      {pr.attachmentName && (
                        <div style={{ marginTop: 4 }}>Attachment: <a href="#down" onClick={(e) => { e.preventDefault(); alert(`Download ${pr.attachmentName}`); }} style={{ color: 'var(--accent-color)' }}>📎 {pr.attachmentName}</a></div>
                      )}
                    </div>

                    {/* PR Items inside approval review */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Items List</div>
                      {pr.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', padding: '0.25rem 0', borderBottom: idx < pr.items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <span>{it.itemName} <span style={{ color: 'var(--text-muted)' }}>({it.specification})</span></span>
                          <strong>{it.qty} Pcs @ {fmt(it.estimatedRate)} = {fmt(it.totalCost)}</strong>
                        </div>
                      ))}
                    </div>

                    {/* Workflow Audit steps timeline */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: 'var(--font-size-xs)' }}>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Workflow Steps Sign-off status</div>
                      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
                        {pr.approvalWorkflow.map((step, idx) => (
                          <div key={idx} style={{ borderLeft: `3px solid ${step.status === 'Approved' ? 'var(--success)' : (step.status === 'Rejected' ? 'var(--danger)' : 'var(--text-muted)')}`, paddingLeft: 6 }}>
                            <div style={{ fontWeight: 700 }}>{step.approverRole}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>{step.status} {step.approverName ? `by ${step.approverName}` : ''}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action form */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Add approval remarks or rejection justification..."
                        style={{ flex: 1, minWidth: '200px' }}
                        value={approvalRemarks}
                        onChange={e => setApprovalRemarks(e.target.value)}
                      />
                      <button onClick={() => handleRejectPR(pr.id)} disabled={loading} className="btn btn-danger btn-sm">
                        ✕ Reject
                      </button>
                      <button onClick={() => handleApprovePR(pr.id)} disabled={loading} className="btn btn-primary btn-sm">
                        ✓ Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
         TAB 5: PROCUREMENT PROCESSING (RFQ & COMPARATIVE STATEMENT)
         ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'processing' && (
        <div>
          {/* Requisition picker */}
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Select Approved Requisition to process RFQ</h3>
            <select className="form-control" value={selectedPrId} onChange={e => { setSelectedPrId(e.target.value); setSelectedSupplierId(''); }}>
              <option value="">-- Choose Approved Requisition --</option>
              {prs.filter(p => p.status === 'Approved').map(p => (
                <option key={p.id} value={p.id}>{p.prNumber} - {p.department} - {fmt(p.totalAmount)}</option>
              ))}
            </select>
          </div>

          {selectedPrId ? (() => {
            const quotes = procurementService.getRFQQuotes(selectedPrId);
            const pr = prs.find(p => p.id === selectedPrId);

            // Compute RFQ metrics highlights
            const bestPrice = quotes.length > 0 ? Math.min(...quotes.map(q => q.totalAmount)) : 0;
            const fastestDelivery = quotes.length > 0 ? Math.min(...quotes.map(q => q.deliveryDays)) : 999;
            const highestRating = quotes.length > 0 ? Math.max(...quotes.map(q => q.rating)) : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Comparative statement list */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>⚖️ RFQ Comparative Bid Statement for {pr.prNumber}</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Vendor / Supplier</th>
                          <th>Bid Amount</th>
                          <th>Est. Delivery Time</th>
                          <th>Vendor Rating</th>
                          <th>Terms &amp; Remarks</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotes.map(quote => (
                          <tr key={quote.supplierId} style={{ background: selectedSupplierId === quote.supplierId ? 'rgba(37,99,235,0.06)' : 'transparent' }}>
                            <td style={{ fontWeight: 700 }}>
                              <div>{quote.supplierName}</div>
                              <div style={{ display: 'flex', gap: '0.25rem', marginTop: 4, flexWrap: 'wrap' }}>
                                {quote.totalAmount === bestPrice && <span className="chip chip-success" style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4 }}>🏆 Best Price</span>}
                                {quote.deliveryDays === fastestDelivery && <span className="chip chip-blue" style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4 }}>🚚 Fastest Delivery</span>}
                                {quote.rating === highestRating && <span className="chip chip-purple" style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4 }}>⭐️ Highest Rated</span>}
                              </div>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--success)' }}>{fmt(quote.totalAmount)}</td>
                            <td style={{ fontSize: 'var(--font-size-sm)' }}>{quote.deliveryDays} Business Days</td>
                            <td style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>⭐ {quote.rating} / 5.0</td>
                            <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{quote.remarks}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button onClick={() => handleSelectQuoteAndPostPO(selectedPrId, quote.supplierId)} className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}>
                                Convert to PO
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Visual Comparative price bars */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visual Bid Comparison (Total Bid Value)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {quotes.map(quote => {
                      const maxVal = Math.max(...quotes.map(q => q.totalAmount)) || 1;
                      const minVal = Math.min(...quotes.map(q => q.totalAmount)) || 0;
                      const percent = Math.round((quote.totalAmount / maxVal) * 100);
                      const isLowest = quote.totalAmount === minVal;
                      return (
                        <div key={quote.supplierId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <span style={{ width: '150px', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{quote.supplierName}</span>
                          <div style={{ flex: 1, minWidth: '200px', height: '20px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative', border: '1px solid var(--border-color)' }}>
                            <div style={{ height: '100%', width: `${percent}%`, background: isLowest ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '10px', transition: 'width 0.6s ease' }} />
                            <span style={{ position: 'absolute', right: '10px', fontSize: '0.72rem', fontWeight: 950, color: 'var(--text-primary)' }}>{fmt(quote.totalAmount)}</span>
                          </div>
                          {isLowest && <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)' }}>🏆 Lowest Bid</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items comparative breakdown sheet */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Detailed Item-wise Bids Comparison</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-tertiary)' }}>
                          <th style={{ padding: '0.5rem 1rem', textAlign: 'left' }}>Item Name</th>
                          <th style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Budget Rate</th>
                          {quotes.map(q => (
                            <th key={q.supplierId} style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>{q.supplierName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pr.items.map((item, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.itemName} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>({item.qty} Pcs)</span></td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.estimatedRate)}</td>
                            {quotes.map(q => {
                              const qItem = q.items.find(qi => qi.itemName === item.itemName);
                              return (
                                <td key={q.supplierId} style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                  {qItem ? fmt(qItem.quotedRate) : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an approved requisition above to review supplier quotes, evaluate comparative statements, and issue purchase orders.
            </div>
          )}
        </div>
      )}

      {/* ── AUTO GENERATED SUGGESTIONS TAB ── */}
      {tab === 'auto-generated' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, margin: 0 }}>🚨 Inventory Shortage Replenishment recommendations</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              These suggestions are automatically calculated based on items whose current stock levels fall below their configured Reorder Points.
            </p>
          </div>

          <div className="table-container">
            {autoSuggestions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                🎉 No stock shortages detected! All items are adequately stocked.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={autoSuggestions.length > 0 && selectedShortageIds.length === autoSuggestions.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedShortageIds(autoSuggestions.map(x => x.id));
                          } else {
                            setSelectedShortageIds([]);
                          }
                        }}
                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                      />
                    </th>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Current Qty</th>
                    <th style={{ textAlign: 'right' }}>Reorder Point</th>
                    <th style={{ textAlign: 'right' }}>Safety stock</th>
                    <th style={{ textAlign: 'right' }}>Suggested order</th>
                    <th>Urgency</th>
                    <th>Rationale</th>
                    <th>Preferred Supplier</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {autoSuggestions.map(sug => {
                    const sup = JSON.parse(localStorage.getItem('erp_suppliers') || '[]').find(x => x.id === sug.preferredSupplierId);
                    const isChecked = selectedShortageIds.includes(sug.id);
                    return (
                      <tr key={sug.id} style={{ background: isChecked ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedShortageIds([...selectedShortageIds, sug.id]);
                              } else {
                                setSelectedShortageIds(selectedShortageIds.filter(id => id !== sug.id));
                              }
                            }}
                            style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                          />
                        </td>
                        <td><span className="sku-badge">{sug.sku}</span></td>
                        <td style={{ fontWeight: 600 }}>{sug.itemName}</td>
                        <td>{sug.category}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{sug.currentStock} {sug.unit}</td>
                        <td style={{ textAlign: 'right' }}>{sug.reorderPoint} {sug.unit}</td>
                        <td style={{ textAlign: 'right' }}>{sug.safetyStock} {sug.unit}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-color)' }}>{sug.suggestedQty} {sug.unit}</td>
                        <td>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 'var(--font-size-xs)', fontWeight: 800,
                            background: sug.priority === 'High' ? 'var(--danger-light)' : 'var(--warning-light)',
                            color: sug.priority === 'High' ? 'var(--danger)' : 'var(--warning)'
                          }}>{sug.urgency}</span>
                        </td>
                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{sug.reason}</td>
                        <td style={{ fontWeight: 600 }}>{sup?.name || 'Unassigned'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => handleConvertShortageToPR(sug)} className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: 'var(--font-size-xs)' }}>
                            ⚡ Convert to Draft PR
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Floating Actions Toolbar for selected shortages */}
          {selectedShortageIds.length > 0 && (
            <div style={{
              position: 'fixed', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--accent-color)',
              borderRadius: 24, padding: '0.85rem 1.75rem', zIndex: 600,
              boxShadow: '0 12px 35px rgba(99, 102, 241, 0.25), var(--shadow-lg)',
              display: 'flex', alignItems: 'center', gap: '1.5rem',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                ⚡ {selectedShortageIds.length} shortages selected
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleBulkConvertShortages} style={{ padding: '0.45rem 1.1rem', borderRadius: 10 }}>
                  ⚡ Bulk Convert to Draft PR
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedShortageIds([])} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Master Reorder Rules Configurator */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, marginBottom: '1rem' }}>⚙️ Configure Reorder & Safety parameters</h3>
            <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th style={{ textAlign: 'right' }}>Reorder Point</th>
                    <th style={{ textAlign: 'right' }}>Min Stock</th>
                    <th style={{ textAlign: 'right' }}>Max Stock</th>
                    <th style={{ textAlign: 'right' }}>Safety Stock</th>
                    <th style={{ textAlign: 'right' }}>Lead Time (days)</th>
                    <th style={{ textAlign: 'right' }}>Avg Consumption</th>
                    <th>Supplier Preference</th>
                    <th style={{ textAlign: 'center' }}>Configure</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(prod => {
                    const rule = reorderRules[prod.id] || { reorderPoint: prod.minStock, minStock: prod.minStock, maxStock: prod.minStock * 4, safetyStock: Math.round(prod.minStock * 0.5), leadTime: 7, avgMonthlyConsumption: prod.minStock * 2, preferredSupplierId: prod.supplierId || '' };
                    const sup = JSON.parse(localStorage.getItem('erp_suppliers') || '[]').find(x => x.id === rule.preferredSupplierId);
                    return (
                      <tr key={prod.id}>
                        <td><span className="sku-badge">{prod.sku}</span></td>
                        <td style={{ fontWeight: 600 }}>{prod.name}</td>
                        <td style={{ textAlign: 'right' }}>{rule.reorderPoint}</td>
                        <td style={{ textAlign: 'right' }}>{rule.minStock}</td>
                        <td style={{ textAlign: 'right' }}>{rule.maxStock}</td>
                        <td style={{ textAlign: 'right' }}>{rule.safetyStock}</td>
                        <td style={{ textAlign: 'right' }}>{rule.leadTime} days</td>
                        <td style={{ textAlign: 'right' }}>{rule.avgMonthlyConsumption}/mo</td>
                        <td>{sup?.name || 'Unassigned'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => handleConfigureReorderRule(prod)} className="btn btn-sm btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}>
                            ⚙️ Edit Rule
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VENDOR REGISTRY & SCORING TAB ── */}
      {tab === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #312e81 100%)',
            borderRadius: 20, padding: '1.5rem 2rem', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'absolute', bottom: -30, right: 80, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 6 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏢</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.3px' }}>Vendor Performance Scorecard</h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', opacity: 0.82 }}>Multi-criteria vendor evaluation · Quality · Delivery · Price · Compliance</p>
                </div>
              </div>
            </div>
            {/* Summary Stats */}
            <div style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}>
              {(() => {
                const suppliers = JSON.parse(localStorage.getItem('erp_suppliers') || '[]');
                const preferred = suppliers.filter(s => Object.values((vendorDetails[s.id]?.scores || {})).reduce((a, b) => a + b, 0) >= 85).length;
                const approved = suppliers.filter(s => { const t = Object.values((vendorDetails[s.id]?.scores || {})).reduce((a, b) => a + b, 0); return t >= 70 && t < 85; }).length;
                const watchlist = suppliers.filter(s => Object.values((vendorDetails[s.id]?.scores || {})).reduce((a, b) => a + b, 0) < 55).length;
                return [
                  { label: 'Total Vendors', val: suppliers.length, color: '#93c5fd' },
                  { label: 'Preferred', val: preferred, color: '#6ee7b7' },
                  { label: 'Approved', val: approved, color: '#fde68a' },
                  { label: 'Watchlist', val: watchlist, color: '#fca5a5' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Vendor Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {JSON.parse(localStorage.getItem('erp_suppliers') || '[]').map(supplier => {
              const details = vendorDetails[supplier.id] || {
                code: 'VND-NEW', bin: 'N/A', currency: 'BDT', paymentTerms: 'COD', moq: 0, leadTime: 7,
                kyc: false, bankVerified: false, contractStatus: 'Active', contractExpiry: 'N/A',
                scores: { quality: 15, delivery: 15, price: 10, support: 5, compliance: 5, flexibility: 5 }
              };

              const scores = details.scores || { quality: 15, delivery: 15, price: 10, support: 5, compliance: 5, flexibility: 5 };
              const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);

              let tier = { label: 'New Vendor', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)', glow: 'rgba(107,114,128,0.08)', icon: '🔘' };
              if (totalScore >= 85) tier = { label: 'Preferred Supplier', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', glow: 'rgba(34,197,94,0.06)', icon: '⭐' };
              else if (totalScore >= 70) tier = { label: 'Approved Vendor', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', glow: 'rgba(59,130,246,0.06)', icon: '✅' };
              else if (totalScore >= 55) tier = { label: 'Conditional Vendor', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.06)', icon: '⚠️' };
              else if (totalScore > 0)   tier = { label: 'Watchlist', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', glow: 'rgba(239,68,68,0.06)', icon: '🚨' };

              const scoreMetrics = [
                { key: 'quality',     label: 'Quality',     max: 25, val: scores.quality || 0,     color: '#22c55e', icon: '🏆' },
                { key: 'delivery',    label: 'Delivery',    max: 25, val: scores.delivery || 0,    color: '#3b82f6', icon: '🚚' },
                { key: 'price',       label: 'Pricing',     max: 20, val: scores.price || 0,       color: '#f59e0b', icon: '💲' },
                { key: 'support',     label: 'Support',     max: 10, val: scores.support || 0,     color: '#8b5cf6', icon: '🛠️' },
                { key: 'compliance',  label: 'Compliance',  max: 10, val: scores.compliance || 0,  color: '#06b6d4', icon: '📋' },
                { key: 'flexibility', label: 'Flexibility', max: 10, val: scores.flexibility || 0, color: '#ec4899', icon: '🔄' },
              ];

              const scorePercent = (totalScore / 100) * 100;
              const circumference = 2 * Math.PI * 26;
              const dashOffset = circumference * (1 - scorePercent / 100);

              return (
                <div key={supplier.id} style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${tier.border}`,
                  borderRadius: 18,
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: `0 4px 20px ${tier.glow}`,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 35px ${tier.glow}, 0 0 0 1px ${tier.border}`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 20px ${tier.glow}`; }}
                >
                  {/* Card Header */}
                  <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: `1px solid ${tier.border}`, background: tier.bg }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: 6, fontFamily: 'monospace', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>{details.code}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`, borderRadius: 20 }}>{tier.icon} {tier.label}</span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{supplier.name}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        📞 {supplier.contact || 'N/A'} &nbsp;·&nbsp; BIN: {details.bin || 'N/A'}
                      </div>
                    </div>
                    {/* Circular Score Gauge */}
                    <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
                      <svg width="70" height="70" viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="26" fill="transparent" stroke="var(--border-color)" strokeWidth="5" opacity="0.5" />
                        <circle cx="30" cy="30" r="26" fill="transparent" stroke={tier.color} strokeWidth="5"
                          strokeDasharray={circumference} strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                          transform="rotate(-90 30 30)"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: tier.color, lineHeight: 1 }}>{totalScore}</div>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700 }}>/ 100</div>
                      </div>
                    </div>
                  </div>

                  {/* Score Metrics */}
                  <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {scoreMetrics.map(m => {
                      const pct = (m.val / m.max) * 100;
                      return (
                        <div key={m.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>{m.icon}</span> {m.label}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: pct >= 70 ? m.color : (pct >= 40 ? '#f59e0b' : '#ef4444') }}>
                              {m.val} / {m.max}
                            </span>
                          </div>
                          <div style={{ height: 5, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: pct >= 70 ? m.color : (pct >= 40 ? '#f59e0b' : '#ef4444'),
                              borderRadius: 3,
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Operational Details Grid */}
                  <div style={{ padding: '0 1.5rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { label: 'Lead Time', val: `${details.leadTime || 7}d` },
                      { label: 'MOQ', val: `${details.moq || 0} pcs` },
                      { label: 'Payment', val: details.paymentTerms || 'N/A' },
                      { label: 'Currency', val: details.currency || 'BDT' },
                      { label: 'KYC', val: details.kyc ? '✅ Done' : '❌ Pending' },
                      { label: 'Bank', val: details.bankVerified ? '✅ Linked' : '❌ Pending' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 1 }}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Contract Status Bar */}
                  <div style={{ margin: '0 1.5rem 1rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: details.contractStatus === 'Active' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${details.contractStatus === 'Active' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: details.contractStatus === 'Active' ? '#16a34a' : '#dc2626' }}>
                      📄 Contract: {details.contractStatus || 'Active'}
                    </span>
                    {details.contractExpiry && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Expires: {details.contractExpiry}</span>}
                  </div>

                  {/* Edit Button */}
                  <div style={{ padding: '0 1.5rem 1.25rem' }}>
                    <button
                      onClick={() => handleEditVendor(supplier)}
                      style={{
                        width: '100%', padding: '0.6rem', borderRadius: 10,
                        background: `linear-gradient(135deg, ${tier.color}18, ${tier.color}08)`,
                        border: `1.5px solid ${tier.border}`,
                        color: tier.color, fontWeight: 700, fontSize: '0.82rem',
                        cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${tier.color}20`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${tier.color}18, ${tier.color}08)`; e.currentTarget.style.transform = 'none'; }}
                    >
                      ✏️ Edit Scorecard Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ranking Summary Table */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🏅</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Vendor Rankings — Comparative Scorecard</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All approved vendors sorted by composite performance score</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    {['Rank', 'Vendor', 'Tier', 'Quality /25', 'Delivery /25', 'Pricing /20', 'Support /10', 'Compliance /10', 'Flexibility /10', 'Total /100', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {JSON.parse(localStorage.getItem('erp_suppliers') || '[]')
                    .map(s => {
                      const d = vendorDetails[s.id] || { scores: { quality: 15, delivery: 15, price: 10, support: 5, compliance: 5, flexibility: 5 } };
                      return { ...s, scores: d.scores || {}, total: Object.values(d.scores || {}).reduce((a, b) => a + b, 0) };
                    })
                    .sort((a, b) => b.total - a.total)
                    .map((s, idx) => {
                      let tier = { label: 'New', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
                      if (s.total >= 85) tier = { label: 'Preferred', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' };
                      else if (s.total >= 70) tier = { label: 'Approved', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' };
                      else if (s.total >= 55) tier = { label: 'Conditional', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' };
                      else if (s.total > 0)   tier = { label: 'Watchlist', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' };
                      const isTop = idx === 0;
                      return (
                        <tr key={s.id} style={{ borderTop: '1px solid var(--border-color)', background: isTop ? 'rgba(245,158,11,0.04)' : 'transparent', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={e => e.currentTarget.style.background = isTop ? 'rgba(245,158,11,0.04)' : 'transparent'}
                        >
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: isTop ? 'linear-gradient(135deg,#f59e0b,#d97706)' : idx === 1 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : idx === 2 ? 'linear-gradient(135deg,#cd7f32,#a0522d)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isTop || idx <= 2 ? '#fff' : 'var(--text-muted)', fontWeight: 900, fontSize: '0.75rem' }}>
                              {idx + 1}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem' }}>{s.name}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: tier.bg, color: tier.color }}>{tier.label}</span>
                          </td>
                          {[s.scores.quality, s.scores.delivery, s.scores.price, s.scores.support, s.scores.compliance, s.scores.flexibility].map((v, i) => {
                            const maxes = [25, 25, 20, 10, 10, 10];
                            const pct = ((v || 0) / maxes[i]) * 100;
                            return (
                              <td key={i} style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: 700, color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                                {v || 0}
                              </td>
                            );
                          })}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                <div style={{ height: '100%', width: `${s.total}%`, background: tier.color, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontWeight: 900, fontSize: '0.82rem', color: tier.color, minWidth: 28 }}>{s.total}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontWeight: 700 }}>Active</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Vendor Performance Scoring Edit Modal ── */}
      {editingVendor && (
        <div className="modal-overlay" onClick={() => setEditingVendor(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: 'calc(100vh - 2rem)' }}>
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', position: 'relative' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🏢</div>
                <div>
                  <h3 className="modal-title">Vendor Performance Scorecard</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', opacity: 0.82 }}>{editingVendor.name} · {editingVendor.contact || 'N/A'}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setEditingVendor(null)}>&times;</button>
            </div>

            <form onSubmit={handleSaveVendorSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-form-content" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Vendor Identity */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>🏷️</div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Vendor Identity & Compliance</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
                    {[
                      { label: 'Vendor Code', key: 'code', type: 'text', placeholder: 'VND-ABC-01' },
                      { label: 'BIN / Tax ID', key: 'bin', type: 'text', placeholder: '19XXXXXXXXX' },
                      { label: 'Lead Time (Days)', key: 'leadTime', type: 'number', placeholder: '7' },
                      { label: 'MOQ (pcs)', key: 'moq', type: 'number', placeholder: '5' },
                      { label: 'Currency', key: 'currency', type: 'select', opts: ['BDT', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'] },
                      { label: 'Payment Terms', key: 'paymentTerms', type: 'select', opts: ['Net 30', 'Net 60', 'Net 15', 'COD', 'Advance', '50% Advance'] },
                    ].map(f => (
                      <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</label>
                        {f.type === 'select' ? (
                          <select className="form-control" style={{ padding: '0.6rem 0.85rem', borderRadius: 9, border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                            value={vendorForm[f.key]} onChange={e => setVendorForm({ ...vendorForm, [f.key]: e.target.value })}
                            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                            onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                          >
                            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={f.type} required placeholder={f.placeholder} className="form-control"
                            style={{ padding: '0.6rem 0.85rem', borderRadius: 9, border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                            value={vendorForm[f.key]} onChange={e => setVendorForm({ ...vendorForm, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                            onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Contract Status & Expiry */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginTop: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Contract Status</label>
                      <select className="form-control" style={{ padding: '0.6rem 0.85rem', borderRadius: 9, border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                        value={vendorForm.contractStatus} onChange={e => setVendorForm({ ...vendorForm, contractStatus: e.target.value })}>
                        {['Active', 'Expired', 'Under Renewal', 'Suspended', 'Blacklisted'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Contract Expiry Date</label>
                      <input type="date" className="form-control"
                        style={{ padding: '0.6rem 0.85rem', borderRadius: 9, border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        value={vendorForm.contractExpiry || ''}
                        onChange={e => setVendorForm({ ...vendorForm, contractExpiry: e.target.value })}
                        onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>
                  {/* KYC & Bank toggles */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem' }}>
                    {[
                      { key: 'kyc', label: 'KYC Verified', icon: '🪪' },
                      { key: 'bankVerified', label: 'Bank Account Linked', icon: '🏦' },
                    ].map(toggle => (
                      <button key={toggle.key} type="button"
                        onClick={() => setVendorForm({ ...vendorForm, [toggle.key]: !vendorForm[toggle.key] })}
                        style={{
                          flex: 1, padding: '0.55rem 0.75rem', borderRadius: 10,
                          border: `1.5px solid ${vendorForm[toggle.key] ? 'rgba(34,197,94,0.35)' : 'var(--border-color)'}`,
                          background: vendorForm[toggle.key] ? 'rgba(34,197,94,0.1)' : 'transparent',
                          color: vendorForm[toggle.key] ? '#16a34a' : 'var(--text-muted)',
                          fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                        }}>
                        <span>{toggle.icon}</span>
                        {toggle.label}: {vendorForm[toggle.key] ? '✅ Yes' : '❌ No'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Score Sliders */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>🏅</div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Performance Scoring Weights</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                    {/* Live total */}
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 900, padding: '2px 10px', borderRadius: 20,
                      background: (() => { const t = Object.values(vendorForm.scores || {}).reduce((a, b) => a + b, 0); return t >= 85 ? 'rgba(34,197,94,0.15)' : t >= 70 ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)'; })(),
                      color: (() => { const t = Object.values(vendorForm.scores || {}).reduce((a, b) => a + b, 0); return t >= 85 ? '#22c55e' : t >= 70 ? '#3b82f6' : '#f59e0b'; })()
                    }}>
                      {Object.values(vendorForm.scores || {}).reduce((a, b) => a + b, 0)} / 100
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { key: 'quality',     label: 'Quality',     max: 25, icon: '🏆', color: '#22c55e', desc: 'Product quality, defect rates, inspection results' },
                      { key: 'delivery',    label: 'Delivery',    max: 25, icon: '🚚', color: '#3b82f6', desc: 'On-time delivery rate, lead time accuracy' },
                      { key: 'price',       label: 'Pricing',     max: 20, icon: '💲', color: '#f59e0b', desc: 'Price competitiveness, contract adherence' },
                      { key: 'support',     label: 'Support',     max: 10, icon: '🛠️', color: '#8b5cf6', desc: 'After-sales service, issue resolution speed' },
                      { key: 'compliance',  label: 'Compliance',  max: 10, icon: '📋', color: '#06b6d4', desc: 'Regulatory compliance, documentation accuracy' },
                      { key: 'flexibility', label: 'Flexibility', max: 10, icon: '🔄', color: '#ec4899', desc: 'Ability to handle urgent orders, changes' },
                    ].map(m => {
                      const val = vendorForm.scores?.[m.key] || 0;
                      const pct = (val / m.max) * 100;
                      return (
                        <div key={m.key} style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                <span>{m.icon}</span> {m.label} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.72rem' }}>(max {m.max})</span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{m.desc}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="number" min="0" max={m.max}
                                value={val}
                                onChange={e => setVendorForm({ ...vendorForm, scores: { ...vendorForm.scores, [m.key]: Math.min(m.max, Math.max(0, Number(e.target.value))) } })}
                                style={{ width: 52, padding: '0.3rem 0.4rem', borderRadius: 7, border: `1.5px solid ${m.color}40`, background: 'var(--bg-secondary)', color: m.color, fontWeight: 900, fontSize: '0.9rem', textAlign: 'center', outline: 'none' }}
                              />
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 28 }}>/{m.max}</span>
                            </div>
                          </div>
                          <div style={{ position: 'relative', height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: pct >= 70 ? m.color : (pct >= 40 ? '#f59e0b' : '#ef4444'), borderRadius: 4, transition: 'width 0.3s ease' }} />
                          </div>
                          <input
                            type="range" min="0" max={m.max} value={val}
                            onChange={e => setVendorForm({ ...vendorForm, scores: { ...vendorForm.scores, [m.key]: Number(e.target.value) } })}
                            style={{ width: '100%', marginTop: '0.4rem', accentColor: m.color, cursor: 'pointer' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Composite Score: <strong style={{ color: (() => { const t = Object.values(vendorForm.scores || {}).reduce((a, b) => a + b, 0); return t >= 85 ? '#22c55e' : t >= 70 ? '#3b82f6' : '#f59e0b'; })() }}>
                    {Object.values(vendorForm.scores || {}).reduce((a, b) => a + b, 0)} / 100
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingVendor(null)} style={{ borderRadius: 10, padding: '0.6rem 1.25rem', fontWeight: 600 }}>Cancel</button>
                  <button type="submit" style={{
                    padding: '0.65rem 1.75rem', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem',
                    background: 'linear-gradient(135deg, #1e40af, #4f46e5)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                    display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.45)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)'; }}
                  >
                    💾 Save Scorecard
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ── Reorder Point Rule Config Modal ── */}
      {selectedRuleProduct && (
        <div className="modal-overlay" style={{ zIndex: 950 }}>
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Inventory Reorder Rule Config</h3>
              <button className="modal-close" onClick={() => setSelectedRuleProduct(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveReorderRuleSubmit} className="modal-form-content">
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 'var(--font-size-sm)' }}>
                <strong>Product:</strong> {selectedRuleProduct.name} (SKU: {selectedRuleProduct.sku})<br />
                <strong>Current On-Hand Qty:</strong> {selectedRuleProduct.qty} {selectedRuleProduct.unit}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Reorder Level Point</label>
                  <input type="number" className="form-control" required value={reorderForm.reorderPoint} onChange={e => setReorderForm({ ...reorderForm, reorderPoint: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Safety Stock</label>
                  <input type="number" className="form-control" required value={reorderForm.safetyStock} onChange={e => setReorderForm({ ...reorderForm, safetyStock: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Stock Limit</label>
                  <input type="number" className="form-control" required value={reorderForm.minStock} onChange={e => setReorderForm({ ...reorderForm, minStock: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Stock Limit</label>
                  <input type="number" className="form-control" required value={reorderForm.maxStock} onChange={e => setReorderForm({ ...reorderForm, maxStock: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Supplier Lead Time (Days)</label>
                  <input type="number" className="form-control" required value={reorderForm.leadTime} onChange={e => setReorderForm({ ...reorderForm, leadTime: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Avg Monthly Consumption</label>
                  <input type="number" className="form-control" required value={reorderForm.avgMonthlyConsumption} onChange={e => setReorderForm({ ...reorderForm, avgMonthlyConsumption: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Preferred Supplier Preference</label>
                <select className="form-control" value={reorderForm.preferredSupplierId} onChange={e => setReorderForm({ ...reorderForm, preferredSupplierId: e.target.value })}>
                  <option value="">-- Choose Supplier --</option>
                  {JSON.parse(localStorage.getItem('erp_suppliers') || '[]').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedRuleProduct(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Reorder Rules</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Slide-over Requisition Detail Drawer */}
      {detailPr && (
        <>
          <div 
            onClick={() => setDetailPr(null)} 
            style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)', animation: 'fadeIn 0.25s' }} 
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '480px',
            background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-xl)', zIndex: 900, display: 'flex', flexDirection: 'column',
            animation: 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>{detailPr.prNumber} Details</h3>
                <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Requisition Overview</span>
              </div>
              <button 
                onClick={() => setDetailPr(null)} 
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', fontSize: '1.15rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="modal-form-content" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800,
                  background: detailPr.status === 'Draft' ? 'var(--bg-tertiary)' : (detailPr.status === 'Approved' || detailPr.status === 'PO Created' ? 'var(--success-light)' : (detailPr.status === 'Rejected' ? 'var(--danger-light)' : 'var(--warning-light)')),
                  color: detailPr.status === 'Draft' ? 'var(--text-muted)' : (detailPr.status === 'Approved' || detailPr.status === 'PO Created' ? 'var(--success)' : (detailPr.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)'))
                }}>
                  {detailPr.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Department</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{detailPr.department}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Cost Center</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>{detailPr.costCenter}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Requisition Date</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{detailPr.requisitionDate}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Delivery Date</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{detailPr.requiredDeliveryDate}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Justification</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', fontStyle: 'italic' }}>
                  "{detailPr.justification || 'No justification provided.'}"
                </div>
              </div>

              {/* Items Table inside Drawer */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Requisitioned Items</div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  {detailPr.items.map((it, idx) => (
                    <div key={idx} style={{ padding: '0.75rem 1rem', borderBottom: idx < detailPr.items.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{it.itemName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{it.specification}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>{it.qty} {it.unit || 'Pcs'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontFamily: 'monospace' }}>@ {fmt(it.estimatedRate)}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>Total Requisition Amount</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent-color)', fontFamily: 'monospace' }}>{fmt(detailPr.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Workflow Audit history */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Approval History Timeline</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border-color)' }}>
                  {detailPr.history.map((step, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-13px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)' }} />
                      <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>{step.status}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>{step.remark}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(step.timestamp).toLocaleString()} by {step.updater}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setDetailPr(null)} 
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Close Details
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
