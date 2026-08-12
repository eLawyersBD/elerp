import { useState, useEffect, useMemo, useRef } from 'react';
import { taskService } from '../services/taskService';

export default function TaskManagementView({ currentUser, isMobile }) {
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [rules, setRules] = useState([]);
  const [activeTab, setActiveTab] = useState('kanban'); // dashboard | kanban | list | calendar | timeline | map | config
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Modals & Form states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', category: 'Installation', type: 'Installation',
    priority: 'medium', urgency: 'medium', impact: 'medium',
    sourceModule: 'general', sourceId: '', customerId: '', customerName: '',
    assigneeId: '', assigneeName: '', estimatedHours: '', slaDueDate: '',
    checklist: []
  });

  const [ruleForm, setRuleForm] = useState({
    name: '', triggerModule: 'sales', condition: 'invoice.grandTotal > 100000', templateId: 'tpl-install', active: true
  });

  // Filters state
  const [filters, setFilters] = useState({ search: '', status: 'all', priority: 'all', category: 'all' });
  const [successMsg, setSuccessMsg] = useState('');
  
  // Comment & Canvas states
  const [commentText, setCommentText] = useState('');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Dropdown list data
  const technicians = useMemo(() => taskService.getTechnicians(), []);
  const employees = useMemo(() => taskService.getAllEmployees(), []);
  const customers = useMemo(() => JSON.parse(localStorage.getItem('erp_customers') || '[]'), []);
  const salesInvoices = useMemo(() => JSON.parse(localStorage.getItem('erp_sales_invoices') || '[]'), []);

  const loadData = async () => {
    const [tasksData, templatesData, rulesData] = await Promise.all([
      taskService.getTasks(),
      taskService.getTemplates(),
      taskService.getRules()
    ]);
    setTasks(tasksData || []);
    setTemplates(templatesData || []);
    setRules(rulesData || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Status lifecycle options
  const STATUS_PILLS = {
    draft: { label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: '#cbd5e1' },
    pending_approval: { label: 'Pending Approval', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: '#fde68a' },
    approved: { label: 'Approved', color: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: '#bfdbfe' },
    assigned: { label: 'Assigned', color: '#4f46e5', bg: 'rgba(79,70,229,0.08)', border: '#c7d2fe' },
    accepted: { label: 'Accepted', color: '#0d9488', bg: 'rgba(13,148,136,0.08)', border: '#99f6e4' },
    traveling: { label: 'Traveling', color: '#0284c7', bg: 'rgba(2,132,199,0.08)', border: '#bae6fd' },
    on_site: { label: 'On Site', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: '#ddd6fe' },
    in_progress: { label: 'In Progress', color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: '#bbf7d0' },
    waiting_parts: { label: 'Waiting for Parts', color: '#ea580c', bg: 'rgba(234,88,12,0.08)', border: '#ffedd5' },
    waiting_customer: { label: 'Waiting for Cust', color: '#ca8a04', bg: 'rgba(202,138,4,0.08)', border: '#fef3c7' },
    review: { label: 'Under Review', color: '#0f172a', bg: 'rgba(15,23,42,0.08)', border: '#e2e8f0' },
    completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#a7f3d0' },
    closed: { label: 'Closed', color: '#475569', bg: 'rgba(71,85,105,0.08)', border: '#cbd5e1' },
    cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: '#fecaca' }
  };

  const PRIORITY_COLORS = {
    low: { label: 'Low', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    medium: { label: 'Medium', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    high: { label: 'High', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const total = safeTasks.length;
    const pendingAssign = safeTasks.filter(t => !t.assigneeId).length;
    const active = safeTasks.filter(t => ['assigned', 'accepted', 'traveling', 'on_site', 'in_progress', 'waiting_parts'].includes(t.status)).length;
    const completed = safeTasks.filter(t => t.status === 'completed' || t.status === 'closed').length;
    
    // SLA breaches (due date < now && not completed)
    const overdue = safeTasks.filter(t => t.status !== 'completed' && t.status !== 'closed' && t.slaDueDate && new Date(t.slaDueDate) < new Date()).length;
    const compliance = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

    return { total, pendingAssign, active, completed, overdue, compliance };
  }, [tasks]);

  // Filtering tasks
  const filteredTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    return safeTasks.filter(t => {
      const matchSearch = !filters.search || 
        t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.taskNo.toLowerCase().includes(filters.search.toLowerCase()) ||
        (t.assigneeName || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (t.sourceId || '').toLowerCase().includes(filters.search.toLowerCase());
      
      const matchStatus = filters.status === 'all' || t.status === filters.status;
      const matchPriority = filters.priority === 'all' || t.priority === filters.priority;
      const matchCategory = filters.category === 'all' || t.category === filters.category;

      return matchSearch && matchStatus && matchPriority && matchCategory;
    });
  }, [tasks, filters]);

  // Canvas Signature Methods
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = async () => {
    if (!hasSignature) return alert('Please draw a signature first.');
    const log = {
      id: `log-${Date.now()}`,
      author: currentUser?.displayName || 'Customer',
      text: 'Client signature captured & verified on-site check list.',
      timestamp: new Date().toISOString()
    };
    const updated = {
      ...selectedTask,
      activityLogs: [...(selectedTask.activityLogs || []), log],
      checklist: selectedTask.checklist.map(c => c.signatureRequired ? { ...c, done: true, completedBy: 'Client Signature', completedTime: new Date().toISOString() } : c)
    };
    const saved = await taskService.saveTask(updated, currentUser);
    setSelectedTask(saved);
    loadData();
    clearSignature();
    showSuccess('✍️ Client signature logged and verified.');
  };

  // Handle manual task submission
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title) return alert('Task title is required.');
    
    let assigneeName = '';
    if (taskForm.assigneeId) {
      assigneeName = employees.find(emp => emp.id === taskForm.assigneeId)?.name || 
                     technicians.find(tech => tech.id === taskForm.assigneeId)?.name || '';
    }

    const t = {
      ...taskForm,
      assigneeName,
      status: taskForm.assigneeId ? 'assigned' : 'pending_approval',
      slaDueDate: taskForm.slaDueDate || new Date(Date.now() + 24 * 3600000).toISOString()
    };

    await taskService.saveTask(t, currentUser);
    setIsTaskModalOpen(false);
    showSuccess(`✅ Operations task created successfully.`);
    loadData();
    setTaskForm({
      title: '', description: '', category: 'Installation', type: 'Installation',
      priority: 'medium', urgency: 'medium', impact: 'medium',
      sourceModule: 'general', sourceId: '', customerId: '', customerName: '',
      assigneeId: '', assigneeName: '', estimatedHours: '', slaDueDate: '',
      checklist: []
    });
  };

  const handleUpdateStatus = async (task, newStatus) => {
    const updated = { ...task, status: newStatus };
    const saved = await taskService.saveTask(updated, currentUser);
    setSelectedTask(saved);
    loadData();
    showSuccess(`Task status changed to ${newStatus.toUpperCase().replace('_', ' ')}`);
  };

  const handleChecklistToggle = async (task, itemIndex) => {
    const updatedChecklist = task.checklist.map((item, idx) => {
      if (idx === itemIndex) {
        const done = !item.done;
        return {
          ...item,
          done,
          completedBy: done ? (currentUser?.displayName || 'Technician') : '',
          completedTime: done ? new Date().toISOString() : ''
        };
      }
      return item;
    });

    const updated = { ...task, checklist: updatedChecklist };
    const saved = await taskService.saveTask(updated, currentUser);
    setSelectedTask(saved);
    loadData();
  };

  const handleAddComment = async (e, task) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const comments = [
      ...(task.comments || []),
      {
        id: `c-${Date.now()}`,
        author: currentUser?.displayName || 'user',
        text: commentText,
        timestamp: new Date().toISOString()
      }
    ];
    const updated = { ...task, comments };
    const saved = await taskService.saveTask(updated, currentUser);
    setSelectedTask(saved);
    setCommentText('');
    loadData();
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!ruleForm.name || !ruleForm.condition || !ruleForm.templateId) return alert('Please fill all fields.');
    await taskService.saveRule(ruleForm);
    setIsRuleModalOpen(false);
    showSuccess('Rule saved successfully.');
    loadData();
  };

  const loadTemplateChecklist = (templateId) => {
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setTaskForm(f => ({
        ...f,
        category: tpl.category,
        type: tpl.type,
        priority: tpl.priority,
        estimatedHours: tpl.estimatedHours,
        checklist: tpl.checklist.map(c => ({ ...c, done: false }))
      }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-primary)', fontFamily: 'Outfit, Inter, sans-serif' }}>
      
      {/* Modern Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(255,255,255,0.01) 100%)', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-color)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📋 Operations Board</span>
            <span style={{ fontSize: '0.65rem', background: 'rgba(79,70,229,0.1)', color: 'var(--accent-color)', padding: '2px 8px', borderRadius: 20, fontWeight: 800, textTransform: 'uppercase' }}>Central Engine</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cross-functional operations workflow dispatcher. Linked directly to CRM, Sales, and Invoices.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button onClick={() => setIsTaskModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '0.55rem 1.1rem', borderRadius: 10, fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }}>
            <span>➕ Create Task</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="fade-in" style={{ padding: '0.8rem 1.25rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: 12, fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeIn 0.25s ease' }}>
          <span>🔔</span> {successMsg}
        </div>
      )}

      {/* Glassmorphic Tab Selector */}
      <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-tertiary)', padding: '0.35rem', borderRadius: 12, width: 'fit-content', border: '1px solid var(--border-color)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}>
        {[
          { id: 'kanban', label: '🗂️ Kanban Board' },
          { id: 'dashboard', label: '📊 Metric Analytics' },
          { id: 'list', label: '📝 List View' },
          { id: 'calendar', label: '📅 Calendar Map' },
          { id: 'timeline', label: '⏳ Gantt Timeline' },
          { id: 'map', label: '🗺️ Field GPS Tracker' },
          { id: 'config', label: '⚙️ Rule Engine & Config' }
        ].map(tb => (
          <button
            key={tb.id}
            onClick={() => setActiveTab(tb.id)}
            style={{
              padding: '0.5rem 1.05rem',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              background: activeTab === tb.id ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === tb.id ? 'var(--accent-color)' : 'var(--text-muted)',
              boxShadow: activeTab === tb.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: KANBAN BOARD ── */}
      {activeTab === 'kanban' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Enhanced Filter panel */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
              <span>🔍 Filters:</span>
              <input
                type="text"
                placeholder="Search No, Title, Assignee..."
                className="form-control"
                style={{ width: '220px', fontSize: '0.76rem', padding: '0.45rem 0.8rem', borderRadius: 8, height: '32px' }}
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                className="form-control"
                style={{ width: '130px', fontSize: '0.76rem', padding: '0.35rem', borderRadius: 8, height: '32px' }}
                value={filters.priority}
                onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="all">Priority: All</option>
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟡 High</option>
                <option value="critical">🔴 Critical</option>
              </select>

              <select
                className="form-control"
                style={{ width: '150px', fontSize: '0.76rem', padding: '0.35rem', borderRadius: 8, height: '32px' }}
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              >
                <option value="all">Category: All</option>
                <option value="Installation">Installation</option>
                <option value="Calibration">Calibration</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Repair">Repair</option>
                <option value="Survey">Survey</option>
              </select>
            </div>
          </div>

          {/* Kanban Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.85rem', overflowX: 'auto', minHeight: '560px' }}>
            {[
              { id: 'pending', label: '📥 PENDING ASSIGNMENT', statuses: ['draft', 'pending_approval', 'approved'], theme: '#d97706' },
              { id: 'assigned', label: '👤 ASSIGNED & ACCEPTED', statuses: ['assigned', 'accepted'], theme: '#4f46e5' },
              { id: 'in_progress', label: '⚙️ IN PROGRESS / TRAVEL', statuses: ['traveling', 'on_site', 'in_progress'], theme: '#0d9488' },
              { id: 'waiting', label: '⏳ WAITING / REVIEW', statuses: ['waiting_parts', 'waiting_customer', 'review'], theme: '#ca8a04' },
              { id: 'completed', label: '✅ COMPLETED / CLOSED', statuses: ['completed', 'closed', 'cancelled'], theme: '#10b981' }
            ].map(col => {
              const colTasks = filteredTasks.filter(t => col.statuses.includes(t.status));
              return (
                <div key={col.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 16, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: '240px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  {/* Column Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${col.theme}40`, paddingBottom: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: col.theme, letterSpacing: '0.04em' }}>{col.label}</span>
                    <span style={{ background: `${col.theme}15`, color: col.theme, padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 800 }}>{colTasks.length}</span>
                  </div>

                  {/* Cards Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
                    {colTasks.map(t => {
                      const overdue = new Date(t.slaDueDate) < new Date() && t.status !== 'completed' && t.status !== 'closed';
                      const pri = PRIORITY_COLORS[t.priority] || { label: t.priority, color: '#333', bg: '#eee' };
                      return (
                        <div
                          key={t.taskNo}
                          onClick={() => setSelectedTask(t)}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: `1px solid ${overdue ? '#ef4444' : 'var(--border-color)'}`,
                            borderLeft: `4px solid ${pri.color}`,
                            borderRadius: 10,
                            padding: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                          }}
                        >
                          {/* Top Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.taskNo}</span>
                            <span style={{ fontSize: '0.58rem', fontWeight: 900, color: pri.color, background: pri.bg, padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase' }}>{pri.label}</span>
                          </div>

                          {/* Task Subject */}
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px', lineHeight: 1.35, color: 'var(--text-primary)' }}>{t.title}</div>
                          
                          {/* Category Badge & Assignee info */}
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t.category}</span>
                            {t.sourceId && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(79,70,229,0.06)', color: 'var(--accent-color)', fontFamily: 'monospace' }}>{t.sourceId}</span>}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            <span>Assignee: <strong style={{ color: 'var(--text-primary)' }}>{t.assigneeName || 'Unassigned'}</strong></span>
                          </div>

                          {/* Progress Line */}
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', marginBottom: 2 }}>
                              <span style={{ color: 'var(--text-muted)' }}>Steps completed</span>
                              <strong style={{ color: '#10b981' }}>{t.completionPercent}%</strong>
                            </div>
                            <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${t.completionPercent}%`, background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' }} />
                            </div>
                          </div>

                          {overdue && (
                            <div style={{ marginTop: 8, fontSize: '0.6rem', color: '#ef4444', fontWeight: 800, background: 'rgba(239,68,68,0.08)', padding: '3px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>⚠️</span> SLA BREACHED (OVERDUE)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: METRIC ANALYTICS ── */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Glassmorphic Metrics Card Grid */}
          <div className="grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {[
              { label: 'Total Operations Scheduled', val: metrics.total, color: 'var(--accent-color)', bg: 'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(79,70,229,0.01) 100%)', icon: '📋' },
              { label: 'Unassigned Queue', val: metrics.pendingAssign, color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.01) 100%)', icon: '📥' },
              { label: 'Active Field Tasks', val: metrics.active, color: '#0d9488', bg: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(13,148,136,0.01) 100%)', icon: '🛠️' },
              { label: 'Closed Jobs (Completed)', val: metrics.completed, color: '#10b981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.01) 100%)', icon: '✅' },
              { label: 'Critical SLA Breaches', val: metrics.overdue, color: '#ef4444', bg: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.01) 100%)', icon: '⏰' }
            ].map((m, i) => (
              <div key={i} style={{ background: m.bg, border: `1px solid ${m.color}25`, padding: '1.25rem', borderRadius: 16, boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>{m.label}</span>
                  <span style={{ fontSize: '1.25rem' }}>{m.icon}</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 950, color: m.color, letterSpacing: '-0.03em' }}>{m.val}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Technician List load tracker */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: 16 }}>
              <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '0.95rem', fontWeight: 900, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', color: 'var(--text-primary)' }}>👷 Specialist Efficiency Matrix</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {technicians.map((t, idx) => {
                  const techTasks = tasks.filter(tk => tk.assigneeId === t.id);
                  const activeCount = techTasks.filter(tk => tk.status !== 'completed' && tk.status !== 'closed').length;
                  const completedCount = techTasks.filter(tk => tk.status === 'completed' || tk.status === 'closed').length;
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)' }}>{t.name}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.role}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem' }}>
                        <div>Active: <strong style={{ color: 'var(--accent-color)' }}>{activeCount}</strong></div>
                        <div>Closed: <strong style={{ color: '#10b981' }}>{completedCount}</strong></div>
                        <div>Score: <strong style={{ color: '#f59e0b' }}>⭐ {t.rating}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SLA Compliancy Progress circle */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 900 }}>🛡️ Overall SLA Compliance</h4>
              <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1.25rem 0' }}>
                <svg width="140" height="140" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={metrics.compliance >= 90 ? '#10b981' : '#f59e0b'}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * metrics.compliance) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <span style={{ position: 'absolute', fontSize: '2.1rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>{metrics.compliance}%</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>Target threshold is **90%**. Overdue count: <strong>{metrics.overdue}</strong> task(s). Keep resolution times low to avoid breach penalties.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LIST VIEW ── */}
      {activeTab === 'list' && (
        <div className="card" style={{ padding: '1.5rem', borderRadius: 16, overflowX: 'auto', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900 }}>📂 Operations Registry & Audit Log</h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tabular representation of all operations tracking records.</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => alert('Excel sheet created (mock)...')} style={{ padding: '0.45rem 1rem', fontSize: '0.76rem', fontWeight: 700, borderRadius: 8 }}>📥 Export Records</button>
          </div>
          <table className="table" style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Task No</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Workflow Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Linked Document</th>
                <th>Deadline Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(t => (
                <tr key={t.taskNo} onClick={() => setSelectedTask(t)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} className="table-row-hover">
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-color)' }}>{t.taskNo}</td>
                  <td><strong>{t.title}</strong></td>
                  <td><span style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{t.category}</span></td>
                  <td>
                    <span style={{
                      padding: '3px 9px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 800,
                      color: STATUS_PILLS[t.status]?.color || '#333',
                      background: STATUS_PILLS[t.status]?.bg || '#eee',
                      border: `1px solid ${STATUS_PILLS[t.status]?.border || '#ddd'}`
                    }}>{STATUS_PILLS[t.status]?.label || t.status}</span>
                  </td>
                  <td>
                    <span style={{ color: PRIORITY_COLORS[t.priority]?.color, fontWeight: 800 }}>{t.priority.toUpperCase()}</span>
                  </td>
                  <td>{t.assigneeName || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{t.sourceId || '—'}</td>
                  <td>{new Date(t.slaDueDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 4: CALENDAR VIEW ── */}
      {activeTab === 'calendar' && (
        <div className="card" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900 }}>📅 Operations Planner Calendar</h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Showing target deadlines for the month of July 2026.</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
              <strong key={d} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: '0.5rem' }}>{d}</strong>
            ))}
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = (i % 31) + 1;
              const dateStr = `2026-07-${String(dayNum).padStart(2, '0')}`;
              const dayTasks = tasks.filter(t => t.slaDueDate.startsWith(dateStr));
              const isToday = dayNum === 3; // July 3, 2026 is today
              return (
                <div key={i} style={{ minHeight: '95px', background: isToday ? 'rgba(79,70,229,0.03)' : 'var(--bg-secondary)', border: `1px solid ${isToday ? 'var(--accent-color)' : 'var(--border-color)'}`, borderRadius: 10, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isToday ? 'var(--accent-color)' : 'var(--text-muted)' }}>{dayNum}</span>
                    {isToday && <span style={{ fontSize: '0.58rem', background: 'var(--accent-color)', color: '#fff', padding: '1px 5px', borderRadius: 4, fontWeight: 900 }}>TODAY</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', flex: 1 }}>
                    {dayTasks.map(t => (
                      <div
                        key={t.taskNo}
                        onClick={() => setSelectedTask(t)}
                        style={{
                          background: PRIORITY_COLORS[t.priority]?.bg || 'rgba(0,0,0,0.05)',
                          color: PRIORITY_COLORS[t.priority]?.color || '#333',
                          borderLeft: `3px solid ${PRIORITY_COLORS[t.priority]?.color || '#333'}`,
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer'
                        }}
                        title={t.title}
                      >
                        {t.taskNo}: {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 5: GANTT TIMELINE ── */}
      {activeTab === 'timeline' && (
        <div className="card" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 900 }}>⏳ Operational Gantt Chart</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1.25rem' }}>Track task durations, timelines, and execution paths horizontally.</span>
          
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflowX: 'auto', background: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px repeat(10, 1fr)', borderBottom: '2px solid var(--border-color)', fontWeight: 800, fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.65rem' }}>
              <div>Task ID & Subject</div>
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} style={{ textAlign: 'center' }}>Jul {idx + 1}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tasks.slice(0, 8).map((t, tIdx) => {
                const dayOffset = (tIdx % 4) + 1;
                const durationDays = (tIdx % 3) + 2;
                return (
                  <div key={t.taskNo} style={{ display: 'grid', gridTemplateColumns: '220px repeat(10, 1fr)', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 0.65rem', background: 'var(--bg-secondary)' }}>
                    <div onClick={() => setSelectedTask(t)} style={{ cursor: 'pointer', fontSize: '0.76rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>
                      <span style={{ color: 'var(--accent-color)', fontFamily: 'monospace', marginRight: 4 }}>{t.taskNo}</span> {t.title}
                    </div>
                    
                    <div style={{ gridColumn: `${dayOffset + 1} / span ${durationDays}`, position: 'relative', height: '24px' }}>
                      <div
                        onClick={() => setSelectedTask(t)}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 12,
                          background: `linear-gradient(90deg, ${PRIORITY_COLORS[t.priority]?.color}e0 0%, ${PRIORITY_COLORS[t.priority]?.color}90 100%)`,
                          color: '#fff',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '0.75rem',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {t.completionPercent}% Complete
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: MAP TRACKER ── */}
      {activeTab === 'map' && (
        <div className="card" style={{ padding: '1.5rem', borderRadius: 16 }}>
          <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 900 }}>🗺️ Live Field Operations Map</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1.25rem' }}>Visual representation of active check-ins, travel routes, and dispatch pins.</span>
          <div style={{ height: '400px', background: '#cbd5e1', borderRadius: 16, border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
            {/* Grid Lines Mock Map */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.15, background: 'radial-gradient(circle, #000 10%, transparent 11%)', backgroundSize: '15px 15px' }} />
            
            {/* Simulated Path */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d="M 200 150 Q 300 100 450 250 T 700 120" fill="none" stroke="var(--accent-color)" strokeWidth="3" strokeDasharray="6 6" />
            </svg>

            {/* Pins */}
            <div style={{ position: 'absolute', top: '150px', left: '200px', transform: 'translate(-50%, -100%)', textAlign: 'center' }}>
              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 8px', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-sm)' }}>
                🏠 Main HQ Start
              </div>
              <div style={{ fontSize: '1.5rem', animation: 'bounce 2s infinite' }}>📍</div>
            </div>

            <div style={{ position: 'absolute', top: '250px', left: '450px', transform: 'translate(-50%, -100%)', textAlign: 'center' }}>
              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 8px', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-sm)' }}>
                📍 Chittagong Docks Site
              </div>
              <div style={{ fontSize: '1.5rem', animation: 'bounce 2.5s infinite' }}>📍</div>
              <div style={{ width: 16, height: 16, background: '#7c3aed40', border: '2px solid #7c3aed', borderRadius: '50%', position: 'absolute', bottom: -5, left: 'calc(50% - 8px)', animation: 'ping 1.5s infinite' }} />
            </div>

            <div style={{ position: 'absolute', top: '120px', left: '700px', transform: 'translate(-50%, -100%)', textAlign: 'center' }}>
              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 8px', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-sm)' }}>
                🏢 Dhaka Workspaces
              </div>
              <div style={{ fontSize: '1.5rem', color: '#10b981' }}>📍</div>
            </div>

            <div style={{ position: 'absolute', bottom: 15, left: 15, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '0.85rem', borderRadius: 12, border: '1px solid var(--border-color)', maxWidth: 280, fontSize: '0.72rem', boxShadow: 'var(--shadow-md)' }}>
              <strong style={{ display: 'block', marginBottom: 4, color: 'var(--accent-color)' }}>🛰️ GPS Coordinates Lock</strong>
              <span>Technicians Kamrul and Sultana checked-in at destination coordinates via cellular geo-verification margins.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 7: RULE ENGINE CONFIG ── */}
      {activeTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
            {/* Auto Rules config list */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900 }}>⚡ Auto-Dispatch Rule Set</h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Automate operations scheduling on document post events.</span>
                </div>
                <button onClick={() => setIsRuleModalOpen(true)} className="btn btn-secondary btn-sm" style={{ padding: '0.45rem 0.95rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 8 }}>➕ Add Rule</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {rules.map(r => (
                  <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', background: 'var(--bg-tertiary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{r.name}</strong>
                      <span style={{ fontSize: '0.62rem', background: r.active ? '#d1fae5' : '#fee2e2', color: r.active ? '#065f46' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>{r.active ? 'ACTIVE' : 'INACTIVE'}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-color)', margin: '0.5rem 0' }}>
                      IF {r.condition} THEN Auto-Create task from template.
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Linked Template ID: <strong style={{ color: 'var(--text-primary)' }}>{r.templateId}</strong></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Templates List */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: 16 }}>
              <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '0.95rem', fontWeight: 900, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>📋 Standard Checklist Templates</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {templates.map(t => (
                  <div key={t.id} style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem', background: 'var(--bg-tertiary)' }}>
                    <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4, color: 'var(--text-primary)' }}>{t.title}</strong>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>Category: <strong style={{ color: 'var(--text-primary)' }}>{t.category}</strong></span>
                      <span>Items: <strong style={{ color: 'var(--text-primary)' }}>{t.checklist.length} Checkpoints</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXECUTION & CHECKLIST DRAWER ── */}
      {selectedTask && (
        <div className="fade-in" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: isMobile ? '100%' : '560px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', boxShadow: '-15px 0 35px rgba(0,0,0,0.15)', zIndex: 950, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {/* Drawer Header */}
          <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, var(--accent-color) 0%, #4f46e5 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{selectedTask.taskNo}</span>
              <h3 style={{ margin: '6px 0 0 0', fontSize: '1.05rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>{selectedTask.title}</h3>
            </div>
            <button onClick={() => setSelectedTask(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.75rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* SLA countdown timer if active */}
            {selectedTask.status !== 'completed' && selectedTask.status !== 'closed' && (
              <div style={{ background: new Date(selectedTask.slaDueDate) < new Date() ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${new Date(selectedTask.slaDueDate) < new Date() ? '#fca5a5' : '#a7f3d0'}`, color: new Date(selectedTask.slaDueDate) < new Date() ? '#dc2626' : '#10b981', padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🛡️ SLA Compliance Status:</span>
                <span className={new Date(selectedTask.slaDueDate) < new Date() ? 'pulse-danger' : ''}>
                  {new Date(selectedTask.slaDueDate) < new Date() ? '⚠️ SLA BREACHED' : '🟢 Active Compliance'}
                </span>
              </div>
            )}

            {/* Workflow Control */}
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8, letterSpacing: '0.04em' }}>Workflow Status Transition Console</span>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {selectedTask.status === 'pending_approval' && (
                  <button onClick={() => handleUpdateStatus(selectedTask, 'approved')} className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6 }}>Approve Task</button>
                )}
                {['approved', 'pending_approval'].includes(selectedTask.status) && (
                  <select
                    className="form-control"
                    style={{ maxWidth: '180px', padding: '0.35rem', fontSize: '0.74rem', height: '32px', borderRadius: 6 }}
                    onChange={e => {
                      const emp = employees.find(x => x.id === e.target.value) || technicians.find(x => x.id === e.target.value);
                      if (emp) {
                        const updated = { ...selectedTask, assigneeId: emp.id, assigneeName: emp.name, status: 'assigned' };
                        taskService.saveTask(updated, currentUser).then(saved => {
                          setSelectedTask(saved);
                          loadData();
                          showSuccess(`Task assigned to ${emp.name}`);
                        });
                      }
                    }}
                  >
                    <option value="">-- Assign specialist --</option>
                    <optgroup label="Field Specialists">
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.name} (Tech)</option>)}
                    </optgroup>
                    <optgroup label="General Staff">
                      {employees.slice(0, 15).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </optgroup>
                  </select>
                )}
                {selectedTask.status === 'assigned' && (
                  <button onClick={() => handleUpdateStatus(selectedTask, 'accepted')} className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6 }}>Accept & Confirm</button>
                )}
                {selectedTask.status === 'accepted' && (
                  <button onClick={() => handleUpdateStatus(selectedTask, 'traveling')} className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6 }}>🚘 Start Traveling</button>
                )}
                {selectedTask.status === 'traveling' && (
                  <button onClick={() => handleUpdateStatus(selectedTask, 'on_site')} className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6 }}>📍 On Site Check-In</button>
                )}
                {selectedTask.status === 'on_site' && (
                  <button onClick={() => handleUpdateStatus(selectedTask, 'in_progress')} className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6 }}>🛠️ Begin Operation</button>
                )}
                {selectedTask.status === 'in_progress' && (
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button onClick={() => handleUpdateStatus(selectedTask, 'review')} className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6 }}>Submit for Review</button>
                    <button onClick={() => handleUpdateStatus(selectedTask, 'waiting_parts')} className="btn btn-secondary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6, color: '#ea580c' }}>Wait for Parts</button>
                  </div>
                )}
                {selectedTask.status === 'review' && (
                  <button onClick={() => handleUpdateStatus(selectedTask, 'completed')} className="btn btn-primary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6, background: '#10b981', borderColor: '#10b981', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>Verify & Complete</button>
                )}
                {selectedTask.status === 'completed' && (
                  <button onClick={() => handleUpdateStatus(selectedTask, 'closed')} className="btn btn-secondary btn-sm" style={{ padding: '0.45rem 1rem', fontSize: '0.74rem', fontWeight: 700, borderRadius: 6 }}>Archive Record</button>
                )}
              </div>
            </div>

            {/* Task Info Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
              <div>Category: <strong style={{ color: 'var(--text-primary)' }}>{selectedTask.category}</strong></div>
              <div>Workflow Type: <strong style={{ color: 'var(--text-primary)' }}>{selectedTask.type || 'Standard'}</strong></div>
              <div>Assignee: <strong style={{ color: 'var(--text-primary)' }}>{selectedTask.assigneeName || 'Unassigned'}</strong></div>
              <div>Linked Document: <strong style={{ fontFamily: 'monospace', color: 'var(--accent-color)' }}>{selectedTask.sourceId || '—'}</strong></div>
              <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                Deadline SLA Due: <strong style={{ color: 'var(--text-primary)' }}>{new Date(selectedTask.slaDueDate).toLocaleString()}</strong>
              </div>
            </div>

            {/* Checklist Verification list */}
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8, letterSpacing: '0.04em' }}>Field Checklist Verification Items</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {selectedTask.checklist.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--bg-tertiary)', padding: '0.65rem 0.85rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleChecklistToggle(selectedTask, idx)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.78rem', textDecoration: item.done ? 'line-through' : 'none', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                      {item.photoRequired && <span style={{ fontSize: '0.58rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '1px 5px', borderRadius: 4, fontWeight: 900, marginLeft: 6 }}>📸 Photo Required</span>}
                      {item.signatureRequired && <span style={{ fontSize: '0.58rem', color: 'var(--accent-color)', background: 'rgba(79,70,229,0.08)', padding: '1px 5px', borderRadius: 4, fontWeight: 900, marginLeft: 6 }}>✍️ Signature Required</span>}
                      {item.done && (
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>Verified by {item.completedBy} at {new Date(item.completedTime).toLocaleTimeString()}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Canvas Signature Draw Pad */}
            {selectedTask.checklist.some(c => c.signatureRequired && !c.done) && (
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8, letterSpacing: '0.04em' }}>Client Signature Capture Pad</span>
                <canvas
                  ref={canvasRef}
                  width="380"
                  height="110"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ background: '#fff', border: '1px dashed var(--border-color)', borderRadius: 8, cursor: 'crosshair', display: 'block', width: '100%', height: '110px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={clearSignature} style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem' }}>Clear</button>
                  <button className="btn btn-primary btn-sm" onClick={saveSignature} style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}>Log Signature</button>
                </div>
              </div>
            )}

            {/* Collaborative comments logs */}
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8, letterSpacing: '0.04em' }}>Remarks & Logs Feed</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.85rem' }}>
                {(selectedTask.comments || []).map((c, i) => (
                  <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.62rem', marginBottom: 4 }}>
                      <strong>{c.author}</strong>
                      <span>{new Date(c.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', lineHeight: 1.35 }}>{c.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => handleAddComment(e, selectedTask)} style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="Type a remark..."
                  className="form-control"
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem', borderRadius: 8 }}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0.45rem 0.85rem', borderRadius: 8, fontWeight: 700 }}>Post</button>
              </form>
            </div>

            {/* Audit Logs Trail Timeline */}
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8, letterSpacing: '0.04em' }}>Operations Audit Timeline</span>
              <div style={{ borderLeft: '2px solid var(--border-color)', marginLeft: 8, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(selectedTask.activityLogs || []).map((log, i) => (
                  <div key={i} style={{ position: 'relative', fontSize: '0.74rem' }}>
                    <div style={{ position: 'absolute', top: 4, left: -19, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-color)' }} />
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>{new Date(log.timestamp).toLocaleString()}</div>
                    <div style={{ color: 'var(--text-primary)', marginTop: 2 }}><strong>{log.author}</strong>: {log.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Task Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 990 }}>
          <div className="modal-content" style={{ maxWidth: 520, borderRadius: 16 }}>
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 900 }}>➕ Add Operation Task</h3>
              <button className="modal-close" onClick={() => setIsTaskModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTask} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Task Subject *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Chittagong Shipyard installation coordinates check"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Description / Guidelines</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={taskForm.description}
                  onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Enter details..."
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Category</label>
                  <select className="form-control" value={taskForm.category} onChange={e => setTaskForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="Installation">Installation</option>
                    <option value="Calibration">Calibration</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Repair">Repair</option>
                    <option value="Survey">Survey</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Priority</label>
                  <select className="form-control" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🔵 Medium</option>
                    <option value="high">🟡 High</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Load Checklist Template</label>
                <select className="form-control" onChange={e => loadTemplateChecklist(e.target.value)}>
                  <option value="">-- Choose Template to Pre-populate Checklist --</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Target SLA Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={taskForm.slaDueDate ? taskForm.slaDueDate.substring(0, 10) : ''}
                    onChange={e => setTaskForm(f => ({ ...f, slaDueDate: new Date(e.target.value).toISOString() }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Source Sales Invoice</label>
                  <select className="form-control" value={taskForm.sourceId} onChange={e => {
                    const inv = salesInvoices.find(si => si.invoiceNo === e.target.value);
                    setTaskForm(f => ({
                      ...f,
                      sourceModule: inv ? 'sales' : 'general',
                      sourceId: e.target.value,
                      customerId: inv?.customerId || '',
                      customerName: inv?.customerId ? (customers.find(c => c.id === inv.customerId)?.name || '') : ''
                    }));
                  }}>
                    <option value="">-- Select Sales Invoice --</option>
                    {salesInvoices.map(si => <option key={si.invoiceNo} value={si.invoiceNo}>{si.invoiceNo} - {fmt(si.grandTotal)}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)} style={{ borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700, borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Schedule Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto Rules Creation Modal */}
      {isRuleModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 990 }}>
          <div className="modal-content" style={{ maxWidth: 450, borderRadius: 16 }}>
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 900 }}>⚡ Set Auto-Dispatch Criteria</h3>
              <button className="modal-close" onClick={() => setIsRuleModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveRule} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Rule Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={ruleForm.name}
                  onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Priority Delivery for VIP client"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Condition Criteria Trigger IF *</label>
                <select className="form-control" value={ruleForm.condition} onChange={e => setRuleForm(f => ({ ...f, condition: e.target.value }))}>
                  <option value="invoice.grandTotal > 100000">Sales Invoice Total &gt; ৳1,00,000</option>
                  <option value="invoice.grandTotal > 500000">Sales Invoice Total &gt; ৳5,00,000</option>
                  <option value="item.name.toLowerCase().includes('printer')">Product name matches "Printer"</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800, fontSize: '0.72rem' }}>Automatically Trigger Template *</label>
                <select className="form-control" value={ruleForm.templateId} onChange={e => setRuleForm(f => ({ ...f, templateId: e.target.value }))}>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRuleModalOpen(false)} style={{ borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const fmt = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
