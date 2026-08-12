import { salesService } from './salesService';
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

const MOCK_LEADS = [
  {
    id: 'lead-1',
    name: 'Gulshan Workspace Fitout',
    company: 'Dhaka Workspaces Inc.',
    contactPerson: 'Sajid Islam',
    email: 'procurement@dhakawork.bd',
    phone: '+880 1911-332211',
    stage: 'Negotiation',
    value: 1200000,
    expectedCloseDate: '2026-07-15',
    priority: 'High',
    assignee: 'Sales Executive',
    notes: [
      { id: 'act-1', type: 'Call', date: '2026-06-20', summary: 'Initial requirements call', details: 'Sajid showed high interest in full office hardware setup and cabling services.', author: 'Sales Executive' },
      { id: 'act-2', type: 'Meeting', date: '2026-06-23', summary: 'Proposal review meeting', details: 'Reviewed BDT 1.2M quote. Sajid requested a 5% discount on installation charges. Negotiation ongoing.', author: 'Sales Executive' }
    ],
    tasks: [
      { id: 'tsk-1', description: 'Follow up on proposal feedback', dueDate: '2026-06-28', status: 'Pending' },
      { id: 'tsk-2', description: 'Draft revised service SLA', dueDate: '2026-06-30', status: 'Pending' }
    ],
    createdAt: '2026-06-20T10:00:00.000Z'
  },
  {
    id: 'lead-2',
    name: 'Spare Parts Bulk Supply',
    company: 'Chittagong Shipyards Ltd.',
    contactPerson: 'Anwar Hossain',
    email: 'anwar@ctgship.com',
    phone: '+880 1515-998877',
    stage: 'Proposal Sent',
    value: 450000,
    expectedCloseDate: '2026-08-01',
    priority: 'Medium',
    assignee: 'Sales Executive',
    notes: [
      { id: 'act-3', type: 'Email', date: '2026-06-22', summary: 'Sent RFQ pricing sheet', details: 'Emailed custom pricing for spare part components with standard 15% discount limit.', author: 'Sales Executive' }
    ],
    tasks: [
      { id: 'tsk-3', description: 'Check technical drawing compliance', dueDate: '2026-07-05', status: 'Pending' }
    ],
    createdAt: '2026-06-22T09:00:00.000Z'
  }
];

