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

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-install',
    title: 'Standard Product Installation & Setup',
    category: 'Installation',
    type: 'Installation',
    estimatedHours: 6,
    priority: 'medium',
    checklist: [
      { id: 'c1', title: 'Prepare equipment and carry to site', mandatory: true, photoRequired: false, signatureRequired: false },
      { id: 'c2', title: 'Assemble and securely mount device', mandatory: true, photoRequired: true, signatureRequired: false },
      { id: 'c3', title: 'Power test and initialization logs check', mandatory: true, photoRequired: false, signatureRequired: false },
      { id: 'c4', title: 'Obtain client sign-off sheet', mandatory: true, photoRequired: true, signatureRequired: true }
    ]
  },
  {
    id: 'tpl-calib',
    title: 'Precision Calibration & ISO Alignment',
    category: 'Calibration',
    type: 'Calibration',
    estimatedHours: 4,
    priority: 'high',
    checklist: [
      { id: 'c1', title: 'Inspect instrument for physical damage', mandatory: true },
      { id: 'c2', title: 'Perform zero-point baseline adjustment', mandatory: true },
      { id: 'c3', title: 'Test precision against standard meters', mandatory: true }
    ]
  }
];

const DEFAULT_RULES = [
  {
    id: 'rule-invoice-total',
    name: 'Auto-Install for Major Sales',
    triggerModule: 'sales',
    condition: 'invoice.grandTotal > 100000',
    templateId: 'tpl-install',
    assigneeRole: 'Field Engineer',
    active: true
  }
];

const INITIAL_TASKS = [
  {
    id: 'task-1',
    taskNo: 'TSK-2026-0001',
    title: 'Install Developer Laptop for Dhaka Workspaces',
    description: 'Provide full unboxing and local network configurations for Sajid Islam.',
    category: 'Installation',
    type: 'Installation',
    sourceModule: 'sales',
    sourceId: 'ticket-1',
    customerId: 'cust-1',
    customerName: 'Dhaka Workspaces Inc.',
    branchId: 'br-1',
    priority: 'medium',
    urgency: 'medium',
    assigneeRole: 'Field Engineer',
    assignedTo: 'emp-103',
    status: 'completed',
    checklist: [
      { id: 'c1', title: 'Prepare equipment and carry to site', mandatory: true, status: 'checked', verifiedAt: '2026-06-24T12:00:00Z', verifiedBy: 'emp-103' },
      { id: 'c2', title: 'Assemble and securely mount device', mandatory: true, status: 'checked', verifiedAt: '2026-06-24T13:00:00Z', verifiedBy: 'emp-103' },
      { id: 'c3', title: 'Power test and initialization logs check', mandatory: true, status: 'checked', verifiedAt: '2026-06-24T13:30:00Z', verifiedBy: 'emp-103' },
      { id: 'c4', title: 'Obtain client sign-off sheet', mandatory: true, status: 'checked', verifiedAt: '2026-06-24T16:30:00Z', verifiedBy: 'emp-103' }
    ],
    comments: [
      { id: 'com-1', author: 'Field Service Tech A', text: 'Installation complete. Customer signed.', timestamp: '2026-06-24T16:30:00Z' }
    ],
    history: [
      { status: 'Pending', remark: 'Task assigned.', updater: 'System', timestamp: '2026-06-24T10:15:00Z' },
      { status: 'completed', remark: 'Technician signed off.', updater: 'Field Service Tech A', timestamp: '2026-06-24T16:30:00Z' }
    ],
    attachments: [],
    startedAt: '2026-06-24T11:00:00Z',
    completedAt: '2026-06-24T16:30:00Z',
    createdAt: '2026-06-24T10:15:00Z'
  }
];

