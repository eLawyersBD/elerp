import { useState, useMemo, useEffect, useRef } from 'react';
import { serviceModuleService } from '../services/serviceModuleService';
import { salesService } from '../services/salesService';
import { auditService } from '../services/auditService';

function ServiceView({ currentUser, products, customers, onRefresh }) {
  const [viewTab, setViewTab] = useState('dashboard'); // dashboard | tickets | assets | amc | customer360 | mobile | scheduler | qr
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Timeline & Detail Sidebar Panel
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isAddContractOpen, setIsAddContractOpen] = useState(false);
  const [timelineNote, setTimelineNote] = useState('');

  // Ticket Form States
  const [isRaiseTicketOpen, setIsRaiseTicketOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [serviceType, setServiceType] = useState('warranty_claim');
  const [technicianId, setTechnicianId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [problemDesc, setProblemDesc] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [selectedSlaHours, setSelectedSlaHours] = useState(null);

  // Asset Form States
  const [newAsset, setNewAsset] = useState({
    serialNo: '', productId: '', customerId: '', purchaseDate: '', warrantyExpiry: '',
    installationDate: '', modelConfig: '', firmwareVersion: '', softwareLicense: '', gpsCoordinates: '23.8103, 90.4125'
  });

  // AMC Form States
  const [newContract, setNewContract] = useState({
    customerId: '', machineId: '', startDate: '', endDate: '', visitSchedule: 'Quarterly', freeVisitsIncluded: 4
  });

  // Customer 360 State
  const [c360CustomerId, setC360CustomerId] = useState('');

  // Mobile Emulator States
  const [mobileTechId, setMobileTechId] = useState('tech-2');
  const [mobileTicketId, setMobileTicketId] = useState('');
  const [mobileGps, setMobileGps] = useState('');
  const [mobilePhoto, setMobilePhoto] = useState(null);
  const [mobileDiagnosis, setMobileDiagnosis] = useState('');
  const [mobileSpares, setMobileSpares] = useState([]); // { productId, qty, unitPrice }
  const sigCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // QR States
  const [qrAssetId, setQrAssetId] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadAllData = async () => {
    serviceModuleService.initLocalDB();
    setTickets(serviceModuleService.getTickets());
    setAssets(serviceModuleService.getAssets());
    setContracts(serviceModuleService.getContracts());
    const cat = await serviceModuleService.getServiceCatalog();
    setCatalog(cat || []);
    setTechnicians(serviceModuleService.getTechnicians());
    setEstimates(serviceModuleService.getEstimates());
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Run PM Scheduler check on load
  useEffect(() => {
    const triggerPM = async () => {
      const createdCount = await serviceModuleService.runPreventiveMaintenanceScheduler(currentUser);
      if (createdCount > 0) {
        showToast(`Preventive Maintenance: ${createdCount} routine tickets generated automatically!`, 'warning');
        loadAllData();
      }
    };
    triggerPM();
  }, []);

  const fmt = (val) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(val);

  // SLA Time Remaining check
  const getSLADetails = (ticket) => {
    if (ticket.status === 'closed' || ticket.status === 'completed') {
      return { text: 'Resolved', expired: false, color: '#10b981' };
    }
    const now = new Date();
    const deadline = ticket.slaDeadline ? new Date(ticket.slaDeadline) : new Date(now.getTime() + 24 * 3600000);
    const diffMs = deadline - now;
    if (isNaN(diffMs) || diffMs <= 0) {
      return { text: 'Expired', expired: true, color: '#ef4444' };
    }
    const diffHours = Math.ceil(diffMs / 3600000);
    return { text: `${diffHours} Hours Left`, expired: false, color: diffHours <= 4 ? '#f59e0b' : '#3b82f6' };
  };

  // Raise ticket submission
  const handleRaiseTicket = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedAssetId) {
      showToast('Customer and Asset must be selected.', 'danger');
      return;
    }

    const asset = assets.find(a => a.id === selectedAssetId);
    const customer = customers.find(c => c.id === selectedCustomerId);
    
    const isWarrantyActive = asset?.warrantyExpiry && new Date(asset.warrantyExpiry) >= new Date();

    const ticket = {
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Customer',
      productId: asset?.productId || '',
      productName: asset?.productName || '',
      assetId: selectedAssetId,
      serialNo: asset?.serialNo || '',
      invoiceNo: asset?.invoiceNo || '',
      serviceType,
      warrantyStatus: isWarrantyActive ? 'active' : 'expired',
      problemDescription: problemDesc,
      technicianId,
      status: 'open',
      priority,
      serviceFee: Number(serviceFee || 0),
      slaHours: selectedSlaHours !== null ? selectedSlaHours : undefined,
      sparesUsed: []
    };

    await serviceModuleService.saveTicket(ticket, currentUser);
    showToast('Service ticket created successfully.');
    setSelectedCustomerId('');
    setSelectedAssetId('');
    setProblemDesc('');
    setServiceFee('');
    setSelectedSlaHours(null);
    setIsRaiseTicketOpen(false);
    loadAllData();
    setViewTab('tickets');
  };

  // Asset creation
  const handleCreateAsset = (e) => {
    e.preventDefault();
    const prod = products.find(p => p.id === newAsset.productId);
    const customer = customers.find(c => c.id === newAsset.customerId);
    
    const asset = {
      ...newAsset,
      productName: prod?.name || '',
      customerName: customer?.name || '',
      healthScore: 100,
      serviceHistory: [],
      partsChanged: [],
      attachments: []
    };

    serviceModuleService.saveAsset(asset);
    showToast('Asset registered in FSM registry.');
    setNewAsset({
      serialNo: '', productId: '', customerId: '', purchaseDate: '', warrantyExpiry: '',
      installationDate: '', modelConfig: '', firmwareVersion: '', softwareLicense: '', gpsCoordinates: '23.8103, 90.4125'
    });
    loadAllData();
  };

  // AMC contract creation
  const handleCreateContract = (e) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === newContract.customerId);
    const asset = assets.find(a => a.id === newContract.machineId);

    const contract = {
      ...newContract,
      customerName: customer?.name || '',
      machineName: asset?.productName || '',
      visitsUsed: 0,
      status: 'active',
      nextVisitDate: newContract.startDate
    };

    serviceModuleService.saveContract(contract);
    showToast('AMC contract registered and active.');
    setNewContract({ customerId: '', machineId: '', startDate: '', endDate: '', visitSchedule: 'Quarterly', freeVisitsIncluded: 4 });
    loadAllData();
  };

  // Add timeline stage
  const handleAddTimelineStage = async (ticketId, stage) => {
    if (!timelineNote.trim()) {
      showToast('Please enter a note for this transition.', 'warning');
      return;
    }
    const updated = await serviceModuleService.pushTimelineStage(ticketId, stage, timelineNote, currentUser);
    if (updated) {
      showToast(`Advanced timeline to: ${stage}`);
      setSelectedTicket(updated);
      setTimelineNote('');
      loadAllData();
    }
  };

  // Signature canvas handlers
  const startDrawing = (e) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    // Support mouse/touch
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Submit Mobile Flow
  const handleMobileSubmit = async (e) => {
    e.preventDefault();
    if (!mobileTicketId) return;

    const ticket = tickets.find(t => t.id === mobileTicketId);
    if (!ticket) return;

    const canvas = sigCanvasRef.current;
    const signatureData = canvas ? canvas.toDataURL() : '';

    setLoading(true);
    try {
      // 1. Advance states in ticket
      ticket.gpsCheckIn = mobileGps || '23.8103, 90.4125';
      ticket.customerSignature = signatureData;
      ticket.sparesUsed = mobileSpares;
      ticket.serviceFee = Number(ticket.serviceFee || 0);
      ticket.problemDescription = ticket.problemDescription + `\n\n[Tech Diagnosis]: ${mobileDiagnosis}`;
      
      // Update ticket status
      ticket.status = 'completed';
      ticket.completedAt = new Date().toISOString();
      if (!ticket.timeline.some(t => t.stage === 'Completed')) {
        ticket.timeline.push({ stage: 'Completed', date: new Date().toISOString(), note: 'Technician logged signature and checks via mobile.' });
      }

      await serviceModuleService.saveTicket(ticket, currentUser);

      // 2. Generate double entry accounting entries
      const billingRes = await serviceModuleService.generateServiceBill(mobileTicketId, 'receivable', currentUser);

      if (billingRes.success) {
        showToast(`Mobile Flow Complete! Invoice ${billingRes.billNo} posted.`, 'success');
        setMobileTicketId('');
        setMobileDiagnosis('');
        setMobileSpares([]);
        setMobileGps('');
        clearSignature();
        loadAllData();
        setViewTab('tickets');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Auto detect GPS coordinates
  const triggerGPSCheckIn = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMobileGps(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          showToast('GPS coordinates loaded from browser.');
        },
        () => {
          setMobileGps('23.7925, 90.4078'); // Gulshan 2 mock
          showToast('Mock GPS coordinates applied.', 'warning');
        }
      );
    } else {
      setMobileGps('23.7925, 90.4078');
    }
  };

  // Stats computed
  const fsmStats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length;
    const progress = tickets.filter(t => t.status === 'in_progress' || t.status === 'waiting_parts').length;
    const completed = tickets.filter(t => t.status === 'completed' || t.status === 'closed').length;
    const activeAMC = contracts.filter(c => c.status === 'active').length;
    
    // Compute revenue from billed completed tickets this month
    const rev = tickets.filter(t => t.billingStatus === 'billed').reduce((sum, t) => sum + (t.billAmount || 0), 0);
    const satisfaction = 96; // Simulated average CSAT
    const resolutionHours = 18; // Simulated average resolution hours

    return { open, progress, completed, activeAMC, rev, satisfaction, resolutionHours };
  }, [tickets, contracts]);

  // Filtered tickets list
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch =
        (t.ticketNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.serialNo || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !statusFilter || t.status === statusFilter;
      const matchPriority = !priorityFilter || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  // Customer 360 Data Compute
  const customer360Data = useMemo(() => {
    if (!c360CustomerId) return null;
    const cust = customers.find(c => c.id === c360CustomerId);
    const custAssets = assets.filter(a => a.customerId === c360CustomerId);
    const custTickets = tickets.filter(t => t.customerId === c360CustomerId);
    const amcs = contracts.filter(c => c.customerId === c360CustomerId);
    
    const outstanding = cust?.currentBalance || 0;
    const serviceCost = custTickets.reduce((sum, t) => sum + (t.billAmount || 0), 0);

    return {
      cust,
      assets: custAssets,
      tickets: custTickets,
      amcs,
      outstanding,
      serviceCost
    };
  }, [c360CustomerId, customers, assets, tickets, contracts]);

  // Map Dispatch coordinates listings
  const dispatchList = useMemo(() => {
    return [
      { name: 'Sultana Razia (Specialist)', coords: 'Gulshan (23.7925, 90.4078)', status: 'Active Site' },
      { name: 'Kamrul Islam (Engineer)', coords: 'Tejgaon (23.7612, 90.3981)', status: 'Travelling' },
      { name: 'Mahbub Alam (Tech)', coords: 'Uttara (23.8759, 90.3795)', status: 'Idle' }
    ];
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'inherit' }}>
      
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
          padding: '0.85rem 1.5rem', borderRadius: 12, color: '#fff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          background: toastType === 'danger' ? '#ef4444' : (toastType === 'warning' ? '#f59e0b' : '#10b981'),
          fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>{toastType === 'danger' ? '✕' : (toastType === 'warning' ? '⚠️' : '✓')}</span>
          {toastMessage}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        borderRadius: 24,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
        padding: '1.75rem 2.25rem 1.5rem',
        boxShadow: '0 12px 35px -5px rgba(30,27,75,0.3)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.45rem', letterSpacing: '-0.4px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Field Service Management (FSM) Suite</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.8, fontWeight: 500 }}>Calibrations, AMCs, Work Orders, Asset Cards, and SLA Control Center.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, opacity: 0.7, textTransform: 'uppercase' }}>FSM Operations</div>
              <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#10b981' }}>SAP PM Engine</div>
            </div>
            <div style={{ fontSize: '1.5rem' }}>⚙️</div>
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="scrollable-tab-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-tertiary)', borderRadius: 12, padding: '0.3rem', border: '1px solid var(--border-color)', width: 'fit-content' }}>
          <button style={{ padding: '0.6rem 1.35rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: viewTab === 'dashboard' ? 700 : 600, background: viewTab === 'dashboard' ? 'var(--accent-color)' : 'transparent', color: viewTab === 'dashboard' ? '#fff' : 'var(--text-muted)' }} onClick={() => setViewTab('dashboard')}>📊 Dashboard</button>
          <button style={{ padding: '0.6rem 1.35rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: viewTab === 'tickets' ? 700 : 600, background: viewTab === 'tickets' ? 'var(--accent-color)' : 'transparent', color: viewTab === 'tickets' ? '#fff' : 'var(--text-muted)' }} onClick={() => setViewTab('tickets')}>🛠️ Tickets & SLA</button>
          <button style={{ padding: '0.6rem 1.35rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: viewTab === 'assets' ? 700 : 600, background: viewTab === 'assets' ? 'var(--accent-color)' : 'transparent', color: viewTab === 'assets' ? '#fff' : 'var(--text-muted)' }} onClick={() => setViewTab('assets')}>📦 Asset Cards</button>
          <button style={{ padding: '0.6rem 1.35rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: viewTab === 'amc' ? 700 : 600, background: viewTab === 'amc' ? 'var(--accent-color)' : 'transparent', color: viewTab === 'amc' ? '#fff' : 'var(--text-muted)' }} onClick={() => setViewTab('amc')}>📜 AMC Contracts</button>
          <button style={{ padding: '0.6rem 1.35rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: viewTab === 'customer360' ? 700 : 600, background: viewTab === 'customer360' ? 'var(--accent-color)' : 'transparent', color: viewTab === 'customer360' ? '#fff' : 'var(--text-muted)' }} onClick={() => setViewTab('customer360')}>🤝 Customer 360</button>
          <button style={{ padding: '0.6rem 1.35rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: viewTab === 'mobile' ? 700 : 600, background: viewTab === 'mobile' ? 'var(--accent-color)' : 'transparent', color: viewTab === 'mobile' ? '#fff' : 'var(--text-muted)' }} onClick={() => setViewTab('mobile')}>📱 Mobile Workflow</button>
          <button style={{ padding: '0.6rem 1.35rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: viewTab === 'scheduler' ? 700 : 600, background: viewTab === 'scheduler' ? 'var(--accent-color)' : 'transparent', color: viewTab === 'scheduler' ? '#fff' : 'var(--text-muted)' }} onClick={() => setViewTab('scheduler')}>🗺️ Dispatch Map & Calendar</button>
          <button style={{ padding: '0.6rem 1.35rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: viewTab === 'qr' ? 700 : 600, background: viewTab === 'qr' ? 'var(--accent-color)' : 'transparent', color: viewTab === 'qr' ? '#fff' : 'var(--text-muted)' }} onClick={() => setViewTab('qr')}>🏷️ QR Scan Simulator</button>
        </div>
      </div>

      {/* ── TAB 1: EXECUTIVE ANALYTICS DASHBOARD ── */}
      {viewTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Widget Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Open Work Orders', val: fsmStats.open, color: '#f59e0b', desc: 'Critical SLA checks active', icon: '🚨' },
              { label: 'Active AMC Contracts', val: fsmStats.activeAMC, color: '#a855f7', desc: 'Installed equipment checks', icon: '📜' },
              { label: 'Jobs In Progress', val: fsmStats.progress, color: '#3b82f6', desc: 'Technicians on route/onsite', icon: '⚡' },
              { label: 'Average Resolution', val: `${fsmStats.resolutionHours} Hours`, color: '#ec4899', desc: 'Target SLA benchmark: 24h', icon: '🕐' },
              { label: 'CSAT (Satisfaction)', val: `${fsmStats.satisfaction}%`, color: '#10b981', desc: 'Client post-visit review', icon: '⭐' },
              { label: 'Revenue This Month', val: fmt(fsmStats.rev), color: '#16a34a', desc: 'Paid spare parts + service bills', icon: '💰' }
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 4, borderTop: `4px solid ${k.color}`, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{k.label}</span>
                  <span style={{ fontSize: '1.25rem' }}>{k.icon}</span>
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: k.color, margin: '4px 0' }}>{k.val}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{k.desc}</div>
              </div>
            ))}
          </div>

          {/* Quick links & PM warnings */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>🔔 Active SLA Compliance Alerts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tickets.filter(t => t.status !== 'closed' && t.status !== 'completed').map(t => {
                  const sla = getSLADetails(t);
                  return (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 10, border: `1.5px solid ${t.priority === 'critical' ? '#ef4444' : '#border-color'}30` }}>
                      <div>
                        <span className="sku-badge" style={{ marginRight: 6 }}>{t.ticketNo}</span>
                        <strong style={{ fontSize: '0.88rem' }}>{t.customerName}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{t.productName} (S/N: {t.serialNo})</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: sla.color }}>🕒 {sla.text}</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: t.priority === 'critical' ? '#ef4444' : '#a855f7' }}>{t.priority}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(37,99,235,0.02) 0%, rgba(99,102,241,0.04) 100%)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.85rem 0' }}>🛠️ Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setIsRaiseTicketOpen(true)}>Raise New Complaint</button>
                <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setViewTab('amc')}>Register AMC Contract</button>
                <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setViewTab('mobile')}>Simulate Technician Signoff</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── TAB 2: TICKET DESK & SLA CONTROL ── */}
      {viewTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Filter bar */}
            <div className="card" style={{ padding: '1.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="Search ticket #, customer, or serial..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input" style={{ flex: 1, minWidth: 200 }} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select-filter">
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_parts">Waiting Parts</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="select-filter">
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedCustomerId('');
                  setSelectedAssetId('');
                  setProblemDesc('');
                  setServiceFee('');
                  setSelectedSlaHours(null);
                  setIsRaiseTicketOpen(true);
                }}
                style={{ marginLeft: 'auto' }}
              >
                ➕ Raise Complaint
              </button>
            </div>

            {/* Tickets Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket No</th>
                    <th>Customer</th>
                    <th>Product / Model</th>
                    <th>Priority</th>
                    <th>SLA Remaining</th>
                    <th>Timeline Stage</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(t => {
                    const sla = getSLADetails(t);
                    const priorityEmoji = t.priority === 'critical' ? '🔴 Critical' : (t.priority === 'high' ? '🟠 High' : (t.priority === 'medium' ? '🟡 Medium' : '🟢 Low'));
                    const stages = t.timeline || [];
                    const currentStage = stages.length > 0 ? stages[stages.length - 1].stage : 'Raised';
                    
                    return (
                      <tr key={t.id} onClick={() => setSelectedTicket(t)} style={{ cursor: 'pointer', background: selectedTicket?.id === t.id ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                        <td style={{ fontWeight: 800 }}><span className="sku-badge">{t.ticketNo}</span></td>
                        <td style={{ fontWeight: 600 }}>{t.customerName}</td>
                        <td>
                          <div>{t.productName}</div>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>S/N: {t.serialNo}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{priorityEmoji}</td>
                        <td style={{ fontWeight: 800, color: sla.color }}>{sla.text}</td>
                        <td><span style={{ fontSize: '0.72rem', background: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: 8 }}>{currentStage}</span></td>
                        <td>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                            color: t.status === 'closed' ? '#10b981' : (t.status === 'open' ? '#f59e0b' : '#3b82f6'),
                            background: t.status === 'closed' ? 'rgba(16,185,129,0.1)' : (t.status === 'open' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)')
                          }}>{t.status.toUpperCase()}</span>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{t.billingStatus === 'billed' ? `৳ ${t.billAmount}` : 'Unbilled'}</td>
                        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTicket(t)}>Timeline</button>
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

      {/* ── TAB 3: ASSET CARDS / SAP PM EQUIPMENT CARD ── */}
      {viewTab === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Search Assets */}
          <div className="card" style={{ padding: '1.2rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search equipment by serial #, product SKU, or customer name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input" style={{ flex: 1, minWidth: 200 }} />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddAssetOpen(true)}
              style={{ marginLeft: 'auto' }}
            >
              ➕ Register Asset
            </button>
          </div>

            {/* Assets Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial / Batch Code</th>
                    <th>Product Name</th>
                    <th>Customer Name</th>
                    <th>Purchased Date</th>
                    <th>Warranty Expiry</th>
                    <th>Firmware Version</th>
                    <th>GPS Coordinates</th>
                    <th>Health Score</th>
                    <th style={{ textAlign: 'center' }}>History &amp; Parts</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.filter(a => (a.serialNo || '').toLowerCase().includes(searchTerm.toLowerCase()) || (a.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (a.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())).map(a => {
                    const isWarrantyExpired = new Date(a.warrantyExpiry) < new Date();
                    return (
                      <tr key={a.id} onClick={() => setSelectedAsset(a)} style={{ cursor: 'pointer', background: selectedAsset?.id === a.id ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                        <td>
                          <span className="sku-badge">{a.serialNo}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{a.productName}</td>
                        <td style={{ fontWeight: 600 }}>{a.customerName}</td>
                        <td>{a.purchaseDate}</td>
                        <td style={{ color: isWarrantyExpired ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                          {a.warrantyExpiry} {isWarrantyExpired ? '(Expired)' : '(Active)'}
                        </td>
                        <td><span style={{ fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>{a.firmwareVersion}</span></td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {a.gpsCoordinates}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 60, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${a.healthScore}%`, height: '100%', background: a.healthScore > 80 ? '#10b981' : (a.healthScore > 50 ? '#f59e0b' : '#ef4444') }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: a.healthScore > 80 ? '#10b981' : (a.healthScore > 50 ? '#f59e0b' : '#ef4444') }}>{a.healthScore}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            🛠️ {a.serviceHistory?.length || 0} visits · ⚙️ {a.partsChanged?.length || 0} parts
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* ── TAB 4: AMC CONTRACTS & PM SCHEDULER ── */}
      {viewTab === 'amc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="card" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Automate quarterly/annual maintenance visits. Tickets are spawned when due dates trigger.</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button className="btn btn-secondary btn-sm" onClick={async () => {
                const count = await serviceModuleService.runPreventiveMaintenanceScheduler(currentUser);
                showToast(`Force check run! ${count} routine PM tickets created.`, 'info');
                loadAllData();
              }}>🔄 Run PM Scheduler Check</button>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddContractOpen(true)}>
                ➕ Register AMC
              </button>
            </div>
          </div>

            {/* Contracts List */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contract No</th>
                    <th>Customer Name</th>
                    <th>Equipment Details</th>
                    <th>Schedule</th>
                    <th>Free Visits</th>
                    <th>Used Visits</th>
                    <th>Next Visit Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id} onClick={() => setSelectedContract(c)} style={{ cursor: 'pointer', background: selectedContract?.id === c.id ? 'rgba(37,99,235,0.04)' : 'transparent' }}>
                      <td style={{ fontWeight: 800 }}><span className="sku-badge">{c.contractNo}</span></td>
                      <td style={{ fontWeight: 600 }}>{c.customerName}</td>
                      <td>{c.machineName}</td>
                      <td>{c.visitSchedule}</td>
                      <td style={{ textAlign: 'center' }}>{c.freeVisitsIncluded}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--accent-color)' }}>{c.visitsUsed}</td>
                      <td style={{ fontWeight: 700, color: '#f59e0b' }}>{c.nextVisitDate}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* ── TAB 5: CUSTOMER 360° PORTAL ── */}
      {viewTab === 'customer360' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Customer selector card */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>Select Customer Profile:</span>
            <select
              className="form-control" style={{ maxWidth: '300px', margin: 0 }}
              value={c360CustomerId}
              onChange={e => setC360CustomerId(e.target.value)}
            >
              <option value="">— Select Customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {customer360Data ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', alignItems: 'flex-start' }}>
              {/* Left Customer Info Card */}
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{customer360Data.cust.name}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div>📞 Phone: <strong>{customer360Data.cust.phone}</strong></div>
                  <div>✉️ Email: <strong>{customer360Data.cust.email}</strong></div>
                  <div>📍 Address: <strong>{customer360Data.cust.address}</strong></div>
                  <div>🏷️ VAT BIN: <strong>{customer360Data.cust.vatNo || 'Not registered'}</strong></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Outstanding Balance:</span>
                    <strong style={{ color: '#ef4444' }}>{fmt(customer360Data.outstanding)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Accumulated Service Cost:</span>
                    <strong style={{ color: 'var(--accent-color)' }}>{fmt(customer360Data.serviceCost)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Active Machinery Count:</span>
                    <strong>{customer360Data.assets.length} Units</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Support Tickets Raised:</span>
                    <strong>{customer360Data.tickets.length} complaints</strong>
                  </div>
                </div>
              </div>

              {/* Right: Machines, Tickets list tabs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Installed Machines Grid */}
                <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.92rem', fontWeight: 800 }}>📦 Active Installed Machinery</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {customer360Data.assets.map(a => (
                      <div key={a.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{a.productName}</div>
                        <div>S/N: <span style={{ fontFamily: 'monospace' }}>{a.serialNo}</span></div>
                        <div style={{ color: new Date(a.warrantyExpiry) >= new Date() ? '#10b981' : '#ef4444', marginTop: 2 }}>🛡️ Warranty: {a.warrantyExpiry}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complaint Tickets List */}
                <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.92rem', fontWeight: 800 }}>🛠️ Claim & Service Incident History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {customer360Data.tickets.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.78rem' }}>
                        <div>
                          <span className="sku-badge" style={{ marginRight: 6 }}>{t.ticketNo}</span>
                          <strong>{t.productName}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8 }}>{t.createdAt.substring(0, 10)}</span>
                        </div>
                        <span style={{
                          fontWeight: 800, padding: '3px 8px', borderRadius: 8, fontSize: '0.68rem',
                          color: t.status === 'closed' ? '#10b981' : '#f59e0b',
                          background: t.status === 'closed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'
                        }}>{t.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
              Select a customer to view their complete 360° asset history and claim ledger profiles.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 6: TECHNICIAN MOBILE WORKFLOW EMULATOR ── */}
      {viewTab === 'mobile' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          
          {/* Mobile phone outer frame mockup */}
          <div style={{
            width: '375px', height: '680px', borderRadius: '40px',
            border: '12px solid #0f172a', background: 'var(--bg-primary)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
          }}>
            {/* Speaker & camera top bar mock */}
            <div style={{ height: '24px', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: '#334155' }} />
            </div>

            {/* Mobile Header */}
            <div style={{ padding: '0.75rem 1rem', background: '#1e1b4b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.88rem' }}>📱 Engineer App Portal</strong>
              <select
                value={mobileTechId} onChange={e => {
                  setMobileTechId(e.target.value);
                  setMobileTicketId('');
                }}
                style={{ padding: '2px 4px', fontSize: '0.72rem', borderRadius: 4, background: '#312e81', color: '#fff', border: 'none' }}
              >
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name.split(' ')[0]}</option>)}
              </select>
            </div>

            {/* Mobile Body Content */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', boxSizing: 'border-box' }}>
              
              {/* Select Mobile Job */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Select Active Job Allocation</label>
                <select
                  className="form-control" style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  value={mobileTicketId}
                  onChange={e => {
                    setMobileTicketId(e.target.value);
                    const tk = tickets.find(t => t.id === e.target.value);
                    if (tk) {
                      setMobileDiagnosis('');
                      setMobileSpares([]);
                    }
                  }}
                >
                  <option value="">— Choose Assigned Ticket —</option>
                  {tickets.filter(t => t.technicianId === mobileTechId && t.status !== 'closed' && t.status !== 'completed').map(t => (
                    <option key={t.id} value={t.id}>{t.ticketNo} - {t.customerName}</option>
                  ))}
                </select>
              </div>

              {mobileTicketId ? (
                <form onSubmit={handleMobileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Job card summary */}
                  {(() => {
                    const ticket = tickets.find(t => t.id === mobileTicketId);
                    return (
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '0.65rem', border: '1px solid var(--border-color)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                        <strong>Incident:</strong> {ticket?.problemDescription}<br />
                        <strong>Device:</strong> {ticket?.productName} (S/N: {ticket?.serialNo})<br />
                        <strong>Warranty Status:</strong> <span style={{ color: ticket?.warrantyStatus === 'active' ? '#10b981' : '#ef4444', fontWeight: 800 }}>{ticket?.warrantyStatus?.toUpperCase()}</span>
                      </div>
                    );
                  })()}

                  {/* Geolocation check-in */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '6px' }} onClick={triggerGPSCheckIn}>📍 GPS Check-in</button>
                    <input
                      type="text" required placeholder="GPS Coordinates" readOnly
                      className="form-control" style={{ flex: 1, padding: '5px', fontSize: '0.75rem', margin: 0 }}
                      value={mobileGps}
                    />
                  </div>

                  {/* Take Photos Mock */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Upload Fault Photo</label>
                    <input type="file" accept="image/*" onChange={e => { setMobilePhoto(e.target.files[0]?.name || 'photo.jpg'); showToast('Photo uploaded.'); }} style={{ fontSize: '0.72rem', width: '100%' }} />
                    {mobilePhoto && <span style={{ fontSize: '0.68rem', color: '#10b981' }}>✓ Loaded: {mobilePhoto}</span>}
                  </div>

                  {/* Log diagnosis notes */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Diagnostic Findings *</label>
                    <textarea required rows={2} style={{ fontSize: '0.78rem' }} placeholder="Detail problem diagnosis..." value={mobileDiagnosis} onChange={e => setMobileDiagnosis(e.target.value)} className="form-control" />
                  </div>

                  {/* Use spare parts dropdown */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Spare Parts Used</label>
                    <select
                      className="form-control" style={{ padding: '4px', fontSize: '0.78rem' }}
                      onChange={e => {
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) {
                          const existing = mobileSpares.find(s => s.productId === prod.id);
                          if (existing) {
                            setMobileSpares(mobileSpares.map(s => s.productId === prod.id ? { ...s, qty: s.qty + 1 } : s));
                          } else {
                            setMobileSpares([...mobileSpares, { productId: prod.id, productName: prod.name, qty: 1, unitPrice: prod.price }]);
                          }
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="">— Select Spare —</option>
                      {products.map(p => <option key={p.id} value={p.id} disabled={p.qty <= 0}>{p.name} (৳ {p.price})</option>)}
                    </select>
                    {/* Spares loaded preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                      {mobileSpares.map(s => (
                        <div key={s.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>
                          <span>{s.productName} (x{s.qty})</span>
                          <span style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => setMobileSpares(mobileSpares.filter(x => x.productId !== s.productId))}>✕</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Draw Digital Signature Canvas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Customer Sign-off Pad *</label>
                      <button type="button" onClick={clearSignature} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}>Clear</button>
                    </div>
                    <canvas
                      ref={sigCanvasRef}
                      width={320} height={100}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{ border: '2px dashed var(--accent-border)', background: '#fff', borderRadius: 8, cursor: 'crosshair', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    type="submit" disabled={loading}
                    style={{ width: '100%', padding: '0.5rem', background: '#1e1b4b', color: '#fff', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', marginTop: 4 }}
                  >
                    {loading ? 'Completing Work...' : '🚀 Complete Job & Signoff'}
                  </button>

                </form>
              ) : (
                <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '3rem 1rem' }}>
                  No active job selected. Choose a ticket to begin diagnostics and check-ins.
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* ── TAB 7: DISPATCH SCHEDULER & MAP VIEW ── */}
      {viewTab === 'scheduler' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
          
          {/* Outlook-style Calendar View */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>📅 FSM Scheduling Calendar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: '0.78rem' }}>
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ fontWeight: 800, color: 'var(--text-muted)', paddingBottom: 6 }}>{d}</div>
              ))}
              
              {/* Month dates */}
              {Array.from({ length: 35 }, (_, idx) => {
                const day = idx - 4; // Start offset
                const isCurrent = day >= 1 && day <= 30;
                
                // Fetch amc due or ticket due on this date
                const targetDate = `2026-07-${String(day).padStart(2, '0')}`;
                const amcTasks = contracts.filter(c => c.nextVisitDate === targetDate);
                const ticketTasks = tickets.filter(t => t.slaDeadline && t.slaDeadline.substring(0, 10) === targetDate);
                
                return (
                  <div key={idx} style={{
                    minHeight: '60px', border: '1px solid var(--border-color)', borderRadius: 6,
                    background: isCurrent ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                    opacity: isCurrent ? 1 : 0.4, padding: 4, display: 'flex', flexDirection: 'column', gap: 4
                  }}>
                    <span style={{ fontWeight: 800, fontSize: '0.72rem', alignSelf: 'flex-start' }}>{isCurrent ? day : ''}</span>
                    
                    {amcTasks.map(amc => (
                      <span key={amc.id} style={{ fontSize: '0.62rem', background: '#a855f7', color: '#fff', borderRadius: 4, padding: '1px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="AMC Visit">🛠️ AMC</span>
                    ))}
                    {ticketTasks.map(tk => (
                      <span key={tk.id} style={{ fontSize: '0.62rem', background: '#ef4444', color: '#fff', borderRadius: 4, padding: '1px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Service Ticket">🚨 Ticket</span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dhaka Dispatch Map View Mockup */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>🗺️ Dhaka Dispatch Map</h3>
            
            {/* Visual map placeholder */}
            <div style={{
              height: '240px', borderRadius: 14, border: '2px solid var(--border-color)',
              background: 'radial-gradient(circle, #e2e8f0 10%, #cbd5e1 90%)',
              position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
              {/* Map grid lines mock */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.15, background: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              
              {/* GPS coordinates pins */}
              <span style={{ position: 'absolute', top: '40%', left: '50%', fontSize: '1.5rem', cursor: 'pointer' }} title="Technician Sultana Razia">📍</span>
              <span style={{ position: 'absolute', top: '40%', left: '52%', fontSize: '0.65rem', background: '#3b82f6', color: '#fff', borderRadius: 4, padding: '2px' }}>Razia (Tech)</span>
              
              <span style={{ position: 'absolute', top: '30%', left: '20%', fontSize: '1.5rem', cursor: 'pointer' }} title="Technician Kamrul Islam">📍</span>
              <span style={{ position: 'absolute', top: '30%', left: '22%', fontSize: '0.65rem', background: '#10b981', color: '#fff', borderRadius: 4, padding: '2px' }}>Kamrul (Eng)</span>

              <span style={{ position: 'absolute', top: '65%', left: '55%', fontSize: '1.5rem', cursor: 'pointer' }} title="Open Ticket #TK-0002">📍</span>
              <span style={{ position: 'absolute', top: '65%', left: '57%', fontSize: '0.65rem', background: '#ef4444', color: '#fff', borderRadius: 4, padding: '2px' }}>TK-0002 (Ticket)</span>
              
              <span style={{ fontSize: '0.78rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 10, position: 'absolute', bottom: 8, left: 8, border: '1px solid var(--border-color)', fontWeight: 700 }}>Dhaka City Map Grid</span>
            </div>

            {/* Dispatch details list */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Technician Geo Coordinates</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dispatchList.map((d, idx) => (
                  <div key={idx} style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{d.name}</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{d.coords}</div>
                    </div>
                    <span style={{
                      fontWeight: 800, fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4,
                      color: d.status === 'Idle' ? '#10b981' : '#f59e0b',
                      background: d.status === 'Idle' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'
                    }}>{d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 8: QR CODE CODE SCANNER SIMULATOR ── */}
      {viewTab === 'qr' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* QR scanner code select */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📷</span> Scan Equipment QR Code
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '1.25rem' }}>Select an installed equipment card below to simulate the customer scanning the QR code sticker on the physical device.</p>
            
            <div className="form-group">
              <label className="form-label">Select Equipment Asset</label>
              <select
                className="form-control"
                value={qrAssetId}
                onChange={e => setQrAssetId(e.target.value)}
              >
                <option value="">— Select Serial No —</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.serialNo} ({a.productName})</option>)}
              </select>
            </div>

            {qrAssetId && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                {/* Mock visual QR code */}
                <div style={{
                  width: 140, height: 140, border: '6px solid #0f172a', borderRadius: 8, padding: 6,
                  display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{
                    width: '100%', height: '100%', opacity: 0.85,
                    background: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
                    backgroundSize: '16px 16px', backgroundColor: '#fff'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* QR results details sheet */}
          <div className="card" style={{ padding: '1.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 800 }}>📱 Scanned Customer Portal</h3>
            
            {qrAssetId ? (
              (() => {
                const asset = assets.find(a => a.id === qrAssetId);
                const isWarranty = asset?.warrantyExpiry && new Date(asset.warrantyExpiry) >= new Date();
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                      <span className="sku-badge">{asset?.serialNo}</span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{asset?.productName}</h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Config: {asset?.modelConfig}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <div>🏢 Owner: <strong>{asset?.customerName}</strong></div>
                      <div>📅 Purchase Date: <strong>{asset?.purchaseDate}</strong></div>
                      <div style={{ color: isWarranty ? '#10b981' : '#ef4444' }}>🛡️ Warranty: <strong>{isWarranty ? `Active (${asset?.warrantyExpiry})` : `Expired (${asset?.warrantyExpiry})`}</strong></div>
                      <div>⚙️ Accuracy Status: <strong>Calibrated ATR Passed</strong></div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Documentation / Downloads</div>
                      <a href="#" style={{ textDecoration: 'underline', color: 'var(--accent-color)', display: 'block' }}>📄 Service Manual.pdf</a>
                      <a href="#" style={{ textDecoration: 'underline', color: 'var(--accent-color)', display: 'block' }}>📄 Calibration Certificate.pdf</a>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedCustomerId(asset?.customerId || '');
                        setSelectedAssetId(asset?.id || '');
                        setServiceType(isWarranty ? 'warranty_claim' : 'paid_repair');
                        setIsRaiseTicketOpen(true);
                      }}
                      className="btn btn-primary" style={{ width: '100%', padding: '0.65rem', fontWeight: 800, marginTop: 4 }}
                    >
                      🚨 Quick Raise Complaint Ticket
                    </button>
                  </div>
                );
              })()
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '3rem 1rem' }}>
                Select an equipment card on the left to simulate scan output and customer portal options.
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── TICKET CREATION MODAL OVERLAY ── */}
      {isRaiseTicketOpen && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
          <div className="modal-content" style={{ 
            maxWidth: '600px', 
            maxHeight: '90vh',
            boxShadow: '0 25px 50px -12px rgba(30, 27, 75, 0.4)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div className="modal-header" style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                  <span>🛠️</span> Log Customer Complaint & SLA
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.8, fontWeight: 500 }}>Create new ticket, assign field engineer and set SLA deadline</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsRaiseTicketOpen(false)} style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '1.25rem',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}>&times;</button>
            </div>
            
            {/* Form Wrap */}
            <form onSubmit={handleRaiseTicket} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              
              {/* Scrollable Body */}
              <div className="modal-body" style={{ 
                padding: '1.5rem', 
                overflowY: 'auto', 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>Select Customer *</label>
                    <select required className="form-control" value={selectedCustomerId} onChange={e => {
                      setSelectedCustomerId(e.target.value);
                      setSelectedAssetId('');
                    }} style={{ borderRadius: '10px', height: '42px', padding: '0 10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                      <option value="">— Select Customer —</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>Select Equipment Asset *</label>
                    <select required className="form-control" value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} style={{ borderRadius: '10px', height: '42px', padding: '0 10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                      <option value="">— Select Asset Card —</option>
                      {assets.filter(a => !selectedCustomerId || a.customerId === selectedCustomerId).map(a => {
                        const isWarranty = a.warrantyExpiry && new Date(a.warrantyExpiry) >= new Date();
                        return (
                          <option key={a.id} value={a.id}>
                            {a.serialNo} ({a.productName}) [{isWarranty ? 'Active Warranty' : 'Expired Warranty'}]
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>Service Type</label>
                    <select className="form-control" value={serviceType} onChange={e => setServiceType(e.target.value)} style={{ borderRadius: '10px', height: '42px', padding: '0 10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                      <option value="warranty_claim">Warranty Claim</option>
                      <option value="paid_repair">Paid Repair</option>
                      <option value="installation">Installation Setup</option>
                      <option value="maintenance">Preventive Maintenance</option>
                      <option value="amc_visit">AMC Routine Visit</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>Priority</label>
                    <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)} style={{ borderRadius: '10px', height: '42px', padding: '0 10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                      <option value="low">🟢 Low Priority</option>
                      <option value="medium">🟡 Medium Priority</option>
                      <option value="high">🟠 High Priority</option>
                      <option value="critical">🔴 Critical Priority</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>Select Service Offering (Fee Auto-fill)</label>
                  <select
                    className="form-control"
                    onChange={e => {
                      const srv = catalog.find(x => x.id === e.target.value);
                      if (srv) {
                        setServiceFee(srv.baseFee);
                        setSelectedSlaHours(srv.slaHours !== undefined ? srv.slaHours : 24);
                        if (problemDesc) {
                          setProblemDesc(prev => prev + `\nService: ${srv.name}`);
                        } else {
                          setProblemDesc(`Service: ${srv.name}`);
                        }
                      } else {
                        setSelectedSlaHours(null);
                      }
                    }}
                    style={{ borderRadius: '10px', height: '42px', padding: '0 10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
                  >
                    <option value="">— Choose Package —</option>
                    {catalog.map(x => <option key={x.id} value={x.id}>{x.name} (৳ {x.baseFee})</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>Estimated Service Fee (BDT)</label>
                    <input type="number" min="0" className="form-control" value={serviceFee} onChange={e => setServiceFee(e.target.value)} style={{ borderRadius: '10px', height: '42px', padding: '0 10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>Assign Field Engineer</label>
                    <select className="form-control" value={technicianId} onChange={e => setTechnicianId(e.target.value)} style={{ borderRadius: '10px', height: '42px', padding: '0 10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                      <option value="">— Assign Later —</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>Problem Description / Job Scope *</label>
                  <textarea required rows={3} className="form-control" placeholder="Specify error code, faulty behavior, or setup checklist details..." value={problemDesc} onChange={e => setProblemDesc(e.target.value)} style={{ borderRadius: '10px', padding: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', resize: 'vertical' }} />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="modal-actions" style={{ 
                padding: '1.25rem 1.5rem', 
                borderTop: '1px solid var(--border-color)', 
                background: 'var(--bg-tertiary)',
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '0.75rem',
                margin: 0
              }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRaiseTicketOpen(false)} style={{ borderRadius: '10px', padding: '0.6rem 1.25rem', fontWeight: 600 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '10px', padding: '0.6rem 1.5rem', fontWeight: 700, background: 'var(--accent-color)' }}>Register Ticket & SLA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Slide-over Ticket Detail Drawer ── */}
      {selectedTicket && (
        <>
          <div onClick={() => setSelectedTicket(null)} style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '460px',
            background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
            zIndex: 900, boxShadow: '-10px 0 35px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column',
            transform: selectedTicket ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
              <div>
                <span className="sku-badge" style={{ marginBottom: 4 }}>{selectedTicket.ticketNo}</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedTicket.customerName}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            {/* Drawer Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Problem Incident Scope */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Incident Description</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{selectedTicket.problemDescription || 'No details provided.'}</p>
              </div>

              {/* Device Info */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Equipment Asset Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Product:</span>
                    <strong>{selectedTicket.productName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Serial Number:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{selectedTicket.serialNo}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Warranty Status:</span>
                    <strong style={{ color: selectedTicket.warrantyStatus === 'active' ? 'var(--success)' : 'var(--danger)' }}>
                      {selectedTicket.warrantyStatus ? selectedTicket.warrantyStatus.toUpperCase() : 'N/A'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Badges/Priority/SLA */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Priority</h4>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8, display: 'inline-block',
                    color: selectedTicket.priority === 'critical' ? '#ef4444' : selectedTicket.priority === 'high' ? '#f97316' : '#3b82f6',
                    background: selectedTicket.priority === 'critical' ? 'rgba(239,68,68,0.1)' : selectedTicket.priority === 'high' ? 'rgba(249,115,22,0.1)' : 'rgba(59,130,246,0.1)'
                  }}>{selectedTicket.priority?.toUpperCase()}</span>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>SLA Compliance</h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: getSLADetails(selectedTicket).color }}>
                    {getSLADetails(selectedTicket).text}
                  </span>
                </div>
              </div>

              {/* Financial details */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Financial Billing & Costs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estimated Service Fee:</span>
                    <strong>{fmt(selectedTicket.serviceFee || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Invoiced Status:</span>
                    <strong style={{ color: selectedTicket.billingStatus === 'billed' ? 'var(--success)' : 'var(--text-muted)' }}>
                      {selectedTicket.billingStatus === 'billed' ? `Billed (৳ ${selectedTicket.billAmount})` : 'Unbilled / Pending'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Timeline History */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Service Workflow Timeline</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)', margin: '0.5rem 0' }}>
                  {selectedTicket.timeline?.map((step, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-1.45rem', top: '4px', width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-color)', border: '2px solid var(--bg-secondary)' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{step.stage}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(step.date).toLocaleString()} · {step.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transition notes and action options */}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'completed' && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>Transition Notes</label>
                  <input type="text" placeholder="Update ticket stage details..." value={timelineNote} onChange={e => setTimelineNote(e.target.value)} className="form-control" style={{ fontSize: '0.82rem' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 4 }}>
                    {selectedTicket.status === 'open' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddTimelineStage(selectedTicket.id, 'Assigned')}>Assign Engineer</button>
                    )}
                    {selectedTicket.timeline.some(x => x.stage === 'Assigned') && !selectedTicket.timeline.some(x => x.stage === 'Technician Accepted') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddTimelineStage(selectedTicket.id, 'Technician Accepted')}>Accept Job</button>
                    )}
                    {selectedTicket.timeline.some(x => x.stage === 'Technician Accepted') && !selectedTicket.timeline.some(x => x.stage === 'Travelling') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddTimelineStage(selectedTicket.id, 'Travelling')}>Start Travel</button>
                    )}
                    {selectedTicket.timeline.some(x => x.stage === 'Travelling') && !selectedTicket.timeline.some(x => x.stage === 'On Site') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddTimelineStage(selectedTicket.id, 'On Site')}>Arrive On Site</button>
                    )}
                    {selectedTicket.timeline.some(x => x.stage === 'On Site') && !selectedTicket.timeline.some(x => x.stage === 'Diagnosis') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddTimelineStage(selectedTicket.id, 'Diagnosis')}>Log Diagnosis</button>
                    )}
                    {selectedTicket.timeline.some(x => x.stage === 'On Site') && !selectedTicket.timeline.some(x => x.stage === 'Repair') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddTimelineStage(selectedTicket.id, 'Repair')}>Start Repair</button>
                    )}
                    {selectedTicket.timeline.some(x => x.stage === 'Repair') && !selectedTicket.timeline.some(x => x.stage === 'Testing') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddTimelineStage(selectedTicket.id, 'Testing')}>Final Test</button>
                    )}
                    {selectedTicket.timeline.some(x => x.stage === 'Testing') && !selectedTicket.timeline.some(x => x.stage === 'Completed') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddTimelineStage(selectedTicket.id, 'Completed')}>Complete Job</button>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedTicket(null)}>Close Details</button>
            </div>

          </div>
        </>
      )}

      {/* ── Slide-over Asset Detail Drawer ── */}
      {selectedAsset && (
        <>
          <div onClick={() => setSelectedAsset(null)} style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '460px',
            background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
            zIndex: 900, boxShadow: '-10px 0 35px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column',
            transform: selectedAsset ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
              <div>
                <span className="sku-badge" style={{ marginBottom: 4 }}>{selectedAsset.serialNo}</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedAsset.productName}</h3>
              </div>
              <button onClick={() => setSelectedAsset(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            {/* Drawer Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Asset Configuration */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Configuration / Model Spec</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{selectedAsset.modelConfig || 'No specific configuration logged.'}</p>
              </div>

              {/* Owner and Registry Info */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Equipment Registry Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Registered Owner:</span>
                    <strong>{selectedAsset.customerName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Purchase Date:</span>
                    <strong>{selectedAsset.purchaseDate || 'N/A'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Installation Date:</span>
                    <strong>{selectedAsset.installationDate || 'N/A'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Warranty Expiry:</span>
                    <strong style={{ color: new Date(selectedAsset.warrantyExpiry) >= new Date() ? 'var(--success)' : 'var(--danger)' }}>
                      {selectedAsset.warrantyExpiry} {new Date(selectedAsset.warrantyExpiry) >= new Date() ? '(Active)' : '(Expired)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Badges/Specs */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Firmware</h4>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 8, display: 'inline-block' }}>
                    {selectedAsset.firmwareVersion || 'v1.0.0'}
                  </span>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Health Score</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 60, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${selectedAsset.healthScore}%`, height: '100%', background: selectedAsset.healthScore > 80 ? '#10b981' : (selectedAsset.healthScore > 50 ? '#f59e0b' : '#ef4444') }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: selectedAsset.healthScore > 80 ? '#10b981' : (selectedAsset.healthScore > 50 ? '#f59e0b' : '#ef4444') }}>{selectedAsset.healthScore}%</span>
                  </div>
                </div>
              </div>

              {/* Geographic Coordinates */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Telemetry & Location</h4>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>📍 Coordinates: {selectedAsset.gpsCoordinates || 'N/A'}</span>
              </div>

              {/* Service History audit logs */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Field Service Incident History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '200px', overflowY: 'auto' }}>
                  {(!selectedAsset.serviceHistory || selectedAsset.serviceHistory.length === 0) ? (
                    <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                      No historic service visits logged.
                    </div>
                  ) : (
                    selectedAsset.serviceHistory.map((h, idx) => (
                      <div key={idx} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                          <span>Visit Date: {h.date}</span>
                          <span style={{ color: 'var(--accent-color)' }}>{h.type}</span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>{h.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedAsset(null)}>Close</button>
            </div>

          </div>
        </>
      )}

      {/* ── Slide-over AMC Contract Detail Drawer ── */}
      {selectedContract && (
        <>
          <div onClick={() => setSelectedContract(null)} style={{ position: 'fixed', inset: 0, zIndex: 890, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: '460px',
            background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
            zIndex: 900, boxShadow: '-10px 0 35px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column',
            transform: selectedContract ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
              <div>
                <span className="sku-badge" style={{ marginBottom: 4 }}>{selectedContract.contractNo}</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedContract.customerName}</h3>
              </div>
              <button onClick={() => setSelectedContract(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            {/* Drawer Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Contract Target Machine */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>Target Equipment</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4, fontWeight: 700 }}>{selectedContract.machineName || 'N/A'}</p>
              </div>

              {/* Duration and Schedule */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>AMC Agreement Specs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Start Date:</span>
                    <strong>{selectedContract.startDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>End Date:</span>
                    <strong>{selectedContract.endDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Visit Frequency:</span>
                    <strong>{selectedContract.visitSchedule}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Next Due Visit:</span>
                    <strong style={{ color: '#f59e0b' }}>{selectedContract.nextVisitDate}</strong>
                  </div>
                </div>
              </div>

              {/* Visits Balance */}
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Free Visits Included</h4>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {selectedContract.freeVisitsIncluded || 0}
                  </span>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Visits Logged/Used</h4>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-color)' }}>
                    {selectedContract.visitsUsed || 0}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>Contract Status</h4>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'inline-block' }}>
                  {selectedContract.status?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>

            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedContract(null)}>Close</button>
            </div>

          </div>
        </>
      )}

      {/* ── REGISTER ASSET MODAL OVERLAY ── */}
      {isAddAssetOpen && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 950 }}>
          <div className="modal-content" style={{ 
            maxWidth: '560px', 
            boxShadow: '0 25px 50px -12px rgba(30, 27, 75, 0.4)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="modal-header" style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: '#fff' }}>
                <span>➕</span> Add Equipment Card
              </h3>
              <button type="button" className="modal-close" onClick={() => setIsAddAssetOpen(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer',
                borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>&times;</button>
            </div>
            
            <form onSubmit={(e) => { handleCreateAsset(e); setIsAddAssetOpen(false); }} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', margin: 0 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Serial / Batch Code *</label>
                <input type="text" required className="form-control" value={newAsset.serialNo} onChange={e => setNewAsset({...newAsset, serialNo: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Select Product SKU *</label>
                <select required className="form-control" value={newAsset.productId} onChange={e => setNewAsset({...newAsset, productId: e.target.value})}>
                  <option value="">— Select SKU —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Select Owner Customer *</label>
                <select required className="form-control" value={newAsset.customerId} onChange={e => setNewAsset({...newAsset, customerId: e.target.value})}>
                  <option value="">— Select Customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Purchase Date</label>
                  <input type="date" className="form-control" value={newAsset.purchaseDate} onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Warranty Expiry</label>
                  <input type="date" className="form-control" value={newAsset.warrantyExpiry} onChange={e => setNewAsset({...newAsset, warrantyExpiry: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Model Configuration</label>
                <input type="text" placeholder="e.g. Firmware v1.4, Calibrated accuracy 0.5" className="form-control" value={newAsset.modelConfig} onChange={e => setNewAsset({...newAsset, modelConfig: e.target.value})} />
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddAssetOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Asset Card</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REGISTER AMC CONTRACT MODAL OVERLAY ── */}
      {isAddContractOpen && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 950 }}>
          <div className="modal-content" style={{ 
            maxWidth: '560px', 
            boxShadow: '0 25px 50px -12px rgba(30, 27, 75, 0.4)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="modal-header" style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: '#fff' }}>
                <span>📜</span> Register AMC Contract
              </h3>
              <button type="button" className="modal-close" onClick={() => setIsAddContractOpen(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer',
                borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>&times;</button>
            </div>
            
            <form onSubmit={(e) => { handleCreateContract(e); setIsAddContractOpen(false); }} className="modal-form-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', margin: 0 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Select Customer *</label>
                <select required className="form-control" value={newContract.customerId} onChange={e => setNewContract({...newContract, customerId: e.target.value})}>
                  <option value="">— Select Customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Select Target Asset Serial *</label>
                <select required className="form-control" value={newContract.machineId} onChange={e => setNewContract({...newContract, machineId: e.target.value})}>
                  <option value="">— Select Machine Serial —</option>
                  {assets.filter(a => !newContract.customerId || a.customerId === newContract.customerId).map(a => (
                    <option key={a.id} value={a.id}>{a.serialNo} ({a.productName})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Start Date *</label>
                  <input type="date" required className="form-control" value={newContract.startDate} onChange={e => setNewContract({...newContract, startDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>End Date *</label>
                  <input type="date" required className="form-control" value={newContract.endDate} onChange={e => setNewContract({...newContract, endDate: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Visit Frequency</label>
                  <select className="form-control" value={newContract.visitSchedule} onChange={e => setNewContract({...newContract, visitSchedule: e.target.value})}>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Semiannually">Semiannually</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Free Visits</label>
                  <input type="number" min="0" className="form-control" value={newContract.freeVisitsIncluded} onChange={e => setNewContract({...newContract, freeVisitsIncluded: e.target.value})} />
                </div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddContractOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save AMC Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ServiceView;
