const BACKEND_URL = '/api';

const getLocalLogs = () => {
  try {
    const raw = localStorage.getItem('erp_audit_logs');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveLocalLogs = (logs) => {
  const trimmed = logs.slice(0, 2000);
  localStorage.setItem('erp_audit_logs', JSON.stringify(trimmed));
};

export const auditService = {

  log: async ({ userId, userName, module, action, refId = '', refNo = '', description = '', oldData = null, newData = null }) => {
    const entry = {
      userId,
      userName:    userName || 'System',
      module,
      action,
      refId,
      refNo,
      description,
      oldData:     oldData ? JSON.stringify(oldData).substring(0, 1000) : null,
      newData:     newData ? JSON.stringify(newData).substring(0, 1000) : null,
      timestamp:   new Date().toISOString(),
      date:        new Date().toLocaleDateString('en-GB'),
      time:        new Date().toLocaleTimeString('en-GB'),
    };

    // Save locally immediately
    const logs = getLocalLogs();
    const newEntry = { id: `al-${Date.now()}`, ...entry };
    saveLocalLogs([newEntry, ...logs]);

    // Background sync to MySQL
    fetch(`${BACKEND_URL}/erp/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(err => {
      console.warn('[auditService] MySQL log write background failed:', err.message);
    });
  },

  getLogs: async (filters = {}) => {
    const { module, action, userId, fromDate, toDate, limit = 200 } = filters;

    // Background sync
    fetch(`${BACKEND_URL}/erp/audit-logs`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocalLogs(data);
      })
      .catch(err => console.warn('[auditService] MySQL fetch logs background failed:', err.message));

    let logs = getLocalLogs();

    if (module)   logs = logs.filter(l => l.module === module);
    if (action)   logs = logs.filter(l => l.action === action);
    if (userId)   logs = logs.filter(l => l.userId === userId);
    if (fromDate) logs = logs.filter(l => l.timestamp >= fromDate);
    if (toDate)   logs = logs.filter(l => l.timestamp <= toDate + 'T23:59:59');

    return logs.slice(0, limit);
  },

  logLogin:    (user) => auditService.log({ userId: user.uid, userName: user.displayName, module: 'auth',      action: 'login',   description: `User signed in: ${user.email}` }),
  logLogout:   (user) => auditService.log({ userId: user.uid, userName: user.displayName, module: 'auth',      action: 'logout',  description: `User signed out: ${user.email}` }),
  logCreate:   (user, module, refId, refNo, description, newData)        => auditService.log({ userId: user?.uid, userName: user?.displayName, module, action: 'create', refId, refNo, description, newData }),
  logUpdate:   (user, module, refId, refNo, description, oldData, newData) => auditService.log({ userId: user?.uid, userName: user?.displayName, module, action: 'update', refId, refNo, description, oldData, newData }),
  logDelete:   (user, module, refId, refNo, description, oldData)        => auditService.log({ userId: user?.uid, userName: user?.displayName, module, action: 'delete', refId, refNo, description, oldData }),
  logPost:     (user, module, refId, refNo, description)                  => auditService.log({ userId: user?.uid, userName: user?.displayName, module, action: 'post',   refId, refNo, description }),
  logApprove:  (user, module, refId, refNo, description)                  => auditService.log({ userId: user?.uid, userName: user?.displayName, module, action: 'approve',refId, refNo, description }),
  logReverse:  (user, module, refId, refNo, description)                  => auditService.log({ userId: user?.uid, userName: user?.displayName, module, action: 'reverse',refId, refNo, description }),
};
