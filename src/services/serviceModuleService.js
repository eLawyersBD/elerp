import { inventoryService } from './inventoryService';
import { accountingService } from './accountingService';
import { auditService } from './auditService';
import { defaultAccountMap } from '../database/seedData';
import { INITIAL_SERVICE_CATALOG } from '../database/seedServices';

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

const INITIAL_ASSETS = [
  {
    id: 'asset-1',
    serialNo: 'DL-LAT-8798124',
    productId: 'prod-1',
    productName: 'Dell Latitude 5420 Laptop',
    customerId: 'cust-1',
    customerName: 'Dhaka Workspaces Inc.',
    purchaseDate: '2026-01-10',
    warrantyExpiry: '2027-01-10',
    installationDate: '2026-01-12',
    calibrationDueDate: '2026-07-12',
    amcContractId: 'amc-1',
    serviceHistory: ['ticket-1'],
    partsChanged: [],
    modelConfig: 'Core i5 / 16GB RAM / 512GB SSD / Win 11 Pro',
    firmwareVersion: 'v1.4.2 BIOS',
    softwareLicense: 'WIN-PRO-OEM-2026',
    gpsCoordinates: '23.7925, 90.4078',
    commissioningReport: 'Initial boot success. Temperature nominal.',
    atrStatus: 'Passed',
    healthScore: 92,
    attachments: [
      { name: 'User Manual.pdf', url: '#' },
      { name: 'Calibration Cert.pdf', url: '#' }
    ]
  }
];

const INITIAL_CONTRACTS = [
  {
    id: 'amc-1',
    contractNo: 'AMC-2026-001',
    customerId: 'cust-1',
    customerName: 'Dhaka Workspaces Inc.',
    machineId: 'asset-1',
    machineName: 'Dell Latitude Laptop (DL-LAT-8798124)',
    startDate: '2026-01-15',
    endDate: '2027-01-15',
    visitSchedule: 'Quarterly',
    freeVisitsIncluded: 4,
    visitsUsed: 1,
    chargeableVisits: 0,
    nextVisitDate: '2026-07-15',
    status: 'active'
  }
];

const INITIAL_TICKETS = [
  {
    id: 'ticket-1',
    ticketNo: 'TK-0001',
    customerId: 'cust-1',
    customerName: 'Dhaka Workspaces Inc.',
    productId: 'prod-1',
    productName: 'Dell Latitude Laptop',
    serialNo: 'DL-LAT-8798124',
    assetId: 'asset-1',
    invoiceNo: 'ERP-S-0001',
    serviceType: 'repair',
    warrantyStatus: 'active',
    problemDescription: 'Display flickering during screen sharing.',
    technicianId: 'emp-103',
    status: 'completed',
    priority: 'medium',
    slaDeadline: '2026-06-25T14:00:00.000Z',
    resolutionNotes: 'Updated display graphics firmware and calibrated refresh rate. Display flickering resolved.',
    sparesUsed: [],
    serviceFee: 1200.00,
    billingStatus: 'billed',
    billNo: 'SRV-BL-90181',
    billAmount: 1200.00,
    completedAt: '2026-06-24T16:30:00.000Z',
    timeline: [
      { stage: 'Ticket Raised', date: '2026-06-24T10:00:00.000Z', note: 'Problem submitted.' },
      { stage: 'Technician Assigned', date: '2026-06-24T10:15:00.000Z', note: 'Assigned to Technician.' },
      { stage: 'Technician Accepted', date: '2026-06-24T10:30:00.000Z', note: 'Accepted.' },
      { stage: 'Completed', date: '2026-06-24T16:30:00.000Z', note: 'Signed off.' }
    ],
    gpsCheckIn: '23.7924, 90.4079',
    customerSignature: 'Sajid Islam Signature',
    attachments: [],
    internalNotes: 'Client verified fix.',
    createdAt: '2026-06-24T10:00:00.000Z'
  }
];

const INITIAL_CATALOG = INITIAL_SERVICE_CATALOG;

