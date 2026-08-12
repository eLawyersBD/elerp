import { useState, useEffect, useMemo } from 'react';
import { lcService } from '../services/lcService';
import { auditService } from '../services/auditService';

const fmt = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtForeign = (n, cur) => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function LCAccountingView({ currentUser }) {
  const [tab, setTab] = useState('dashboard'); // dashboard | lcs
  const [lcs, setLcs] = useState([]);
  const [selectedLcId, setSelectedLcId] = useState(null);
  const [detailTab, setDetailTab] = useState('overview'); // overview | margin | shipment | costs | allocation | bank_loans | customs | capitalization | ledgers

  // State to list accounts & journals
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  // Form states - Open New LC
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openForm, setOpenForm] = useState({
    lcNumber: '',
    lcDate: new Date().toISOString().substring(0, 10),
    supplierId: 'sup-1',
    country: 'China',
    lcAmountForeign: '',
    currency: 'USD',
    exchangeRate: '120.00',
    marginPercent: '10',
    issuingBank: 'City Bank Ltd',
    advisingBank: 'Bank of China',
    expiryDate: new Date(Date.now() + 90*24*60*60*1000).toISOString().substring(0, 10)
  });
  const [formItems, setFormItems] = useState([
    { itemName: '', itemType: 'Inventory', hsCode: '', qty: '', unit: 'Pcs', weight: '', volume: '', unitCostForeign: '' }
  ]);

  // Form states - Add Margin Deposit
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [marginForm, setMarginForm] = useState({
    amount: '',
    type: 'Opening',
    ref: '',
    bankAccountId: 'acc-1020'
  });

  // Form states - Add Shipment
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
    invoiceNo: '',
    invoiceDate: new Date().toISOString().substring(0, 10),
    blNo: '',
    blDate: new Date().toISOString().substring(0, 10),
    vesselName: '',
    eta: '',
    containerNo: ''
  });

  // Form states - Add Landed Cost Expense
  const [showCostModal, setShowCostModal] = useState(false);
  const [costForm, setCostForm] = useState({
    type: 'Freight Inward',
    amount: '',
    ref: '',
    date: new Date().toISOString().substring(0, 10),
    category: 'Local',
    bankAccountId: 'acc-1020'
  });

  // Form states - Cost Allocation Basis
  const [allocationBasis, setAllocationBasis] = useState('FOB Value');

  // Form states - Bank Loans (PAD/LTR)
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState({
    loanType: 'PAD',
    loanAmount: '',
    settlementRate: '',
    interestRate: '9',
    date: new Date().toISOString().substring(0, 10),
    bankAccountId: 'acc-1020'
  });

  // Form states - Customs Assessment
  const [showCustomsModal, setShowCustomsModal] = useState(false);
  const [customsForm, setCustomsForm] = useState({
    assessableValue: '',
    cd: '10',
    rd: '3',
    sd: '0',
    vat: '15',
    ait: '5',
    at: '5',
    totalDutyPaid: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLcs(lcService.getLCList());
    try {
      const coa = localStorage.getItem('erp_coa');
      if (coa) setAccounts(JSON.parse(coa));
      const jrn = localStorage.getItem('erp_journals');
      if (jrn) setJournals(JSON.parse(jrn));
      const sups = localStorage.getItem('erp_suppliers');
      if (sups) setSuppliers(JSON.parse(sups));
      const prods = localStorage.getItem('erp_products');
      if (prods) setProducts(JSON.parse(prods));
    } catch (e) {
      console.error('[LCAccountingView] loadData error:', e);
    }
  };

  const selectedLc = useMemo(() => {
    return lcs.find(item => item.id === selectedLcId);
  }, [lcs, selectedLcId]);

  const supplierName = (id) => {
    const s = suppliers.find(item => item.id === id);
    return s ? s.name : id;
  };

  // Upgraded KPI Calculations
  const stats = useMemo(() => {
    // 1. Open LC Value: BDT total of active (not capitalized) LCs
    const activeLCs = lcs.filter(item => item.status !== 'Capitalized');
    const openLcValue = activeLCs.reduce((sum, item) => sum + (item.lcAmountForeign * item.exchangeRate), 0);

    // 2. Goods in Transit (GIT): accumulated asset value currently in transit
    const gitValue = lcs.filter(item => item.status === 'Opened' || item.status === 'Shipment Received' || item.status === 'Documents Received' || item.status === 'PAD Created' || item.status === 'Duty Paid').reduce((sum, item) => {
      const fobVal = item.items.reduce((s, it) => s + (it.totalCostForeign * item.exchangeRate), 0);
      const landedVal = item.costs.reduce((s, c) => s + c.amount, 0);
      return sum + fobVal + landedVal;
    }, 0);

    // 3. PAD / Loans Outstanding: Sum of active bank loans
    const padOutstanding = lcs.reduce((sum, item) => {
      const activeLoans = item.padLoans.filter(l => l.status === 'Active');
      return sum + activeLoans.reduce((s, l) => s + l.loanAmount, 0);
    }, 0);

    // 4. Margin Locked: Running margin deposits balance
    const marginLocked = lcs.reduce((sum, item) => {
      const lcMarginTotal = item.marginDeposits.reduce((s, m) => s + m.amount, 0);
      return sum + lcMarginTotal;
    }, 0);

    // 5. Forex Settlement Variance: Exchange Loss/Gain from acc-6160
    const forexVariance = journals.reduce((sum, j) => {
      const forexLines = j.lines.filter(l => l.accountId === 'acc-6160');
      const drSum = forexLines.filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0);
      const crSum = forexLines.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
      return sum + (drSum - crSum); // net loss is positive
    }, 0);

    return {
      openLcValue,
      gitValue,
      padOutstanding,
      marginLocked,
      forexVariance
    };
  }, [lcs, journals]);

  // Open LC Form Handlers
  const handleOpenLC = (e) => {
    e.preventDefault();
    if (!openForm.lcNumber || !openForm.lcAmountForeign || !openForm.exchangeRate) {
      return alert('Please fill in all general fields.');
    }
    
    const itemsValid = formItems.every(it => it.itemName && it.qty && it.unitCostForeign);
    if (!itemsValid) {
      return alert('Please fill in item details.');
    }

    const itemsFormatted = formItems.map(it => ({
      itemName: it.itemName,
      itemType: it.itemType,
      hsCode: it.hsCode || '0000.00.00',
      qty: Number(it.qty),
      unit: it.unit,
      weight: Number(it.weight || 0),
      volume: Number(it.volume || 0),
      unitCostForeign: Number(it.unitCostForeign),
      totalCostForeign: Number(it.qty) * Number(it.unitCostForeign),
      allocatedCost: 0,
      landedUnitCost: 0
    }));

    const totalFOBForeign = itemsFormatted.reduce((sum, it) => sum + it.totalCostForeign, 0);
    if (Math.abs(totalFOBForeign - Number(openForm.lcAmountForeign)) > 1) {
      return alert(`FOB Manifest Value mismatch. Total items cost (${fmtForeign(totalFOBForeign, openForm.currency)}) does not equal LC Amount (${fmtForeign(openForm.lcAmountForeign, openForm.currency)}).`);
    }

    const newLc = {
      ...openForm,
      items: itemsFormatted
    };

    lcService.saveLC(newLc);
    setShowOpenModal(false);
    loadData();
  };

  const addFormItem = () => {
    setFormItems([...formItems, { itemName: '', itemType: 'Inventory', hsCode: '', qty: '', unit: 'Pcs', weight: '', volume: '', unitCostForeign: '' }]);
  };

  const removeFormItem = (idx) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const updateFormItem = (idx, field, val) => {
    setFormItems(formItems.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  // Step 1: Margin deposits handler
  const handleMarginSubmit = async (e) => {
    e.preventDefault();
    if (!marginForm.amount || !marginForm.ref) return alert('Please enter amount and reference.');
    try {
      await lcService.postLCMargin(selectedLcId, marginForm.amount, marginForm.type, marginForm.ref, marginForm.bankAccountId);
      setShowMarginModal(false);
      setMarginForm({ amount: '', type: 'Opening', ref: '', bankAccountId: 'acc-1020' });
      loadData();
      alert('Margin transaction posted successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Step 2: Shipment BL handler
  const handleShipmentSubmit = async (e) => {
    e.preventDefault();
    if (!shipmentForm.invoiceNo || !shipmentForm.blNo) return alert('Please enter invoice and BL number.');
    try {
      await lcService.postShipmentEntry(selectedLcId, shipmentForm);
      setShowShipmentModal(false);
      setShipmentForm({ invoiceNo: '', invoiceDate: new Date().toISOString().substring(0, 10), blNo: '', blDate: new Date().toISOString().substring(0, 10), vesselName: '', eta: '', containerNo: '' });
      loadData();
      alert('Shipment BL registered and Goods in Transit asset posted!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Step 4: Cost expense handler
  const handleCostSubmit = async (e) => {
    e.preventDefault();
    if (!costForm.amount || !costForm.ref) return alert('Please enter amount and reference.');
    try {
      await lcService.postLCCost(selectedLcId, costForm.type, costForm.amount, costForm.ref, costForm.date, costForm.category, costForm.bankAccountId);
      setShowCostModal(false);
      setCostForm({ type: 'Freight Inward', amount: '', ref: '', date: new Date().toISOString().substring(0, 10), category: 'Local', bankAccountId: 'acc-1020' });
      loadData();
      alert('Import expense cost successfully allocated to transit account.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Step 5: Cost allocation basis allocator
  const handleAllocateCosts = () => {
    try {
      lcService.runCostAllocation(selectedLcId, allocationBasis);
      loadData();
      alert(`Landed costs allocated successfully based on ${allocationBasis}!`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Step 6: Bank loans handler
  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    if (!loanForm.loanAmount || !loanForm.settlementRate) return alert('Please fill in loan amount and exchange rate.');
    try {
      await lcService.createPADLoan(selectedLcId, loanForm);
      setShowLoanModal(false);
      setLoanForm({ loanType: 'PAD', loanAmount: '', settlementRate: '', interestRate: '9', date: new Date().toISOString().substring(0, 10), bankAccountId: 'acc-1020' });
      loadData();
      alert('Bank loan created and Forex variance posted successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Step 7: Customs assessment handler
  const handleCustomsSubmit = (e) => {
    e.preventDefault();
    if (!customsForm.assessableValue || !customsForm.totalDutyPaid) return alert('Please enter assessable value and total duty paid.');
    try {
      lcService.saveCustomsAssessment(selectedLcId, customsForm);
      setShowCustomsModal(false);
      loadData();
      alert('Customs assessment recorded and status updated.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Customs calculations auto trigger
  const calculateDuties = () => {
    const av = Number(customsForm.assessableValue || 0);
    const cd = av * (Number(customsForm.cd || 0) / 100);
    const rd = av * (Number(customsForm.rd || 0) / 100);
    const sd = (av + cd + rd) * (Number(customsForm.sd || 0) / 100);
    const vat = (av + cd + rd + sd) * (Number(customsForm.vat || 0) / 100);
    const ait = av * (Number(customsForm.ait || 0) / 100);
    const at = (av + cd + rd + sd) * (Number(customsForm.at || 0) / 100);
    const total = cd + rd + sd + vat + ait + at;

    setCustomsForm({
      ...customsForm,
      totalDutyPaid: total.toFixed(2)
    });
  };

  // Step 8: Final Stock Capitalization
  const handleCapitalize = async () => {
    try {
      await lcService.capitalizeLC(selectedLcId, 'wh-central');
      loadData();
      alert('LC finalized and stock successfully capitalized!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const lcJournals = useMemo(() => {
    if (!selectedLcId) return [];
    return journals.filter(j => j.sourceRefId === selectedLcId);
  }, [journals, selectedLcId]);

  // Country flag helper
  const countryFlag = (country) => {
    const flags = { 'China': '🇨🇳', 'India': '🇮🇳', 'USA': '🇺🇸', 'Germany': '🇩🇪', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Bangladesh': '🇧🇩', 'Turkey': '🇹🇷', 'Italy': '🇮🇹', 'UK': '🇬🇧' };
    return flags[country] || '🌍';
  };

  const LC_STAGES = ['Draft', 'Opened', 'Shipment Received', 'Documents Received', 'PAD Created', 'Duty Paid', 'Capitalized'];
  const STAGE_ICONS = ['📝', '🏦', '🚢', '📄', '💳', '🏛️', '✅'];

  return (
    <div className="view-container" style={{ padding: '1.5rem', overflowY: 'auto', height: '100%', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Cockpit Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1a2e 0%, #0f3460 50%, #134074 100%)',
        borderRadius: 20,
        padding: '1.75rem 2rem',
        marginBottom: '1.5rem',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        boxShadow: '0 8px 32px rgba(15,52,96,0.45)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background ship watermark */}
        <div style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.06, fontSize: '9rem', pointerEvents: 'none', userSelect: 'none' }}>🚢</div>
        {/* Icon */}
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
          🚢
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' }}>LC Trade Finance Portal</h2>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', padding: '3px 10px', borderRadius: 9999 }}>
              {lcs.filter(l => l.status !== 'Capitalized').length} Active LCs
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', maxWidth: 520 }}>
            End-to-end import cost tracking: Margin → GIT → PAD → Customs → Capitalization
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Portfolio', val: fmt(lcs.reduce((s,l) => s + l.lcAmountForeign * l.exchangeRate, 0)), color: '#60a5fa' },
              { label: 'Capitalized', val: lcs.filter(l => l.status === 'Capitalized').length, color: '#a78bfa' },
              { label: 'In Progress', val: lcs.filter(l => l.status !== 'Capitalized' && l.status !== 'Draft').length, color: '#fbbf24' },
            ].map(k => (
              <div key={k.label}>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: k.color, fontFamily: 'monospace' }}>{k.val}</div>
              </div>
            ))}
          </div>
        </div>
        {!selectedLcId && (
          <button onClick={() => setShowOpenModal(true)} style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none', borderRadius: 12, color: '#fff',
            padding: '0.7rem 1.5rem', fontWeight: 800, fontSize: '0.85rem',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
            flexShrink: 0, whiteSpace: 'nowrap'
          }}>
            ➕ Open New LC
          </button>
        )}
      </div>

      {!selectedLcId ? (
        <>
          {/* ── Premium KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Open LC Value', val: fmt(stats.openLcValue), icon: '🏦', color: '#3b82f6', sub: 'Active import lines' },
              { label: 'Goods in Transit', val: fmt(stats.gitValue), icon: '🚢', color: '#f59e0b', sub: 'Accumulated at sea/ports' },
              { label: 'PAD/LTR Loans', val: fmt(stats.padOutstanding), icon: '💳', color: '#ef4444', sub: 'Bank liability outstanding' },
              { label: 'Margin Locked', val: fmt(stats.marginLocked), icon: '🔒', color: '#10b981', sub: 'Deposited guarantees' },
              { label: 'Forex Variance', val: stats.forexVariance >= 0 ? `Loss ${fmt(stats.forexVariance)}` : `Gain ${fmt(Math.abs(stats.forexVariance))}`, icon: stats.forexVariance >= 0 ? '📉' : '📈', color: stats.forexVariance >= 0 ? '#ef4444' : '#10b981', sub: 'IAS 21 settlement diff' },
            ].map((k, i) => (
              <div key={i} style={{
                borderRadius: 16, padding: '1rem',
                background: `linear-gradient(135deg, ${k.color}12, ${k.color}05)`,
                border: `1px solid ${k.color}28`,
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 8, right: 10, fontSize: '1.6rem', opacity: 0.12 }}>{k.icon}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: k.color, fontFamily: 'monospace', lineHeight: 1.2, marginBottom: 4 }}>{k.val}</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── LC Pipeline Funnel Bar ── */}
          {lcs.length > 0 && (() => {
            const stageCounts = LC_STAGES.map(s => ({ stage: s, count: lcs.filter(l => l.status === s).length })).filter(s => s.count > 0);
            const total = lcs.length;
            const stageColors = { 'Draft': '#64748b', 'Opened': '#3b82f6', 'Shipment Received': '#f59e0b', 'Documents Received': '#8b5cf6', 'PAD Created': '#ef4444', 'Duty Paid': '#06b6d4', 'Capitalized': '#10b981' };
            return (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>📊 LC Pipeline Distribution</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{total} LCs Total</span>
                </div>
                <div style={{ display: 'flex', height: 10, borderRadius: 8, overflow: 'hidden', gap: 2, marginBottom: '0.6rem' }}>
                  {stageCounts.map(s => (
                    <div key={s.stage} title={`${s.stage}: ${s.count}`}
                      style={{ flex: s.count, background: stageColors[s.stage] || '#64748b', minWidth: 6 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {stageCounts.map(s => (
                    <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: stageColors[s.stage] || '#64748b' }} />
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{s.stage}</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 900, color: stageColors[s.stage] || '#64748b' }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── LC Directory ── */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>🗂️ Import LC Registry</h3>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{lcs.length} records</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['LC Number', 'Supplier', 'Origin', 'FOB Amount', 'Landed Costs', 'Margin', 'Progress', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '0.65rem 0.85rem', textAlign: h === 'FOB Amount' || h === 'Landed Costs' || h === 'Margin' ? 'right' : 'left', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lcs.map(item => {
                    const landedTotal = item.costs.reduce((s, c) => s + c.amount, 0);
                    const marginTotal = item.marginDeposits.reduce((s, m) => s + m.amount, 0);
                    const stageIdx = LC_STAGES.indexOf(item.status);
                    const stageColors2 = { 'Capitalized': { bg: 'rgba(168,85,247,0.1)', color: '#a855f7' }, 'Opened': { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' }, 'Draft': { bg: 'rgba(100,116,139,0.1)', color: '#64748b' } };
                    const sc = stageColors2[item.status] || { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' };
                    return (
                      <tr key={item.id} onClick={() => { setSelectedLcId(item.id); setDetailTab('overview'); }} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '0.75rem 0.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{item.lcNumber}</td>
                        <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>{supplierName(item.supplierId)}</td>
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: '1rem' }}>{countryFlag(item.country)}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.country}</span>
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmtForeign(item.lcAmountForeign, item.currency)}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(landedTotal)}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(marginTotal)}</td>
                        <td style={{ padding: '0.75rem 0.85rem', minWidth: 120 }}>
                          {/* Stage progress dots */}
                          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                            {LC_STAGES.map((st, i) => (
                              <div key={i} title={st} style={{
                                width: i <= stageIdx ? 8 : 6,
                                height: i <= stageIdx ? 8 : 6,
                                borderRadius: '50%',
                                background: i < stageIdx ? '#10b981' : i === stageIdx ? '#3b82f6' : 'var(--border-color)',
                                flexShrink: 0,
                                transition: 'all 0.2s'
                              }} />
                            ))}
                          </div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 3 }}>{stageIdx + 1}/{LC_STAGES.length}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: '0.62rem', fontWeight: 700, background: sc.bg, color: sc.color }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <button onClick={() => { setSelectedLcId(item.id); setDetailTab('overview'); }}
                            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 12px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                            Open →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {lcs.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No LCs found. Click "Open New LC" to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Detailed LC Stage console */
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>

          {/* ── LC Detail Banner ── */}
          <div style={{ background: 'linear-gradient(135deg, #0c1a2e 0%, #0f3460 100%)', padding: '1.25rem 1.5rem', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <button onClick={() => setSelectedLcId(null)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                ← Back
              </button>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.01em' }}>
                  🚢 {selectedLc?.lcNumber}
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', padding: '2px 8px', borderRadius: 9999, marginLeft: 10 }}>
                    {selectedLc?.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                  {countryFlag(selectedLc?.country)} {selectedLc?.country} · {supplierName(selectedLc?.supplierId)} · {fmtForeign(selectedLc?.lcAmountForeign, selectedLc?.currency)} @ {selectedLc?.exchangeRate} BDT
                </div>
              </div>
            </div>

            {/* ── Stage Pipeline Stepper ── */}
            <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
              {LC_STAGES.map((st, i) => {
                const currentIdx = LC_STAGES.indexOf(selectedLc?.status);
                const isPast = i < currentIdx;
                const isActive = i === currentIdx;
                const isFuture = i > currentIdx;
                return (
                  <div key={st} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: isPast ? '#10b981' : isActive ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                        border: `2px solid ${isPast ? '#10b981' : isActive ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', transition: 'all 0.3s',
                        boxShadow: isActive ? '0 0 0 4px rgba(59,130,246,0.25)' : 'none'
                      }}>
                        {isPast ? '✓' : STAGE_ICONS[i]}
                      </div>
                      <span style={{ fontSize: '0.55rem', fontWeight: isActive ? 800 : 600, color: isPast ? '#6ee7b7' : isActive ? '#93c5fd' : 'rgba(255,255,255,0.35)', textAlign: 'center', maxWidth: 70, lineHeight: 1.2 }}>
                        {st}
                      </span>
                    </div>
                    {i < LC_STAGES.length - 1 && (
                      <div style={{ width: 32, height: 2, background: isPast ? '#10b981' : 'rgba(255,255,255,0.12)', margin: '0 4px', marginBottom: 18, flexShrink: 0, transition: 'background 0.3s' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Premium Tab Navigation ── */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)', overflowX: 'auto', background: 'var(--bg-secondary)' }}>
            {[
              ['overview', '📋', 'Overview'],
              ['margin', '💰', 'Margin'],
              ['shipment', '🚢', 'Shipment'],
              ['costs', '📦', 'Costs'],
              ['allocation', '⚙️', 'Allocation'],
              ['bank_loans', '💳', 'Bank Loan'],
              ['customs', '🏛️', 'Customs'],
              ['capitalization', '🏭', 'Capitalize'],
              ['ledgers', '📒', 'Ledgers']
            ].map(([t, icon, label]) => (
              <button key={t} onClick={() => setDetailTab(t)} style={{
                padding: '0.65rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 700,
                color: detailTab === t ? 'var(--primary-color)' : 'var(--text-secondary)',
                borderBottom: detailTab === t ? '2px solid var(--primary-color)' : '2px solid transparent',
                outline: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                transition: 'color 0.2s'
              }}>
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>

          {/* Tab Content Wrapper */}
          <div style={{ padding: '1.25rem' }}>
          {detailTab === 'overview' && (() => {
            const fobBDT = (selectedLc?.lcAmountForeign || 0) * (selectedLc?.exchangeRate || 1);
            const landedTotal = selectedLc?.costs.reduce((s, c) => s + c.amount, 0) || 0;
            const totalCapital = fobBDT + landedTotal;
            const marginReq = fobBDT * (selectedLc?.marginPercent || 10) / 100;
            const marginDep = selectedLc?.marginDeposits.reduce((s, m) => s + m.amount, 0) || 0;
            const marginPct = marginReq > 0 ? Math.min(100, (marginDep / marginReq) * 100) : 0;
            return (
              <div>
                {/* KPI mini cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'FOB Value (BDT)', val: fmt(fobBDT), color: '#3b82f6', icon: '💵' },
                    { label: 'Landed Costs', val: fmt(landedTotal), color: '#f59e0b', icon: '📦' },
                    { label: 'Total Capital', val: fmt(totalCapital), color: '#10b981', icon: '🏭' },
                    { label: 'Margin Deposited', val: `${marginPct.toFixed(0)}% (${fmt(marginDep)})`, color: '#a855f7', icon: '🔒' },
                  ].map((k, i) => (
                    <div key={i} style={{ borderRadius: 12, padding: '0.85rem', background: `${k.color}0d`, border: `1px solid ${k.color}22` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                        <span style={{ fontSize: '1.1rem' }}>{k.icon}</span>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900, color: k.color, fontFamily: 'monospace' }}>{k.val}</div>
                    </div>
                  ))}
                </div>

                {/* FOB vs Landed bar */}
                {totalCapital > 0 && (
                  <div style={{ marginBottom: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 12, padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: '#3b82f6' }}>FOB {((fobBDT / totalCapital) * 100).toFixed(1)}%</span>
                      <span style={{ color: 'var(--text-muted)' }}>Total Capital Cost</span>
                      <span style={{ color: '#f59e0b' }}>Landed {((landedTotal / totalCapital) * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ flex: fobBDT, background: '#3b82f6', transition: 'flex 0.4s ease' }} />
                      <div style={{ flex: landedTotal, background: '#f59e0b', transition: 'flex 0.4s ease' }} />
                    </div>
                  </div>
                )}

                {/* Two-column info cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🏦</span> Import Metadata
                    </h4>
                    {[
                      ['Supplier', supplierName(selectedLc?.supplierId)],
                      ['Origin', `${countryFlag(selectedLc?.country)} ${selectedLc?.country}`],
                      ['Issuing Bank', selectedLc?.issuingBank],
                      ['Advising Bank', selectedLc?.advisingBank],
                      ['Margin %', `${selectedLc?.marginPercent}%`],
                      ['Expiry', selectedLc?.expiryDate],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px dotted var(--border-color)', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{k}:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{v}</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>💱</span> Valuation Metrics
                    </h4>
                    {[
                      ['LC Limit (Foreign)', fmtForeign(selectedLc?.lcAmountForeign, selectedLc?.currency)],
                      ['Exchange Rate', `${selectedLc?.exchangeRate?.toFixed(2)} BDT`],
                      ['FOB Valuation (BDT)', fmt(fobBDT)],
                      ['Total Landed Costs', fmt(landedTotal)],
                      ['Effective Capital', fmt(totalCapital)],
                      ['Status', selectedLc?.status],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px dotted var(--border-color)', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{k}:</span>
                        <strong style={{ color: k === 'Effective Capital' ? '#10b981' : 'var(--text-primary)', fontFamily: k.includes('৳') || k.includes('BDT') || k.includes('Valuation') || k.includes('Capital') || k.includes('Costs') ? 'monospace' : 'inherit' }}>{v}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cargo Manifest table */}
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📋</span> Manifest Cargo Items
                </h4>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '7px 10px', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '7px 10px', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '7px 10px', textAlign: 'center' }}>HS Code</th>
                        <th style={{ padding: '7px 10px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '7px 10px', textAlign: 'right' }}>Weight</th>
                        <th style={{ padding: '7px 10px', textAlign: 'right' }}>FOB Rate</th>
                        <th style={{ padding: '7px 10px', textAlign: 'right' }}>FOB BDT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLc?.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>{it.itemName}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 9999, fontWeight: 700, background: it.itemType === 'Fixed Asset' ? 'rgba(244,63,94,0.1)' : 'rgba(6,182,212,0.1)', color: it.itemType === 'Fixed Asset' ? '#f43f5e' : '#06b6d4' }}>
                              {it.itemType}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <code style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4 }}>{it.hsCode}</code>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{it.qty} {it.unit}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>{it.weight ? `${it.weight} kg` : '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtForeign(it.unitCostForeign, selectedLc.currency)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#3b82f6', fontFamily: 'monospace' }}>{fmt(it.totalCostForeign * selectedLc.exchangeRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {detailTab === 'margin' && (
            <div>
              <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Margin Deposits Ledger</h4>
                {selectedLc?.status !== 'Capitalized' && (
                  <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => setShowMarginModal(true)}>
                    Add Margin Transaction
                  </button>
                )}
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Deposit Type</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Reference / Voucher</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLc?.marginDeposits.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No margin deposits registered. Click Add Margin to record opening margins.</td>
                    </tr>
                  ) : (
                    selectedLc?.marginDeposits.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '6px' }}>{m.date}</td>
                        <td style={{ padding: '6px', fontWeight: 700 }}>{m.type}</td>
                        <td style={{ padding: '6px' }}>{m.ref}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>{fmt(m.amount)}</td>
                      </tr>
                    ))
                  )}
                  <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 700 }}>
                    <td colSpan="3" style={{ padding: '6px', textAlign: 'right' }}>Total Margin Locked:</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: '#10b981' }}>{fmt(selectedLc?.marginDeposits.reduce((sum, m) => sum + m.amount, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'shipment' && (
            <div>
              <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Shipping & BL Manifest Registry</h4>
                {selectedLc?.status !== 'Capitalized' && (
                  <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => setShowShipmentModal(true)}>
                    Add Shipment Info (Post GIT)
                  </button>
                )}
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>BL Number</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Invoice Number</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Vessel Name</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>ETA Date</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Container No</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>GIT Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLc?.shipments.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No shipments logged. Post shipment entry to activate GIT assets.</td>
                    </tr>
                  ) : (
                    selectedLc?.shipments.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '6px', fontWeight: 700 }}>{s.blNo} ({s.blDate})</td>
                        <td style={{ padding: '6px' }}>{s.invoiceNo} ({s.invoiceDate})</td>
                        <td style={{ padding: '6px' }}>{s.vesselName}</td>
                        <td style={{ padding: '6px' }}>{s.eta}</td>
                        <td style={{ padding: '6px', textAlign: 'center', fontFamily: 'monospace' }}>{s.containerNo}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{s.gitPosted ? '✓ Posted' : 'Pending'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'costs' && (
            <div>
              <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Landed Cost Tracker</h4>
                {selectedLc?.status !== 'Capitalized' && (
                  <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => setShowCostModal(true)}>
                    ➕ Log Landed Cost Expense
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Foreign Expenses */}
                <div className="card" style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px' }}>
                  <h5 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 4, marginBottom: 8 }}>Foreign Expenses (FOB & Portals)</h5>
                  <table style={{ width: '100%', fontSize: '0.7rem' }}>
                    <tbody>
                      {selectedLc?.costs.filter(c => c.category === 'Foreign').map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                          <td style={{ padding: '4px 0' }}><strong>{c.type}</strong><span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginLeft: 6 }}>({c.ref})</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Local Expenses */}
                <div className="card" style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px' }}>
                  <h5 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 4, marginBottom: 8 }}>Local Port & Carriage Expenses</h5>
                  <table style={{ width: '100%', fontSize: '0.7rem' }}>
                    <tbody>
                      {selectedLc?.costs.filter(c => c.category === 'Local').map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                          <td style={{ padding: '4px 0' }}><strong>{c.type}</strong><span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginLeft: 6 }}>({c.ref})</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, padding: 8, background: 'var(--bg-input)', borderRadius: '6px' }}>
                <span>Grand Total Expenses Locked:</span>
                <span style={{ color: '#f59e0b' }}>{fmt(selectedLc?.costs.reduce((sum, c) => sum + c.amount, 0))}</span>
              </div>
            </div>
          )}

          {detailTab === 'allocation' && (
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Landed Cost Allocation Engine</h4>
              
              <div className="card d-flex align-items-center justify-content-between flex-row" style={{ padding: '10px 15px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-input)', marginBottom: '1rem', gap: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>Allocation Basis:</label>
                  <select className="form-control" style={{ fontSize: '0.75rem', padding: '4px 10px', width: 160 }} value={allocationBasis} onChange={e => setAllocationBasis(e.target.value)}>
                    <option value="FOB Value">FOB Value (BDT Ratio)</option>
                    <option value="Quantity">Quantity Proportional</option>
                    <option value="Weight">Weight (Kilograms)</option>
                    <option value="Volume">Volume (CBM Container)</option>
                  </select>
                </div>
                {selectedLc?.status !== 'Capitalized' && (
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={handleAllocateCosts}>
                    ⚙️ Calculate & Allocate Landed Costs
                  </button>
                )}
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>FOB BDT</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Weight (Total)</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Allocated cost</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Landed Cost / Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLc?.items.map(it => (
                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>{it.itemName}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{it.qty} {it.unit}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(it.totalCostForeign * selectedLc.exchangeRate)}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{it.weight ? `${it.weight * it.qty} Kg` : '—'}</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{fmt(it.allocatedCost)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)' }}>{fmt(it.landedUnitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'bank_loans' && (
            <div>
              <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Bank Loan / PAD Module</h4>
                {selectedLc?.status !== 'Capitalized' && selectedLc?.padLoans.length === 0 && (
                  <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => {
                    setLoanForm({
                      ...loanForm,
                      loanAmount: String(selectedLc.lcAmountForeign * selectedLc.exchangeRate),
                      settlementRate: String(selectedLc.exchangeRate)
                    });
                    setShowLoanModal(true);
                  }}>
                    Create PAD / Loan Against Documents
                  </button>
                )}
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Loan Date</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Loan Type</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Settlement Rate</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Interest rate</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Amount (BDT)</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Loan status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLc?.padLoans.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No bank trade financing loans active for this LC.</td>
                    </tr>
                  ) : (
                    selectedLc?.padLoans.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '6px' }}>{l.date}</td>
                        <td style={{ padding: '6px', fontWeight: 700 }}>{l.loanType}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{l.settlementRate.toFixed(2)}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{l.interestRate}%</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>{fmt(l.loanAmount)}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.62rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'customs' && (() => {
            const av = selectedLc?.customs?.assessableValue || 0;
            const cd = av * (Number(selectedLc?.customs?.cd || 0) / 100);
            const rd = av * (Number(selectedLc?.customs?.rd || 0) / 100);
            const sd = (av + cd + rd) * (Number(selectedLc?.customs?.sd || 0) / 100);
            const vat = (av + cd + rd + sd) * (Number(selectedLc?.customs?.vat || 0) / 100);
            const ait = av * (Number(selectedLc?.customs?.ait || 0) / 100);
            const at = (av + cd + rd + sd) * (Number(selectedLc?.customs?.at || 0) / 100);
            const total = selectedLc?.customs?.totalDutyPaid || 0;
            const effectiveRate = av > 0 ? ((total / av) * 100).toFixed(1) : 0;
            const dutyItems = [
              { label: 'Customs Duty (CD)', rate: selectedLc?.customs?.cd, amount: cd, color: '#3b82f6' },
              { label: 'Regulatory Duty (RD)', rate: selectedLc?.customs?.rd, amount: rd, color: '#8b5cf6' },
              { label: 'Supplementary Duty (SD)', rate: selectedLc?.customs?.sd, amount: sd, color: '#f59e0b' },
              { label: 'VAT Assessment', rate: selectedLc?.customs?.vat, amount: vat, color: '#10b981' },
              { label: 'Advance Income Tax (AIT)', rate: selectedLc?.customs?.ait, amount: ait, color: '#ef4444' },
              { label: 'Advance Tax (AT)', rate: selectedLc?.customs?.at, amount: at, color: '#06b6d4' },
            ];
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>🏛️ Customs Duty Assessment Console</h4>
                  {selectedLc?.status !== 'Capitalized' && (
                    <button style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 14px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => { setCustomsForm({ ...customsForm, assessableValue: String(selectedLc.lcAmountForeign * selectedLc.exchangeRate) }); setShowCustomsModal(true); }}>
                      ⚖️ Assess / Calculate
                    </button>
                  )}
                </div>

                {av > 0 ? (
                  <>
                    {/* Assessable value + effective rate hero */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '1rem' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Assessable Value</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#3b82f6', fontFamily: 'monospace' }}>{fmt(av)}</div>
                      </div>
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1rem' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Total Duty Paid</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ef4444', fontFamily: 'monospace' }}>{fmt(total)}</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f87171', background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: 9999 }}>{effectiveRate}% effective</div>
                        </div>
                      </div>
                    </div>

                    {/* Duty component bars */}
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                      <h5 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.85rem' }}>📊 Duty Component Breakdown</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {dutyItems.map(d => {
                          const pct = total > 0 ? (d.amount / total) * 100 : 0;
                          return (
                            <div key={d.label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{d.label}</span>
                                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{d.rate}%</span>
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: d.color, fontFamily: 'monospace' }}>{fmt(d.amount)}</span>
                              </div>
                              <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                    🏛️ No customs assessment recorded. Click "Assess / Calculate" to log duty details.
                  </div>
                )}
              </div>
            );
          })()}

          {detailTab === 'capitalization' && (
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '1rem' }}>Stock Capitalization & Arrival Console</h4>
              
              <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px' }}>
                  <h5 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Landed Capital Breakdown</h5>
                  <div style={{ fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justify: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Inventory Items value (Landed):</span>
                      <strong>{fmt(selectedLc?.items.filter(it => it.itemType === 'Inventory').reduce((s, it) => s + (it.landedUnitCost * it.qty), 0))}</strong>
                    </div>
                    <div style={{ display: 'flex', justify: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Fixed Asset Items value (Landed):</span>
                      <strong>{fmt(selectedLc?.items.filter(it => it.itemType === 'Fixed Asset').reduce((s, it) => s + (it.landedUnitCost * it.qty), 0))}</strong>
                    </div>
                    <div style={{ display: 'flex', justify: 'space-between', borderTop: '1.5px solid var(--border-color)', paddingTop: 6, fontWeight: 700 }}>
                      <span style={{ color: 'var(--text-primary)' }}>Total Capitalized Stock Addition:</span>
                      <strong style={{ color: 'var(--primary-color)' }}>{fmt(selectedLc?.items.reduce((s, it) => s + (it.landedUnitCost * it.qty), 0))}</strong>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px' }}>
                  <h5 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Capitalization Checklist</h5>
                  <ul style={{ fontSize: '0.7rem', paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)' }}>
                    <li style={{ color: selectedLc?.marginDeposits.length > 0 ? '#10b981' : '#ef4444' }}>{selectedLc?.marginDeposits.length > 0 ? '✓ Margin Deposit Completed' : '✗ Margin ledger empty'}</li>
                    <li style={{ color: selectedLc?.costs.length > 0 ? '#10b981' : '#f59e0b' }}>{selectedLc?.costs.length > 0 ? '✓ Landed Expenses Tracker populated' : '! No Landed Expenses logged'}</li>
                    <li style={{ color: selectedLc?.status === 'Capitalized' ? '#a855f7' : 'var(--text-secondary)' }}>Status Flow: <strong>{selectedLc?.status}</strong></li>
                  </ul>
                </div>
              </div>

              {selectedLc?.status !== 'Capitalized' ? (
                <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-input)' }}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Select Warehouse for Stock Receipt</label>
                    <select id="capital-warehouse-select" className="form-control" style={{ fontSize: '0.75rem' }}>
                      <option value="wh-1">Central Warehouse Dhaka</option>
                      <option value="wh-2">Raw Materials Store Chittagong</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '8px' }} onClick={handleCapitalize}>
                    🚢 Capitalize Assets & Receive Stock
                  </button>
                </div>
              ) : (
                <div style={{ padding: '1rem', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                  ✓ This Import Line has been capitalized. Stock has been loaded into warehouses at adjusted landed cost averages.
                </div>
              )}
            </div>
          )}

          {detailTab === 'ledgers' && (() => {
            const getModuleTag = (narration = '') => {
              if (narration.includes('Margin')) return { label: 'Margin', color: '#a855f7' };
              if (narration.includes('Transit') || narration.includes('GIT')) return { label: 'GIT', color: '#f59e0b' };
              if (narration.includes('PAD') || narration.includes('Loan')) return { label: 'PAD/Loan', color: '#ef4444' };
              if (narration.includes('Customs') || narration.includes('Duty')) return { label: 'Customs', color: '#06b6d4' };
              if (narration.includes('Capitali') || narration.includes('Stock')) return { label: 'Capitalize', color: '#10b981' };
              if (narration.includes('Cost') || narration.includes('Landed')) return { label: 'Landed Cost', color: '#f59e0b' };
              return { label: 'LC Journal', color: '#3b82f6' };
            };
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>📒 General Ledger — Double-Entry Log</h4>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{lcJournals.length} journal entries</span>
                </div>
                {lcJournals.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                    📒 No journal entries yet. Post transactions (Margin, Shipment, Costs, etc.) to generate GL entries.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {lcJournals.map(j => {
                      const tag = getModuleTag(j.narration);
                      const totalDR = j.lines.filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0);
                      const totalCR = j.lines.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
                      const isBalanced = Math.abs(totalDR - totalCR) < 0.01;
                      return (
                        <div key={j.id} style={{ border: `1px solid ${tag.color}28`, borderLeft: `3px solid ${tag.color}`, borderRadius: 12, overflow: 'hidden' }}>
                          {/* Journal Header */}
                          <div style={{ background: `${tag.color}08`, padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: tag.color, background: `${tag.color}15`, padding: '2px 8px', borderRadius: 9999 }}>{tag.label}</span>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{j.refNo}</span>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{j.date}</span>
                            </div>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: isBalanced ? '#10b981' : '#ef4444', background: isBalanced ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 9999 }}>
                              {isBalanced ? '✓ Balanced' : '⚠ Unbalanced'}
                            </span>
                          </div>
                          {/* Narration */}
                          <div style={{ padding: '0.4rem 0.85rem', fontSize: '0.68rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderBottom: '1px solid var(--border-color)' }}>
                            {j.narration}
                          </div>
                          {/* Lines table */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <th style={{ padding: '5px 12px', textAlign: 'left' }}>Account</th>
                                <th style={{ padding: '5px 12px', textAlign: 'right', color: '#3b82f6' }}>Debit (DR)</th>
                                <th style={{ padding: '5px 12px', textAlign: 'right', color: '#10b981' }}>Credit (CR)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {j.lines.map((l, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                                  <td style={{ padding: '5px 12px', paddingLeft: l.type === 'credit' ? 28 : 12 }}>
                                    <span style={{ fontWeight: 700, color: l.type === 'debit' ? '#3b82f6' : '#10b981', marginRight: 6, fontSize: '0.62rem' }}>{l.type === 'debit' ? 'DR' : 'CR'}</span>
                                    {accounts.find(a => a.id === l.accountId)?.name || l.accountId}
                                    {l.memo && <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem', marginLeft: 6 }}>({l.memo})</span>}
                                  </td>
                                  <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: 700, color: l.type === 'debit' ? '#3b82f6' : 'transparent', fontFamily: 'monospace' }}>
                                    {l.type === 'debit' ? fmt(l.amount) : '—'}
                                  </td>
                                  <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: 700, color: l.type === 'credit' ? '#10b981' : 'transparent', fontFamily: 'monospace' }}>
                                    {l.type === 'credit' ? fmt(l.amount) : '—'}
                                  </td>
                                </tr>
                              ))}
                              {/* Totals row */}
                              <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-color)', fontWeight: 900 }}>
                                <td style={{ padding: '5px 12px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total</td>
                                <td style={{ padding: '5px 12px', textAlign: 'right', color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.72rem' }}>{fmt(totalDR)}</td>
                                <td style={{ padding: '5px 12px', textAlign: 'right', color: '#10b981', fontFamily: 'monospace', fontSize: '0.72rem' }}>{fmt(totalCR)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          </div>{/* end tab content wrapper */}
        </div>
      )}

      {/* MODAL - Open New LC */}
      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Open Letter of Credit</h3>
              <button type="button" className="modal-close" onClick={() => setShowOpenModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleOpenLC} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">LC Number</label>
                  <input type="text" className="form-control" placeholder="LC-2026-XXXX" required value={openForm.lcNumber} onChange={e => setOpenForm({ ...openForm, lcNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Supplier</label>
                  <select className="form-control" value={openForm.supplierId} onChange={e => setOpenForm({ ...openForm, supplierId: e.target.value })}>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="form-group">
                  <label className="form-label">Origin Country</label>
                  <input type="text" className="form-control" required value={openForm.country} onChange={e => setOpenForm({ ...openForm, country: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Issuing Bank</label>
                  <input type="text" className="form-control" required value={openForm.issuingBank} onChange={e => setOpenForm({ ...openForm, issuingBank: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Advising Bank</label>
                  <input type="text" className="form-control" required value={openForm.advisingBank} onChange={e => setOpenForm({ ...openForm, advisingBank: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">LC Amount (Foreign)</label>
                  <input type="number" className="form-control" placeholder="0.00" required value={openForm.lcAmountForeign} onChange={e => setOpenForm({ ...openForm, lcAmountForeign: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-control" value={openForm.currency} onChange={e => setOpenForm({ ...openForm, currency: e.target.value })}>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="CNY">CNY (¥)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ex. Rate (BDT)</label>
                  <input type="number" step="0.01" className="form-control" required value={openForm.exchangeRate} onChange={e => setOpenForm({ ...openForm, exchangeRate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Margin (%)</label>
                  <input type="number" className="form-control" placeholder="10" required value={openForm.marginPercent} onChange={e => setOpenForm({ ...openForm, marginPercent: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input type="date" className="form-control" required value={openForm.expiryDate} onChange={e => setOpenForm({ ...openForm, expiryDate: e.target.value })} />
                </div>
              </div>

              {/* Manifest Cargo list */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>Import Manifest Items</label>
                  <button type="button" className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.65rem' }} onClick={addFormItem}>
                    Add Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {formItems.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, flexDirection: 'column', borderBottom: '1px dotted var(--border-color)', paddingBottom: 6 }}>
                      <div className="d-flex gap-2">
                        <select className="form-control" style={{ flex: 2, fontSize: '0.72rem' }} value={it.itemName} onChange={e => updateFormItem(idx, 'itemName', e.target.value)}>
                          <option value="">-- Choose Product --</option>
                          {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                        <select className="form-control" style={{ flex: 1, fontSize: '0.72rem' }} value={it.itemType} onChange={e => updateFormItem(idx, 'itemType', e.target.value)}>
                          <option value="Inventory">Inventory</option>
                          <option value="Fixed Asset">Fixed Asset</option>
                        </select>
                        <input type="text" className="form-control" style={{ flex: 1, fontSize: '0.72rem' }} placeholder="HS Code" value={it.hsCode} onChange={e => updateFormItem(idx, 'hsCode', e.target.value)} />
                      </div>
                      <div className="d-flex gap-2 align-items-center">
                        <input type="number" className="form-control" style={{ flex: 1, fontSize: '0.72rem' }} placeholder="Qty" value={it.qty} onChange={e => updateFormItem(idx, 'qty', e.target.value)} />
                        <input type="number" className="form-control" style={{ flex: 1, fontSize: '0.72rem' }} placeholder="Weight (Kg)" value={it.weight} onChange={e => updateFormItem(idx, 'weight', e.target.value)} />
                        <input type="number" className="form-control" style={{ flex: 1, fontSize: '0.72rem' }} placeholder="Volume (CBM)" value={it.volume} onChange={e => updateFormItem(idx, 'volume', e.target.value)} />
                        <input type="number" className="form-control" style={{ flex: 1.5, fontSize: '0.72rem' }} placeholder="FOB rate" value={it.unitCostForeign} onChange={e => updateFormItem(idx, 'unitCostForeign', e.target.value)} />
                        <button type="button" className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => removeFormItem(idx)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Open Letter of Credit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Add Margin Deposit */}
      {showMarginModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Log Margin Transaction</h3>
              <button type="button" className="modal-close" onClick={() => setShowMarginModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleMarginSubmit} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Margin Category</label>
                <select className="form-control" value={marginForm.type} onChange={e => setMarginForm({ ...marginForm, type: e.target.value })}>
                  <option value="Opening">Opening Deposit</option>
                  <option value="Additional">Additional Guarantee</option>
                  <option value="Adjustment">Adjustment / Clearance</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Margin Amount (BDT)</label>
                <input type="number" className="form-control" required value={marginForm.amount} onChange={e => setMarginForm({ ...marginForm, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Pay from bank account</label>
                <select className="form-control" value={marginForm.bankAccountId} onChange={e => setMarginForm({ ...marginForm, bankAccountId: e.target.value })}>
                  <option value="acc-1020">City Bank Current A/C</option>
                  <option value="acc-1025">Dutch-Bangla Bank A/C</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reference No (Cheque/TT)</label>
                <input type="text" className="form-control" required value={marginForm.ref} onChange={e => setMarginForm({ ...marginForm, ref: e.target.value })} />
              </div>
              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMarginModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Margin Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Add Shipment */}
      {showShipmentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Shipment Manifest (GIT)</h3>
              <button type="button" className="modal-close" onClick={() => setShowShipmentModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleShipmentSubmit} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Invoice Number</label>
                  <input type="text" className="form-control" required value={shipmentForm.invoiceNo} onChange={e => setShipmentForm({ ...shipmentForm, invoiceNo: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Date</label>
                  <input type="date" className="form-control" required value={shipmentForm.invoiceDate} onChange={e => setShipmentForm({ ...shipmentForm, invoiceDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">BL Number</label>
                  <input type="text" className="form-control" required value={shipmentForm.blNo} onChange={e => setShipmentForm({ ...shipmentForm, blNo: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">BL Date</label>
                  <input type="date" className="form-control" required value={shipmentForm.blDate} onChange={e => setShipmentForm({ ...shipmentForm, blDate: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Vessel Name</label>
                <input type="text" className="form-control" required value={shipmentForm.vesselName} onChange={e => setShipmentForm({ ...shipmentForm, vesselName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Container Number</label>
                  <input type="text" className="form-control" placeholder="TGBU-XXXXXXX" required value={shipmentForm.containerNo} onChange={e => setShipmentForm({ ...shipmentForm, containerNo: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">ETA Date</label>
                  <input type="date" className="form-control" required value={shipmentForm.eta} onChange={e => setShipmentForm({ ...shipmentForm, eta: e.target.value })} />
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowShipmentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Shipment Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Add Landed Cost Expense */}
      {showCostModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Log Landed Cost Expense</h3>
              <button type="button" className="modal-close" onClick={() => setShowCostModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCostSubmit} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Expense Head</label>
                <select className="form-control" value={costForm.type} onChange={e => setCostForm({ ...costForm, type: e.target.value })}>
                  <option value="Supplier Invoice">Supplier Invoice Addition (FOB)</option>
                  <option value="Freight Inward">Marine Ocean Freight</option>
                  <option value="Insurance">Marine Insurance Premium</option>
                  <option value="Customs Duty">Bangladesh Customs Duty</option>
                  <option value="VAT">VAT Assessment</option>
                  <option value="AIT">Advance Income Tax (AIT)</option>
                  <option value="Port Charges">Port Handling Charges</option>
                  <option value="C&F Charges">C&F Agency Commission</option>
                  <option value="Transportation">Local Inland Carriage</option>
                  <option value="Labor">Warehouse Labor Loading</option>
                  <option value="Demurrage">Port Demurrage Charges</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Expense Amount (BDT)</label>
                <input type="number" className="form-control" required value={costForm.amount} onChange={e => setCostForm({ ...costForm, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Expense Category</label>
                <select className="form-control" value={costForm.category} onChange={e => setCostForm({ ...costForm, category: e.target.value })}>
                  <option value="Foreign">Foreign Expenses (FOB/Insurance/Freight)</option>
                  <option value="Local">Local Port & Clearing Expenses</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Account</label>
                <select className="form-control" value={costForm.bankAccountId} onChange={e => setCostForm({ ...costForm, bankAccountId: e.target.value })}>
                  <option value="acc-1020">City Bank Current A/C</option>
                  <option value="acc-1025">Dutch-Bangla Bank A/C</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bill / Challan Reference</label>
                <input type="text" className="form-control" required value={costForm.ref} onChange={e => setCostForm({ ...costForm, ref: e.target.value })} />
              </div>
              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCostModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Allocate Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Bank Loan (PAD) */}
      {showLoanModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Trade Loan (PAD / LTR / LIM)</h3>
              <button type="button" className="modal-close" onClick={() => setShowLoanModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleLoanSubmit} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Loan Type</label>
                <select className="form-control" value={loanForm.loanType} onChange={e => setLoanForm({ ...loanForm, loanType: e.target.value })}>
                  <option value="PAD">Payment Against Documents (PAD)</option>
                  <option value="LTR">Loan Against Trust Receipt (LTR)</option>
                  <option value="LIM">Loan Against Imported Merchandise (LIM)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Loan Amount (BDT)</label>
                <input type="number" className="form-control" required value={loanForm.loanAmount} onChange={e => setLoanForm({ ...loanForm, loanAmount: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Settlement Exchange Rate</label>
                  <input type="number" step="0.01" className="form-control" required value={loanForm.settlementRate} onChange={e => setLoanForm({ ...loanForm, settlementRate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Interest Rate (%)</label>
                  <input type="number" className="form-control" required value={loanForm.interestRate} onChange={e => setLoanForm({ ...loanForm, interestRate: e.target.value })} />
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLoanModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Loan & Settle Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Customs Assessment */}
      {showCustomsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Customs Duty Assessment</h3>
              <button type="button" className="modal-close" onClick={() => setShowCustomsModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCustomsSubmit} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Assessable Value (BDT)</label>
                <input type="number" className="form-control" required value={customsForm.assessableValue} onChange={e => setCustomsForm({ ...customsForm, assessableValue: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="form-group">
                  <label className="form-label">CD (%)</label>
                  <input type="number" className="form-control" value={customsForm.cd} onChange={e => setCustomsForm({ ...customsForm, cd: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">RD (%)</label>
                  <input type="number" className="form-control" value={customsForm.rd} onChange={e => setCustomsForm({ ...customsForm, rd: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">SD (%)</label>
                  <input type="number" className="form-control" value={customsForm.sd} onChange={e => setCustomsForm({ ...customsForm, sd: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="form-group">
                  <label className="form-label">VAT (%)</label>
                  <input type="number" className="form-control" value={customsForm.vat} onChange={e => setCustomsForm({ ...customsForm, vat: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">AIT (%)</label>
                  <input type="number" className="form-control" value={customsForm.ait} onChange={e => setCustomsForm({ ...customsForm, ait: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">AT (%)</label>
                  <input type="number" className="form-control" value={customsForm.at} onChange={e => setCustomsForm({ ...customsForm, at: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: 4 }}>
                  <label className="form-label">Total Calculated Duty Paid (BDT)</label>
                  <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.65rem' }} onClick={calculateDuties}>
                    Auto-Calculate duties
                  </button>
                </div>
                <input type="number" className="form-control" required value={customsForm.totalDutyPaid} onChange={e => setCustomsForm({ ...customsForm, totalDutyPaid: e.target.value })} />
              </div>
              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