export const taskService = {
  initLocalDB: () => {
    if (!localStorage.getItem('erp_tasks')) saveLocal('erp_tasks', INITIAL_TASKS);
    if (!localStorage.getItem('erp_task_templates')) saveLocal('erp_task_templates', DEFAULT_TEMPLATES);
    if (!localStorage.getItem('erp_task_rules')) saveLocal('erp_task_rules', DEFAULT_RULES);
  },

  getTasks: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/tasks`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_tasks', data);
      })
      .catch(err => console.warn('[taskService] MySQL fetch tasks background failed', err.message));

    taskService.initLocalDB();
    return getLocal('erp_tasks');
  },

  getTemplates: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/tasks/templates`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_task_templates', data);
      })
      .catch(err => console.warn('[taskService] MySQL fetch templates background failed', err.message));

    taskService.initLocalDB();
    return getLocal('erp_task_templates', DEFAULT_TEMPLATES);
  },

  getRules: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/tasks/rules`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_task_rules', data);
      })
      .catch(err => console.warn('[taskService] MySQL fetch rules background failed', err.message));

    taskService.initLocalDB();
    return getLocal('erp_task_rules', DEFAULT_RULES);
  },

  saveTask: async (task, currentUser) => {
    const tasks = taskService.getTasks();
    const taskData = {
      ...task,
      checklist: task.checklist || [],
      comments: task.comments || [],
      history: task.history || [],
      attachments: task.attachments || [],
      completionPercent: taskService.calculateCompletionPercent(task.checklist || []),
      updatedAt: new Date().toISOString()
    };

    if (task.taskNo) {
      const old = tasks.find(t => t.taskNo === task.taskNo);
      if (old && old.status !== taskData.status) {
        taskData.history = [
          ...(taskData.history || []),
          {
            status: taskData.status,
            remark: `Status transitioned from ${old.status.toUpperCase()} to ${taskData.status.toUpperCase()}`,
            updater: currentUser?.displayName || 'system',
            timestamp: new Date().toISOString()
          }
        ];
        
        if (taskData.status === 'accepted') taskData.startedAt = new Date().toISOString();
        if (taskData.status === 'completed') taskData.completedAt = new Date().toISOString();
      }
    } else {
      taskData.id = `tsk-${Date.now()}`;
      taskData.taskNo = `TSK-2026-${String(tasks.length + 1).padStart(4, '0')}`;
      taskData.createdAt = new Date().toISOString();
      taskData.history = [
        {
          status: taskData.status || 'Pending',
          remark: 'Task created.',
          updater: currentUser?.displayName || 'system',
          timestamp: new Date().toISOString()
        }
      ];
    }

    const updated = task.taskNo 
      ? tasks.map(t => t.taskNo === task.taskNo ? taskData : t)
      : [taskData, ...tasks];
    saveLocal('erp_tasks', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    }).catch(err => console.warn(err));

    if (task.taskNo) {
      const old = tasks.find(t => t.taskNo === task.taskNo);
      await auditService.logUpdate(currentUser, 'sales', task.taskNo, task.taskNo, `Task ${task.taskNo} updated: Status is ${taskData.status}`, old, taskData);
    } else {
      await auditService.logCreate(currentUser, 'sales', taskData.taskNo, taskData.taskNo, `Task ${taskData.taskNo} created.`, taskData);
    }

    return taskData;
  },

  deleteTask: (taskNo) => {
    const tasks = taskService.getTasks();
    const updated = tasks.filter(t => t.taskNo !== taskNo);
    saveLocal('erp_tasks', updated);

    // Background delete
    fetch(`${BACKEND_URL}/erp/tasks/${taskNo}`, {
      method: 'DELETE'
    }).catch(err => console.warn(err));

    return true;
  },

  saveTemplate: (tpl) => {
    const templates = taskService.getTemplates();
    const tplData = {
      ...tpl,
      checklist: tpl.checklist || []
    };

    if (!tplData.id) {
      tplData.id = `tpl-${Date.now()}`;
    }

    const updated = tpl.id 
      ? templates.map(t => t.id === tpl.id ? tplData : t)
      : [tplData, ...templates];
    saveLocal('erp_task_templates', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/tasks/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tplData)
    }).catch(err => console.warn(err));

    return tplData;
  },

  deleteTemplate: (id) => {
    const templates = taskService.getTemplates();
    const updated = templates.filter(t => t.id !== id);
    saveLocal('erp_task_templates', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/tasks/templates/${id}`, {
      method: 'DELETE'
    }).catch(err => console.warn(err));

    return true;
  },

  saveRule: (rule) => {
    const ruleData = {
      ...rule,
      active: rule.active ? 1 : 0
    };

    if (!ruleData.id) {
      ruleData.id = `rule-${Date.now()}`;
    }

    const rules = taskService.getRules();
    const updated = rule.id 
      ? rules.map(r => r.id === rule.id ? ruleData : r)
      : [ruleData, ...rules];
    saveLocal('erp_task_rules', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/tasks/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData)
    }).catch(err => console.warn(err));

    return ruleData;
  },

  calculateCompletionPercent: (checklist) => {
    if (!checklist || checklist.length === 0) return 0;
    const checked = checklist.filter(c => c.status === 'checked').length;
    return Math.round((checked / checklist.length) * 100);
  },

  getTechnicians: () => {
    return [
      { id: 'emp-103', displayName: 'Field Service Tech A' },
      { id: 'emp-104', displayName: 'Field Service Tech B' }
    ];
  },

  getAllEmployees: () => {
    return [
      { id: 'emp-101', displayName: 'Managing Director' },
      { id: 'emp-102', displayName: 'CFO' },
      { id: 'emp-103', displayName: 'Field Service Tech A' },
      { id: 'emp-104', displayName: 'Field Service Tech B' }
    ];
  },

  triggerAutoTaskRules: async (sourceModule, document, currentUser) => {
    const rules = taskService.getRules();
    const activeRules = rules.filter(r => r.active && r.triggerModule === sourceModule);
    
    for (const rule of activeRules) {
      try {
        let match = false;
        if (rule.condition.includes('invoice.grandTotal >')) {
          const threshold = Number(rule.condition.split('>')[1].trim());
          if (Number(document.grandTotal) > threshold) {
            match = true;
          }
        }

        if (match) {
          const templates = taskService.getTemplates();
          const tpl = templates.find(t => t.id === rule.templateId);
          if (tpl) {
            const newTask = {
              title: `Auto-task: ${tpl.title}`,
              description: `Generated automatically via Rule: ${rule.name}`,
              category: tpl.category,
              type: tpl.type,
              sourceModule,
              sourceId: document.id || document.invoiceNo || '',
              customerId: document.customerId || '',
              customerName: document.customerName || '',
              branchId: document.branchId || 'br-1',
              priority: tpl.priority || 'medium',
              urgency: 'medium',
              assigneeRole: rule.assigneeRole,
              assignedTo: '',
              status: 'Pending',
              checklist: tpl.checklist.map(c => ({ ...c, status: 'unchecked' }))
            };
            await taskService.saveTask(newTask, currentUser);
          }
        }
      } catch (err) {
        console.error('[taskService] triggerAutoTaskRules evaluate failed:', err.message);
      }
    }
  }
};
