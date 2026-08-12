import { useState, useEffect } from 'react';
import { auditService } from '../services/auditService';

const ACTION_COLORS = {
  create:  { bg: 'rgba(34,197,94,0.1)',  color: '#16a34a', label: 'Created'  },
  update:  { bg: 'rgba(37,99,235,0.1)',  color: '#2563eb', label: 'Updated'  },
  delete:  { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'Deleted'  },
  login:   { bg: 'rgba(124,58,237,0.1)', color: '#7c3aed', label: 'Login'    },
  logout:  { bg: 'rgba(100,116,139,0.1)',color: '#64748b', label: 'Logout'   },
  post:    { bg: 'rgba(8,145,178,0.1)',  color: '#0891b2', label: 'Posted'   },
  approve: { bg: 'rgba(217,119,6,0.1)',  color: '#d97706', label: 'Approved' },
  reverse: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'Reversed' },
};

const MODULE_ICONS = {
  inventory:  '📦', purchases: '🛒', sales: '🧾',
  accounting: '⚖️', auth: '🔐', settings: '⚙️',
  ledgers: '👥', vouchers: '📝',
};

export default function AuditLogView() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ module: '', action: '', fromDate: '', toDate: '', search: '' });

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getLogs({ limit: 500 });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  // Initial load — we call the async fn inside the effect directly to satisfy linter
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await auditService.getLogs({ limit: 500 });
        if (!cancelled) setLogs(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = logs.filter(l => {
    if (filters.module && l.module !== filters.module) return false;
    if (filters.action && l.action !== filters.action) return false;
    if (filters.fromDate && l.timestamp < filters.fromDate) return false;
    if (filters.toDate   && l.timestamp > filters.toDate + 'T23:59:59') return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!l.description?.toLowerCase().includes(q) &&
          !l.userName?.toLowerCase().includes(q) &&
          !l.refNo?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))];
  const actions = [...new Set(logs.map(l => l.action).filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">🔍 Audit Logs</h1>
        <button onClick={loadLogs} className="btn btn-secondary btn-sm">↻ Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Events',   value: logs.length,                                  color: '#2563eb' },
          { label: 'Today',          value: logs.filter(l => l.date === new Date().toLocaleDateString('en-GB')).length, color: '#7c3aed' },
          { label: 'Create Actions', value: logs.filter(l => l.action === 'create').length, color: '#059669' },
          { label: 'Delete Actions', value: logs.filter(l => l.action === 'delete').length, color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.75rem' }}>
          <input className="form-control" placeholder="Search description, user, ref…" value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          <select className="form-control" value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}>
            <option value="">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{MODULE_ICONS[m] || '📌'} {m}</option>)}
          </select>
          <select className="form-control" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
            <option value="">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="date" className="form-control" value={filters.fromDate} onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))} />
          <input type="date" className="form-control" value={filters.toDate}   onChange={e => setFilters(f => ({ ...f, toDate:   e.target.value }))} />
          <button className="btn btn-secondary" onClick={() => setFilters({ module: '', action: '', fromDate: '', toDate: '', search: '' })}>Clear</button>
        </div>
      </div>

      {/* Log Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit logs…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
            <div>No audit events found. Actions will appear here as users interact with the system.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Module</th>
                <th>Action</th>
                <th>Ref No.</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const actionStyle = ACTION_COLORS[log.action] || { bg: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)', label: log.action };
                return (
                  <tr key={log.id || i}>
                    <td style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      <div>{log.date}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{log.time}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.userName || '—'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{log.userId?.substring(0, 8)}…</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                        {MODULE_ICONS[log.module] || '📌'} {log.module}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 700, background: actionStyle.bg, color: actionStyle.color }}>
                        {actionStyle.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent-color)' }}>{log.refNo || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 360 }}>{log.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        Showing {filtered.length} of {logs.length} events
      </div>
    </div>
  );
}
