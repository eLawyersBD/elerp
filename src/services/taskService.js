import { USER_SEEDS } from '../utils/userSeeds';
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
      { id: 'c4', title: 'Conduct user training and hand over documentation', mandatory: false, photoRequired: false, signatureRequired: true },
      { id: 'c5', title: 'Obtain client sign-off sheet', mandatory: true, photoRequired: true, signatureRequired: true }
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
      { id: 'c1', title: 'Inspect instrument for physical damage', mandatory: true, photoRequired: false, signatureRequired: false },
      { id: 'c2', title: 'Perform zero-point baseline adjustment', mandatory: true, photoRequired: false, signatureRequired: false },
      { id: 'c3', title: 'Test precision against certified standard weights/meters', mandatory: true, photoRequired: true, signatureRequired: false },
      { id: 'c4', title: 'Generate and upload ISO calibration report', mandatory: true, photoRequired: true, signatureRequired: false }
    ]
  },
  {
    id: 'tpl-amc',
    title: 'Routine Monthly AMC Maintenance Visit',
    category: 'Maintenance',
    type: 'AMC',
    estimatedHours: 3,
    priority: 'low',
    checklist: [
      { id: 'c1', title: 'Clean dust filters and check cooling systems', mandatory: true, photoRequired: false, signatureRequired: false },
      { id: 'c2', title: 'Run system diagnostics & diagnostic error logs check', mandatory: true, photoRequired: true, signatureRequired: false },
      { id: 'c3', title: 'Confirm electrical backups and UPS safety margins', mandatory: true, photoRequired: false, signatureRequired: false },
      { id: 'c4', title: 'Log routine visit in logbook', mandatory: true, photoRequired: false, signatureRequired: true }
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
  },
  {
    id: 'rule-service-calib',
    name: 'Auto-Calibrate on Precision Devices',
    triggerModule: 'sales',
    condition: 'item.name.toLowerCase().includes("battery") || item.name.toLowerCase().includes("printer")',
    templateId: 'tpl-calib',
    assigneeRole: 'Specialist',
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
    assigneeId: 'emp-103',
    assigneeName: 'Field Service Tech A',
    assignedTo: 'emp-103',
    status: 'completed',
    slaDueDate: '2026-06-24T17:00:00Z',
    completionPercent: 100,
    checklist: [
      { id: 'c1', title: 'Prepare equipment and carry to site', mandatory: true, status: 'checked', done: true, verifiedAt: '2026-06-24T12:00:00Z', verifiedBy: 'emp-103' },
      { id: 'c2', title: 'Assemble and securely mount device', mandatory: true, status: 'checked', done: true, verifiedAt: '2026-06-24T13:00:00Z', verifiedBy: 'emp-103' },
      { id: 'c3', title: 'Power test and initialization logs check', mandatory: true, status: 'checked', done: true, verifiedAt: '2026-06-24T13:30:00Z', verifiedBy: 'emp-103' },
      { id: 'c4', title: 'Obtain client sign-off sheet', mandatory: true, status: 'checked', done: true, verifiedAt: '2026-06-24T16:30:00Z', verifiedBy: 'emp-103' }
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

  getTasks: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/tasks`);
      if (res.ok) {
        const data = await res.json();
        saveLocal('erp_tasks', data);
        return data;
      }
    } catch (err) {
      console.warn('[taskService] MySQL fetch tasks failed, using local', err.message);
    }
    taskService.initLocalDB();
    return getLocal('erp_tasks');
  },

  getTemplates: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/tasks/templates`);
      if (res.ok) {
        const data = await res.json();
        saveLocal('erp_task_templates', data);
        return data;
      }
    } catch (err) {
      console.warn('[taskService] MySQL fetch templates failed, using local', err.message);
    }
    taskService.initLocalDB();
    return getLocal('erp_task_templates', DEFAULT_TEMPLATES);
  },

  getRules: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/tasks/rules`);
      if (res.ok) {
        const data = await res.json();
        saveLocal('erp_task_rules', data);
        return data;
      }
    } catch (err) {
      console.warn('[taskService] MySQL fetch rules failed, using local', err.message);
    }
    taskService.initLocalDB();
    return getLocal('erp_task_rules', DEFAULT_RULES);
  },

  saveTask: async (task, currentUser) => {
    const tasks = await taskService.getTasks();
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

    try {
      await fetch(`${BACKEND_URL}/erp/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
    } catch (err) {
      console.warn('[taskService] MySQL saveTask failed', err.message);
    }

    const updated = task.taskNo 
      ? tasks.map(t => t.taskNo === task.taskNo ? taskData : t)
      : [taskData, ...tasks];
    saveLocal('erp_tasks', updated);

    if (task.taskNo) {
      const old = tasks.find(t => t.taskNo === task.taskNo);
      await auditService.logUpdate(currentUser, 'sales', task.taskNo, task.taskNo, `Task ${task.taskNo} updated: Status is ${taskData.status}`, old, taskData);
    } else {
      await auditService.logCreate(currentUser, 'sales', taskData.taskNo, taskData.taskNo, `Task ${taskData.taskNo} created.`, taskData);
    }

    return taskData;
  },

  deleteTask: async (taskNo) => {
    try {
      await fetch(`${BACKEND_URL}/erp/tasks/${taskNo}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[taskService] MySQL deleteTask failed', err.message);
    }

    const tasks = await taskService.getTasks();
    const updated = tasks.filter(t => t.taskNo !== taskNo);
    saveLocal('erp_tasks', updated);
    return true;
  },

  saveTemplate: async (tpl) => {
    const templates = await taskService.getTemplates();
    const tplData = {
      ...tpl,
      checklist: tpl.checklist || []
    };

    if (!tplData.id) {
      tplData.id = `tpl-${Date.now()}`;
    }

    try {
      await fetch(`${BACKEND_URL}/erp/tasks/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tplData)
      });
    } catch (err) {
      console.warn('[taskService] MySQL saveTemplate failed', err.message);
    }

    const updated = tpl.id 
      ? templates.map(t => t.id === tpl.id ? tplData : t)
      : [tplData, ...templates];
    saveLocal('erp_task_templates', updated);
    return tplData;
  },

  deleteTemplate: async (id) => {
    try {
      await fetch(`${BACKEND_URL}/erp/tasks/templates/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[taskService] MySQL deleteTemplate failed', err.message);
    }

    const templates = await taskService.getTemplates();
    const updated = templates.filter(t => t.id !== id);
    saveLocal('erp_task_templates', updated);
    return true;
  },

  saveRule: async (rule) => {
    const ruleData = {
      ...rule,
      active: rule.active ? 1 : 0
    };

    if (!ruleData.id) {
      ruleData.id = `rule-${Date.now()}`;
    }

    try {
      await fetch(`${BACKEND_URL}/erp/tasks/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
    } catch (err) {
      console.warn('[taskService] MySQL saveRule failed', err.message);
    }

    const rules = await taskService.getRules();
    const updated = rule.id 
      ? rules.map(r => r.id === rule.id ? ruleData : r)
      : [ruleData, ...rules];
    saveLocal('erp_task_rules', updated);
    return ruleData;
  },

  calculateCompletionPercent: (checklist) => {
    if (!checklist || checklist.length === 0) return 0;
    // Support both old format (status='checked') and new format (done=true)
    const checked = checklist.filter(c => c.status === 'checked' || c.done === true).length;
    return Math.round((checked / checklist.length) * 100);
  },

  getTechnicians: () => {
    return [
      { id: 'emp-103', name: 'Field Service Tech A', displayName: 'Field Service Tech A', role: 'Field Engineer', rating: 4.8 },
      { id: 'emp-104', name: 'Field Service Tech B', displayName: 'Field Service Tech B', role: 'Field Engineer', rating: 4.6 },
      { id: 'emp-105', name: 'Calibration Specialist', displayName: 'Calibration Specialist', role: 'Specialist', rating: 4.9 }
    ];
  },

  getAllEmployees: () => {
    return USER_SEEDS.map(u => ({ id: u.id, name: u.name, code: u.employeeCode, email: u.email }));
  },

  triggerAutoTaskRules: async (sourceModule, document, currentUser) => {
    const rules = await taskService.getRules();
    const activeRules = rules.filter(r => r.active && r.triggerModule === sourceModule);
    
    for (const rule of activeRules) {
      try {
        let match = false;
        // Simple condition parser e.g. "invoice.grandTotal > 100000"
        if (rule.condition.includes('invoice.grandTotal >')) {
          const threshold = Number(rule.condition.split('>')[1].trim());
          if (Number(document.grandTotal) > threshold) {
            match = true;
          }
        }

        if (match) {
          const templates = await taskService.getTemplates();
          const tpl = templates.find(t => t.id === rule.templateId);
          if (tpl) {
            // Auto create task
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
