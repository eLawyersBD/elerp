import { useState, useMemo } from 'react';
import { defaultSettings } from '../database/seedData';
import { printProInvoice, printProQuotation } from '../components/ProInvoicePrint';

const fmt = (n) => `৳${Math.round(Number(n || 0)).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
const fmtNoDec = (n) => Math.round(Number(n || 0)).toLocaleString('en-BD', { maximumFractionDigits: 0 });

const getSettings = () => {
  try {
    const s = localStorage.getItem('erp_settings');
    return s ? JSON.parse(s) : defaultSettings;
  } catch { return defaultSettings; }
};

const TEMPLATE_CONFIG_KEY = 'erp_template_config';
const getTemplateConfig = () => {
  try {
    const c = localStorage.getItem(TEMPLATE_CONFIG_KEY);
    return c ? JSON.parse(c) : null;
  } catch { return null; }
};

function Toggle({ value, onChange, label }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.48rem 0', borderBottom: '1px solid var(--border-color)'
    }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
          background: value ? '#3b82f6' : 'rgba(148,163,184,0.25)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)'
        }} />
      </button>
    </div>
  );
}

export default function TemplateView({ currentUser, isMobile }) {
  const [activeTab, setActiveTab]         = useState('documents');
  const [selectedTemplate, setSelectedTemplate] = useState('invoice-elawyers');
  const [successMsg, setSuccessMsg]       = useState('');
  const [editorPanel, setEditorPanel]     = useState('style');

  const savedCfg = useMemo(() => getTemplateConfig() || {}, []);
  const [accentColor,    setAccentColor]    = useState(savedCfg.accentColor    || '#1e3a8a');
  const [secondaryColor, setSecondaryColor] = useState(savedCfg.secondaryColor || '#3b82f6');
  const [baseFontSize,   setBaseFontSize]   = useState(savedCfg.baseFontSize   || 13);
  const [fontFamily,     setFontFamily]     = useState(savedCfg.fontFamily     || 'Inter');
  const [paperSize,      setPaperSize]      = useState(savedCfg.paperSize      || 'A4');
  const [tableStyle,     setTableStyle]     = useState(savedCfg.tableStyle     || 'classic');
  const [headerStyle,    setHeaderStyle]    = useState(savedCfg.headerStyle    || 'standard');

  const [showQr,           setShowQr]           = useState(savedCfg.showQr           !== false);
  const [showSignatures,   setShowSignatures]   = useState(savedCfg.showSignatures   !== false);
  const [showNotes,        setShowNotes]        = useState(savedCfg.showNotes        !== false);
  const [showContact,      setShowContact]      = useState(savedCfg.showContact      !== false);
  const [showPayNow,       setShowPayNow]       = useState(savedCfg.showPayNow       !== false);
  const [showWords,        setShowWords]        = useState(savedCfg.showWords        !== false);
  const [showAccentStripe, setShowAccentStripe] = useState(savedCfg.showAccentStripe !== false);

  const [sampleData, setSampleData] = useState({
    customerName:    'Advanced Technology Ltd',
    customerTitle:   'Mohammad Salim, Managing Director',
    customerBin:     '000123456-0201',
    customerAddress: 'Dhaka, Bangladesh',
    customerPhone:   '+8801819556752',
    customerEmail:   'atc@dhaka.net',
    invoiceNo:       'ELI-7274',
    invoiceDate:     '2026-07-10',
    dueDate:         '2026-07-30',
    amount:          300000,
    salesperson:     'Md. Ridwanul Arefin',
    branch:          'Dhaka HQ',
    quoteNo:         '',
    soNumber:        '',
    discountTotal:   0,
    vatAmount:       45000,
    taxAmount:       17250,
    netReceivable:   327750,
    contactPerson:   'Md. Ridwanul Arefin',
    contactPhone:    '+8801796317346',
    contactEmail:    'riyadh@elawyersbd.com',
    notesText:       'The invoice excludes any applicable conversion fees, which shall be payable separately as required. The total payable amount may vary in the event of any changes in government-imposed fees or charges.',
    items: [
      { desc: 'Winding Up of Company (RJSC)',     sub: 'Feroza Hossain.',          qty: 1, rate: 100000, discount: 0, vatRate: 15, taxRate: 5,  taxAmount: 8625 },
      { desc: 'Company Foundation Incorporation', sub: 'Chatkhil Falah Limited.',  qty: 1, rate: 200000, discount: 0, vatRate: 15, taxRate: 5,  taxAmount: 17250 },
    ],
    // Sample payment receipts — modify or clear this array as needed
    paymentReceipts: [
      { receiptNo: 'RV-100001', date: '2026-07-12', amount: 100000 },
      { receiptNo: 'RV-100002', date: '2026-07-20', amount: 80000  },
    ],
  });
  const setSd = (k, v) => setSampleData(d => ({ ...d, [k]: v }));

  const [templates] = useState({
    documents: [
      { id: 'invoice-classic',  name: 'Classic Invoice Print',       type: 'Invoice',   lastUpdated: '2026-07-02', content: 'Invoice Layout with top brand logo, standard table list, and signature signoff at the bottom.' },
      { id: 'invoice-modern',   name: 'Modern Glassmorphic Invoice', type: 'Invoice',   lastUpdated: '2026-07-03', content: 'Vibrant grid card header with gradient accent background, detailed BDT tax summary list.' },
      { id: 'invoice-elawyers', name: 'Pro Invoice',                 type: 'Invoice',   lastUpdated: '2026-07-10', content: 'Premium legal & consulting template — full colour controls, section toggles, and editable sample data.' },
      { id: 'quote-standard',   name: 'Standard Quotation Layout',   type: 'Quotation', lastUpdated: '2026-06-28', content: 'Quotation slip equipped with warranty validity periods and terms & conditions.' },
      { id: 'quote-pro',        name: 'Pro Quotation',               type: 'Quotation', lastUpdated: '2026-07-10', content: 'Premium quotation template — teal colour scheme, validity date, Terms & Conditions block, all section toggles, and editable sample data.' },
    ],
    contracts: [
      { id: 'amc-standard', name: 'Standard AMC Contract', type: 'Contract', lastUpdated: '2026-07-01', body: 'This agreement is made between {{company_name}} and {{customer_name}} for providing professional maintenance service for GNSS equipment for a period of 12 months starting from {{start_date}} for BDT {{amount}}.' },
      { id: 'service-sla',  name: 'Premium Service SLA',   type: 'SLA',      lastUpdated: '2026-06-15', body: 'Service response times shall not exceed {{response_hours}} hours. Maintenance team shall perform routine health checks on Chittagong port units.' },
    ],
    notifications: [
      { id: 'sms-dispatch',   name: 'SMS Dispatch Notification', type: 'SMS',   lastUpdated: '2026-07-02', body: 'Dear {{customer_name}}, your order {{order_no}} has been dispatched. Track details on your portal. Thank you.' },
      { id: 'email-reminder', name: 'Email Payment Reminder',    type: 'Email', lastUpdated: '2026-07-03', body: 'Subject: Payment Reminder - Invoice {{invoice_no}}\n\nDear Partner,\nThis is a friendly reminder that invoice {{invoice_no}} of BDT {{amount}} is due on {{due_date}}. Please settle it to avoid late fees.' },
    ],
  });

  const [editorBody, setEditorBody] = useState('');

  const companyInfo = useMemo(() => {
    const s = getSettings();
    return s?.company || {
      name: 'E-Lawyers', legalName: 'E-Lawyers - Legal & Business Consultancy Firm',
      address: 'G-5, bti Centara Grand, 144/1 Green Road, Dhaka',
      phone: '+88 01335230170-81', email: 'info@elawyersbd.com',
      website: 'www.elawyersbd.com', bin: '001234567-0101',
    };
  }, []);

  useMemo(() => {
    const all = [...templates.documents, ...templates.contracts, ...templates.notifications];
    const match = all.find(t => t.id === selectedTemplate);
    if (match) setEditorBody(match.body || match.content || '');
  }, [selectedTemplate, templates]);

  const currentTemplateObj = useMemo(() => {
    const all = [...templates.documents, ...templates.contracts, ...templates.notifications];
    return all.find(t => t.id === selectedTemplate) || {};
  }, [selectedTemplate, templates]);

  const isProInvoice = selectedTemplate === 'invoice-elawyers';
  const isProQuotation = selectedTemplate === 'quote-pro';
  const isProDoc = isProInvoice || isProQuotation;

  // Quotation-specific sample data extra fields
  const [quoteSampleData, setQuoteSampleData] = useState({
    quoteNo:       'QT-2026-0042',
    quoteDate:     '2026-07-10',
    validityDate:  '2026-07-31',
    salesperson:   'Md. Ridwanul Arefin',
    branch:        'Dhaka HQ',
    customerName:  'Advanced Technology Ltd',
    customerTitle: 'Mohammad Salim, Managing Director',
    customerBin:   '000123456-0201',
    customerAddress: 'Dhaka, Bangladesh',
    customerPhone: '+8801819556752',
    customerEmail: 'atc@dhaka.net',
    contactPerson: 'Md. Ridwanul Arefin',
    contactPhone:  '+8801796317346',
    contactEmail:  'riyadh@elawyersbd.com',
    amount:        300000,
    vatAmount:     45000,
    taxAmount:     17250,
    netReceivable: 327750,
    discountTotal: 0,
    notesText:     'This quotation is valid for the period stated above. Prices are subject to change after the validity date. This document is not a tax invoice. Acceptance is subject to availability of goods/services.',
    termsText:     '1. Payment: 50% advance upon order confirmation, balance before delivery.\n2. Delivery: 15–21 working days after order confirmation.\n3. Warranty: 12 months from delivery date for manufacturing defects.\n4. Cancellation: Orders cancelled after 48 hours are subject to 10% restocking fee.',
    items: [
      { desc: 'Winding Up of Company (RJSC)',     sub: 'Feroza Hossain.',         qty: 1, rate: 100000, discount: 0, vatRate: 15, taxRate: 5, taxAmount: 8625 },
      { desc: 'Company Foundation Incorporation', sub: 'Chatkhil Falah Limited.', qty: 1, rate: 200000, discount: 0, vatRate: 15, taxRate: 5, taxAmount: 17250 },
    ],
  });
  const setQd = (k, v) => setQuoteSampleData(d => ({ ...d, [k]: v }));

  const handleSave = () => {
    const cfg = { accentColor, secondaryColor, baseFontSize, fontFamily, paperSize, tableStyle, headerStyle, showQr, showSignatures, showNotes, showContact, showPayNow, showWords, showAccentStripe };
    localStorage.setItem(TEMPLATE_CONFIG_KEY, JSON.stringify(cfg));
    setSuccessMsg('✅ Template configuration saved & synced live!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handlePrintSample = () => {
    const subtotal = sampleData.items.reduce((s, i) => s + i.qty * i.rate * (1 - (i.discount || 0) / 100), 0);
    const vatAmount = sampleData.vatAmount || sampleData.items.reduce((s, i) => s + (i.qty * i.rate * (1 - (i.discount || 0) / 100)) * ((i.vatRate || 0) / 100), 0);
    const grandTotal = subtotal + vatAmount - (sampleData.discountTotal || 0);
    const taxAmount = sampleData.taxAmount || 0;
    const inv = {
      invoiceNo:     sampleData.invoiceNo,
      date:          sampleData.invoiceDate,
      dueDate:       sampleData.dueDate,
      grandTotal,
      subtotal,
      vatAmount,
      totalTaxAmount: taxAmount,
      netReceivable:  grandTotal - taxAmount,
      discountTotal:  sampleData.discountTotal || 0,
      paidAmount:     0,
      salesperson:    sampleData.salesperson,
      branch:         sampleData.branch,
      quoteNo:        sampleData.quoteNo,
      soNumber:       sampleData.soNumber,
      narration:      sampleData.notesText,
      items: sampleData.items.map(i => ({
        productName: i.desc,
        narration:   i.sub,
        qty:         i.qty,
        unitPrice:   i.rate,
        discount:    i.discount || 0,
        vatRate:     i.vatRate || 0,
        taxRate:     i.taxRate || 0,
        taxAmount:   i.taxAmount || 0,
        lineTotal:   i.qty * i.rate * (1 - (i.discount || 0) / 100),
      })),
    };
    printProInvoice(inv, {
      name:    sampleData.customerName,
      contact: sampleData.customerTitle,
      address: sampleData.customerAddress,
      phone:   sampleData.customerPhone,
      email:   sampleData.customerEmail,
      vatNo:   sampleData.customerBin,
    }, sampleData.paymentReceipts || []);
  };

  const handlePrintSampleQuotation = () => {
    const subtotal = quoteSampleData.items.reduce((s, i) => s + i.qty * i.rate * (1 - (i.discount || 0) / 100), 0);
    const vatAmount = quoteSampleData.vatAmount || quoteSampleData.items.reduce((s, i) => s + (i.qty * i.rate * (1 - (i.discount || 0) / 100)) * ((i.vatRate || 0) / 100), 0);
    const grandTotal = subtotal + vatAmount - (quoteSampleData.discountTotal || 0);
    const taxAmount = quoteSampleData.taxAmount || 0;
    const qt = {
      quoteNo:        quoteSampleData.quoteNo,
      date:           quoteSampleData.quoteDate,
      validityDate:   quoteSampleData.validityDate,
      grandTotal,
      subtotal,
      vatAmount,
      totalTaxAmount: taxAmount,
      netReceivable:  grandTotal - taxAmount,
      discountTotal:  quoteSampleData.discountTotal || 0,
      salesperson:    quoteSampleData.salesperson,
      branch:         quoteSampleData.branch,
      narration:      quoteSampleData.notesText,
      termsText:      quoteSampleData.termsText,
      items: quoteSampleData.items.map(i => ({
        productName: i.desc,
        narration:   i.sub,
        qty:         i.qty,
        unitPrice:   i.rate,
        discount:    i.discount || 0,
        vatRate:     i.vatRate || 0,
        taxRate:     i.taxRate || 0,
        taxAmount:   i.taxAmount || 0,
        lineTotal:   i.qty * i.rate * (1 - (i.discount || 0) / 100),
      })),
    };
    printProQuotation(qt, {
      name:    quoteSampleData.customerName,
      contact: quoteSampleData.customerTitle,
      address: quoteSampleData.customerAddress,
      phone:   quoteSampleData.customerPhone,
      email:   quoteSampleData.customerEmail,
      vatNo:   quoteSampleData.customerBin,
    });
  };

  const handleInsertTag = (tag) => setEditorBody(prev => prev + ` ${tag}`);

  const PALETTE = [
    { primary: '#1e3a8a', secondary: '#3b82f6', label: 'Classic Blue'  },
    { primary: '#1e293b', secondary: '#64748b', label: 'Slate Pro'     },
    { primary: '#064e3b', secondary: '#10b981', label: 'Emerald Law'   },
    { primary: '#7c2d12', secondary: '#f97316', label: 'Amber Firm'    },
    { primary: '#4c1d95', secondary: '#8b5cf6', label: 'Violet Edge'   },
    { primary: '#881337', secondary: '#f43f5e', label: 'Rose Corp'     },
  ];

  const FONTS = ['Inter', 'Roboto', 'Georgia', 'Merriweather', 'Playfair Display', 'Lato', 'Open Sans'];

  const CardBox = ({ title, children }) => (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'inherit', color: 'var(--text-primary)' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #4c0519 100%)', borderRadius: 20, padding: '1.5rem 2rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 80, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ERP Layouts</span>
            <h2 style={{ margin: '5px 0 0', fontSize: '1.30rem', fontWeight: 900, letterSpacing: '-0.4px' }}>Central Template Manager</h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>Design Print Layouts, Custom Service Agreements (SLA), Contract Terms & Customer Alerts</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {isProInvoice && activeTab === 'documents' && (
              <button onClick={handlePrintSample} style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', border: 'none', padding: '0.55rem 1.2rem', borderRadius: 12, color: '#fff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
                🖨️ Print Sample
              </button>
            )}
            {isProQuotation && activeTab === 'documents' && (
              <button onClick={handlePrintSampleQuotation} style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)', border: 'none', padding: '0.55rem 1.2rem', borderRadius: 12, color: '#fff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }}>
                🖨️ Print Sample Quotation
              </button>
            )}
            <button onClick={handleSave} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', padding: '0.55rem 1.2rem', borderRadius: 12, color: '#fff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
              💾 Save Config
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontWeight: 700, color: '#22c55e' }}>{successMsg}</div>
      )}

      {/* MAIN TABS */}
      <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: 14, alignSelf: 'flex-start', border: '1px solid var(--border-color)' }}>
        {[{ id: 'documents', label: '📄 Print Layouts' }, { id: 'contracts', label: '📝 Contracts & SLAs' }, { id: 'notifications', label: '🔔 Alert Reminders' }].map(t => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedTemplate(templates[t.id][0]?.id); }} style={{ padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700, background: active ? 'var(--bg-tertiary)' : 'transparent', color: active ? 'var(--accent-color)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* WORKSPACE */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 16, border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Available Templates</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {templates[activeTab].map(t => {
                const active = selectedTemplate === t.id;
                return (
                  <button key={t.id} onClick={() => setSelectedTemplate(t.id)} style={{ width: '100%', textAlign: 'left', padding: '0.65rem 0.85rem', borderRadius: 10, border: `1.5px solid ${active ? 'var(--accent-color)' : 'var(--border-color)'}`, background: active ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 700 : 500, display: 'flex', flexDirection: 'column', gap: 2, transition: 'all 0.15s' }}>
                    <span>{t.name}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Updated: {t.lastUpdated}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'documents' && isProDoc && (
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 16, border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🎨 Color Presets</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {PALETTE.map(p => (
                  <button key={p.label} onClick={() => { setAccentColor(p.primary); setSecondaryColor(p.secondary); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.42rem 0.65rem', borderRadius: 8, border: `1.5px solid ${accentColor === p.primary ? p.secondary : 'var(--border-color)'}`, background: accentColor === p.primary ? 'var(--bg-tertiary)' : 'transparent', cursor: 'pointer', width: '100%', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.primary }} />
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.secondary }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{p.label}</span>
                    {accentColor === p.primary && <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: 'var(--accent-color)', fontWeight: 800 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>

            {/* Editor header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--bg-tertiary)' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>🛠️ Layout Editor — {currentTemplateObj.name || '—'}</h4>
              {activeTab === 'documents' && isProDoc && (
                <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                  {[{ id: 'style', label: '🎨 Style' }, { id: 'layout', label: '🗂 Layout' }, { id: 'data', label: '✏️ Sample Data' }, { id: 'preview', label: '👁 Preview' }].map(p => {
                    const active = editorPanel === p.id;
                    return (
                      <button key={p.id} onClick={() => setEditorPanel(p.id)} style={{ padding: '0.3rem 0.75rem', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 700, background: active ? 'var(--bg-tertiary)' : 'transparent', color: active ? 'var(--accent-color)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '1.25rem' }}>
              {activeTab === 'documents' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* ── STYLE ── */}
                  {isProDoc && editorPanel === 'style' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                      <CardBox title="🎨 Brand Colors">
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Primary / Header Color</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 38, height: 30, borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2 }} />
                            <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 7px', borderRadius: 4 }}>{accentColor}</code>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Secondary / Accent Color</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: 38, height: 30, borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2 }} />
                            <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 7px', borderRadius: 4 }}>{secondaryColor}</code>
                          </div>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${accentColor} 0%, ${secondaryColor} 100%)` }} />
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Use the Color Presets panel on the left for quick palettes.</div>
                      </CardBox>

                      <CardBox title="🔤 Typography">
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Font Family</label>
                          <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="form-control" style={{ fontSize: '0.8rem' }}>
                            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                            Base Font Size: <strong style={{ color: 'var(--accent-color)' }}>{baseFontSize}px</strong>
                          </label>
                          <input type="range" min="10" max="16" value={baseFontSize} onChange={e => setBaseFontSize(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.63rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <span>Compact (10)</span><span>Large (16)</span>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Paper Size</label>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {['A4', 'Letter', 'Legal'].map(s => (
                              <button key={s} onClick={() => setPaperSize(s)} style={{ flex: 1, padding: '0.35rem', borderRadius: 7, border: `1.5px solid ${paperSize === s ? 'var(--accent-color)' : 'var(--border-color)'}`, background: paperSize === s ? 'rgba(99,102,241,0.1)' : 'transparent', color: paperSize === s ? 'var(--accent-color)' : 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardBox>

                      <CardBox title="📊 Table Style">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {[{ id: 'classic', icon: '▦', label: 'Classic' }, { id: 'striped', icon: '≡', label: 'Striped' }, { id: 'minimal', icon: '—', label: 'Minimal' }].map(s => (
                            <button key={s.id} onClick={() => setTableStyle(s.id)} style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: `1.5px solid ${tableStyle === s.id ? 'var(--accent-color)' : 'var(--border-color)'}`, background: tableStyle === s.id ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
                              <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{s.icon}</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: tableStyle === s.id ? 'var(--accent-color)' : 'var(--text-muted)' }}>{s.label}</div>
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', minHeight: 28 }}>
                          {tableStyle === 'classic' && 'Clean rows with thin dividing lines.'}
                          {tableStyle === 'striped' && 'Alternating shaded rows for easier reading.'}
                          {tableStyle === 'minimal' && 'Borderless — clean, whitespace-forward.'}
                        </div>
                      </CardBox>

                      <CardBox title="📐 Header Style">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {[{ id: 'standard', label: 'Standard', desc: 'Full logo + address' }, { id: 'compact', label: 'Compact', desc: 'Single-line header' }, { id: 'banner', label: 'Banner', desc: 'Full-width band' }].map(s => (
                            <button key={s.id} onClick={() => setHeaderStyle(s.id)} style={{ flex: 1, padding: '0.5rem 0.4rem', borderRadius: 8, border: `1.5px solid ${headerStyle === s.id ? 'var(--accent-color)' : 'var(--border-color)'}`, background: headerStyle === s.id ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: headerStyle === s.id ? 'var(--accent-color)' : 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{s.desc}</div>
                            </button>
                          ))}
                        </div>
                        <Toggle value={showAccentStripe} onChange={setShowAccentStripe} label="Show top accent stripe" />
                      </CardBox>
                    </div>
                  )}

                  {/* ── LAYOUT ── */}
                  {isProDoc && editorPanel === 'layout' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                      <CardBox title="🔧 Section Visibility">
                        <Toggle value={showContact}      onChange={setShowContact}      label="Point of Contact Block"     />
                        <Toggle value={showNotes}        onChange={setShowNotes}        label="Important Notes Disclaimer" />
                        <Toggle value={showWords}        onChange={setShowWords}        label="Amount In Words"            />
                        <Toggle value={showQr}           onChange={setShowQr}           label="Scan-to-Pay QR Code"        />
                        <Toggle value={showPayNow}       onChange={setShowPayNow}       label="Pay Now Button"             />
                        <Toggle value={showSignatures}   onChange={setShowSignatures}   label="Signature Lines"            />
                        <Toggle value={showAccentStripe} onChange={setShowAccentStripe} label="Top Accent Stripe"          />
                      </CardBox>

                      <CardBox title="📋 Layout Stack Preview">
                        <div style={{ background: '#fff', borderRadius: 8, padding: '0.6rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {[
                            { label: 'Top Accent Stripe',      active: showAccentStripe, color: secondaryColor },
                            { label: 'Header (Logo + INVOICE)', always: true,             color: accentColor    },
                            { label: 'Bill To + Invoice Meta',  always: true,             color: '#3b82f6'      },
                            { label: 'Items Table',             always: true,             color: '#6366f1'      },
                            { label: 'Contact Block',           active: showContact,      color: '#0891b2'      },
                            { label: 'Notes Disclaimer',        active: showNotes,        color: '#d97706'      },
                            { label: 'Amount In Words',         active: showWords,        color: '#059669'      },
                            { label: 'Totals + QR Code',        active: showQr,           color: '#7c3aed'      },
                            { label: 'Signature Lines',         active: showSignatures,   color: '#64748b'      },
                            { label: 'Page Footer',             always: true,             color: '#94a3b8'      },
                          ].map((row, i) => {
                            const vis = row.always || row.active;
                            return (
                              <div key={i} style={{ padding: '4px 10px', borderRadius: 4, background: vis ? row.color : '#f1f5f9', opacity: vis ? 1 : 0.28, fontSize: '0.58rem', fontWeight: 700, color: vis ? '#fff' : '#94a3b8', transition: 'all 0.2s' }}>
                                {row.label}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Greyed-out blocks are hidden in the printed output.</div>
                      </CardBox>
                    </div>
                  )}

                  {/* ── SAMPLE DATA ── */}
                  {isProInvoice && editorPanel === 'data' && isProInvoice && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                      <CardBox title="👤 Client Details">
                        {[{ k: 'customerName', l: 'Customer Name' }, { k: 'customerTitle', l: 'Title / Company' }, { k: 'customerBin', l: 'BIN' }, { k: 'customerAddress', l: 'Address' }, { k: 'customerPhone', l: 'Phone' }, { k: 'customerEmail', l: 'Email' }].map(f => (
                          <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">{f.l}</label>
                            <input className="form-control" style={{ fontSize: '0.78rem' }} value={sampleData[f.k] || ''} onChange={e => setSd(f.k, e.target.value)} />
                          </div>
                        ))}
                      </CardBox>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <CardBox title="🧾 Invoice Meta">
                          {[{ k: 'invoiceNo', l: 'Invoice No.', t: 'text' }, { k: 'invoiceDate', l: 'Invoice Date', t: 'date' }, { k: 'dueDate', l: 'Due Date', t: 'date' }].map(f => (
                            <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{f.l}</label>
                              <input type={f.t} className="form-control" style={{ fontSize: '0.78rem' }} value={sampleData[f.k]} onChange={e => setSd(f.k, e.target.value)} />
                            </div>
                          ))}
                          {[{ k: 'salesperson', l: 'Salesperson' }, { k: 'branch', l: 'Branch' }, { k: 'quoteNo', l: 'Quote / SO No.' }].map(f => (
                            <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{f.l}</label>
                              <input className="form-control" style={{ fontSize: '0.78rem' }} value={sampleData[f.k] || ''} onChange={e => setSd(f.k, e.target.value)} />
                            </div>
                          ))}
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Grand Total (BDT)</label>
                            <input type="number" className="form-control" style={{ fontSize: '0.78rem' }} value={sampleData.amount} onChange={e => setSd('amount', Number(e.target.value))} />
                          </div>
                          {[{ k: 'vatAmount', l: 'VAT Total (৳)' }, { k: 'taxAmount', l: 'Tax Withholding / AIT (৳)' }, { k: 'discountTotal', l: 'Invoice Discount (৳)' }, { k: 'netReceivable', l: 'Net Receivable (৳)' }].map(f => (
                            <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{f.l}</label>
                              <input type="number" className="form-control" style={{ fontSize: '0.78rem' }} value={sampleData[f.k] || 0} onChange={e => setSd(f.k, Number(e.target.value))} />
                            </div>
                          ))}
                        </CardBox>
                        <CardBox title="📞 Contact Person">
                          {[{ k: 'contactPerson', l: 'Name' }, { k: 'contactPhone', l: 'Phone' }, { k: 'contactEmail', l: 'Email' }].map(f => (
                            <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{f.l}</label>
                              <input className="form-control" style={{ fontSize: '0.78rem' }} value={sampleData[f.k]} onChange={e => setSd(f.k, e.target.value)} />
                            </div>
                          ))}
                        </CardBox>
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <CardBox title="📦 Line Items">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                            {sampleData.items.map((item, i) => (
                              <div key={i} style={{ background: 'var(--bg-secondary)', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: '0.5rem', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <input className="form-control" style={{ fontSize: '0.76rem' }} placeholder="Description" value={item.desc} onChange={e => { const items = [...sampleData.items]; items[i] = { ...item, desc: e.target.value }; setSd('items', items); }} />
                                    <input className="form-control" style={{ fontSize: '0.7rem' }} placeholder="Sub-line / narration (italic note)" value={item.sub} onChange={e => { const items = [...sampleData.items]; items[i] = { ...item, sub: e.target.value }; setSd('items', items); }} />
                                  </div>
                                  <button onClick={() => setSd('items', sampleData.items.filter((_, j) => j !== i))} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.4rem' }}>
                                  <div>
                                    <label style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Qty</label>
                                    <input type="number" min="1" className="form-control" style={{ fontSize: '0.76rem' }} placeholder="Qty" value={item.qty} onChange={e => { const items = [...sampleData.items]; items[i] = { ...item, qty: Number(e.target.value) }; setSd('items', items); }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Rate (৳)</label>
                                    <input type="number" min="0" className="form-control" style={{ fontSize: '0.76rem' }} placeholder="Rate (৳)" value={item.rate} onChange={e => { const items = [...sampleData.items]; items[i] = { ...item, rate: Number(e.target.value) }; setSd('items', items); }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Disc (%)</label>
                                    <input type="number" min="0" max="100" className="form-control" style={{ fontSize: '0.76rem' }} placeholder="0" value={item.discount || 0} onChange={e => { const items = [...sampleData.items]; items[i] = { ...item, discount: Number(e.target.value) }; setSd('items', items); }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>VAT (%)</label>
                                    <input type="number" min="0" className="form-control" style={{ fontSize: '0.76rem' }} placeholder="0" value={item.vatRate || 0} onChange={e => { const items = [...sampleData.items]; items[i] = { ...item, vatRate: Number(e.target.value) }; setSd('items', items); }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Tax/AIT (%)</label>
                                    <input type="number" min="0" className="form-control" style={{ fontSize: '0.76rem' }} placeholder="0" value={item.taxRate || 0} onChange={e => { const items = [...sampleData.items]; items[i] = { ...item, taxRate: Number(e.target.value) }; setSd('items', items); }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button onClick={() => setSd('items', [...sampleData.items, { desc: '', sub: '', qty: 1, rate: 0, discount: 0, vatRate: 15, taxRate: 0, taxAmount: 0 }])} style={{ padding: '0.45rem', borderRadius: 8, border: '1.5px dashed var(--border-color)', background: 'transparent', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                              + Add Line Item
                            </button>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes / Disclaimer Text</label>
                            <textarea className="form-control" style={{ fontSize: '0.76rem', resize: 'vertical', minHeight: 60 }} value={sampleData.notesText} onChange={e => setSd('notesText', e.target.value)} />
                          </div>
                        </CardBox>
                      </div>
                    </div>
                  )}

                  {/* ── QUOTATION SAMPLE DATA ── */}
                  {isProQuotation && editorPanel === 'data' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                      <CardBox title="👤 Client Details">
                        {[{ k: 'customerName', l: 'Customer Name' }, { k: 'customerTitle', l: 'Title / Company' }, { k: 'customerBin', l: 'BIN' }, { k: 'customerAddress', l: 'Address' }, { k: 'customerPhone', l: 'Phone' }, { k: 'customerEmail', l: 'Email' }].map(f => (
                          <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">{f.l}</label>
                            <input className="form-control" style={{ fontSize: '0.78rem' }} value={quoteSampleData[f.k] || ''} onChange={e => setQd(f.k, e.target.value)} />
                          </div>
                        ))}
                      </CardBox>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <CardBox title="📋 Quotation Meta">
                          {[{ k: 'quoteNo', l: 'Quotation No.', t: 'text' }, { k: 'quoteDate', l: 'Quotation Date', t: 'date' }, { k: 'validityDate', l: 'Valid Until', t: 'date' }].map(f => (
                            <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{f.l}</label>
                              <input type={f.t} className="form-control" style={{ fontSize: '0.78rem' }} value={quoteSampleData[f.k]} onChange={e => setQd(f.k, e.target.value)} />
                            </div>
                          ))}
                          {[{ k: 'salesperson', l: 'Salesperson' }, { k: 'branch', l: 'Branch' }].map(f => (
                            <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{f.l}</label>
                              <input className="form-control" style={{ fontSize: '0.78rem' }} value={quoteSampleData[f.k] || ''} onChange={e => setQd(f.k, e.target.value)} />
                            </div>
                          ))}
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Grand Total (BDT)</label>
                            <input type="number" className="form-control" style={{ fontSize: '0.78rem' }} value={quoteSampleData.amount} onChange={e => setQd('amount', Number(e.target.value))} />
                          </div>
                          {[{ k: 'vatAmount', l: 'VAT Total (৳)' }, { k: 'taxAmount', l: 'Tax Withholding / AIT (৳)' }, { k: 'discountTotal', l: 'Invoice Discount (৳)' }, { k: 'netReceivable', l: 'Net Receivable (৳)' }].map(f => (
                            <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{f.l}</label>
                              <input type="number" className="form-control" style={{ fontSize: '0.78rem' }} value={quoteSampleData[f.k] || 0} onChange={e => setQd(f.k, Number(e.target.value))} />
                            </div>
                          ))}
                        </CardBox>
                        <CardBox title="📞 Contact Person">
                          {[{ k: 'contactPerson', l: 'Name' }, { k: 'contactPhone', l: 'Phone' }, { k: 'contactEmail', l: 'Email' }].map(f => (
                            <div key={f.k} className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">{f.l}</label>
                              <input className="form-control" style={{ fontSize: '0.78rem' }} value={quoteSampleData[f.k] || ''} onChange={e => setQd(f.k, e.target.value)} />
                            </div>
                          ))}
                        </CardBox>
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <CardBox title="📦 Line Items">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                            {quoteSampleData.items.map((item, i) => (
                              <div key={i} style={{ background: 'var(--bg-secondary)', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: '0.5rem', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <input className="form-control" style={{ fontSize: '0.76rem' }} placeholder="Description" value={item.desc} onChange={e => { const items = [...quoteSampleData.items]; items[i] = { ...item, desc: e.target.value }; setQd('items', items); }} />
                                    <input className="form-control" style={{ fontSize: '0.7rem' }} placeholder="Sub-line / narration" value={item.sub} onChange={e => { const items = [...quoteSampleData.items]; items[i] = { ...item, sub: e.target.value }; setQd('items', items); }} />
                                  </div>
                                  <button onClick={() => setQd('items', quoteSampleData.items.filter((_, j) => j !== i))} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.4rem' }}>
                                  {[['qty','Qty','number'],['rate','Rate (৳)','number'],['discount','Disc (%)','number'],['vatRate','VAT (%)','number'],['taxRate','Tax/AIT (%)','number']].map(([k, l, t]) => (
                                    <div key={k}>
                                      <label style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>{l}</label>
                                      <input type={t} min="0" className="form-control" style={{ fontSize: '0.76rem' }} value={item[k] || 0} onChange={e => { const items = [...quoteSampleData.items]; items[i] = { ...item, [k]: Number(e.target.value) }; setQd('items', items); }} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <button onClick={() => setQd('items', [...quoteSampleData.items, { desc: '', sub: '', qty: 1, rate: 0, discount: 0, vatRate: 15, taxRate: 0, taxAmount: 0 }])} style={{ padding: '0.45rem', borderRadius: 8, border: '1.5px dashed var(--border-color)', background: 'transparent', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>+ Add Line Item</button>
                          </div>
                          <div style={{ marginTop: '0.75rem' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes / Disclaimer Text</label>
                            <textarea className="form-control" style={{ fontSize: '0.76rem', resize: 'vertical', minHeight: 55 }} value={quoteSampleData.notesText} onChange={e => setQd('notesText', e.target.value)} />
                          </div>
                          <div style={{ marginTop: '0.6rem' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Terms &amp; Conditions</label>
                            <textarea className="form-control" style={{ fontSize: '0.76rem', resize: 'vertical', minHeight: 80 }} value={quoteSampleData.termsText} onChange={e => setQd('termsText', e.target.value)} />
                          </div>
                        </CardBox>
                      </div>
                    </div>
                  )}

                  {/* ── QUOTATION LIVE PREVIEW ── */}
                  {isProQuotation && editorPanel === 'preview' && (() => {
                    const qSubtotal = quoteSampleData.items.reduce((s, i) => s + i.qty * i.rate * (1 - (i.discount || 0) / 100), 0);
                    const qTeal = '#0f766e';
                    const qTeal2 = '#14b8a6';
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span>📐 Live A4 preview — Pro Quotation Template</span>
                          <button onClick={handlePrintSampleQuotation} style={{ padding: '0.28rem 0.8rem', borderRadius: 6, border: 'none', background: qTeal, color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>🖨️ Print This</button>
                        </div>

                        <div style={{ width: '100%', maxWidth: 780, minHeight: 1100, aspectRatio: '1 / 1.414', background: '#fff', color: '#1e293b', boxShadow: '0 16px 48px rgba(0,0,0,0.14)', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontSize: `${baseFontSize}px`, fontFamily, position: 'relative' }}>
                          <div style={{ position: 'absolute', top: showAccentStripe ? 13 : 8, right: 8, fontSize: '0.52em', fontWeight: 800, background: qTeal2, color: '#fff', padding: '2px 6px', borderRadius: 3, zIndex: 1 }}>A4 LIVE PREVIEW</div>
                          {showAccentStripe && <div style={{ height: 5, background: `linear-gradient(90deg, ${qTeal} 0%, ${qTeal2} 100%)`, flexShrink: 0 }} />}

                          <div style={{ padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f1f5f9' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginRight: '1.5rem' }}>
                                  {companyInfo.logo ? <img src={companyInfo.logo} alt="logo" style={{ height: 46, maxWidth: 110, objectFit: 'contain', borderRadius: 5 }} /> : <div style={{ fontSize: '1.9em', color: qTeal }}>📋</div>}
                                  <div>
                                    <div style={{ color: qTeal, fontWeight: 900, fontSize: '1.2em', letterSpacing: '-0.6px', lineHeight: 1.1 }}>{companyInfo.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.58em', fontWeight: 800, letterSpacing: '0.08em', borderTop: '1px solid #e2e8f0', paddingTop: 2, marginTop: 1 }}>{companyInfo.legalName}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 0, marginTop: '0.55rem', fontSize: '0.69em', fontWeight: 600 }}>
                                  <div style={{ paddingRight: '0.6rem' }}>
                                    <div style={{ color: qTeal }}>{companyInfo.phone}</div>
                                    <div style={{ color: qTeal2 }}>{companyInfo.website}</div>
                                  </div>
                                  <div style={{ width: 1, background: '#cbd5e1', margin: '0 0.6rem' }} />
                                  <div>
                                    <div style={{ color: qTeal }}>{companyInfo.email}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9em' }}>{companyInfo.address}</div>
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '2.1em', fontWeight: 900, color: qTeal2, letterSpacing: '0.04em', lineHeight: 1 }}>QUOTATION</div>
                                <div style={{ fontSize: '0.6em', fontStyle: 'italic', color: '#94a3b8', maxWidth: 190, marginTop: 3 }}>Estimated offer — subject to acceptance. Not a tax invoice.</div>
                                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdfa', border: `1.5px solid #99f6e4`, borderRadius: 6, padding: '3px 9px', fontSize: '0.62em', fontWeight: 700, color: qTeal }}>
                                    <span style={{ color: '#64748b', fontWeight: 500 }}>No.</span> {quoteSampleData.quoteNo}
                                  </div>
                                  {quoteSampleData.validityDate && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 6, padding: '2px 8px', fontSize: '0.58em', fontWeight: 700, color: '#a16207' }}>
                                      ⏳ Valid Until: {quoteSampleData.validityDate}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quote To + Meta */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.74em' }}>
                              <div>
                                <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.64em', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>QUOTE TO</div>
                                <div style={{ fontSize: '1.05em', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{quoteSampleData.customerName}</div>
                                <div style={{ fontSize: '0.85em', color: '#475569', fontWeight: 600, marginBottom: '0.4rem' }}>{quoteSampleData.customerTitle}</div>
                                {quoteSampleData.customerBin && <div style={{ fontSize: '0.85em', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>BIN: {quoteSampleData.customerBin}</div>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#475569', fontSize: '0.85em', fontWeight: 500 }}>
                                  <div>📞 {quoteSampleData.customerPhone} | ✉️ {quoteSampleData.customerEmail}</div>
                                  <div>📍 {quoteSampleData.customerAddress}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '110px 90px', gap: '0.3rem', fontSize: '0.78em', textAlign: 'right' }}>
                                  <span style={{ color: '#64748b', fontWeight: 500 }}>Quotation Date</span>
                                  <strong>{quoteSampleData.quoteDate}</strong>
                                  {quoteSampleData.validityDate && <><span style={{ color: '#64748b', fontWeight: 500 }}>Valid Until</span><strong style={{ color: '#a16207' }}>{quoteSampleData.validityDate}</strong></>}
                                  {quoteSampleData.branch && <><span style={{ color: '#64748b', fontWeight: 500 }}>Branch</span><strong>{quoteSampleData.branch}</strong></>}
                                </div>
                                <div style={{ width: '100%', maxWidth: 200, background: `linear-gradient(135deg, ${qTeal}, ${qTeal2})`, color: '#fff', borderRadius: 10, padding: '0.6rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                                  <span style={{ fontSize: '0.7em', fontWeight: 700 }}>Quoted Amount</span>
                                  <strong style={{ fontSize: '1.1em', fontWeight: 900 }}>৳{fmtNoDec(quoteSampleData.amount)}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Items Table */}
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.73em', borderRadius: 8, overflow: 'hidden', border: tableStyle === 'minimal' ? 'none' : '1px solid #e2e8f0' }}>
                              <thead>
                                <tr style={{ background: `linear-gradient(90deg, ${qTeal} 0%, #0d9488 100%)`, color: '#fff' }}>
                                  <th style={{ padding: '0.7rem 0.9rem', textAlign: 'left', fontWeight: 700, fontSize: '0.68em', letterSpacing: '0.04em' }}>DESCRIPTION OF GOODS / SERVICES</th>
                                  <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center', width: 35, fontWeight: 700, fontSize: '0.68em' }}>QTY</th>
                                  <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right', width: 75, fontWeight: 700, fontSize: '0.68em' }}>UNIT PRICE</th>
                                  <th style={{ padding: '0.7rem 0.4rem', textAlign: 'center', width: 38, fontWeight: 700, fontSize: '0.68em' }}>DISC%</th>
                                  <th style={{ padding: '0.7rem 0.4rem', textAlign: 'center', width: 38, fontWeight: 700, fontSize: '0.68em' }}>VAT%</th>
                                  <th style={{ padding: '0.7rem 0.4rem', textAlign: 'center', width: 42, fontWeight: 700, fontSize: '0.68em' }}>TAX%</th>
                                  <th style={{ padding: '0.7rem 0.7rem', textAlign: 'right', width: 80, fontWeight: 700, fontSize: '0.68em' }}>AMOUNT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {quoteSampleData.items.map((item, idx) => {
                                  const lineAmt = item.qty * item.rate * (1 - (item.discount || 0) / 100);
                                  return (
                                    <tr key={idx} style={{ background: tableStyle === 'striped' && idx % 2 === 1 ? '#f0fdfa' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                                      <td style={{ padding: '0.8rem 0.9rem' }}>
                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84em' }}>{item.desc || '—'}</div>
                                        {item.sub && <div style={{ fontSize: '0.68em', color: '#94a3b8', fontStyle: 'italic', marginTop: 1 }}>{item.sub}</div>}
                                      </td>
                                      <td style={{ padding: '0.8rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>{item.qty}</td>
                                      <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right', color: '#475569', fontWeight: 600 }}>৳{fmtNoDec(item.rate)}</td>
                                      <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center', fontSize: '0.8em', color: (item.discount || 0) > 0 ? '#dc2626' : '#94a3b8' }}>{(item.discount || 0) > 0 ? `${item.discount}%` : '—'}</td>
                                      <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center', fontSize: '0.8em', color: (item.vatRate || 0) > 0 ? '#0891b2' : '#94a3b8' }}>{(item.vatRate || 0) > 0 ? `${item.vatRate}%` : '—'}</td>
                                      <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center', fontSize: '0.8em', color: (item.taxRate || 0) > 0 ? '#7c3aed' : '#94a3b8' }}>{(item.taxRate || 0) > 0 ? `${item.taxRate}%` : '—'}</td>
                                      <td style={{ padding: '0.8rem 0.7rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>৳{fmtNoDec(lineAmt)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            {/* Bottom grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.25rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {showWords && (
                                  <div style={{ fontSize: '0.66em', color: '#475569', background: '#f8fafc', borderRadius: 6, padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                                    <strong>In Words:</strong> Three Lakh Taka Only
                                  </div>
                                )}
                                {quoteSampleData.termsText && (
                                  <div style={{ background: '#f0fdfa', borderLeft: `3px solid ${qTeal2}`, borderRadius: '0 8px 8px 0', padding: '0.6rem 0.9rem', fontSize: '0.63em', color: '#134e4a', lineHeight: 1.45 }}>
                                    <strong style={{ display: 'block', marginBottom: 2, fontSize: '0.85em', color: qTeal }}>📋 Terms &amp; Conditions</strong>
                                    {quoteSampleData.termsText}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-end' }}>
                                <div style={{ width: '100%', maxWidth: 220, display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.73em' }}>
                                  {quoteSampleData.items.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 3px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: '0.87em' }}>
                                      <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.desc || 'Item'}</span>
                                      <span style={{ fontWeight: 700, color: '#1e293b' }}>৳{fmtNoDec(it.qty * it.rate * (1 - (it.discount||0)/100))}</span>
                                    </div>
                                  ))}
                                  {[['Subtotal', `৳${fmtNoDec(qSubtotal)}`], quoteSampleData.vatAmount > 0 && ['VAT', `৳${fmtNoDec(quoteSampleData.vatAmount)}`], quoteSampleData.taxAmount > 0 && ['Tax Withholding (AIT)', `−৳${fmtNoDec(quoteSampleData.taxAmount)}`], quoteSampleData.discountTotal > 0 && ['Discount', `−৳${fmtNoDec(quoteSampleData.discountTotal)}`]].filter(Boolean).map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 3px', color: '#475569', fontWeight: 600 }}>
                                      <span>{label}:</span><strong style={{ color: label.startsWith('Tax') || label === 'Discount' ? '#dc2626' : '#0f172a' }}>{value}</strong>
                                    </div>
                                  ))}
                                  <div style={{ background: `linear-gradient(135deg, ${qTeal} 0%, ${qTeal2} 100%)`, color: '#fff', borderRadius: 10, padding: '0.6rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ fontSize: '0.62em', fontWeight: 700, opacity: 0.85 }}>TOTAL QUOTED</div>
                                      <div style={{ fontSize: '0.55em', opacity: 0.7 }}>BDT</div>
                                    </div>
                                    <strong style={{ fontSize: '1.25em', fontWeight: 900 }}>৳{fmtNoDec(quoteSampleData.amount)}</strong>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bottom signatures + notes */}
                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
                              {showSignatures && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', width: '100%', marginTop: '1rem', marginBottom: '1.25rem', paddingTop: '1.5rem' }}>
                                  {['Customer Signature', 'Prepared By', 'Authorized Sign & Seal'].map(s => (
                                    <div key={s} style={{ textAlign: 'center', paddingTop: 5, borderTop: '1px solid #cbd5e1', fontSize: '0.62em', color: '#64748b', fontWeight: 700 }}>{s}</div>
                                  ))}
                                </div>
                              )}
                              {(showNotes || showContact) && (
                                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'stretch', marginTop: '0.5rem', width: '100%' }}>
                                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {showContact && (
                                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#ccfbf1', color: qTeal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8em', flexShrink: 0 }}>👤</div>
                                        <div style={{ fontSize: '0.7em', lineHeight: 1.35 }}>
                                          <strong style={{ color: '#0f172a' }}>{quoteSampleData.contactPerson}</strong>
                                          <div style={{ color: '#64748b', fontSize: '0.88em' }}>📞 {quoteSampleData.contactPhone} | ✉️ {quoteSampleData.contactEmail}</div>
                                        </div>
                                      </div>
                                    )}
                                    {showNotes && (
                                      <div style={{ background: '#fffbeb', borderLeft: `3px solid ${qTeal2}`, borderRadius: '0 8px 8px 0', padding: '0.75rem 0.9rem', fontSize: '0.68em', color: '#78350f', lineHeight: 1.45 }}>
                                        <strong style={{ display: 'block', marginBottom: 3, fontSize: '0.75em', color: '#b45309' }}>• IMPORTANT NOTES</strong>
                                        {quoteSampleData.notesText}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer */}
                          <div style={{ padding: '0.55rem 2.5rem', background: '#f0fdfa', borderTop: '1.5px solid #ccfbf1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.57em', color: '#94a3b8', flexShrink: 0 }}>
                            <div>
                              <span>{companyInfo.name}{companyInfo.bin ? ` • BIN: ${companyInfo.bin}` : ''} — Thank you for considering our proposal!</span>
                              <div style={{ color: qTeal, fontWeight: 700, fontSize: '0.9em', marginTop: 2 }}>⚠️ This is a Quotation only — NOT a Tax Invoice</div>
                            </div>
                            <span>Quotation {quoteSampleData.quoteNo} • Powered by ACCOUNTICA</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── LIVE PREVIEW (Invoice) ── */}
                  {isProInvoice && editorPanel === 'preview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>📐 Live A4 preview reflecting all style & layout settings</span>
                        <button onClick={handlePrintSample} style={{ padding: '0.28rem 0.8rem', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>🖨️ Print This</button>
                      </div>

                      <div style={{ width: '100%', maxWidth: 780, minHeight: 1100, aspectRatio: '1 / 1.414', background: '#fff', color: '#1e293b', boxShadow: '0 16px 48px rgba(0,0,0,0.14)', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontSize: `${baseFontSize}px`, fontFamily, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: showAccentStripe ? 13 : 8, right: 8, fontSize: '0.52em', fontWeight: 800, background: secondaryColor, color: '#fff', padding: '2px 6px', borderRadius: 3, zIndex: 1 }}>A4 LIVE PREVIEW</div>
                        {showAccentStripe && <div style={{ height: 5, background: `linear-gradient(90deg, ${accentColor} 0%, ${secondaryColor} 100%)`, flexShrink: 0 }} />}

                        <div style={{ padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f1f5f9' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginRight: '1.5rem' }}>
                                {companyInfo.logo ? <img src={companyInfo.logo} alt="logo" style={{ height: 46, maxWidth: 110, objectFit: 'contain', borderRadius: 5 }} /> : <div style={{ fontSize: '1.9em', color: accentColor }}>⚖️</div>}
                                <div>
                                  <div style={{ color: accentColor, fontWeight: 900, fontSize: '1.2em', letterSpacing: '-0.6px', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{companyInfo.name}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.58em', fontWeight: 800, letterSpacing: '0.08em', borderTop: '1px solid #e2e8f0', paddingTop: 2, marginTop: 1, whiteSpace: 'nowrap' }}>{companyInfo.legalName}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginTop: '0.55rem', fontSize: '0.69em', fontWeight: 600 }}>
                                <div style={{ paddingRight: '0.6rem', color: '#475569', whiteSpace: 'nowrap' }}>
                                  <div style={{ color: accentColor, whiteSpace: 'nowrap' }}>{companyInfo.phone}</div>
                                  <div style={{ color: secondaryColor, whiteSpace: 'nowrap' }}>{companyInfo.website}</div>
                                </div>
                                <div style={{ width: 1, background: '#cbd5e1', margin: '0 0.6rem', flexShrink: 0 }} />
                                <div style={{ color: '#475569', whiteSpace: 'nowrap' }}>
                                  <div style={{ color: accentColor, whiteSpace: 'nowrap' }}>{companyInfo.email}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.9em', whiteSpace: 'nowrap' }}>{companyInfo.address}</div>
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '2.3em', fontWeight: 900, color: secondaryColor, letterSpacing: '0.04em', lineHeight: 1 }}>INVOICE</div>
                              <div style={{ fontSize: '0.6em', fontStyle: 'italic', color: '#94a3b8', maxWidth: 190, marginTop: 3 }}>Binding agreement. Terms of sale may be subject to change.</div>
                            </div>
                          </div>

                          {/* Bill To + Meta */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.74em' }}>
                            <div>
                              <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.64em', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>BILL TO</div>
                              <div style={{ fontSize: '1.05em', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>{sampleData.customerName}</div>
                              <div style={{ fontSize: '0.85em', color: '#475569', fontWeight: 600, marginBottom: '0.4rem' }}>{sampleData.customerTitle}</div>
                              {sampleData.customerBin && (
                                <div style={{ fontSize: '0.85em', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>
                                  BIN: {sampleData.customerBin}
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#475569', fontSize: '0.85em', fontWeight: 500 }}>
                                <div>📞 {sampleData.customerPhone} | ✉️ {sampleData.customerEmail}</div>
                                <div>📍 {sampleData.customerAddress}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '110px 90px', gap: '0.3rem', fontSize: '0.78em', textAlign: 'right' }}>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Invoice No.</span>
                                <strong style={{ color: secondaryColor }}>{sampleData.invoiceNo}</strong>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Invoice Date</span>
                                <strong>{sampleData.invoiceDate}</strong>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Payment Due</span>
                                <strong>{sampleData.dueDate}</strong>
                                {/* Salesperson row hidden — details shown in Point of Contact block below */}
                                {sampleData.branch && <><span style={{ color: '#64748b', fontWeight: 500 }}>Branch</span><strong>{sampleData.branch}</strong></>}
                                {sampleData.quoteNo && <><span style={{ color: '#64748b', fontWeight: 500 }}>Quote / SO</span><strong style={{ color: secondaryColor }}>{sampleData.quoteNo}</strong></>}
                              </div>
                              <div style={{ width: '100%', maxWidth: 200, background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})`, color: '#fff', borderRadius: 10, padding: '0.6rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                                <span style={{ fontSize: '0.7em', fontWeight: 700 }}>Amount Due</span>
                                <strong style={{ fontSize: '1.1em', fontWeight: 900 }}>৳{fmtNoDec(sampleData.amount)}</strong>
                              </div>
                              {showPayNow && (
                                <div style={{ width: '100%', maxWidth: 200, background: secondaryColor, color: '#fff', borderRadius: 8, padding: '0.48rem 0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, fontSize: '0.7em', fontWeight: 800 }}>
                                  💳 Pay Now | Online Payment
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Items table */}
                          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.73em', borderRadius: 8, overflow: 'hidden', border: tableStyle === 'minimal' ? 'none' : '1px solid #e2e8f0' }}>
                            <thead>
                              <tr style={{ background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}ee 100%)`, color: '#fff' }}>
                                <th style={{ padding: '0.7rem 0.9rem', textAlign: 'left', fontWeight: 700, fontSize: '0.68em', letterSpacing: '0.04em' }}>DESCRIPTION OF SERVICES</th>
                                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center', width: 35, fontWeight: 700, fontSize: '0.68em' }}>QTY</th>
                                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right', width: 75, fontWeight: 700, fontSize: '0.68em' }}>UNIT PRICE</th>
                                <th style={{ padding: '0.7rem 0.4rem', textAlign: 'center', width: 38, fontWeight: 700, fontSize: '0.68em' }}>DISC%</th>
                                <th style={{ padding: '0.7rem 0.4rem', textAlign: 'center', width: 38, fontWeight: 700, fontSize: '0.68em' }}>VAT%</th>
                                <th style={{ padding: '0.7rem 0.4rem', textAlign: 'center', width: 42, fontWeight: 700, fontSize: '0.68em' }}>TAX%</th>
                                <th style={{ padding: '0.7rem 0.7rem', textAlign: 'right', width: 80, fontWeight: 700, fontSize: '0.68em' }}>AMOUNT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sampleData.items.map((item, idx) => {
                                const lineAmt = item.qty * item.rate * (1 - (item.discount || 0) / 100);
                                return (
                                  <tr key={idx} style={{ background: tableStyle === 'striped' && idx % 2 === 1 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '0.8rem 0.9rem', borderLeft: tableStyle === 'striped' ? `3px solid ${secondaryColor}33` : 'none' }}>
                                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84em' }}>{item.desc || '—'}</div>
                                      {item.sub && <div style={{ fontSize: '0.68em', color: '#94a3b8', fontStyle: 'italic', marginTop: 1 }}>{item.sub}</div>}
                                    </td>
                                    <td style={{ padding: '0.8rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>{item.qty}</td>
                                    <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right', color: '#475569', fontWeight: 600 }}>৳{fmtNoDec(item.rate)}</td>
                                    <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center', fontSize: '0.8em', color: (item.discount || 0) > 0 ? '#dc2626' : '#94a3b8' }}>{(item.discount || 0) > 0 ? `${item.discount}%` : '—'}</td>
                                    <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center', fontSize: '0.8em', color: (item.vatRate || 0) > 0 ? '#0891b2' : '#94a3b8' }}>{(item.vatRate || 0) > 0 ? `${item.vatRate}%` : '—'}</td>
                                    <td style={{ padding: '0.8rem 0.4rem', textAlign: 'center', fontSize: '0.8em', color: (item.taxRate || 0) > 0 ? '#7c3aed' : '#94a3b8' }}>{(item.taxRate || 0) > 0 ? `${item.taxRate}%` : '—'}</td>
                                    <td style={{ padding: '0.8rem 0.7rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>৳{fmtNoDec(lineAmt)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* Bottom grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {showWords && (
                                <div style={{ fontSize: '0.66em', color: '#475569', background: '#f8fafc', borderRadius: 6, padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                                  <strong>In Words:</strong> Three Lakh Taka Only
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', alignItems: 'flex-end' }}>
                              <div style={{ width: '100%', maxWidth: 220, display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.73em' }}>
                                {sampleData.items.map((it, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 3px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: '0.87em' }}>
                                    <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.desc || 'Item'}</span>
                                    <span style={{ fontWeight: 700, color: '#1e293b' }}>৳{fmtNoDec(it.qty * it.rate * (1 - (it.discount||0)/100))}</span>
                                  </div>
                                ))}
                                {[['Subtotal', `৳${fmtNoDec(sampleData.amount)}`], sampleData.vatAmount > 0 && ['VAT', `৳${fmtNoDec(sampleData.vatAmount)}`], sampleData.taxAmount > 0 && ['Tax Withholding (AIT)', `−৳${fmtNoDec(sampleData.taxAmount)}`], sampleData.discountTotal > 0 && ['Discount', `−৳${fmtNoDec(sampleData.discountTotal)}`]].filter(Boolean).map(([label, value]) => (
                                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 3px', color: '#475569', fontWeight: 600 }}>
                                    <span>{label}:</span><strong style={{ color: label.startsWith('Tax') || label === 'Discount' ? '#dc2626' : '#0f172a' }}>{value}</strong>
                                  </div>
                                ))}
                                <div style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${secondaryColor} 100%)`, color: '#fff', borderRadius: 10, padding: '0.6rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: '0.62em', fontWeight: 700, opacity: 0.85 }}>AMOUNT DUE</div>
                                    <div style={{ fontSize: '0.55em', opacity: 0.7 }}>BDT</div>
                                  </div>
                                  <strong style={{ fontSize: '1.25em', fontWeight: 900 }}>৳{fmtNoDec(sampleData.amount)}</strong>
                                </div>
                                {sampleData.taxAmount > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 3px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                                    <span style={{ color: '#15803d', fontWeight: 700 }}>Net Receivable:</span>
                                    <strong style={{ color: '#15803d' }}>৳{fmtNoDec(sampleData.netReceivable || (sampleData.amount - sampleData.taxAmount))}</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ── BOTTOM CONTAINER (always pinned to bottom) ── */}
                          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', width: '100%' }}>

                            {/* Payment Receipts Block */}
                            {sampleData.paymentReceipts && sampleData.paymentReceipts.length > 0 && (() => {
                              const grandTotalForReceipts = sampleData.amount + (sampleData.vatAmount || 0);
                              let runBal = grandTotalForReceipts;
                              const totalPaid = sampleData.paymentReceipts.reduce((s, r) => s + (r.amount || 0), 0);
                              const remaining = Math.max(0, grandTotalForReceipts - totalPaid);
                              const fullyPaid = remaining <= 0.01;
                              return (
                                <div style={{ width: '100%', marginTop: 12, marginBottom: 12, border: '1.5px solid #bbf7d0', borderRadius: 10, overflow: 'hidden', background: '#f0fdf4' }}>
                                  {/* Header */}
                                  <div style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)', color: '#fff', padding: '6px 12px', fontSize: '0.6em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>💳 Payment Receipts</span>
                                    {fullyPaid && <span style={{ background: '#fff', color: '#15803d', borderRadius: 5, padding: '2px 8px', fontSize: '0.9em', fontWeight: 800 }}>✅ PAID IN FULL</span>}
                                  </div>
                                  {/* Table */}
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.62em' }}>
                                    <thead>
                                      <tr style={{ background: '#dcfce7' }}>
                                        {['Date', 'Voucher No.', 'Amount Received', 'Balance Due'].map((h, i) => (
                                          <th key={h} style={{ padding: '5px 10px', color: '#166534', fontWeight: 700, textAlign: i >= 2 ? 'right' : 'left', borderBottom: '1px solid #bbf7d0' }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sampleData.paymentReceipts.map((r, i) => {
                                        runBal -= (r.amount || 0);
                                        return (
                                          <tr key={i} style={{ borderBottom: '1px solid #d1fae5' }}>
                                            <td style={{ padding: '5px 10px', color: '#374151' }}>{r.date || '—'}</td>
                                            <td style={{ padding: '5px 10px', fontWeight: 700, color: '#15803d' }}>{r.receiptNo || '—'}</td>
                                            <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700 }}>৳{Math.round(r.amount || 0).toLocaleString('en-BD')}</td>
                                            <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: runBal <= 0.01 ? '#15803d' : '#dc2626' }}>৳{Math.max(0, Math.round(runBal)).toLocaleString('en-BD')}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                  {/* Footer */}
                                  <div style={{ background: '#dcfce7', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.62em', fontWeight: 700 }}>
                                    <span style={{ color: '#166534' }}>Total Received: <strong>৳{Math.round(totalPaid).toLocaleString('en-BD')}</strong></span>
                                    <span style={{ color: fullyPaid ? '#15803d' : '#dc2626' }}>Remaining Due: <strong>৳{Math.round(remaining).toLocaleString('en-BD')}</strong></span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Signatures block (spanning full page width) */}
                            {showSignatures && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', width: '100%', marginTop: '1rem', marginBottom: '1.25rem', paddingTop: '1.5rem' }}>
                                {['Customer Signature', 'Prepared By', 'Authorized Sign & Seal'].map(s => (
                                  <div key={s} style={{ textAlign: 'center', paddingTop: 5, borderTop: '1px solid #cbd5e1', fontSize: '0.62em', color: '#64748b', fontWeight: 700 }}>{s}</div>
                                ))}
                              </div>
                            )}

                            {/* Notes, Contact Person and QR Code Side-by-Side Row */}
                            {(showNotes || showQr || showContact) && (
                              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'stretch', marginTop: '1rem', width: '100%', paddingTop: '0px' }}>
                                {(showNotes || showContact) && (
                                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {showContact && (
                                      <div>
                                        <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.6em', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>YOUR POINT OF CONTACT</div>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#dbeafe', color: secondaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8em', flexShrink: 0 }}>👤</div>
                                          <div style={{ fontSize: '0.7em', lineHeight: 1.35 }}>
                                            <strong style={{ color: '#0f172a' }}>{sampleData.contactPerson}</strong>
                                            <div style={{ color: '#64748b', fontSize: '0.88em' }}>📞 {sampleData.contactPhone} | ✉️ {sampleData.contactEmail}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {showNotes && (
                                      <div style={{ background: '#fffbeb', borderLeft: `3px solid ${secondaryColor}`, borderRadius: '0 8px 8px 0', padding: '0.75rem 0.9rem', fontSize: '0.68em', color: '#78350f', lineHeight: 1.45, textAlign: 'left' }}>
                                        <strong style={{ display: 'block', marginBottom: 3, fontSize: '0.75em', color: '#b45309' }}>• IMPORTANT NOTES</strong>
                                        {sampleData.notesText}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {showQr && (
                                  <div style={{ flexShrink: 0, width: 96, background: secondaryColor, borderRadius: 12, padding: '0.55rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#fff' }}>
                                    <div style={{ background: '#fff', padding: 3, borderRadius: 6 }}>
                                      <svg width="52" height="52" viewBox="0 0 29 29">
                                        <path d="M0 0h9v9H0zm1 1h7v7H1zm11 0h9v9h-9zm1 1h7v7h-7zM0 12h9v9H0zm1 1h7v7H1zm18 0h3v3h-3zm-6 2h3v3h-3zm6 2h3v3h-3zm-6 2h3v3h-3zm9-9h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3zm-9 0h3v3h-3zm6 2h3v3h-3zm-6 0h3v3h-3zm12-9h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3z" fill="#000" />
                                        <rect x="3" y="3" width="3" height="3" fill="#000" />
                                        <rect x="14" y="3" width="3" height="3" fill="#000" />
                                        <rect x="3" y="14" width="3" height="3" fill="#000" />
                                      </svg>
                                    </div>
                                    <div style={{ fontSize: '0.53em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SCAN TO PAY</div>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '0.55rem 2.5rem', background: '#f8fafc', borderTop: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.57em', color: '#94a3b8', flexShrink: 0 }}>
                          <span>{companyInfo.name}{companyInfo.bin ? ` • BIN: ${companyInfo.bin}` : ''} — Thank you for your business!</span>
                          <span>Invoice {sampleData.invoiceNo} • Powered by ACCOUNTICA</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Non-Pro classic/modern preview */}
                  {!isProInvoice && (
                    <>
                      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Brand Primary Color:</span>
                          <div style={{ display: 'flex', gap: '0.45rem' }}>
                            {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'].map(color => (
                              <button key={color} onClick={() => { setAccentColor(color); setSecondaryColor(color); }} style={{ width: 20, height: 20, borderRadius: '50%', background: color, border: `2px solid ${accentColor === color ? 'var(--text-primary)' : 'transparent'}`, cursor: 'pointer' }} />
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>📏 Font: <strong style={{ color: 'var(--accent-color)' }}>{baseFontSize}px</strong></span>
                          <input type="range" min="11" max="16" value={baseFontSize} onChange={e => setBaseFontSize(Number(e.target.value))} style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent-color)' }} />
                        </div>
                      </div>
                      <div style={{ width: '100%', maxWidth: '800px', minHeight: '900px', aspectRatio: '1 / 1.414', border: '1.5px dashed var(--accent-color)', borderRadius: 4, overflow: 'hidden', background: '#fff', color: '#1e293b', boxShadow: '0 12px 40px rgba(0,0,0,0.08)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', margin: '0 auto', fontSize: `${baseFontSize}px`, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.55em', fontWeight: 800, background: 'var(--accent-color)', color: '#fff', padding: '2px 6px', borderRadius: 4, opacity: 0.85 }}>A4 PREVIEW</div>
                        <div style={{ paddingBottom: '1.5rem', borderBottom: `3px solid ${accentColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ color: accentColor, fontWeight: 900, fontSize: '1.3em' }}>ACCOUNTICA</div>
                            <div style={{ fontSize: '0.65em', opacity: 0.6 }}>BIN: {companyInfo.bin}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1em', color: accentColor }}>INVOICE</div>
                            <div style={{ fontSize: '0.7em', fontWeight: 700 }}>INV-2026-0042</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75em' }}>
                          <div>
                            <div style={{ color: '#64748b', fontWeight: 700, marginBottom: 2 }}>BILLED TO:</div>
                            <strong>Dhaka Workspaces Ltd.</strong>
                            <div>Banani, Dhaka, Bangladesh</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#64748b', fontWeight: 700, marginBottom: 2 }}>DATE OF ISSUE:</div>
                            <div>2026-07-10</div>
                          </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74em' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '8px 6px', textAlign: 'left' }}>Item Description</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Qty</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Unit Price</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 6px' }}>GNSS Antenna Connector</td>
                              <td style={{ padding: '8px 6px', textAlign: 'right' }}>2</td>
                              <td style={{ padding: '8px 6px', textAlign: 'right' }}>৳15,000.00</td>
                              <td style={{ padding: '8px 6px', textAlign: 'right' }}>৳30,000.00</td>
                            </tr>
                            <tr>
                              <td colSpan="2" />
                              <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>Subtotal:</td>
                              <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>৳30,000.00</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Insert Placeholders:</span>
                    {['{{customer_name}}', '{{amount}}', '{{invoice_no}}', '{{due_date}}', '{{company_name}}'].map(tag => (
                      <button key={tag} onClick={() => handleInsertTag(tag)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>{tag}</button>
                    ))}
                  </div>
                  <textarea value={editorBody} onChange={e => setEditorBody(e.target.value)} style={{ width: '100%', height: '140px', padding: '0.75rem', border: '1.5px solid var(--border-color)', borderRadius: 12, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }} />
                  <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)', borderRadius: 12 }}>
                    <h5 style={{ margin: '0 0 6px', fontSize: '0.7rem', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Live Variable Compilation</h5>
                    <div style={{ fontSize: '0.78rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                      {editorBody
                        .replace(/\{\{customer_name\}\}/g, 'Kamrul Islam')
                        .replace(/\{\{amount\}\}/g, fmt(100000))
                        .replace(/\{\{invoice_no\}\}/g, 'INV-2026-0042')
                        .replace(/\{\{due_date\}\}/g, '2026-07-15')
                        .replace(/\{\{company_name\}\}/g, 'Apex Technologies Ltd.')
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
