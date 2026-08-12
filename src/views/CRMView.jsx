import { useState, useEffect, useMemo } from 'react';
import { crmService } from '../services/crmService';

const fmt = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const safeDate = (d) => {
  if (!d) return '—';
  try { return (window.formatDate ? window.formatDate(d) : new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })); }
  catch { return d; }
};

const STAGES = ['Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];
const STAGE_CONFIG = {
  'Lead':          { icon: '🎯', color: '#6366f1', bg: 'rgba(99,102,241,0.06)',   border: 'rgba(99,102,241,0.18)',   label: 'Lead / New' },
  'Contacted':     { icon: '📞', color: '#06b6d4', bg: 'rgba(6,182,212,0.06)',    border: 'rgba(6,182,212,0.18)',    label: 'Contacted' },
  'Qualified':     { icon: '✅', color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)',   border: 'rgba(139,92,246,0.18)',   label: 'Qualified' },
  'Proposal Sent': { icon: '📄', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)',   border: 'rgba(245,158,11,0.18)',   label: 'Proposal Sent' },
  'Negotiation':   { icon: '🤝', color: '#ec4899', bg: 'rgba(236,72,153,0.06)',   border: 'rgba(236,72,153,0.18)',   label: 'Negotiation' },
  'Closed Won':    { icon: '🏆', color: '#22c55e', bg: 'rgba(34,197,94,0.06)',    border: 'rgba(34,197,94,0.18)',    label: 'Closed Won' },
  'Closed Lost':   { icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.06)',    border: 'rgba(239,68,68,0.18)',    label: 'Closed Lost' },
};
const PRIORITY_CONFIG = {
  High:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.2)' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.2)' },
  Low:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.2)' },
};
const ACTIVITY_CONFIG = {
  Call:    { icon: '📞', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  Email:   { icon: '✉️', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  Meeting: { icon: '👥', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  Note:    { icon: '📝', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};
const FALLBACK_PRODUCTS = [
  { id: 'prod-1', name: 'Dell Latitude 5420 Laptop', category: 'Electronics', price: 85000 },
  { id: 'prod-2', name: 'HP LaserJet Pro M404dn Printer', category: 'Electronics', price: 32000 },
  { id: 'prod-3', name: 'Heavy Duty Drilling Machine', category: 'Spare Parts', price: 7500 },
  { id: 'prod-4', name: 'Industrial Safety Helmet - Yellow', category: 'Safety Gear', price: 450 },
  { id: 'prod-5', name: 'A4 Printing Paper (80gsm)', category: 'Office Supplies', price: 480 }
];
const FALLBACK_SERVICES = [
  { id: 'srv-1', name: 'Product Standard Installation', baseFee: 1500 },
  { id: 'srv-2', name: 'Hardware Diagnostic Check', baseFee: 800 },
  { id: 'srv-3', name: 'Standard Repair & Troubleshooting', baseFee: 2000 },
  { id: 'srv-4', name: 'Annual Maintenance Contract', baseFee: 3000 }
];
const FALLBACK_EMPLOYEES = [
  { employeeCode: 'EL001', fullNameEnglish: 'Shofiqul Islam', department: 'Partner', designation: 'Partner' },
  { employeeCode: 'EL002', fullNameEnglish: 'Zohir Uddin', department: 'Partner', designation: 'Partner' },
  { employeeCode: 'EL003', fullNameEnglish: 'Ekramul Islam Khandaker', department: 'Managing Partner', designation: 'Managing Partner' },
  { employeeCode: 'EL004', fullNameEnglish: 'Md. Anamul Haque', department: 'Partner', designation: 'Partner' }
];

const initials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
const avatarColor = (name = '') => {
  const colors = ['#6366f1','#06b6d4','#22c55e','#f59e0b','#ec4899','#8b5cf6','#ef4444'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
};

const EMPTY_FORM = () => ({
  catalogType: 'Product',
  serviceCategory: 'Electronics',
  subService: 'Dell Latitude 5420 Laptop',
  productPackage: 'Starter Package',
  projectType: 'New Project',
  qty: '1',
  estBudget: '85000',
  estDeliveryTime: '30 Days',
  name: '',
  company: '',
  contactPerson: '',
  phone: '',
  altPhone: '',
  email: '',
  website: '',
  businessType: 'Private Limited',
  address: '',
  district: 'Dhaka',
  areaUpazila: '',
  distanceKm: '5',
  clientType: 'New Client',
  leadSource: 'LinkedIn',
  value: '85000',
  expectedCloseDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().substring(0, 10),
  stage: 'Lead',
  priority: 'Medium',
  probability: '50',
  opportunityStatus: 'New',
  assignee: '',
  assignTeam: 'Corporate Sales Team',
  assignManager: 'Sales Manager',
  department: 'Corporate Sales',
  branch: 'Main Branch',
  salesTerritory: 'Dhaka North',
  dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().substring(0, 10),
  meetingDate: '',
  nextFollowupDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().substring(0, 10),
  followupTime: '11:00 AM',
  commMethod: 'Phone',
  reminder: true,
  reminderTime: '10:00 AM',
  clientRequirements: '',
  businessChallenges: '',
  painPoints: '',
  expectedFeatures: '',
  specialInstructions: '',
  internalNotes: '',
  tags: '',
  riskLevel: 'Medium',
  competitorName: '',
  expectedSuccessRate: '70%'
});

export default function CRMView({ currentUser, onRefresh, isMobile: propIsMobile }) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = propIsMobile ?? (windowWidth <= 768);

  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [dbServices, setDbServices] = useState([]);
  const [dbEmployees, setDbEmployees] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [mockFiles, setMockFiles] = useState([]);
  const [viewMode, setViewMode] = useState('kanban');
  const [mobileKanbanStage, setMobileKanbanStage] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [leadForm, setLeadForm] = useState(EMPTY_FORM());
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [activityForm, setActivityForm] = useState({ type: 'Call', summary: '', details: '', date: new Date().toISOString().substring(0, 10) });
  const [taskForm, setTaskForm] = useState({ description: '', dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().substring(0, 10) });
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({ code: '', name: '', contact: '', phone: '', email: '', address: 'Dhaka, Bangladesh', creditLimit: '1000000', paymentTermDays: '30', vatNo: '', tin: '' });
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    loadCRMData();
    const interval = setInterval(() => {
      crmService.fetchLeadsAsync().then(data => {
        if (data) setLeads(data);
      });
    }, 10000);

    try { const s = localStorage.getItem('erp_customers'); if (s) setCustomers(JSON.parse(s)); } catch (e) { console.warn(e); }
    try { const s = localStorage.getItem('erp_products'); setDbProducts(s ? JSON.parse(s) : FALLBACK_PRODUCTS); } catch { setDbProducts(FALLBACK_PRODUCTS); }
    try { const s = localStorage.getItem('erp_service_catalog'); setDbServices(s ? JSON.parse(s) : FALLBACK_SERVICES); } catch { setDbServices(FALLBACK_SERVICES); }
    try { const s = localStorage.getItem('erp_employees_v8'); setDbEmployees(s ? JSON.parse(s) : FALLBACK_EMPLOYEES); } catch { setDbEmployees(FALLBACK_EMPLOYEES); }

    return () => clearInterval(interval);
  }, []);

  const loadCRMData = () => {
    setLeads(crmService.getLeads());
    crmService.fetchLeadsAsync().then(data => {
      if (data) setLeads(data);
    });
  };

  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);

  const filteredLeads = useMemo(() => leads.filter(l => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || (l.contactPerson || '').toLowerCase().includes(q) || (l.assignee || '').toLowerCase().includes(q);
    const matchPriority = priorityFilter === 'all' || l.priority === priorityFilter;
    const matchStage = stageFilter === 'all' || l.stage === stageFilter;
    return matchSearch && matchPriority && matchStage;
  }), [leads, searchTerm, priorityFilter, stageFilter]);

  const sortedLeads = useMemo(() => {
    const arr = [...filteredLeads];
    arr.sort((a, b) => {
      let av = a[sortKey] ?? '';
      let bv = b[sortKey] ?? '';
      if (sortKey === 'value' || sortKey === 'probability') { av = Number(av || 0); bv = Number(bv || 0); }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredLeads, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const SortIcon = ({ k }) => sortKey !== k ? <span style={{ opacity: 0.3 }}>⇅</span> : sortDir === 'asc' ? <span>↑</span> : <span>↓</span>;

  const kpis = useMemo(() => {
    const active = leads.filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost');
    const totalPipeline = active.reduce((s, l) => s + (Number(l.value) || 0), 0);
    const wonLeads = leads.filter(l => l.stage === 'Closed Won');
    const wonValue = wonLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
    const closedWon = wonLeads.length;
    const closedLost = leads.filter(l => l.stage === 'Closed Lost').length;
    const totalClosed = closedWon + closedLost;
    const winRate = totalClosed > 0 ? Math.round((closedWon / totalClosed) * 100) : 0;
    const avgDealSize = leads.length > 0 ? leads.reduce((s, l) => s + (Number(l.value) || 0), 0) / leads.length : 0;
    return { activeCount: active.length, totalPipeline, wonValue, winRate, avgDealSize, closedWon, closedLost };
  }, [leads]);

  const globalFollowups = useMemo(() => {
    const list = [];
    leads.forEach(l => (l.tasks || []).forEach(t => { if (t.status !== 'Completed') list.push({ ...t, leadId: l.id, leadName: l.name }); }));
    return list.slice(0, 6);
  }, [leads]);

  const globalActivities = useMemo(() => {
    const list = [];
    leads.forEach(l => (l.notes || []).forEach(n => list.push({ ...n, leadId: l.id, leadName: l.name })));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
  }, [leads]);

  // --- Handlers ---
  const handleDragStart = (e, leadId) => e.dataTransfer.setData('text/plain', leadId);
  const handleDrop = (e, newStage) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) handleStageChange(id, newStage); };

  const calculatedExpectedRevenue = useMemo(() => {
    const val = Number(leadForm.value || 0);
    const prob = Number(leadForm.probability || 0);
    return (val * prob) / 100;
  }, [leadForm.value, leadForm.probability]);

  const isPhoneDuplicate = useMemo(() => {
    if (!leadForm.phone) return false;
    return leads.some(l => l.id !== leadForm.id && l.phone === leadForm.phone);
  }, [leadForm.phone, leads, leadForm.id]);

  const handleSaveLead = (e) => {
    if (e) e.preventDefault();
    if (!leadForm.name || !leadForm.company || !leadForm.value) return alert('Please fill Opportunity Title, Company, and Deal Value.');
    if (!leadForm.id) {
      const dup = leads.find(l => l.name.trim().toLowerCase() === (leadForm.name || '').trim().toLowerCase());
      if (dup) { alert(`⚠️ Duplicate: "${dup.name}" already exists in pipeline (${dup.stage}).`); return; }
    }
    crmService.saveLead({ ...leadForm, expectedRevenue: calculatedExpectedRevenue, attachments: mockFiles });
    setShowAddModal(false);
    resetForm();
    loadCRMData();
  };

  const resetForm = () => { setModalStep(1); setMockFiles([]); setLeadForm(EMPTY_FORM()); };

  const handleSaveAndFollowup = () => {
    if (!leadForm.name || !leadForm.company || !leadForm.value) return alert('Please fill required fields.');
    const task = { id: `tsk-${Date.now()}`, description: `Follow-up ${leadForm.commMethod}: ${leadForm.nextFollowupDate} at ${leadForm.followupTime}`, dueDate: leadForm.nextFollowupDate, status: 'Pending' };
    crmService.saveLead({ ...leadForm, tasks: [task], expectedRevenue: calculatedExpectedRevenue, attachments: mockFiles });
    setShowAddModal(false);
    resetForm();
    loadCRMData();
    alert('🎉 Opportunity saved and follow-up task scheduled!');
  };

  const handleEditLead = (lead) => {
    setLeadForm({
      ...EMPTY_FORM(),
      ...lead,
      value: String(lead.value || ''),
      estBudget: String(lead.estBudget || lead.value || ''),
      probability: String(lead.probability || '50'),
      qty: String(lead.qty || '1'),
    });
    setMockFiles(lead.attachments || []);
    setModalStep(1);
    setSelectedLeadId(null);
    setShowAddModal(true);
  };

  const handleAutofillCustomer = (customerName) => {
    const cust = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
    if (cust) setLeadForm(f => ({ ...f, company: cust.name, contactPerson: cust.contactPerson || '', phone: cust.phone || '', email: cust.email || '', address: cust.address || '', district: cust.district || 'Dhaka', clientType: 'Existing Client' }));
  };

  const handleDeleteLead = (id) => {
    if (confirm('Delete this opportunity permanently?')) {
      crmService.deleteLead(id);
      if (selectedLeadId === id) setSelectedLeadId(null);
      loadCRMData();
    }
  };

  const handleStageChange = (leadId, newStage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    crmService.saveLead({ ...lead, stage: newStage });
    loadCRMData();
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.summary) return alert('Please enter activity summary.');
    try {
      await crmService.addActivity(selectedLeadId, activityForm, currentUser);
      setActivityForm({ type: 'Call', summary: '', details: '', date: new Date().toISOString().substring(0, 10) });
      loadCRMData();
    } catch (err) { alert(err.message); }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.description) return alert('Please enter task description.');
    try {
      await crmService.addTask(selectedLeadId, taskForm, currentUser);
      setTaskForm({ description: '', dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().substring(0, 10) });
      loadCRMData();
    } catch (err) { alert(err.message); }
  };

  const handleToggleTask = (taskId, specificLeadId = null) => {
    const targetId = specificLeadId || selectedLeadId;
    crmService.toggleTaskStatus(targetId, taskId);
    loadCRMData();
  };

  const handleInitiateConversion = (lead) => {
    setConvertForm({ code: `CST-${String(Date.now()).slice(-4)}`, name: lead.company, contact: lead.contactPerson || '', phone: lead.phone || '', email: lead.email || '', address: lead.address || 'Dhaka, Bangladesh', creditLimit: '1000000', paymentTermDays: '30', vatNo: '', tin: '' });
    setShowConvertModal(true);
  };

  const handleConfirmConversion = async (e) => {
    e.preventDefault();
    if (!convertForm.name || !convertForm.code) return alert('Customer Name and Code are required.');
    try {
      await crmService.convertToCustomer(selectedLeadId, convertForm, currentUser);
      setShowConvertModal(false);
      loadCRMData();
      if (onRefresh) onRefresh();
      alert(`🎉 ${convertForm.name} has been successfully registered as an ERP customer!`);
    } catch (err) { alert(err.message); }
  };

  // Step 1: Catalog cascading
  const uniqueCategories = useMemo(() => {
    if (leadForm.catalogType === 'Product') {
      const cats = [...new Set(dbProducts.map(p => p.category))].filter(Boolean);
      return cats.length > 0 ? cats : ['Electronics', 'Spare Parts', 'Safety Gear', 'Office Supplies'];
    }
    const cats = [...new Set(dbServices.map(s => s.category || 'Service Income'))].filter(Boolean);
    return cats.length > 0 ? cats : ['Service Income'];
  }, [leadForm.catalogType, dbProducts, dbServices]);

  const subServicesOptions = useMemo(() => {
    if (leadForm.catalogType === 'Product') return dbProducts.filter(p => p.category === leadForm.serviceCategory).map(p => p.name);
    return dbServices.filter(s => (s.category || 'Service Income') === leadForm.serviceCategory).map(s => s.name);
  }, [leadForm.catalogType, leadForm.serviceCategory, dbProducts, dbServices]);

  const handleCatalogTypeChange = (type) => {
    const cats = type === 'Product' 
      ? [...new Set(dbProducts.map(p => p.category))].filter(Boolean) 
      : [...new Set(dbServices.map(s => s.category || 'Service Income'))].filter(Boolean);
    const cat = cats[0] || (type === 'Product' ? 'Electronics' : 'Service Income');
    let sub = '', price = '0';
    if (type === 'Product') { 
      const m = dbProducts.filter(p => p.category === cat); 
      sub = m[0]?.name || ''; 
      price = String(m[0]?.price || 0); 
    } else { 
      const m = dbServices.filter(s => (s.category || 'Service Income') === cat); 
      sub = m[0]?.name || ''; 
      price = String(m[0]?.baseFee || 0); 
    }
    setLeadForm(f => ({ ...f, catalogType: type, serviceCategory: cat, subService: sub, estBudget: price, value: price }));
  };

  const handleServiceCategoryChange = (cat) => {
    let sub = '', price = '0';
    if (leadForm.catalogType === 'Product') { 
      const m = dbProducts.filter(p => p.category === cat); 
      sub = m[0]?.name || ''; 
      price = String(m[0]?.price || 0); 
    } else { 
      const m = dbServices.filter(s => (s.category || 'Service Income') === cat); 
      sub = m[0]?.name || ''; 
      price = String(m[0]?.baseFee || 0); 
    }
    setLeadForm(f => ({ ...f, serviceCategory: cat, subService: sub, estBudget: price, value: price }));
  };

  const handleSubServiceChange = (sub) => {
    let price = '0';
    if (leadForm.catalogType === 'Product') { const item = dbProducts.find(p => p.name === sub); price = String(item?.price || 0); }
    else { const item = dbServices.find(s => s.name === sub); price = String(item?.baseFee || 0); }
    setLeadForm(f => ({ ...f, subService: sub, estBudget: price, value: price }));
  };

  const handleAssigneeChange = (name) => {
    const emp = dbEmployees.find(e => (e.fullNameEnglish || e.name || '') === name);
    if (emp) setLeadForm(f => ({ ...f, assignee: name, department: emp.department || 'Sales', assignTeam: `${emp.department || 'Corporate Sales'} Team`, assignManager: emp.department === 'Partner' ? 'Self/Partner' : 'Ekramul Islam Khandaker' }));
    else setLeadForm(f => ({ ...f, assignee: name }));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      const list = [...mockFiles];
      for (let i = 0; i < files.length; i++) list.push({ name: files[i].name, size: files[i].size, type: files[i].type });
      setMockFiles(list);
    }
  };

  const inputStyle = { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s', fontFamily: 'inherit' };
  const onFocus = (e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; };
  const onBlurInput = (e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; };

  // Dynamic calendar helpers
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth();
  const calMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  return (
    <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'inherit', color: 'var(--text-primary)', flexWrap: 'wrap' }}>

      {/* ═══════════════════════ LEFT SECTION ═══════════════════════ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Hero Banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.95) 0%, rgba(49,46,129,0.95) 50%, rgba(76,29,149,0.95) 100%)', borderRadius: '24px', padding: '2rem', color: '#fff', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: 90, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', backdropFilter: 'blur(10px)' }}>🚀</div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px' }}>CRM Sales Pipeline</h1>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.8 }}>Manage leads • Track deals • Convert customers</p>
              </div>
            </div>
            <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn btn-primary" style={{ padding: '0.75rem 1.6rem', borderRadius: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}>
              ➕ New Opportunity
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '16px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.25rem' }}>Quick Actions:</span>
          {[
            { label: '🎯 + Lead', stage: 'Lead' },
            { label: '💼 + Deal', stage: 'Qualified' },
            { label: '📄 + Proposal', stage: 'Proposal Sent' },
            { label: '🤝 + Won', stage: 'Closed Won' },
          ].map(q => (
            <button key={q.stage} onClick={() => { resetForm(); setLeadForm(f => ({ ...f, stage: q.stage })); setShowAddModal(true); }} className="btn btn-secondary btn-sm" style={{ borderRadius: 8, fontSize: '0.78rem' }}>{q.label}</button>
          ))}
        </div>

        {/* Analytics & KPI Toggle Header */}
        <div 
          onClick={() => setShowAnalytics(prev => !prev)}
          style={{ 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center', 
            background: 'var(--bg-secondary)', 
            padding: '0.75rem 1.25rem', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📊</span>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>Analytics & KPI Overview</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.6rem' }}>
                ({showAnalytics ? 'ক্লিক করে হাইড করুন' : 'ক্লিক করে ওপেন করুন'})
              </span>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowAnalytics(prev => !prev); }} 
            className="btn btn-secondary btn-sm" 
            style={{ borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem' }}
          >
            {showAnalytics ? '🙈 Hide Analytics' : '👁️ Show Analytics'}
            <span style={{ transform: showAnalytics ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'inline-block' }}>▼</span>
          </button>
        </div>

        {/* Collapsible Section */}
        {showAnalytics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Active Deals',   value: kpis.activeCount,   sub: 'In pipeline',          icon: '🎯', color: '#6366f1', display: v => `${v}`,   spark: 'M0,25 Q15,22 30,28 T60,12 T90,5 T100,2' },
                { label: 'Pipeline Value', value: kpis.totalPipeline, sub: 'Active deals BDT',      icon: '💼', color: '#06b6d4', display: v => fmt(v), spark: 'M0,20 Q20,10 40,25 T80,8 T100,5' },
                { label: 'Won Revenue',    value: kpis.wonValue,      sub: `${kpis.closedWon} won`, icon: '🏆', color: '#22c55e', display: v => fmt(v), spark: 'M0,28 Q20,25 40,15 T80,5 T100,1' },
                { label: 'Win Rate',       value: kpis.winRate,       sub: `${kpis.closedLost} lost`, icon: '📊', color: '#ec4899', display: v => `${v}%`, spark: 'M0,15 Q20,22 40,12 T80,2 T100,0' },
                { label: 'Avg Deal Size',  value: kpis.avgDealSize,   sub: 'Per opportunity',       icon: '📈', color: '#f59e0b', display: v => fmt(v), spark: 'M0,25 Q20,18 40,22 T80,10 T100,8' },
              ].map(k => (
                <div key={k.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 24px ${k.color}12`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
                    <span style={{ fontSize: '1rem', background: `${k.color}15`, padding: '5px 9px', borderRadius: '10px' }}>{k.icon}</span>
                  </div>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{k.display(k.value)}</span>
                  <div style={{ height: 28 }}>
                    <svg viewBox="0 0 100 30" width="100%" height="28"><path d={k.spark} fill="none" stroke={k.color} strokeWidth="2.5" strokeLinecap="round" /></svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    <span>{k.sub}</span><span style={{ color: '#22c55e', fontWeight: 700 }}>↑ 12%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {/* Revenue Trend */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>📈 Revenue Trend</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last 6 months</span>
                </div>
                <svg viewBox="0 0 500 140" width="100%" height="120">
                  <defs><linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient></defs>
                  {[30,75,115].map(y => <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="var(--border-color)" strokeDasharray="4 4"/>)}
                  <path d="M0,130 C50,110 100,125 150,90 C200,55 250,85 300,50 C350,20 400,45 450,18 C480,5 500,8 500,8 L500,130 Z" fill="url(#aG)"/>
                  <path d="M0,130 C50,110 100,125 150,90 C200,55 250,85 300,50 C350,20 400,45 450,18 C480,5 500,8 500,8" fill="none" stroke="#6366f1" strokeWidth="3"/>
                  {[[150,90],[300,50],[450,18]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="5" fill="#6366f1"/>)}
                </svg>
              </div>

              {/* Stage Funnel */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>📊 Stage Funnel</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Deal distribution</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {STAGES.slice(0, 5).map(st => {
                    const count = leads.filter(l => l.stage === st).length;
                    const pct = Math.max(6, (count / Math.max(leads.length, 1)) * 100);
                    return (
                      <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 75, fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st}</span>
                        <div style={{ flex: 1, background: 'var(--bg-tertiary)', height: 7, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ background: STAGE_CONFIG[st].color, height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, width: 18, textAlign: 'right', color: STAGE_CONFIG[st].color }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Win/Loss Donut */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>🎯 Win / Loss</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Historical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', height: 120 }}>
                  <svg viewBox="0 0 100 100" width="90" height="90">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border-color)" strokeWidth="10"/>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#22c55e" strokeWidth="10" strokeDasharray="180 240" strokeDashoffset="0"/>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="10" strokeDasharray="60 240" strokeDashoffset="-180"/>
                    <text x="50" y="55" textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '15px', fontWeight: 900 }}>{kpis.winRate}%</text>
                  </svg>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /><span style={{ color: 'var(--text-muted)' }}>Won:</span><span style={{ fontWeight: 800 }}>{kpis.closedWon} · {fmt(kpis.wonValue)}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /><span style={{ color: 'var(--text-muted)' }}>Lost:</span><span style={{ fontWeight: 800 }}>{kpis.closedLost}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-muted)' }}>Avg:</span><span style={{ fontWeight: 800 }}>{fmt(kpis.avgDealSize)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar + View Toggle */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input type="text" placeholder="🔍 Search opportunities, clients, assignee..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingRight: searchTerm ? '2.5rem' : '0.9rem' }} onFocus={onFocus} onBlur={onBlurInput} />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 10, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1 }}>✕</button>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* View Toggle */}
            <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <button type="button" onClick={() => setViewMode('kanban')} style={{ padding: '0.38rem 0.75rem', borderRadius: '8px', border: 'none', background: viewMode === 'kanban' ? '#6366f1' : 'transparent', color: viewMode === 'kanban' ? '#fff' : 'var(--text-muted)', fontSize: '0.73rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
                📋 Kanban
              </button>
              <button type="button" onClick={() => setViewMode('table')} style={{ padding: '0.38rem 0.75rem', borderRadius: '8px', border: 'none', background: viewMode === 'table' ? '#6366f1' : 'transparent', color: viewMode === 'table' ? '#fff' : 'var(--text-muted)', fontSize: '0.73rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
                📝 Table
              </button>
            </div>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '0.45rem 1rem' }}>
              <option value="all">⚡ All Priorities</option>
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🔵 Low</option>
            </select>
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '0.45rem 1rem' }}>
              <option value="all">📂 All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_CONFIG[s].icon} {s}</option>)}
            </select>
          </div>
        </div>

        {/* ─── KANBAN VIEW ─── */}
        {viewMode === 'kanban' && (
          <div>
            {/* Mobile Stage Selector Strip */}
            {isMobile && (
              <div className="tab-strip-mobile" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setMobileKanbanStage('all')}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '12px',
                    border: `1px solid ${mobileKanbanStage === 'all' ? '#6366f1' : 'var(--border-color)'}`,
                    background: mobileKanbanStage === 'all' ? '#6366f1' : 'var(--bg-secondary)',
                    color: mobileKanbanStage === 'all' ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', flexShrink: 0
                  }}
                >
                  🌐 All ({leads.length})
                </button>
                {STAGES.map(stage => {
                  const cfg = STAGE_CONFIG[stage];
                  const count = filteredLeads.filter(l => l.stage === stage).length;
                  const active = mobileKanbanStage === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setMobileKanbanStage(stage)}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '12px',
                        border: `1px solid ${active ? cfg.color : 'var(--border-color)'}`,
                        background: active ? cfg.color : 'var(--bg-secondary)',
                        color: active ? '#fff' : cfg.color,
                        fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', gap: '0.35rem'
                      }}
                    >
                      <span>{cfg.icon}</span>
                      <span>{stage}</span>
                      <span style={{ fontSize: '0.65rem', background: active ? 'rgba(255,255,255,0.25)' : cfg.bg, padding: '1px 6px', borderRadius: '10px' }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{
              overflowX: 'auto', display: 'flex', gap: '0.85rem', paddingBottom: '1.25rem',
              scrollSnapType: isMobile ? 'none' : 'x mandatory',
              flexDirection: isMobile && mobileKanbanStage !== 'all' ? 'column' : 'row'
            }}>
              {STAGES.filter(stage => !isMobile || mobileKanbanStage === 'all' || mobileKanbanStage === stage).map(stage => {
                const cfg = STAGE_CONFIG[stage];
                const stageLeads = filteredLeads.filter(l => l.stage === stage);
                const stageSum = stageLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
                return (
                  <div key={stage}
                    onDragOver={e => e.preventDefault()}
                    onDragEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                    onDragLeave={e => { e.currentTarget.style.background = 'none'; }}
                    onDrop={e => { e.currentTarget.style.background = 'none'; handleDrop(e, stage); }}
                    style={{
                      width: isMobile ? (mobileKanbanStage === 'all' ? '250px' : '100%') : '230px',
                      flexShrink: mobileKanbanStage === 'all' ? 0 : 1,
                      display: 'flex', flexDirection: 'column', gap: '0.65rem',
                      minHeight: isMobile ? 'auto' : '500px',
                      borderRadius: '16px', padding: '0.25rem', transition: 'background 0.2s', scrollSnapAlign: 'start'
                    }}
                  >
                  {/* Column Header */}
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '0.7rem 0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.78rem', color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, background: cfg.color, color: '#fff', padding: '2px 7px', borderRadius: '10px' }}>{stageLeads.length}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{fmt(stageSum)}</div>
                  </div>

                  {/* Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
                    {stageLeads.map(lead => {
                      const active = selectedLeadId === lead.id;
                      const pc = PRIORITY_CONFIG[lead.priority || 'Medium'];
                      const daysLeft = lead.expectedCloseDate ? Math.ceil((new Date(lead.expectedCloseDate) - new Date()) / 86400000) : null;
                      const isOverdue = daysLeft !== null && daysLeft < 0;
                      const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                      const tasksDone = (lead.tasks || []).filter(t => t.status === 'Completed').length;
                      const tasksTotal = (lead.tasks || []).length;
                      const ac = avatarColor(lead.company);
                      return (
                        <div key={lead.id} draggable onDragStart={e => handleDragStart(e, lead.id)}
                          onClick={() => setSelectedLeadId(lead.id)}
                          style={{ background: 'var(--bg-secondary)', border: `${active ? '2px' : '1.5px'} solid ${active ? '#6366f1' : 'var(--border-color)'}`, borderRadius: '14px', padding: '0.9rem', cursor: 'grab', boxShadow: active ? '0 8px 24px rgba(99,102,241,0.15)' : '0 2px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s ease' }}
                          onMouseEnter={e => { if (!active) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; } }}
                          onMouseLeave={e => { if (!active) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)'; } }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', marginBottom: '0.55rem' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '9px', background: `${ac}12`, border: `1px solid ${ac}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 900, color: ac, flexShrink: 0 }}>{initials(lead.company)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏢 {lead.company}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: cfg.color }}>{fmt(lead.value)}</span>
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: pc.color, background: pc.bg, border: `1px solid ${pc.border}`, padding: '1px 5px', borderRadius: '5px', textTransform: 'uppercase' }}>{lead.priority || 'Med'}</span>
                          </div>
                          {daysLeft !== null && (
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, marginBottom: '0.45rem', color: isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : 'var(--text-muted)' }}>
                              {isOverdue ? `⚠️ Overdue ${Math.abs(daysLeft)}d` : isUrgent ? `🔥 ${daysLeft}d left` : `📅 ${daysLeft}d`}
                            </div>
                          )}
                          {tasksTotal > 0 && (
                            <div style={{ marginBottom: '0.45rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 2 }}><span>Tasks</span><span>{tasksDone}/{tasksTotal}</span></div>
                              <div style={{ height: 3, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(tasksDone / tasksTotal) * 100}%`, background: tasksDone === tasksTotal ? '#22c55e' : '#6366f1', borderRadius: 2 }} />
                              </div>
                            </div>
                          )}
                          <div onClick={e => e.stopPropagation()} style={{ paddingTop: '0.45rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.3rem' }}>
                            <select value={lead.stage} onChange={e => handleStageChange(lead.id, e.target.value)} style={{ flex: 1, fontSize: '0.65rem', padding: '3px 4px', border: `1px solid ${cfg.border}`, borderRadius: '6px', background: cfg.bg, color: cfg.color, outline: 'none', cursor: 'pointer', fontWeight: 700 }}>
                              {STAGES.map(s => <option key={s} value={s}>{STAGE_CONFIG[s].icon} {s}</option>)}
                            </select>
                            <button onClick={() => handleEditLead(lead)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.65 }} title="Edit">✏️</button>
                            <button onClick={() => handleDeleteLead(lead.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.65 }} title="Delete">🗑️</button>
                          </div>
                        </div>
                      );
                    })}
                    {stageLeads.length === 0 && (
                      <div style={{ padding: '2.25rem 1rem', border: '1.5px dashed var(--border-color)', borderRadius: '14px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontSize: '1.4rem', opacity: 0.4 }}>{cfg.icon}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>No Deals Yet</div>
                        <button onClick={() => { setLeadForm(f => ({ ...f, stage })); setShowAddModal(true); }} className="btn btn-secondary btn-sm" style={{ fontSize: '0.67rem', padding: '2px 8px', borderRadius: 6 }}>+ Add</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* ─── TABLE VIEW ─── */}
        {viewMode === 'table' && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'var(--bg-secondary)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.79rem', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  {[
                    { key: 'name',               label: 'Opportunity' },
                    { key: 'company',             label: 'Company' },
                    { key: 'subService',          label: 'Product / Service' },
                    { key: 'phone',               label: 'Phone' },
                    { key: 'value',               label: 'Value', right: true },
                    { key: 'probability',         label: 'Win %', right: true },
                    { key: 'expectedRevenue',     label: 'Exp. Revenue', right: true },
                    { key: 'stage',               label: 'Stage' },
                    { key: 'priority',            label: 'Priority' },
                    { key: 'expectedCloseDate',   label: 'Close Date' },
                    { key: 'nextFollowupDate',    label: 'Next Follow-up' },
                    { key: 'assignee',            label: 'Assignee' },
                    { key: '_actions',            label: 'Actions', noSort: true, center: true },
                  ].map(col => (
                    <th key={col.key} onClick={() => !col.noSort && handleSort(col.key)}
                      style={{ padding: '0.75rem 0.8rem', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: col.noSort ? 'default' : 'pointer', textAlign: col.right ? 'right' : col.center ? 'center' : 'left', whiteSpace: 'nowrap', userSelect: 'none' }}>
                      {col.label} {!col.noSort && <SortIcon k={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map(lead => {
                  const cfg = STAGE_CONFIG[lead.stage] || STAGE_CONFIG['Lead'];
                  const pc = PRIORITY_CONFIG[lead.priority || 'Medium'];
                  const expRev = lead.expectedRevenue || (Number(lead.value || 0) * Number(lead.probability || 50)) / 100;
                  const ac = avatarColor(lead.company);
                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.7rem 0.8rem', maxWidth: 160 }}>
                        <span onClick={() => setSelectedLeadId(lead.id)} style={{ color: '#6366f1', fontWeight: 800, cursor: 'pointer', textDecoration: 'none' }}
                          onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.target.style.textDecoration = 'none'}
                        >{lead.name}</span>
                      </td>
                      <td style={{ padding: '0.7rem 0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '5px', background: `${ac}15`, border: `1px solid ${ac}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: ac, flexShrink: 0 }}>{initials(lead.company)}</div>
                          <span style={{ fontWeight: 700 }}>{lead.company}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.7rem 0.8rem', maxWidth: 140 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          [{lead.catalogType || 'Product'}] {lead.subService || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.7rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{lead.phone || '—'}</td>
                      <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right', fontWeight: 800, color: cfg.color, whiteSpace: 'nowrap' }}>{fmt(lead.value)}</td>
                      <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, color: Number(lead.probability) >= 70 ? '#22c55e' : Number(lead.probability) >= 40 ? '#f59e0b' : '#ef4444' }}>{lead.probability || 50}%</span>
                      </td>
                      <td style={{ padding: '0.7rem 0.8rem', textAlign: 'right', fontWeight: 800, color: '#22c55e', whiteSpace: 'nowrap' }}>{fmt(expRev)}</td>
                      <td style={{ padding: '0.7rem 0.8rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: '12px', whiteSpace: 'nowrap' }}>{cfg.icon} {lead.stage}</span>
                      </td>
                      <td style={{ padding: '0.7rem 0.8rem' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: '6px' }}>{lead.priority || 'Medium'}</span>
                      </td>
                      <td style={{ padding: '0.7rem 0.8rem', color: 'var(--text-secondary)', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.72rem' }}>{safeDate(lead.expectedCloseDate)}</td>
                      <td style={{ padding: '0.7rem 0.8rem', color: lead.nextFollowupDate ? '#06b6d4' : 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.72rem' }}>{lead.nextFollowupDate ? safeDate(lead.nextFollowupDate) : '—'}</td>
                      <td style={{ padding: '0.7rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>👤 {lead.assignee || 'Unassigned'}</td>
                      <td style={{ padding: '0.7rem 0.8rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                          <button onClick={() => setSelectedLeadId(lead.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem' }} title="View">👁️</button>
                          <button onClick={() => handleEditLead(lead)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem' }} title="Edit">✏️</button>
                          <button onClick={() => handleDeleteLead(lead.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem' }} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedLeads.length === 0 && (
                  <tr><td colSpan="13" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No opportunities match the current filters.</td></tr>
                )}
                {/* Totals footer row */}
                {sortedLeads.length > 0 && (
                  <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-tertiary)', fontWeight: 800 }}>
                    <td colSpan="4" style={{ padding: '0.6rem 0.8rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total — {sortedLeads.length} opportunities</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#6366f1', fontSize: '0.8rem' }}>{fmt(sortedLeads.reduce((s, l) => s + (Number(l.value) || 0), 0))}</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(sortedLeads.reduce((s, l) => s + (Number(l.probability) || 50), 0) / Math.max(sortedLeads.length, 1))}%</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', color: '#22c55e', fontSize: '0.8rem' }}>{fmt(sortedLeads.reduce((s, l) => s + (l.expectedRevenue || (Number(l.value || 0) * Number(l.probability || 50) / 100)), 0))}</td>
                    <td colSpan="6" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════ RIGHT SIDEBAR ═══════════════════════ */}
      <div style={{ width: isMobile ? '100%' : '300px', display: 'flex', flexDirection: 'column', gap: '1.25rem', flexShrink: 0 }}>

        {/* Follow-ups Widget */}
        <div className="card" style={{ padding: '1.1rem' }}>
          <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            📋 Today's Tasks
            {globalFollowups.length > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 10 }}>{globalFollowups.length}</span>}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {globalFollowups.map(t => (
              <div key={t.id} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '11px', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                <input type="checkbox" checked={t.status === 'Completed'} onChange={() => handleToggleTask(t.id, t.leadId)} style={{ marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textDecoration: t.status === 'Completed' ? 'line-through' : 'none', color: t.status === 'Completed' ? 'var(--text-muted)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>{t.leadName} · {safeDate(t.dueDate)}</div>
                </div>
              </div>
            ))}
            {globalFollowups.length === 0 && <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.73rem', color: 'var(--text-muted)' }}>🎉 All caught up!</div>}
          </div>
        </div>

        {/* Calendar Widget — Dynamic */}
        <div className="card" style={{ padding: '1.1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            📅 Closure Calendar
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: 700 }}>{calMonthName}</span>
          </h4>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '0.7rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', textAlign: 'center', fontSize: '0.64rem' }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => <div key={i} style={{ color: 'var(--text-muted)', fontWeight: 700, paddingBottom: 4 }}>{d}</div>)}
              {/* offset empty cells */}
              {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === now.getDate();
                const hasClosingDeal = leads.some(l => {
                  const d = l.expectedCloseDate;
                  return d && new Date(d).getDate() === dayNum && new Date(d).getMonth() === calMonth && new Date(d).getFullYear() === calYear;
                });
                return (
                  <div key={i} style={{ padding: '3px 0', borderRadius: '6px', background: isToday ? '#6366f1' : 'transparent', color: isToday ? '#fff' : hasClosingDeal ? '#f59e0b' : 'var(--text-primary)', border: hasClosingDeal && !isToday ? '1px solid rgba(245,158,11,0.4)' : 'none', fontWeight: isToday || hasClosingDeal ? 900 : 400, cursor: hasClosingDeal ? 'pointer' : 'default' }} title={hasClosingDeal ? 'Deal closing!' : ''}>
                    {dayNum}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card" style={{ padding: '1.1rem' }}>
          <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🤝 Activity Feed</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {globalActivities.map((act, i) => {
              const ac = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG['Note'];
              return (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: ac.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0, border: `1px solid ${ac.color}30` }}>{ac.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.summary}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{act.leadName}</span>
                      <span>{safeDate(act.date)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {globalActivities.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>No activities logged yet.</div>}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ DETAIL MODAL ═══════════════════════ */}
      {selectedLead && (() => {
        const cfg = STAGE_CONFIG[selectedLead.stage] || STAGE_CONFIG['Lead'];
        const pc = PRIORITY_CONFIG[selectedLead.priority || 'Medium'];
        const daysLeft = selectedLead.expectedCloseDate ? Math.ceil((new Date(selectedLead.expectedCloseDate) - new Date()) / 86400000) : null;
        const tasksDone = (selectedLead.tasks || []).filter(t => t.status === 'Completed').length;
        const tasksTotal = (selectedLead.tasks || []).length;
        return (
          <div className="modal-overlay" onClick={() => setSelectedLeadId(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header" style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.63rem', fontWeight: 800, padding: '2px 8px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20 }}>{cfg.icon} {cfg.label}</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 5 }}>{selectedLead.priority || 'Medium'}</span>
                      {selectedLead.catalogType && <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 5 }}>{selectedLead.catalogType === 'Product' ? '📦' : '🛠️'} {selectedLead.catalogType}</span>}
                    </div>
                    <h3 className="modal-title" style={{ margin: 0, color: '#fff', lineHeight: 1.2 }}>{selectedLead.name}</h3>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>🏢 {selectedLead.company} · 👤 {selectedLead.assignee || 'Unassigned'}</div>
                  </div>
                  <button className="modal-close" onClick={() => setSelectedLeadId(null)}>&times;</button>
                </div>
              </div>

              <div className="modal-form-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                {/* Info Grid */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '0.85rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Deal Information</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.74rem' }}>
                    {[
                      { label: 'Company',       val: selectedLead.company,                 icon: '🏢' },
                      { label: 'Contact',        val: selectedLead.contactPerson || '—',    icon: '👤' },
                      { label: 'Phone',          val: selectedLead.phone || '—',            icon: '📞' },
                      { label: 'Email',          val: selectedLead.email || '—',            icon: '✉️' },
                      { label: 'Product/Svc',   val: selectedLead.subService || '—',        icon: selectedLead.catalogType === 'Service' ? '🛠️' : '📦' },
                      { label: 'Deal Value',    val: fmt(selectedLead.value),               icon: '💰', highlight: true },
                      { label: 'Probability',   val: `${selectedLead.probability || 50}%`, icon: '📊' },
                      { label: 'Exp. Revenue',  val: fmt(selectedLead.expectedRevenue || (Number(selectedLead.value || 0) * Number(selectedLead.probability || 50) / 100)), icon: '📈', green: true },
                      { label: 'Close Date',    val: safeDate(selectedLead.expectedCloseDate), icon: '📅', warn: daysLeft !== null && daysLeft < 7 },
                      { label: 'Follow-up',     val: safeDate(selectedLead.nextFollowupDate), icon: '🔔' },
                      { label: 'Territory',     val: selectedLead.salesTerritory || '—',   icon: '📍' },
                      { label: 'Lead Source',   val: selectedLead.leadSource || '—',        icon: '🌐' },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem', fontWeight: 700, marginBottom: 1 }}>{item.label}</div>
                        <div style={{ fontWeight: 700, color: item.highlight ? cfg.color : item.green ? '#22c55e' : item.warn ? '#f59e0b' : 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.73rem' }}>{item.icon} {item.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Closed Won → Convert Banner */}
                {selectedLead.stage === 'Closed Won' && (
                  <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#16a34a', marginBottom: '0.3rem' }}>🎉 Deal Won — Convert to Customer!</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.6rem' }}>Register this company in ERP customer master to enable invoicing and ledger entries.</div>
                    <button onClick={() => handleInitiateConversion(selectedLead)} style={{ width: '100%', padding: '0.5rem', border: 'none', borderRadius: 9, cursor: 'pointer', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, boxShadow: '0 3px 10px rgba(34,197,94,0.3)' }}>
                      🏢 Convert to ERP Customer Profile
                    </button>
                  </div>
                )}

                {/* Tasks */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      📋 Follow-up Tasks
                      {tasksTotal > 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 7px', background: tasksDone === tasksTotal ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', color: tasksDone === tasksTotal ? '#22c55e' : '#6366f1', borderRadius: 20 }}>{tasksDone}/{tasksTotal}</span>}
                    </div>
                  </div>
                  <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <input type="text" placeholder="Add follow-up task..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.74rem', border: '1.5px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
                    <button type="submit" style={{ padding: '0 0.7rem', border: 'none', borderRadius: 8, cursor: 'pointer', background: '#6366f1', color: '#fff', fontSize: '0.74rem', fontWeight: 700 }}>+ Add</button>
                  </form>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 120, overflowY: 'auto' }}>
                    {(selectedLead.tasks || []).map(task => {
                      const done = task.status === 'Completed';
                      return (
                        <div key={task.id} onClick={() => handleToggleTask(task.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.55rem', background: done ? 'rgba(34,197,94,0.05)' : 'var(--bg-tertiary)', border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border-color)'}`, borderRadius: 8, cursor: 'pointer' }}>
                          <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${done ? '#22c55e' : 'var(--border-color)'}`, background: done ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{done && <span style={{ fontSize: '0.5rem', color: '#fff' }}>✓</span>}</div>
                          <span style={{ flex: 1, fontSize: '0.7rem', color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</span>
                          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', flexShrink: 0 }}>{safeDate(task.dueDate)}</span>
                        </div>
                      );
                    })}
                    {!(selectedLead.tasks || []).length && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.6rem' }}>No tasks yet.</div>}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.78rem', marginBottom: '0.6rem' }}>🤝 Activity Timeline</div>
                  <form onSubmit={handleAddActivity} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 11, padding: '0.65rem', marginBottom: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <select value={activityForm.type} onChange={e => setActivityForm({ ...activityForm, type: e.target.value })} style={{ padding: '0.34rem 0.4rem', fontSize: '0.72rem', border: '1.5px solid var(--border-color)', borderRadius: 7, background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}>
                        <option value="Call">📞 Call</option><option value="Email">✉️ Email</option><option value="Meeting">👥 Meeting</option><option value="Note">📝 Note</option>
                      </select>
                      <input type="text" placeholder="Summary / Title..." value={activityForm.summary} onChange={e => setActivityForm({ ...activityForm, summary: e.target.value })} style={{ flex: 1, padding: '0.34rem 0.5rem', fontSize: '0.72rem', border: '1.5px solid var(--border-color)', borderRadius: 7, background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
                    </div>
                    <textarea placeholder="Details, outcomes, next steps..." value={activityForm.details} onChange={e => setActivityForm({ ...activityForm, details: e.target.value })} style={{ padding: '0.34rem 0.5rem', fontSize: '0.72rem', border: '1.5px solid var(--border-color)', borderRadius: 7, background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', height: 42, fontFamily: 'inherit' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
                    <button type="submit" style={{ alignSelf: 'flex-end', padding: '0.32rem 0.8rem', border: 'none', borderRadius: 7, cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>Log Activity</button>
                  </form>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
                    {(selectedLead.notes || []).map(note => {
                      const ac2 = ACTIVITY_CONFIG[note.type] || ACTIVITY_CONFIG['Note'];
                      return (
                        <div key={note.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: ac2.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', flexShrink: 0, border: `1px solid ${ac2.color}30` }}>{ac2.icon}</div>
                          <div style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 9, padding: '0.45rem 0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.72rem', color: ac2.color }}>{note.summary}</span>
                              <span style={{ fontSize: '0.56rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>{safeDate(note.date)}</span>
                            </div>
                            {note.details && <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.35 }}>{note.details}</div>}
                            <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)', marginTop: 3, textAlign: 'right' }}>— {note.author}</div>
                          </div>
                        </div>
                      );
                    })}
                    {!(selectedLead.notes || []).length && <div style={{ textAlign: 'center', padding: '1.25rem', fontSize: '0.7rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 9 }}>No activities logged yet. Log the first one above.</div>}
                  </div>
                </div>
              </div>

              {/* Detail Modal Footer */}
              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => handleDeleteLead(selectedLead.id)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'none'; }}
                >🗑️ Delete</button>
                <button onClick={() => handleEditLead(selectedLead)} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem', borderRadius: 9 }}>✏️ Edit Opportunity</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════ CREATE / EDIT OPPORTUNITY WIZARD ═══════════════════════ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 860, width: '92%', maxHeight: '95vh', display: 'flex', flexDirection: 'column', borderRadius: '24px' }}>

            {/* Wizard Header */}
            <div className="modal-header" style={{ flexShrink: 0, padding: '1.2rem 1.5rem' }}>
              <div>
                <h3 className="modal-title" style={{ color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {leadForm.id ? '✏️ Edit Opportunity' : '💼 Create Corporate Opportunity'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)' }}>Step {modalStep} of 8 — Enterprise CRM Sales Wizard</p>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            {/* Stepper */}
            <div style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1.5rem', overflowX: 'auto', gap: '0.5rem', flexShrink: 0 }}>
              {[
                { s: 1, label: 'Service/Product' },
                { s: 2, label: 'Customer' },
                { s: 3, label: 'Deal Details' },
                { s: 4, label: 'Assignment' },
                { s: 5, label: 'Follow-up' },
                { s: 6, label: 'Requirements' },
                { s: 7, label: 'Attachments' },
                { s: 8, label: 'Review & Save' }
              ].map(st => {
                const active = modalStep === st.s;
                const completed = modalStep > st.s;
                return (
                  <div key={st.s} onClick={() => setModalStep(st.s)} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700, color: active ? '#6366f1' : completed ? '#22c55e' : 'var(--text-muted)', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? '#6366f1' : completed ? '#22c55e' : 'var(--border-color)', color: active || completed ? '#fff' : 'var(--text-secondary)', fontSize: '0.6rem', flexShrink: 0 }}>
                      {completed ? '✓' : st.s}
                    </span>
                    <span>{st.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="modal-form-content" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

              {/* STEP 1: Service / Product */}
              {modalStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 800 }}>📂 Step 1: Service / Product Information</h4>

                  {/* Catalog type toggle */}
                  <div style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    {['Product', 'Service'].map(type => (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, padding: '0.5rem 0.75rem', background: leadForm.catalogType === type ? (type === 'Product' ? 'rgba(99,102,241,0.1)' : 'rgba(6,182,212,0.1)') : 'transparent', borderRadius: 10, border: `1.5px solid ${leadForm.catalogType === type ? (type === 'Product' ? '#6366f1' : '#06b6d4') : 'transparent'}`, transition: 'all 0.2s' }}>
                        <input type="radio" checked={leadForm.catalogType === type} onChange={() => handleCatalogTypeChange(type)} style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>{type === 'Product' ? '📦 Product (Inventory)' : '🛠️ Service (Catalog)'}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Category <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={leadForm.serviceCategory} onChange={e => handleServiceCategoryChange(e.target.value)} style={inputStyle}>
                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Item / Sub-Service <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={leadForm.subService} onChange={e => handleSubServiceChange(e.target.value)} style={inputStyle}>
                        {subServicesOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Package / SLA</label>
                      <select value={leadForm.productPackage} onChange={e => setLeadForm({ ...leadForm, productPackage: e.target.value })} style={inputStyle}>
                        <option value="Starter Package">Starter Package</option>
                        <option value="Professional SLA">Professional SLA</option>
                        <option value="Enterprise SLA">Enterprise SLA</option>
                        <option value="Custom Solution">Custom Solution</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Project Type</label>
                      <select value={leadForm.projectType} onChange={e => setLeadForm({ ...leadForm, projectType: e.target.value })} style={inputStyle}>
                        <option>New Project</option><option>Upgrade</option><option>Maintenance</option><option>Support</option><option>Replacement</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Quantity</label>
                      <input type="number" min="1" placeholder="1" value={leadForm.qty} onChange={e => setLeadForm({ ...leadForm, qty: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Est. Budget (BDT) — Auto-filled</label>
                      <input type="number" placeholder="e.g. 85000" value={leadForm.estBudget} onChange={e => setLeadForm({ ...leadForm, estBudget: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Est. Delivery Time</label>
                      <input type="text" placeholder="e.g. 30 Days" value={leadForm.estDeliveryTime} onChange={e => setLeadForm({ ...leadForm, estDeliveryTime: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                    </div>
                  </div>

                  {/* Live preview card */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(6,182,212,0.04))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>📊 Live Deal Preview</div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                      <div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Item</div><div style={{ fontWeight: 700 }}>{leadForm.subService || '—'}</div></div>
                      <div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Qty</div><div style={{ fontWeight: 700 }}>{leadForm.qty || '1'}</div></div>
                      <div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Unit Price</div><div style={{ fontWeight: 700 }}>{fmt(leadForm.estBudget)}</div></div>
                      <div><div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total Value</div><div style={{ fontWeight: 900, color: '#6366f1' }}>{fmt(Number(leadForm.estBudget || 0) * Number(leadForm.qty || 1))}</div></div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Customer Information */}
              {modalStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 800 }}>🏢 Step 2: Customer Information</h4>
                    {customers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Auto-fill from:</span>
                        <select onChange={e => handleAutofillCustomer(e.target.value)} style={{ ...inputStyle, padding: '4px 8px', fontSize: '0.7rem', width: 'auto' }}>
                          <option value="">Select Client...</option>
                          {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[
                      { label: 'Opportunity Title *', key: 'name', placeholder: 'e.g. Beximco HR System Upgrade', req: true },
                      { label: 'Company Name *', key: 'company', placeholder: 'e.g. Beximco Textiles Ltd.', req: true },
                      { label: 'Contact Person *', key: 'contactPerson', placeholder: 'e.g. Rafiqul Islam', req: true },
                      { label: 'Phone *', key: 'phone', placeholder: 'e.g. 01712345678', req: true },
                      { label: 'Alternative Phone', key: 'altPhone', placeholder: 'e.g. 01812345678' },
                      { label: 'Email', key: 'email', placeholder: 'e.g. rafiq@beximco.bd', type: 'email' },
                      { label: 'Website', key: 'website', placeholder: 'e.g. www.beximco.com' },
                      { label: 'Address', key: 'address', placeholder: 'House, Road, Area' },
                      { label: 'District', key: 'district', placeholder: 'e.g. Dhaka' },
                      { label: 'Area / Upazila', key: 'areaUpazila', placeholder: 'e.g. Mirpur-12' },
                      { label: 'Distance (KM)', key: 'distanceKm', placeholder: '5', type: 'number' },
                    ].map(f => (
                      <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</label>
                        <input type={f.type || 'text'} placeholder={f.placeholder} value={leadForm[f.key] || ''} onChange={e => setLeadForm({ ...leadForm, [f.key]: e.target.value })}
                          style={{ ...inputStyle, borderColor: (f.key === 'phone' && isPhoneDuplicate) ? '#ef4444' : 'var(--border-color)' }} onFocus={onFocus} onBlur={onBlurInput} />
                        {f.key === 'phone' && isPhoneDuplicate && <span style={{ fontSize: '0.63rem', color: '#ef4444' }}>⚠️ A lead with this phone already exists!</span>}
                      </div>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Business Type</label>
                      <select value={leadForm.businessType} onChange={e => setLeadForm({ ...leadForm, businessType: e.target.value })} style={inputStyle}>
                        <option>Private Limited</option><option>Public Shareholder</option><option>Sole Proprietorship</option><option>Partnership Firm</option><option>NGO / NPO</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Client Type</label>
                      <select value={leadForm.clientType} onChange={e => setLeadForm({ ...leadForm, clientType: e.target.value })} style={inputStyle}>
                        <option>New Client</option><option>Existing Client</option><option>Returning Client</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Lead Source</label>
                      <select value={leadForm.leadSource} onChange={e => setLeadForm({ ...leadForm, leadSource: e.target.value })} style={inputStyle}>
                        {['Facebook','LinkedIn','Website','Referral','Walk-in','Google Ads','Cold Call','WhatsApp','Trade Show','Other'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Opportunity Details */}
              {modalStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 800 }}>💼 Step 3: Opportunity Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Deal Value (BDT) *</label>
                      <input type="number" placeholder="0" value={leadForm.value} onChange={e => setLeadForm({ ...leadForm, value: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Expected Closing Date</label>
                      <input type="date" value={leadForm.expectedCloseDate} onChange={e => setLeadForm({ ...leadForm, expectedCloseDate: e.target.value })} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Pipeline Stage</label>
                      <select value={leadForm.stage} onChange={e => setLeadForm({ ...leadForm, stage: e.target.value })} style={inputStyle}>
                        {STAGES.map(s => <option key={s} value={s}>{STAGE_CONFIG[s].icon} {s}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Priority</label>
                      <select value={leadForm.priority} onChange={e => setLeadForm({ ...leadForm, priority: e.target.value })} style={inputStyle}>
                        <option>High</option><option>Medium</option><option>Low</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Win Probability (%)</label>
                      <input type="range" min="0" max="100" step="5" value={leadForm.probability} onChange={e => setLeadForm({ ...leadForm, probability: e.target.value })} style={{ width: '100%', accentColor: '#6366f1' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}><span>0%</span><span style={{ fontWeight: 900, color: '#6366f1', fontSize: '1rem' }}>{leadForm.probability}%</span><span>100%</span></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Expected Revenue (Auto-calculated)</label>
                      <input type="text" readOnly value={fmt(calculatedExpectedRevenue)} style={{ ...inputStyle, background: 'var(--bg-tertiary)', fontWeight: 800, color: '#22c55e' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Opportunity Status</label>
                      <select value={leadForm.opportunityStatus} onChange={e => setLeadForm({ ...leadForm, opportunityStatus: e.target.value })} style={inputStyle}>
                        <option>New</option><option>Qualified</option><option>Proposal Sent</option><option>Negotiation</option><option>Won</option><option>Lost</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Assignment */}
              {modalStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 800 }}>👤 Step 4: Assignment Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Sales Executive (from Settings / Employees) *</label>
                      <select value={leadForm.assignee} onChange={e => handleAssigneeChange(e.target.value)} style={inputStyle}>
                        <option value="">— Select Employee —</option>
                        {dbEmployees.map(emp => { const n = emp.fullNameEnglish || emp.name; return <option key={emp.employeeCode || emp.id} value={n}>{n} ({emp.designation || 'Staff'})</option>; })}
                      </select>
                    </div>
                    {[
                      { label: 'Sales Team (Auto-loaded)', key: 'assignTeam' },
                      { label: 'Manager (Auto-loaded)', key: 'assignManager' },
                      { label: 'Department (Auto-loaded)', key: 'department' },
                      { label: 'Branch', key: 'branch' },
                      { label: 'Sales Territory', key: 'salesTerritory' },
                    ].map(f => (
                      <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</label>
                        <input type="text" value={leadForm[f.key] || ''} onChange={e => setLeadForm({ ...leadForm, [f.key]: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Task Due Date</label>
                      <input type="date" value={leadForm.dueDate} onChange={e => setLeadForm({ ...leadForm, dueDate: e.target.value })} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>First Meeting Date (Optional)</label>
                      <input type="date" value={leadForm.meetingDate} onChange={e => setLeadForm({ ...leadForm, meetingDate: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Follow-up */}
              {modalStep === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 800 }}>📅 Step 5: Follow-up Schedule</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Next Follow-up Date</label>
                      <input type="date" value={leadForm.nextFollowupDate} onChange={e => setLeadForm({ ...leadForm, nextFollowupDate: e.target.value })} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Follow-up Time</label>
                      <input type="text" placeholder="e.g. 11:00 AM" value={leadForm.followupTime} onChange={e => setLeadForm({ ...leadForm, followupTime: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Communication Method</label>
                      <select value={leadForm.commMethod} onChange={e => setLeadForm({ ...leadForm, commMethod: e.target.value })} style={inputStyle}>
                        {['Phone','WhatsApp','Email','Zoom','Google Meet','Physical Meeting','Teams'].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <input type="checkbox" id="rem" checked={leadForm.reminder} onChange={e => setLeadForm({ ...leadForm, reminder: e.target.checked })} style={{ cursor: 'pointer' }} />
                      <label htmlFor="rem" style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}>Enable Reminder Alert</label>
                    </div>
                    {leadForm.reminder && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Reminder Time</label>
                        <input type="text" placeholder="e.g. 10:00 AM (1 hour before)" value={leadForm.reminderTime} onChange={e => setLeadForm({ ...leadForm, reminderTime: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: Requirements */}
              {modalStep === 6 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 800 }}>📋 Step 6: Client Requirements & Context</h4>
                  {[
                    { label: 'Client Requirements', key: 'clientRequirements', placeholder: 'Features, scope, scale needed...' },
                    { label: 'Business Challenges', key: 'businessChallenges', placeholder: 'What bottleneck are they solving?' },
                    { label: 'Pain Points', key: 'painPoints', placeholder: 'e.g. Slow billing, manual spreadsheets...' },
                    { label: 'Expected Features', key: 'expectedFeatures', placeholder: 'e.g. Custom dashboards, multi-currency...' },
                    { label: 'Competitor / Alternative', key: 'competitorName', placeholder: 'Other solutions they are evaluating...' },
                    { label: 'Special Instructions', key: 'specialInstructions', placeholder: 'Delivery deadlines, regulatory notes...' },
                  ].map(f => (
                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</label>
                      <textarea placeholder={f.placeholder} value={leadForm[f.key] || ''} onChange={e => setLeadForm({ ...leadForm, [f.key]: e.target.value })} style={{ ...inputStyle, height: 60, resize: 'none' }} onFocus={onFocus} onBlur={onBlurInput} />
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 7: Attachments */}
              {modalStep === 7 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 800 }}>📎 Step 7: Attachments</h4>
                  <div onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}
                    onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.onchange = e => { const fs = e.target.files; if (fs) { const l = [...mockFiles]; for (let i = 0; i < fs.length; i++) l.push({ name: fs[i].name, size: fs[i].size }); setMockFiles(l); } }; inp.click(); }}
                    style={{ border: '2px dashed var(--border-color)', borderRadius: '16px', padding: '2.5rem 1rem', textAlign: 'center', background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 4 }}>Drag & Drop or Click to Upload</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PDF, Proposals, RFQ Sheets, Quotations, Slides (Max 25MB)</div>
                  </div>
                  {mockFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Queued ({mockFiles.length}):</span>
                      {mockFiles.map((f, i) => (
                        <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '0.45rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>📄 {f.name}</span>
                          <button onClick={e => { e.stopPropagation(); setMockFiles(l => l.filter((_, idx) => idx !== i)); }} style={{ border: 'none', background: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.74rem' }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 8: Review & Save */}
              {modalStep === 8 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 800 }}>🔍 Step 8: Review & Confirm</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Internal Notes / Remarks</label>
                      <textarea placeholder="e.g. Hot lead, needs priority follow-up..." value={leadForm.internalNotes || ''} onChange={e => setLeadForm({ ...leadForm, internalNotes: e.target.value })} style={{ ...inputStyle, height: 48, resize: 'none' }} onFocus={onFocus} onBlur={onBlurInput} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tags</label>
                      <input type="text" placeholder="e.g. enterprise, cloud, priority" value={leadForm.tags || ''} onChange={e => setLeadForm({ ...leadForm, tags: e.target.value })} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Risk Level</label>
                      <select value={leadForm.riskLevel} onChange={e => setLeadForm({ ...leadForm, riskLevel: e.target.value })} style={inputStyle}>
                        <option value="High">🔴 High Risk</option><option value="Medium">🟡 Medium Risk</option><option value="Low">🟢 Low Risk</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {[
                        { title: 'Product / Service', body: `[${leadForm.catalogType}] ${leadForm.serviceCategory} → ${leadForm.subService} (Qty: ${leadForm.qty || 1})` },
                        { title: 'Client & Location', body: `${leadForm.company || '—'} · ${leadForm.contactPerson || '—'} · ${leadForm.district || 'Dhaka'}` },
                        { title: 'Assignment & Follow-up', body: `${leadForm.assignee || 'Unassigned'} (${leadForm.department}) · Next: ${safeDate(leadForm.nextFollowupDate)} ${leadForm.followupTime}` },
                      ].map(s => (
                        <div key={s.title} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>{s.title}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{s.body}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ width: 220, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deal Summary</div>
                      <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Deal Value</div><div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-color)' }}>{fmt(leadForm.value)}</div></div>
                      <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Win Probability</div><div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{leadForm.probability}%</div></div>
                      <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Expected Revenue</div><div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#22c55e' }}>{fmt(calculatedExpectedRevenue)}</div></div>
                      <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Stage</div><div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{STAGE_CONFIG[leadForm.stage]?.icon} {leadForm.stage}</div></div>
                      <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Priority</div><div style={{ fontSize: '0.8rem', fontWeight: 800, color: PRIORITY_CONFIG[leadForm.priority]?.color }}>{leadForm.priority}</div></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div style={{ flexShrink: 0, padding: '1.1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderRadius: '0 0 24px 24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} style={{ borderRadius: 10 }}>Cancel</button>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {modalStep > 1 && <button type="button" className="btn btn-secondary" onClick={() => setModalStep(s => s - 1)} style={{ borderRadius: 10 }}>← Back</button>}
                {modalStep < 8
                  ? <button type="button" className="btn btn-primary" onClick={() => setModalStep(s => s + 1)} style={{ borderRadius: 10 }}>Next Step →</button>
                  : (
                    <>
                      <button type="button" className="btn btn-secondary" onClick={() => { crmService.saveLead({ ...leadForm, stage: 'Lead' }); setShowAddModal(false); resetForm(); loadCRMData(); }} style={{ borderRadius: 10 }}>💾 Save Draft</button>
                      <button type="button" className="btn btn-primary" onClick={handleSaveLead} style={{ borderRadius: 10 }}>✅ Save Opportunity</button>
                      <button type="button" className="btn btn-primary" onClick={handleSaveAndFollowup} style={{ borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>📅 Save & Schedule</button>
                    </>
                  )
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ CONVERT TO CUSTOMER MODAL ═══════════════════════ */}
      {showConvertModal && (
        <div className="modal-overlay" onClick={() => setShowConvertModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, borderRadius: '20px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ color: '#fff' }}>🏢 Convert to ERP Customer</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)' }}>Register as a verified customer profile in ACCOUNTICA ERP</p>
              </div>
              <button className="modal-close" onClick={() => setShowConvertModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleConfirmConversion} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Customer Code *', key: 'code', placeholder: 'e.g. CST-001' },
                  { label: 'Company Name *', key: 'name', placeholder: 'e.g. Beximco Ltd.' },
                  { label: 'Contact Person', key: 'contact', placeholder: 'Name' },
                  { label: 'Phone', key: 'phone', placeholder: 'e.g. 01711...' },
                  { label: 'Email', key: 'email', placeholder: 'info@company.com', type: 'email' },
                  { label: 'Address', key: 'address', placeholder: 'Dhaka, Bangladesh' },
                  { label: 'Credit Limit (BDT)', key: 'creditLimit', placeholder: '1000000', type: 'number' },
                  { label: 'Payment Terms (Days)', key: 'paymentTermDays', placeholder: '30', type: 'number' },
                  { label: 'VAT Reg. No.', key: 'vatNo', placeholder: 'Optional' },
                  { label: 'TIN Number', key: 'tin', placeholder: 'Optional' },
                ].map(f => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</label>
                    <input type={f.type || 'text'} value={convertForm[f.key] || ''} onChange={e => setConvertForm({ ...convertForm, [f.key]: e.target.value })} placeholder={f.placeholder} style={inputStyle} onFocus={onFocus} onBlur={onBlurInput} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowConvertModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none' }}>✅ Confirm & Register Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