export const crmService = {
  getLeads: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/leads`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_crm_leads', data);
      })
      .catch(err => console.warn('[crmService] MySQL getLeads background sync failed', err.message));

    return getLocal('erp_crm_leads', MOCK_LEADS);
  },

  fetchLeadsAsync: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/leads`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveLocal('erp_crm_leads', data);
          return data;
        }
      }
    } catch (err) {
      console.warn('[crmService] MySQL fetchLeadsAsync failed:', err.message);
    }
    return getLocal('erp_crm_leads', MOCK_LEADS);
  },


  saveLead: (lead) => {
    const leadData = {
      ...lead,
      value: Number(lead.value || 0),
      notes: lead.notes || [],
      tasks: lead.tasks || [],
      createdAt: lead.createdAt || new Date().toISOString()
    };

    if (!leadData.id) {
      leadData.id = `lead-${Date.now()}`;
      if (!leadData.stage) leadData.stage = 'Lead';
    }

    const leads = getLocal('erp_crm_leads', MOCK_LEADS);
    const updated = lead.id 
      ? leads.map(item => item.id === lead.id ? { ...item, ...leadData } : item)
      : [leadData, ...leads];
      
    saveLocal('erp_crm_leads', updated);

    // Background sync post to MySQL
    fetch(`${BACKEND_URL}/erp/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    })
    .then(res => {
      if (res.ok) console.log(`[crmService] Lead synced to MySQL: ${leadData.name}`);
    })
    .catch(err => console.warn('[crmService] MySQL saveLead sync failed', err.message));

    return leadData;
  },

  deleteLead: (id) => {
    const leads = getLocal('erp_crm_leads', MOCK_LEADS);
    const updated = leads.filter(item => item.id !== id);
    saveLocal('erp_crm_leads', updated);

    // Background delete from MySQL
    fetch(`${BACKEND_URL}/erp/leads/${id}`, {
      method: 'DELETE'
    })
    .then(res => {
      if (res.ok) console.log(`[crmService] Lead deleted from MySQL: ${id}`);
    })
    .catch(err => console.warn('[crmService] MySQL deleteLead sync failed', err.message));

    return true;
  },

  addActivity: async (leadId, activityForm, currentUser) => {
    const leads = getLocal('erp_crm_leads', MOCK_LEADS);
    const lead = leads.find(item => item.id === leadId);
    if (!lead) throw new Error('Lead opportunity not found');

    const activity = {
      id: `act-${Date.now()}`,
      type: activityForm.type || 'Note',
      date: activityForm.date || new Date().toISOString().substring(0, 10),
      summary: activityForm.summary || '',
      details: activityForm.details || '',
      author: currentUser?.displayName || 'System'
    };

    lead.notes = lead.notes || [];
    lead.notes.unshift(activity);
    
    crmService.saveLead(lead);

    await auditService.logUpdate(currentUser, 'sales', lead.id, lead.name, `Logged activity (${activity.type}) for CRM Lead: ${lead.name}`, null, lead);
    return activity;
  },

  addTask: async (leadId, taskForm, currentUser) => {
    const leads = getLocal('erp_crm_leads', MOCK_LEADS);
    const lead = leads.find(item => item.id === leadId);
    if (!lead) throw new Error('Lead opportunity not found');

    const task = {
      id: `tsk-${Date.now()}`,
      description: taskForm.description || '',
      dueDate: taskForm.dueDate || new Date().toISOString().substring(0, 10),
      status: 'Pending'
    };

    lead.tasks = lead.tasks || [];
    lead.tasks.unshift(task);

    crmService.saveLead(lead);

    await auditService.logUpdate(currentUser, 'sales', lead.id, lead.name, `Created follow-up task on CRM Lead: ${lead.name}`, null, lead);
    return task;
  },

  toggleTaskStatus: async (leadId, taskId) => {
    const leads = getLocal('erp_crm_leads', MOCK_LEADS);
    const lead = leads.find(item => item.id === leadId);
    if (!lead) throw new Error('Lead opportunity not found');

    lead.tasks = (lead.tasks || []).map(t => {
      if (t.id === taskId) {
        return { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' };
      }
      return t;
    });

    crmService.saveLead(lead);
    return lead.tasks;
  },

  convertToCustomer: async (leadId, customerForm, currentUser) => {
    const leads = getLocal('erp_crm_leads', MOCK_LEADS);
    const lead = leads.find(item => item.id === leadId);
    if (!lead) throw new Error('Lead opportunity not found');

    const newCustomer = {
      id: `cust-${Date.now()}`,
      code: customerForm.code || `CST-${String(Date.now()).slice(-3)}`,
      name: customerForm.name || lead.company,
      contact: customerForm.contact || lead.contactPerson,
      phone: customerForm.phone || lead.phone,
      email: customerForm.email || lead.email,
      address: customerForm.address || 'Dhaka, Bangladesh',
      vatNo: customerForm.vatNo || '',
      tin: customerForm.tin || '',
      accountId: null,
      currentBalance: 0,
      creditLimit: Number(customerForm.creditLimit || 500000),
      paymentTermDays: Number(customerForm.paymentTermDays || 30),
      isActive: true
    };

    await salesService.saveCustomer(newCustomer, false, currentUser);

    lead.stage = 'Closed Won';
    lead.notes = lead.notes || [];
    lead.notes.unshift({
      id: `act-${Date.now()}`,
      type: 'Note',
      date: new Date().toISOString().substring(0, 10),
      summary: 'Converted to ERP Customer',
      details: `Lead closed as WON. Customer profile registered successfully as ${newCustomer.name} (Code: ${newCustomer.code}).`,
      author: currentUser?.displayName || 'System'
    });

    crmService.saveLead(lead);

    await auditService.logUpdate(currentUser, 'sales', lead.id, lead.name, `Converted CRM Lead ${lead.name} to ERP Customer ${newCustomer.name}`, null, lead);
    return newCustomer;
  }
};