export const serviceModuleService = {
  initLocalDB: () => {
    if (!localStorage.getItem('erp_service_assets')) saveLocal('erp_service_assets', INITIAL_ASSETS);
    if (!localStorage.getItem('erp_amc_contracts')) saveLocal('erp_amc_contracts', INITIAL_CONTRACTS);
    if (!localStorage.getItem('erp_service_tickets')) saveLocal('erp_service_tickets', INITIAL_TICKETS);
    const existingCat = getLocal('erp_service_catalog', []);
    if (!localStorage.getItem('erp_service_catalog') || existingCat.length < INITIAL_CATALOG.length) {
      saveLocal('erp_service_catalog', INITIAL_CATALOG);
    }
    if (!localStorage.getItem('erp_service_estimates')) saveLocal('erp_service_estimates', []);
  },

  getAssets: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/services/assets`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_service_assets', data);
      })
      .catch(err => console.warn('[serviceModuleService] MySQL getAssets background failed', err.message));

    serviceModuleService.initLocalDB();
    return getLocal('erp_service_assets');
  },

  saveAsset: (asset) => {
    const assetData = {
      ...asset,
      healthScore: Number(asset.healthScore || 100),
      serviceHistory: asset.serviceHistory || [],
      partsChanged: asset.partsChanged || [],
      attachments: asset.attachments || []
    };

    if (!assetData.id) {
      assetData.id = `asset-${Date.now()}`;
    }

    const assets = getLocal('erp_service_assets', INITIAL_ASSETS);
    const updated = asset.id 
      ? assets.map(a => a.id === asset.id ? { ...a, ...assetData } : a)
      : [assetData, ...assets];
    saveLocal('erp_service_assets', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/services/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData)
    }).catch(err => console.warn(err));

    return assetData;
  },

  getContracts: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/services/amc`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_amc_contracts', data);
      })
      .catch(err => console.warn('[serviceModuleService] MySQL getContracts background failed', err.message));

    serviceModuleService.initLocalDB();
    return getLocal('erp_amc_contracts');
  },

  saveContract: (contract) => {
    const contractData = {
      ...contract,
      freeVisitsIncluded: Number(contract.freeVisitsIncluded || 4),
      visitsUsed: Number(contract.visitsUsed || 0),
      chargeableVisits: Number(contract.chargeableVisits || 0)
    };

    if (!contractData.id) {
      contractData.id = `amc-${Date.now()}`;
      contractData.contractNo = `AMC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    }

    const contracts = getLocal('erp_amc_contracts', INITIAL_CONTRACTS);
    const updated = contract.id 
      ? contracts.map(c => c.id === contract.id ? { ...c, ...contractData } : c)
      : [contractData, ...contracts];
    saveLocal('erp_amc_contracts', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/services/amc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractData)
    }).catch(err => console.warn(err));

    return contractData;
  },

  getTickets: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/services/tickets`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_service_tickets', data);
      })
      .catch(err => console.warn('[serviceModuleService] MySQL getTickets background failed', err.message));

    serviceModuleService.initLocalDB();
    return getLocal('erp_service_tickets');
  },

  saveTicket: async (ticket, currentUser) => {
    const tickets = serviceModuleService.getTickets();
    const ticketData = {
      ...ticket,
      serviceFee: Number(ticket.serviceFee || 0),
      billAmount: Number(ticket.billAmount || 0),
      sparesUsed: ticket.sparesUsed || [],
      timeline: ticket.timeline || [],
      attachments: ticket.attachments || []
    };

    if (!ticket.id) {
      const hoursMap = { critical: 4, high: 12, medium: 24, low: 48 };
      const priorityHours = hoursMap[ticket.priority || 'medium'] || 24;
      ticketData.slaDeadline = new Date(Date.now() + priorityHours * 3600000).toISOString();
      ticketData.timeline = [
        { stage: 'Ticket Raised', date: new Date().toISOString(), note: 'Ticket registered by user.' }
      ];
    }

    if (ticket.id) {
      const oldTicket = tickets.find(t => t.id === ticket.id);
      if (ticketData.status === 'completed' && (!oldTicket || oldTicket.status !== 'completed')) {
        ticketData.completedAt = new Date().toISOString();
        if (!ticketData.timeline.some(tl => tl.stage === 'Completed')) {
          ticketData.timeline.push({ stage: 'Completed', date: new Date().toISOString(), note: 'Signed off by Technician.' });
        }
      }

      if (ticketData.status === 'closed' && (!oldTicket || oldTicket.status !== 'closed')) {
        if (ticketData.assetId) {
          const assets = serviceModuleService.getAssets();
          const targetAsset = assets.find(a => a.id === ticketData.assetId);
          if (targetAsset) {
            targetAsset.serviceHistory = targetAsset.serviceHistory || [];
            if (!targetAsset.serviceHistory.includes(ticketData.id)) targetAsset.serviceHistory.push(ticketData.id);
            
            targetAsset.partsChanged = targetAsset.partsChanged || [];
            (ticketData.sparesUsed || []).forEach(spare => {
              targetAsset.partsChanged.push({
                date: new Date().toISOString().substring(0, 10),
                partName: spare.productName,
                ticketNo: ticketData.ticketNo
              });
            });

            const repairImpact = ticketData.serviceType === 'maintenance' ? 10 : 5;
            targetAsset.healthScore = Math.min(100, (targetAsset.healthScore || 80) + repairImpact);
            serviceModuleService.saveAsset(targetAsset);
          }
        }
      }
    } else {
      ticketData.id = `ticket-${Date.now()}`;
      ticketData.ticketNo = `TK-${String(tickets.length + 1).padStart(4, '0')}`;
      ticketData.billingStatus = 'none';
      ticketData.createdAt = new Date().toISOString();
    }

    const updated = ticket.id 
      ? tickets.map(t => t.id === ticket.id ? ticketData : t)
      : [ticketData, ...tickets];
    saveLocal('erp_service_tickets', updated);

    // Background sync to MySQL
    fetch(`${BACKEND_URL}/erp/services/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    }).catch(err => console.warn(err));

    if (ticket.id) {
      const oldTicket = tickets.find(t => t.id === ticket.id);
      await auditService.logUpdate(currentUser, 'sales', ticket.id, ticket.ticketNo, `Service Ticket ${ticket.ticketNo} modified: Status set to ${ticketData.status}`, oldTicket, ticketData);
    } else {
      await auditService.logCreate(currentUser, 'sales', ticketData.id, ticketData.ticketNo, `Raised Ticket ${ticketData.ticketNo} for Customer: ${ticketData.customerName || ticketData.customerId}`, ticketData);
    }

    return ticketData;
  },

  pushTimelineStage: async (ticketId, stage, note, currentUser) => {
    const tickets = serviceModuleService.getTickets();
    const idx = tickets.findIndex(t => t.id === ticketId);
    if (idx === -1) return null;

    const ticket = tickets[idx];
    ticket.timeline = ticket.timeline || [];
    
    if (!ticket.timeline.some(l => l.stage === stage)) {
      ticket.timeline.push({ stage, date: new Date().toISOString(), note });
      
      if (stage === 'Technician Accepted' || stage === 'Travelling') ticket.status = 'in_progress';
      if (stage === 'Waiting Parts') ticket.status = 'waiting_parts';
      if (stage === 'Completed') {
        ticket.status = 'completed';
        ticket.completedAt = new Date().toISOString();
      }
      if (stage === 'Closed') ticket.status = 'closed';

      tickets[idx] = ticket;
      saveLocal('erp_service_tickets', tickets);

      // Background sync to MySQL
      fetch(`${BACKEND_URL}/erp/services/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      }).catch(err => console.warn(err));

      await auditService.logUpdate(currentUser, 'sales', ticket.id, ticket.ticketNo, `Ticket ${ticket.ticketNo} advanced to timeline stage: ${stage}`, null, ticket);
    }
    return ticket;
  },

  getEstimates: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/services/estimates`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_service_estimates', data);
      })
      .catch(err => console.warn('[serviceModuleService] MySQL getEstimates background failed', err.message));

    serviceModuleService.initLocalDB();
    return getLocal('erp_service_estimates');
  },

  saveEstimate: (estimate) => {
    const estData = {
      ...estimate,
      inspectionCharge: Number(estimate.inspectionCharge || 0),
      laborFee: Number(estimate.laborFee || 0),
      travelCharge: Number(estimate.travelCharge || 0),
      sparesCost: Number(estimate.sparesCost || 0),
      discount: Number(estimate.discount || 0),
      vat: Number(estimate.vat || 0),
      ait: Number(estimate.ait || 0),
      grandTotal: Number(estimate.grandTotal || 0),
      sparesList: estimate.sparesList || []
    };

    if (!estData.id) {
      estData.id = `est-${Date.now()}`;
      estData.estimateNo = `EST-${String(Date.now()).slice(-5)}`;
    }

    const estimates = getLocal('erp_service_estimates', []);
    const updated = estimate.id 
      ? estimates.map(e => e.id === estimate.id ? { ...e, ...estData } : e)
      : [estData, ...estimates];
    saveLocal('erp_service_estimates', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/services/estimates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estData)
    }).catch(err => console.warn(err));

    return estData;
  },

  generateServiceBill: async (ticketId, paymentMethod, currentUser) => {
    const tickets = serviceModuleService.getTickets();
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) throw new Error('Service ticket not found.');

    const ticket = tickets[ticketIndex];
    if (ticket.billingStatus === 'billed') throw new Error('Ticket is already billed.');

    const laborFee = Number(ticket.serviceFee || 0);
    const sparesFee = (ticket.sparesUsed || []).reduce((sum, s) => sum + (Number(s.qty) * Number(s.unitPrice || 0)), 0);
    const grandTotal = laborFee + sparesFee;

    if (grandTotal <= 0 || (ticket.warrantyStatus === 'active' && ticket.serviceType === 'warranty_claim')) {
      ticket.billingStatus = 'billed';
      ticket.billNo = 'FOC-WARRANTY';
      ticket.billAmount = 0;
      
      tickets[ticketIndex] = ticket;
      saveLocal('erp_service_tickets', tickets);

      fetch(`${BACKEND_URL}/erp/services/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      }).catch(err => console.warn(err));
      
      await serviceModuleService.pushTimelineStage(ticketId, 'Invoice Generated', 'Warranty FOC Chalan generated.', currentUser);
      await serviceModuleService.pushTimelineStage(ticketId, 'Closed', 'Free claim auto-closed.', currentUser);
      return { success: true, billNo: 'FOC-WARRANTY', total: 0 };
    }

    let totalCogs = 0;
    const products = JSON.parse(localStorage.getItem('erp_products') || '[]');
    for (const spare of (ticket.sparesUsed || [])) {
      const prod = products.find(p => p.id === spare.productId);
      if (!prod) throw new Error(`Stock spare ${spare.productName} not found.`);
      
      const avgCost = Number(prod.purchasePrice || prod.price || 0);
      totalCogs += avgCost * spare.qty;
      await inventoryService.sellStockOut(spare.productId, null, spare.qty, ticket.ticketNo);
    }

    const billNo = `SRV-BL-${Date.now().toString().slice(-6)}`;
    const date = new Date().toISOString().substring(0, 10);
    
    const debitAccount = paymentMethod === 'cash' ? defaultAccountMap.cash : (paymentMethod === 'bank' ? defaultAccountMap.bank : defaultAccountMap.accountsReceivable);
    
    const journalLines = [
      { accountId: debitAccount, type: 'debit', amount: grandTotal },
      { accountId: 'acc-4030', type: 'credit', amount: laborFee }
    ];

    if (sparesFee > 0) {
      journalLines.push({ accountId: defaultAccountMap.salesRevenue, type: 'credit', amount: sparesFee });
    }

    const cogsJournalLines = totalCogs > 0 ? [
      { accountId: defaultAccountMap.cogs, type: 'debit', amount: totalCogs },
      { accountId: defaultAccountMap.inventoryAsset, type: 'credit', amount: totalCogs }
    ] : [];

    await accountingService.postJournalEntry({
      id: `jv-${Date.now()}`,
      date,
      refNo: billNo,
      narration: `Service ticket billing: #${ticket.ticketNo} (Labor: ${laborFee}, Spares: ${sparesFee})`,
      lines: journalLines,
      sourceModule: 'sales',
      sourceRefId: billNo
    });

    if (cogsJournalLines.length > 0) {
      await accountingService.postJournalEntry({
        id: `jv-${Date.now()}-cogs`,
        date,
        refNo: `${billNo}-COGS`,
        narration: `Spare parts COGS deduction for ticket: #${ticket.ticketNo}`,
        lines: cogsJournalLines,
        sourceModule: 'sales',
        sourceRefId: billNo
      });
    }

    if (paymentMethod === 'receivable') {
      const customers = getLocal('erp_customers');
      const updatedCustomers = customers.map(c => {
        if (c.id === ticket.customerId) {
          return { ...c, currentBalance: (Number(c.currentBalance) || 0) + grandTotal };
        }
        return c;
      });
      saveLocal('erp_customers', updatedCustomers);

      // Background sync updated customer to MySQL
      const targetC = updatedCustomers.find(c => c.id === ticket.customerId);
      if (targetC) {
        fetch(`${BACKEND_URL}/erp/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetC)
        }).catch(e => console.warn(e));
      }
    }

    ticket.billingStatus = 'billed';
    ticket.billNo = billNo;
    ticket.billAmount = grandTotal;

    tickets[ticketIndex] = ticket;
    saveLocal('erp_service_tickets', tickets);

    fetch(`${BACKEND_URL}/erp/services/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket)
    }).catch(err => console.warn(err));

    await serviceModuleService.pushTimelineStage(ticketId, 'Invoice Generated', `Invoice generated successfully: Ref ${billNo}`, currentUser);
    await serviceModuleService.pushTimelineStage(ticketId, 'Closed', 'Payment logged and claim closed.', currentUser);

    await auditService.logCreate(currentUser, 'sales', billNo, billNo, `Service invoice ${billNo} generated for ticket ${ticket.ticketNo} - BDT ${grandTotal}`);
    
    return { success: true, billNo, total: grandTotal };
  },

  runPreventiveMaintenanceScheduler: async (currentUser) => {
    const contracts = serviceModuleService.getContracts();
    const today = new Date().toISOString().substring(0, 10);
    
    let createdCount = 0;

    for (const contract of contracts) {
      if (contract.status === 'active' && contract.nextVisitDate && contract.nextVisitDate <= today) {
        const ticketNo = `TK-PM-${Date.now().toString().slice(-4)}`;
        const pmTicket = {
          id: `ticket-pm-${Date.now()}-${createdCount}`,
          ticketNo,
          customerId: contract.customerId,
          customerName: contract.customerName,
          productId: null,
          productName: contract.machineName,
          serialNo: '',
          assetId: contract.machineId,
          invoiceNo: '',
          serviceType: 'maintenance',
          warrantyStatus: 'none',
          problemDescription: `Routine PM Visit scheduled under Contract: ${contract.contractNo}`,
          technicianId: 'emp-103',
          status: 'open',
          priority: 'low',
          slaDeadline: new Date(Date.now() + 72 * 3600000).toISOString(),
          resolutionNotes: '',
          sparesUsed: [],
          serviceFee: 0,
          billingStatus: 'none',
          billNo: '',
          billAmount: 0,
          completedAt: null,
          timeline: [
            { stage: 'Ticket Raised', date: new Date().toISOString(), note: 'Auto PM schedule ticket created.' }
          ],
          gpsCheckIn: '',
          customerSignature: '',
          attachments: [],
          internalNotes: 'Preventive Maintenance auto-run.',
          createdAt: new Date().toISOString()
        };

        fetch(`${BACKEND_URL}/erp/services/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pmTicket)
        }).catch(err => console.warn(err));

        contract.visitsUsed = Number(contract.visitsUsed) + 1;
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 3);
        contract.nextVisitDate = nextDate.toISOString().substring(0, 10);
        
        serviceModuleService.saveContract(contract);
        
        createdCount++;
      }
    }

    if (createdCount > 0) {
      await auditService.logCreate(currentUser, 'sales', 'cron-pm', 'cron-pm', `Preventive Maintenance Scheduler auto-generated ${createdCount} PM tickets.`);
    }
    return createdCount;
  },

  getServiceCatalog: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/erp/services`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveLocal('erp_service_catalog', data);
          return data;
        }
      }
    } catch (err) {
      console.warn('[serviceModuleService] MySQL fetch catalog failed, using localStorage', err.message);
    }

    serviceModuleService.initLocalDB();
    return getLocal('erp_service_catalog');
  },

  saveCatalogService: (service) => {
    const srvData = {
      ...service,
      baseFee: Number(service.baseFee || 0)
    };

    if (!srvData.id) {
      srvData.id = `cat-srv-${Date.now()}`;
    }

    const catalog = getLocal('erp_service_catalog', INITIAL_CATALOG);

    // ── Layer 2: Duplicate guard ──────────────────────────────────────────
    if (!service.id) {
      // Hard block: duplicate service code
      const codeConflict = catalog.find(
        s => s.code && s.code.trim().toUpperCase() === (service.code || '').trim().toUpperCase()
      );
      if (codeConflict) {
        throw new Error(
          `Duplicate Service Code: "${service.code}" is already used by "${codeConflict.name}". Please use a unique service code.`
        );
      }

      // Hard block: duplicate service name
      const nameConflict = catalog.find(
        s => s.name.trim().toLowerCase() === (service.name || '').trim().toLowerCase()
      );
      if (nameConflict) {
        throw new Error(
          `Duplicate Service Name: A service named "${nameConflict.name}" already exists (Code: ${nameConflict.code}). Please use a different service name.`
        );
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const updated = service.id 
      ? catalog.map(s => s.id === service.id ? srvData : s)
      : [srvData, ...catalog];
    saveLocal('erp_service_catalog', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(srvData)
    }).catch(err => console.warn(err));

    return srvData;
  },

  deleteCatalogService: (id) => {
    const catalog = getLocal('erp_service_catalog', INITIAL_CATALOG);
    const updated = catalog.filter(s => s.id !== id);
    saveLocal('erp_service_catalog', updated);

    // Background sync
    fetch(`${BACKEND_URL}/erp/services/${id}`, {
      method: 'DELETE'
    }).catch(err => console.warn(err));

    return true;
  },

  getTechnicians: () => {
    return [
      { id: 'emp-103', displayName: 'Field Service Tech A' },
      { id: 'emp-104', displayName: 'Field Service Tech B' }
    ];
  }
};
