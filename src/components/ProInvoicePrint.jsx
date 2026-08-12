import { defaultSettings } from '../database/seedData';
import { USER_SEEDS } from '../utils/userSeeds';

const SEED_EMPLOYEES = USER_SEEDS.map(u => ({
  employeeCode: u.employeeCode,
  fullNameEnglish: u.name,
  fullNameBangla: u.name,
  mobileNumber: '+88 01819-556751',
  emailAddress: u.email,
  designation: 'Staff',
  department: 'Administration',
  status: 'Active'
}));

const fmt = (n) =>
  `BDT ${Math.round(Number(n || 0)).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;

const getSalespersonDetails = (name) => {
  if (!name) return null;
  try {
    const list = localStorage.getItem('erp_employees');
    const emps = list ? JSON.parse(list) : SEED_EMPLOYEES;
    return emps.find(e => e.fullNameEnglish === name);
  } catch {
    return SEED_EMPLOYEES.find(e => e.fullNameEnglish === name);
  }
};

function numberToWords(num) {
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ',
    'Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let s = '';
  s += +n[1] ? (a[+n[1]] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  s += +n[2] ? (a[+n[2]] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  s += +n[3] ? (a[+n[3]] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  s += +n[4] ? (a[+n[4]] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  s += +n[5] ? ((s !== '') ? 'and ' : '') + (a[+n[5]] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Taka Only' : 'Taka Only';
  return s.trim();
}

const getSettings = () => {
  try { const s = localStorage.getItem('erp_settings'); return s ? JSON.parse(s) : defaultSettings; }
  catch { return defaultSettings; }
};

export function printProInvoice(inv, customer, receipts = []) {
  const s = getSettings();
  const co = s?.company || {};
  const balance = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
  const isPaid = balance <= 0;

  const salesEmp = getSalespersonDetails(inv.salesperson);
  const salesName = salesEmp?.fullNameEnglish || inv.salesperson || '';
  const salesPhone = salesEmp?.mobileNumber || '';
  const salesEmail = salesEmp?.emailAddress || '';

  const logoBlock = co.logo
    ? `<img src="${co.logo}" alt="logo" style="height:56px;max-width:120px;object-fit:contain;" />`
    : `<div style="font-size:2.4rem;line-height:1;">⚖️</div>`;

  const itemRows = (inv.items || []).map((item, idx) => {
    const lineTotal = item.lineTotal ?? (item.qty * item.unitPrice * (1 - (item.discount || 0) / 100));
    return `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <div style="font-weight:700;color:#0f172a;font-size:8.5pt;">${item.productName || '—'}</div>
        ${item.narration ? `<div style="font-size:7.5pt;color:#94a3b8;margin-top:2px;font-style:italic;">${item.narration}</div>` : ''}
      </td>
      <td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:8.5pt;color:#334155;">${item.qty}</td>
      <td style="padding:10px 14px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:8.5pt;color:#475569;">${fmt(item.unitPrice)}</td>
      ${(item.discount || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#dc2626;font-weight:600;">${item.discount}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      ${(item.vatRate || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#0891b2;font-weight:600;">${item.vatRate || 0}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      ${(item.taxRate || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#7c3aed;font-weight:600;">${item.taxRate}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      <td style="padding:10px 14px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700;font-size:8.5pt;color:#0f172a;">${fmt(lineTotal)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${inv.invoiceNo || ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      font-size: 9pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Screen: centre the A4 sheet ── */
    .page-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px;
      gap: 16px;
    }

    /* ── A4 sheet ── */
    .sheet {
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ── Top accent stripe ── */
    .accent-stripe {
      height: 5px;
      background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
    }

    /* ── Main content padding ── */
    .body-pad {
      padding: 28px 36px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 1.5px solid #e2e8f0;
    }

    .company-block { display: flex; gap: 14px; align-items: flex-start; margin-right: 24px; }
    .company-name {
      font-size: 13.5pt; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px;
      line-height: 1.1; white-space: nowrap;
    }
    .company-sub {
      font-size: 6.5pt; font-weight: 700; color: #64748b; letter-spacing: 0.12em;
      text-transform: uppercase; margin-top: 3px;
      border-top: 1px solid #e2e8f0; padding-top: 3px; white-space: nowrap;
    }
    .company-contact {
      margin-top: 10px; font-size: 7.5pt; color: #475569;
      display: flex; gap: 0; align-items: stretch;
    }
    .contact-col { display: flex; flex-direction: column; gap: 2px; white-space: nowrap; }
    .contact-divider { width: 1px; background: #cbd5e1; margin: 0 12px; flex-shrink: 0; }

    .invoice-title-block { text-align: right; }
    .invoice-word {
      font-size: 30pt; font-weight: 900; color: #3b82f6;
      letter-spacing: 0.05em; line-height: 1;
    }
    .invoice-tagline {
      font-size: 6pt; font-style: italic; color: #94a3b8;
      max-width: 200px; margin-top: 4px; line-height: 1.3; text-align: right;
    }
    .invoice-no-badge {
      margin-top: 8px; display: inline-flex; align-items: center; gap: 6px;
      background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 6px;
      padding: 4px 10px; font-size: 7.5pt; font-weight: 700; color: #1d4ed8;
    }

    /* ── Status badge ── */
    .status-badge {
      display: inline-block; padding: 3px 10px; border-radius: 99px;
      font-size: 6.5pt; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .status-paid    { background: #dcfce7; color: #15803d; }
    .status-partial { background: #fef9c3; color: #92400e; }
    .status-unpaid  { background: #fee2e2; color: #b91c1c; }

    /* ── Bill To / Meta grid ── */
    .meta-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0; margin-top: 20px; margin-bottom: 18px;
    }
    .bill-to { border-right: 1px solid #f1f5f9; padding-right: 24px; }
    .meta-right { padding-left: 24px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }

    .section-label {
      font-size: 6pt; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 6px;
    }
    .cust-name { font-size: 12pt; font-weight: 800; color: #0f172a; margin-bottom: 3px; }
    .cust-detail { font-size: 7.5pt; color: #475569; margin-bottom: 2px; }

    .meta-row { display: flex; gap: 8px; align-items: baseline; }
    .meta-key { font-size: 7pt; color: #94a3b8; font-weight: 500; min-width: 90px; text-align: right; }
    .meta-val { font-size: 8pt; font-weight: 700; color: #0f172a; }
    .meta-val-accent { font-size: 9pt; font-weight: 800; color: #2563eb; }

    /* ── Amount Due pill ── */
    .amount-due-pill {
      margin-top: 10px;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #fff; border-radius: 10px; padding: 10px 16px;
      display: flex; justify-content: space-between; align-items: center;
      min-width: 200px;
    }
    .amount-due-label { font-size: 6.5pt; font-weight: 700; opacity: 0.85; }
    .amount-due-value { font-size: 13pt; font-weight: 900; }

    /* ── Items table ── */
    .items-table {
      width: 100%; border-collapse: collapse;
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    .items-table thead tr {
      background: linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%);
      color: #ffffff;
    }
    .items-table thead th {
      padding: 10px 14px; font-size: 7pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.07em;
    }
    .items-table thead th:first-child { border-radius: 0; text-align: left; }
    .items-table thead th:last-child  { text-align: right; }

    .items-table tbody tr:nth-child(even) { background: #f8fafc; }
    .items-table tbody tr:hover { background: #f0f9ff; }

    /* ── Totals block ── */
    .totals-section {
      margin-top: 20px; display: grid;
      grid-template-columns: 1.1fr 0.9fr; gap: 28px;
    }

    .notes-box { display: none; }
    .contact-box-bottom {
      margin-bottom: 8px;
    }
    .contact-card-inner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 6px 12px;
      width: fit-content;
      max-width: 100%;
    }
    .contact-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #eff6ff;
      color: #1e40af;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      flex-shrink: 0;
    }
    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .contact-name {
      font-size: 8pt;
      font-weight: 700;
      color: #0f172a;
    }
    .contact-details {
      font-size: 7pt;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .contact-sep {
      color: #cbd5e1;
    }

    .invoice-bottom-section {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .notes-qr-row {
      margin-top: 12px;
      display: flex;
      gap: 20px;
      align-items: stretch;
      width: 100%;
      padding-top: 0;
    }
    .notes-box-bottom {
      flex: 1;
      min-width: 0;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
      font-size: 7.5pt;
      color: #78350f;
      line-height: 1.5;
      text-align: left;
    }
    .notes-title { font-weight: 800; color: #b45309; margin-bottom: 4px; font-size: 7.5pt; }

    .words-box {
      margin-top: 12px; font-size: 7.5pt; color: #475569;
      background: #f8fafc; border-radius: 6px; padding: 8px 10px;
      border: 1px solid #e2e8f0; font-style: italic;
    }

    .totals-card {
      display: flex; flex-direction: column; gap: 6px;
      align-items: flex-end;
    }
    .totals-list {
      width: 100%; max-width: 220px;
    }
    .total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 3px 0; font-size: 8pt; border-bottom: 1px solid #f1f5f9;
    }
    .total-row-key { color: #64748b; font-weight: 500; }
    .total-row-val { font-weight: 700; color: #0f172a; }
    .grand-total-block {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: #fff; border-radius: 10px; padding: 10px 16px;
      display: flex; justify-content: space-between; align-items: center;
      width: 100%; max-width: 220px; margin-top: 6px;
    }
    .grand-total-label { font-size: 6.5pt; font-weight: 700; opacity: 0.9; }
    .grand-total-value { font-size: 14pt; font-weight: 900; }

    /* ── QR placeholder ── */
    .qr-block-bottom {
      flex-shrink: 0;
      background: #1e40af;
      color: #fff;
      border-radius: 12px;
      padding: 8px;
      text-align: center;
      width: 90px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 6px;
    }
    .qr-inner { background: #fff; border-radius: 6px; padding: 4px; margin-bottom: 5px; }
    .qr-label { font-size: 5.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }

    /* ── Payment Receipts ── */
    .payment-receipts-box {
      width: 100%;
      margin-top: 16px;
      margin-bottom: 16px;
      border: 1.5px solid #bbf7d0;
      border-radius: 10px;
      overflow: hidden;
      background: #f0fdf4;
    }
    .payment-receipts-header {
      background: linear-gradient(135deg, #15803d, #16a34a);
      color: #fff;
      padding: 7px 14px;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .payment-receipts-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
    }
    .payment-receipts-table th {
      background: #dcfce7;
      color: #166534;
      font-weight: 700;
      padding: 5px 10px;
      text-align: left;
      border-bottom: 1px solid #bbf7d0;
    }
    .payment-receipts-table th:last-child,
    .payment-receipts-table td:last-child { text-align: right; }
    .payment-receipts-table td {
      padding: 5px 10px;
      border-bottom: 1px solid #d1fae5;
      color: #1e293b;
    }
    .payment-receipts-table tr:last-child td { border-bottom: none; }
    .payment-receipts-footer {
      background: #dcfce7;
      padding: 7px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      font-weight: 700;
    }
    .paid-in-full-badge {
      background: #15803d;
      color: #fff;
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    /* ── Signatures ── */
    .signatures {
      margin-top: 0;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      width: 100%;
      padding-top: 24px;
    }
    .sig-line {
      text-align: center; padding-top: 6px;
      border-top: 1px solid #cbd5e1;
      font-size: 7pt; color: #64748b; font-weight: 600;
    }

    /* ── Footer ── */
    .invoice-footer {
      margin-top: auto;
      padding: 14px 36px;
      background: #f8fafc;
      border-top: 1.5px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer-left { font-size: 7pt; color: #94a3b8; }
    .footer-right { font-size: 7pt; color: #94a3b8; }

    /* ── Print button (screen only) ── */
    .print-actions {
      display: flex; gap: 10px; justify-content: center;
    }
    .btn-print {
      padding: 10px 28px; background: #1e40af; color: #fff;
      border: none; border-radius: 8px; font-family: inherit;
      font-size: 10pt; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 16px rgba(30,64,175,0.3);
      display: flex; align-items: center; gap: 8px;
    }
    .btn-close {
      padding: 10px 20px; background: #f1f5f9; color: #334155;
      border: none; border-radius: 8px; font-family: inherit;
      font-size: 10pt; font-weight: 600; cursor: pointer;
    }

    /* ── Print media ── */
    @media print {
      body { background: #fff; font-size: 9pt; }
      .page-wrapper { padding: 0; background: #fff; }
      .sheet {
        width: 100%; min-height: 100%;
        box-shadow: none; border-radius: 0;
        page-break-after: always;
      }
      .print-actions { display: none !important; }
      @page {
        size: A4 portrait;
        margin: 8mm 10mm;
      }
    }
  </style>
</head>
<body>
<div class="page-wrapper">

  <!-- ── Print / Close Buttons (screen only) ── -->
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>

  <!-- ══ A4 SHEET ══ -->
  <div class="sheet">
    <div class="accent-stripe"></div>

    <div class="body-pad">

      <!-- ── HEADER ── -->
      <div class="header">
        <!-- Left: Logo + Company info -->
        <div>
          <div class="company-block">
            ${logoBlock}
            <div>
              <div class="company-name">${co.name || 'Company Name'}</div>
              <div class="company-sub">${co.legalName || ''}</div>
            </div>
          </div>
          <div class="company-contact">
            <div class="contact-col">
              ${co.phone   ? `<div style="color:#1e3a8a;font-weight:600;">${co.phone}</div>`   : ''}
              ${co.website ? `<div style="color:#2563eb;text-decoration:underline;">${co.website}</div>` : ''}
            </div>
            ${(co.email || co.address) ? `
            <div class="contact-divider"></div>
            <div class="contact-col">
              ${co.email   ? `<div style="color:#1e3a8a;font-weight:600;">${co.email}</div>`   : ''}
              ${co.address ? `<div style="color:#64748b;white-space:nowrap;">${co.address}</div>` : ''}
            </div>` : ''}
          </div>
        </div>

        <!-- Right: INVOICE title + no + status -->
        <div class="invoice-title-block">
          <div class="invoice-word">INVOICE</div>
          <div class="invoice-tagline">Binding agreement. Terms of sale may be subject to change.</div>
          <div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
            <div class="invoice-no-badge">
              <span style="color:#64748b;font-weight:500;">No.</span>
              <span>${inv.invoiceNo || '—'}</span>
            </div>
            <span class="status-badge ${isPaid ? 'status-paid' : (inv.paidAmount > 0 ? 'status-partial' : 'status-unpaid')}">
              ${isPaid ? '✓ Paid' : (inv.paidAmount > 0 ? '⚡ Partial' : '● Unpaid')}
            </span>
          </div>
        </div>
      </div>

      <!-- ── BILL TO / INVOICE META ── -->
      <div class="meta-grid">
        <!-- Bill To -->
        <div class="bill-to">
          <div class="section-label">Bill To</div>
          <div class="cust-name" style="font-size:12pt;font-weight:800;color:#0f172a;margin-bottom:2px;">
            ${customer?.name || inv.customerId || '—'}
          </div>
          ${customer?.contact ? `<div class="cust-detail" style="font-size:8.5pt;color:#475569;font-weight:600;margin-bottom:5px;">${customer.contact}</div>` : ''}
          ${(customer?.vatNo || customer?.tin) ? `<div class="cust-detail" style="font-size:8.5pt;font-weight:700;color:#1e293b;margin-bottom:5px;">BIN: ${customer.vatNo || customer.tin}</div>` : ''}
          
          <div style="font-size:8pt;color:#475569;margin-top:2px;font-weight:500;">
            ${(customer?.phone || customer?.email) ? `<div>📞 ${customer.phone || ''} ${customer.phone && customer.email ? '| ✉️' : '✉️'} ${customer.email || ''}</div>` : ''}
            ${customer?.address ? `<div style="margin-top:2px;">📍 ${customer.address}</div>` : ''}
          </div>
        </div>

        <!-- Meta + Amount Due -->
        <div class="meta-right">
          <div>
            ${inv.quoteNo   ? `<div class="meta-row"><span class="meta-key">Quotation No.</span><span class="meta-val">${inv.quoteNo}</span></div>`   : ''}
            ${inv.soNumber  ? `<div class="meta-row"><span class="meta-key">Sales Order</span><span class="meta-val">${inv.soNumber}</span></div>`  : ''}
            <div class="meta-row"><span class="meta-key">Invoice Date</span><span class="meta-val">${inv.date || '—'}</span></div>
            <div class="meta-row"><span class="meta-key">Payment Due</span><span class="meta-val">${inv.dueDate || '—'}</span></div>
            ${/* Salesperson row hidden — details shown in Point of Contact block below */ ''}
            ${inv.branch     ? `<div class="meta-row"><span class="meta-key">Branch</span><span class="meta-val">${inv.branch}</span></div>` : ''}
            ${co.bin        ? `<div class="meta-row"><span class="meta-key">Our BIN</span><span class="meta-val">${co.bin}</span></div>`             : ''}
          </div>
          <!-- Amount Due Pill -->
          <div class="amount-due-pill">
            <div>
              <div class="amount-due-label">AMOUNT DUE</div>
              <div style="font-size:6pt;opacity:0.7;">BDT</div>
            </div>
            <div class="amount-due-value">${fmt(balance).replace('BDT ','')} </div>
          </div>
        </div>
      </div>

      <!-- ── ITEMS TABLE ── -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align:left;">Description of Goods / Services</th>
            <th style="text-align:center;width:45px;">Qty</th>
            <th style="text-align:right;width:100px;">Unit Price</th>
            <th style="text-align:center;width:45px;">Disc%</th>
            <th style="text-align:center;width:45px;">VAT%</th>
            <th style="text-align:center;width:45px;">Tax%</th>
            <th style="text-align:right;width:105px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- ── TOTALS + NOTES ── -->
      <div class="totals-section">

        <!-- LEFT: Words -->
        <div>
          <div class="words-box">
            <strong>In Words:</strong> ${numberToWords(Math.round(inv.grandTotal || 0))}
          </div>
        </div>

        <!-- RIGHT: Totals card -->
        <div class="totals-card">
          <div class="totals-list">
            <div class="total-row">
              <span class="total-row-key">Subtotal</span>
              <span class="total-row-val">${fmt(inv.subtotal || 0)}</span>
            </div>
            ${(inv.vatAmount || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">VAT</span>
              <span class="total-row-val">${fmt(inv.vatAmount)}</span>
            </div>` : ''}
            ${(inv.discountTotal || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">Discount</span>
              <span class="total-row-val" style="color:#dc2626;">− ${fmt(inv.discountTotal)}</span>
            </div>` : ''}
            ${(inv.totalTaxAmount || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">Tax Withholding (AIT)</span>
              <span class="total-row-val" style="color:#7c3aed;">− ${fmt(inv.totalTaxAmount)}</span>
            </div>` : ''}
            ${(inv.paidAmount || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">Paid</span>
              <span class="total-row-val" style="color:#16a34a;">${fmt(inv.paidAmount)}</span>
            </div>` : ''}
          </div>

          <div class="grand-total-block">
            <div>
              <div class="grand-total-label">BALANCE DUE</div>
              <div style="font-size:6pt;opacity:0.75;">Bangladeshi Taka</div>
            </div>
            <div class="grand-total-value">${fmt(balance).replace('BDT ','৳')}</div>
          </div>
          ${(inv.totalTaxAmount || 0) > 0 ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0;margin-top:4px;">
            <span style="font-size:7.5pt;color:#15803d;font-weight:700;">Net Receivable (after AIT):</span>
            <strong style="font-size:8pt;color:#15803d;">${fmt(inv.netReceivable || (inv.grandTotal - inv.totalTaxAmount)).replace('BDT ','৳')}</strong>
          </div>` : ''}
        </div>
      </div>

      <!-- ── BOTTOM SECTIONS CONTAINER (always pinned to bottom) ── -->
      <div class="invoice-bottom-section">

        <!-- Payment Receipts Box (auto-show when payments received) -->
        ${receipts.length > 0 ? (() => {
          let runningBalance = inv.grandTotal || 0;
          const rows = receipts.map(r => {
            runningBalance -= (r.amount || 0);
            return `
            <tr>
              <td>${r.date || '—'}</td>
              <td style="font-weight:700;color:#15803d;">${r.receiptNo || r.id || '—'}</td>
              <td style="text-align:right;font-weight:700;">৳${Math.round(r.amount || 0).toLocaleString('en-BD')}</td>
              <td style="text-align:right;font-weight:700;color:${runningBalance <= 0.01 ? '#15803d' : '#dc2626'};">৳${Math.max(0, Math.round(runningBalance)).toLocaleString('en-BD')}</td>
            </tr>`;
          }).join('');
          const totalPaid = receipts.reduce((s, r) => s + (r.amount || 0), 0);
          const remaining = Math.max(0, (inv.grandTotal || 0) - totalPaid);
          const fullyPaid = remaining <= 0.01;
          return `
        <div class="payment-receipts-box">
          <div class="payment-receipts-header">
            <span>💳 Payment Receipts</span>
            ${fullyPaid ? '<span class="paid-in-full-badge">✅ PAID IN FULL</span>' : ''}
          </div>
          <table class="payment-receipts-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher No.</th>
                <th style="text-align:right;">Amount Received</th>
                <th style="text-align:right;">Balance Due</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="payment-receipts-footer">
            <span style="color:#166534;">Total Received: <strong>৳${Math.round(totalPaid).toLocaleString('en-BD')}</strong></span>
            <span style="color:${fullyPaid ? '#15803d' : '#dc2626'};">Remaining Due: <strong>৳${Math.round(remaining).toLocaleString('en-BD')}</strong></span>
          </div>
        </div>`;
        })() : ''}

        <!-- Signatures (Full Width) -->
        <div class="signatures">
          <div class="sig-line">Customer Signature</div>
          <div class="sig-line">Prepared By</div>
          <div class="sig-line">Authorized Sign &amp; Seal</div>
        </div>

        <!-- Notes and QR Code Side-by-Side Row -->
        <div class="notes-qr-row">
          <div style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;">
            ${salesName ? `
            <div class="contact-box-bottom">
              <div style="font-size: 6.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px;">YOUR POINT OF CONTACT</div>
              <div class="contact-card-inner">
                <div class="contact-avatar">👤</div>
                <div class="contact-info">
                  <div class="contact-name">${salesName}</div>
                  <div class="contact-details">
                    ${salesPhone ? `<span>📞 ${salesPhone}</span>` : ''}
                    ${(salesPhone && salesEmail) ? '<span class="contact-sep">|</span>' : ''}
                    ${salesEmail ? `<span>✉️ ${salesEmail}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>` : ''}
            <div class="notes-box-bottom">
              <div class="notes-title">• Important Notes</div>
              ${inv.narration
                ? inv.narration
                : 'The invoice excludes any applicable conversion or government fees, which shall be payable separately. The total amount may vary in the event of regulatory changes.'}
            </div>
          </div>
          <div class="qr-block-bottom">
            <div class="qr-inner">
              <svg width="64" height="64" viewBox="0 0 29 29">
                <path d="M0 0h9v9H0zm1 1h7v7H1zm11 0h9v9h-9zm1 1h7v7h-7zM0 12h9v9H0zm1 1h7v7H1zm18 0h3v3h-3zm-6 2h3v3h-3zm6 2h3v3h-3zm-6 2h3v3h-3zm9-9h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3zm-9 0h3v3h-3zm6 2h3v3h-3zm-6 0h3v3h-3zm12-9h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3z" fill="#000"/>
                <rect x="3" y="3" width="3" height="3" fill="#000"/>
                <rect x="14" y="3" width="3" height="3" fill="#000"/>
                <rect x="3" y="14" width="3" height="3" fill="#000"/>
              </svg>
            </div>
            <div class="qr-label">Scan to Pay</div>
          </div>
        </div>

      </div>

    </div><!-- /body-pad -->

    <!-- ── FOOTER ── -->
    <div class="invoice-footer">
      <div class="footer-left">
        ${co.name || ''} ${co.bin ? `• BIN: ${co.bin}` : ''}<br/>
        Thank you for your business!
      </div>
      <div class="footer-right">
        Invoice ${inv.invoiceNo || ''} • Generated ${new Date().toLocaleDateString('en-BD')}<br/>
        <span style="color:#bfdbfe;">Powered by ACCOUNTICA</span>
      </div>
    </div>

  </div><!-- /sheet -->
</div><!-- /page-wrapper -->

<script>
  // Auto-trigger print after fonts load
  if (document.fonts) {
    document.fonts.ready.then(() => setTimeout(() => window.print(), 400));
  } else {
    setTimeout(() => window.print(), 800);
  }
</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=950,height=780,scrollbars=yes');
  if (!win) return alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
  win.document.write(html);
  win.document.close();
  win.focus();
}

export function printProQuotation(quote, customer) {
  const s = getSettings();
  const co = s?.company || {};

  const salesEmp = getSalespersonDetails(quote.salesperson);
  const salesName = salesEmp?.fullNameEnglish || quote.salesperson || '';
  const salesPhone = salesEmp?.mobileNumber || '';
  const salesEmail = salesEmp?.emailAddress || '';

  const logoBlock = co.logo
    ? `<img src="${co.logo}" alt="logo" style="height:56px;max-width:120px;object-fit:contain;" />`
    : `<div style="font-size:2.4rem;line-height:1;">📋</div>`;

  const itemRows = (quote.items || []).map((item) => {
    const lineTotal = item.lineTotal ?? (item.qty * item.unitPrice * (1 - (item.discount || 0) / 100));
    return `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <div style="font-weight:700;color:#0f172a;font-size:8.5pt;">${item.productName || '—'}</div>
        ${item.narration ? `<div style="font-size:7.5pt;color:#94a3b8;margin-top:2px;font-style:italic;">${item.narration}</div>` : ''}
      </td>
      <td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:8.5pt;color:#334155;">${item.qty}</td>
      <td style="padding:10px 14px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:8.5pt;color:#475569;">${fmt(item.unitPrice)}</td>
      ${(item.discount || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#dc2626;font-weight:600;">${item.discount}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      ${(item.vatRate || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#0891b2;font-weight:600;">${item.vatRate || 0}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      ${(item.taxRate || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#7c3aed;font-weight:600;">${item.taxRate}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      <td style="padding:10px 14px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700;font-size:8.5pt;color:#0f172a;">${fmt(lineTotal)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Quotation ${quote.quoteNo || ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      background: #f8fafc; color: #1e293b; font-size: 9pt; line-height: 1.5;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .page-wrapper { display: flex; flex-direction: column; align-items: center; padding: 24px; gap: 16px; }
    .sheet { width: 210mm; min-height: 297mm; background: #ffffff; box-shadow: 0 4px 32px rgba(0,0,0,0.10); border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; }
    .accent-stripe { height: 5px; background: linear-gradient(90deg, #0f766e 0%, #14b8a6 50%, #5eead4 100%); }
    .body-pad { padding: 28px 36px; flex: 1; display: flex; flex-direction: column; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 1.5px solid #e2e8f0; }
    .company-block { display: flex; gap: 14px; align-items: flex-start; margin-right: 24px; }
    .company-name { font-size: 13.5pt; font-weight: 900; color: #0f766e; letter-spacing: -0.5px; line-height: 1.1; white-space: nowrap; }
    .company-sub { font-size: 6.5pt; font-weight: 700; color: #64748b; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 3px; border-top: 1px solid #e2e8f0; padding-top: 3px; white-space: nowrap; }
    .company-contact { margin-top: 10px; font-size: 7.5pt; color: #475569; display: flex; gap: 0; align-items: stretch; }
    .contact-col { display: flex; flex-direction: column; gap: 2px; white-space: nowrap; }
    .contact-divider { width: 1px; background: #cbd5e1; margin: 0 12px; flex-shrink: 0; }
    .quote-title-block { text-align: right; }
    .quote-word { font-size: 28pt; font-weight: 900; color: #14b8a6; letter-spacing: 0.04em; line-height: 1; }
    .quote-tagline { font-size: 6pt; font-style: italic; color: #94a3b8; max-width: 200px; margin-top: 4px; line-height: 1.3; text-align: right; }
    .quote-no-badge { margin-top: 8px; display: inline-flex; align-items: center; gap: 6px; background: #f0fdfa; border: 1.5px solid #99f6e4; border-radius: 6px; padding: 4px 10px; font-size: 7.5pt; font-weight: 700; color: #0f766e; }
    .validity-badge { margin-top: 5px; display: inline-flex; align-items: center; gap: 5px; background: #fefce8; border: 1.5px solid #fde047; border-radius: 6px; padding: 3px 9px; font-size: 7pt; font-weight: 700; color: #a16207; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-top: 20px; margin-bottom: 18px; }
    .bill-to { border-right: 1px solid #f1f5f9; padding-right: 24px; }
    .meta-right { padding-left: 24px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
    .section-label { font-size: 6pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 6px; }
    .cust-name { font-size: 12pt; font-weight: 800; color: #0f172a; margin-bottom: 3px; }
    .cust-detail { font-size: 7.5pt; color: #475569; margin-bottom: 2px; }
    .meta-row { display: flex; gap: 8px; align-items: baseline; }
    .meta-key { font-size: 7pt; color: #94a3b8; font-weight: 500; min-width: 90px; text-align: right; }
    .meta-val { font-size: 8pt; font-weight: 700; color: #0f172a; }
    .amount-pill { margin-top: 10px; background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: #fff; border-radius: 10px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; min-width: 200px; }
    .amount-label { font-size: 6.5pt; font-weight: 700; opacity: 0.85; }
    .amount-value { font-size: 13pt; font-weight: 900; }
    .items-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .items-table thead tr { background: linear-gradient(90deg, #0f766e 0%, #0d9488 100%); color: #ffffff; }
    .items-table thead th { padding: 10px 14px; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; }
    .items-table thead th:first-child { text-align: left; }
    .items-table thead th:last-child { text-align: right; }
    .items-table tbody tr:nth-child(even) { background: #f0fdfa; }
    .totals-section { margin-top: 20px; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 28px; }
    .totals-card { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
    .totals-list { width: 100%; max-width: 220px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 8pt; border-bottom: 1px solid #f1f5f9; }
    .total-row-key { color: #64748b; font-weight: 500; }
    .total-row-val { font-weight: 700; color: #0f172a; }
    .grand-total-block { background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: #fff; border-radius: 10px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 220px; margin-top: 6px; }
    .grand-total-label { font-size: 6.5pt; font-weight: 700; opacity: 0.9; }
    .grand-total-value { font-size: 14pt; font-weight: 900; }
    .words-box { margin-top: 12px; font-size: 7.5pt; color: #475569; background: #f8fafc; border-radius: 6px; padding: 8px 10px; border: 1px solid #e2e8f0; font-style: italic; }
    .terms-box { margin-top: 8px; background: #f0fdfa; border-left: 3px solid #14b8a6; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 7.5pt; color: #134e4a; line-height: 1.5; }
    .terms-title { font-weight: 800; color: #0f766e; margin-bottom: 4px; font-size: 7.5pt; }
    .quote-bottom-section { margin-top: auto; display: flex; flex-direction: column; width: 100%; }
    .signatures { margin-top: 0; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; width: 100%; padding-top: 24px; }
    .sig-line { text-align: center; padding-top: 6px; border-top: 1px solid #cbd5e1; font-size: 7pt; color: #64748b; font-weight: 600; }
    .notes-qr-row { margin-top: 12px; display: flex; gap: 20px; align-items: stretch; width: 100%; }
    .notes-box-bottom { flex: 1; min-width: 0; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 7.5pt; color: #78350f; line-height: 1.5; }
    .notes-title { font-weight: 800; color: #b45309; margin-bottom: 4px; font-size: 7.5pt; }
    .contact-box-bottom { margin-bottom: 8px; }
    .contact-card-inner { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px 12px; width: fit-content; max-width: 100%; }
    .contact-avatar { width: 26px; height: 26px; border-radius: 50%; background: #ccfbf1; color: #0f766e; display: flex; align-items: center; justify-content: center; font-size: 9pt; flex-shrink: 0; }
    .contact-info { display: flex; flex-direction: column; gap: 1px; }
    .contact-name { font-size: 8pt; font-weight: 700; color: #0f172a; }
    .contact-details { font-size: 7pt; color: #64748b; display: flex; align-items: center; gap: 6px; }
    .qr-block-bottom { flex-shrink: 0; background: #0f766e; color: #fff; border-radius: 12px; padding: 8px; text-align: center; width: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px; }
    .qr-inner { background: #fff; border-radius: 6px; padding: 4px; margin-bottom: 5px; }
    .qr-label { font-size: 5.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .invoice-footer { margin-top: auto; padding: 14px 36px; background: #f0fdfa; border-top: 1.5px solid #ccfbf1; display: flex; justify-content: space-between; align-items: center; }
    .footer-left { font-size: 7pt; color: #94a3b8; }
    .footer-right { font-size: 7pt; color: #94a3b8; }
    .not-tax-notice { font-size: 6.5pt; color: #0f766e; font-weight: 700; text-align: center; margin-top: 4px; }
    .print-actions { display: flex; gap: 10px; justify-content: center; }
    .btn-print { padding: 10px 28px; background: #0f766e; color: #fff; border: none; border-radius: 8px; font-family: inherit; font-size: 10pt; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(15,118,110,0.3); display: flex; align-items: center; gap: 8px; }
    .btn-close { padding: 10px 20px; background: #f1f5f9; color: #334155; border: none; border-radius: 8px; font-family: inherit; font-size: 10pt; font-weight: 600; cursor: pointer; }
    @media print {
      body { background: #fff; font-size: 9pt; }
      .page-wrapper { padding: 0; background: #fff; }
      .sheet { width: 100%; min-height: 100%; box-shadow: none; border-radius: 0; page-break-after: always; }
      .print-actions { display: none !important; }
      @page { size: A4 portrait; margin: 8mm 10mm; }
    }
  </style>
</head>
<body>
<div class="page-wrapper">
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>

  <div class="sheet">
    <div class="accent-stripe"></div>

    <div class="body-pad">

      <!-- HEADER -->
      <div class="header">
        <div>
          <div class="company-block">
            ${logoBlock}
            <div>
              <div class="company-name">${co.name || 'Company Name'}</div>
              <div class="company-sub">${co.legalName || ''}</div>
            </div>
          </div>
          <div class="company-contact">
            <div class="contact-col">
              ${co.phone   ? `<div style="color:#0f766e;font-weight:600;">${co.phone}</div>`   : ''}
              ${co.website ? `<div style="color:#0d9488;text-decoration:underline;">${co.website}</div>` : ''}
            </div>
            ${(co.email || co.address) ? `
            <div class="contact-divider"></div>
            <div class="contact-col">
              ${co.email   ? `<div style="color:#0f766e;font-weight:600;">${co.email}</div>`   : ''}
              ${co.address ? `<div style="color:#64748b;white-space:nowrap;">${co.address}</div>` : ''}
            </div>` : ''}
          </div>
        </div>

        <div class="quote-title-block">
          <div class="quote-word">QUOTATION</div>
          <div class="quote-tagline">Estimated offer — subject to acceptance. Not a tax invoice.</div>
          <div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
            <div class="quote-no-badge">
              <span style="color:#64748b;font-weight:500;">No.</span>
              <span>${quote.quoteNo || '—'}</span>
            </div>
            ${quote.validityDate ? `<div class="validity-badge">⏳ Valid Until: ${quote.validityDate}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- QUOTE TO / META -->
      <div class="meta-grid">
        <div class="bill-to">
          <div class="section-label">Quote To</div>
          <div class="cust-name">${customer?.name || '—'}</div>
          ${customer?.contact ? `<div class="cust-detail" style="font-size:8.5pt;color:#475569;font-weight:600;margin-bottom:5px;">${customer.contact}</div>` : ''}
          ${(customer?.vatNo || customer?.tin) ? `<div class="cust-detail" style="font-size:8.5pt;font-weight:700;color:#1e293b;margin-bottom:5px;">BIN: ${customer.vatNo || customer.tin}</div>` : ''}
          <div style="font-size:8pt;color:#475569;margin-top:2px;font-weight:500;">
            ${(customer?.phone || customer?.email) ? `<div>📞 ${customer.phone || ''} ${customer.phone && customer.email ? '| ✉️' : '✉️'} ${customer.email || ''}</div>` : ''}
            ${customer?.address ? `<div style="margin-top:2px;">📍 ${customer.address}</div>` : ''}
          </div>
        </div>

        <div class="meta-right">
          <div>
            <div class="meta-row"><span class="meta-key">Quotation Date</span><span class="meta-val">${quote.date || '—'}</span></div>
            ${quote.validityDate ? `<div class="meta-row"><span class="meta-key">Valid Until</span><span class="meta-val" style="color:#a16207;">${quote.validityDate}</span></div>` : ''}
            ${quote.branch ? `<div class="meta-row"><span class="meta-key">Branch</span><span class="meta-val">${quote.branch}</span></div>` : ''}
            ${co.bin ? `<div class="meta-row"><span class="meta-key">Our BIN</span><span class="meta-val">${co.bin}</span></div>` : ''}
          </div>
          <div class="amount-pill">
            <div>
              <div class="amount-label">QUOTED AMOUNT</div>
              <div style="font-size:6pt;opacity:0.7;">BDT</div>
            </div>
            <div class="amount-value">৳${Math.round(Number(quote.grandTotal || 0)).toLocaleString('en-BD')}</div>
          </div>
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align:left;">Description of Goods / Services</th>
            <th style="text-align:center;width:45px;">Qty</th>
            <th style="text-align:right;width:100px;">Unit Price</th>
            <th style="text-align:center;width:45px;">Disc%</th>
            <th style="text-align:center;width:45px;">VAT%</th>
            <th style="text-align:center;width:45px;">Tax%</th>
            <th style="text-align:right;width:105px;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- TOTALS + TERMS -->
      <div class="totals-section">
        <div>
          <div class="words-box">
            <strong>In Words:</strong> ${numberToWords(Math.round(quote.grandTotal || 0))}
          </div>
          ${quote.termsText ? `
          <div class="terms-box" style="margin-top:10px;">
            <div class="terms-title">📋 Terms &amp; Conditions</div>
            ${quote.termsText}
          </div>` : ''}
        </div>

        <div class="totals-card">
          <div class="totals-list">
            <div class="total-row">
              <span class="total-row-key">Subtotal</span>
              <span class="total-row-val">${fmt(quote.subtotal || 0)}</span>
            </div>
            ${(quote.vatAmount || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">VAT</span>
              <span class="total-row-val">${fmt(quote.vatAmount)}</span>
            </div>` : ''}
            ${(quote.discountTotal || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">Discount</span>
              <span class="total-row-val" style="color:#dc2626;">− ${fmt(quote.discountTotal)}</span>
            </div>` : ''}
            ${(quote.totalTaxAmount || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">Tax Withholding (AIT)</span>
              <span class="total-row-val" style="color:#7c3aed;">− ${fmt(quote.totalTaxAmount)}</span>
            </div>` : ''}
          </div>
          <div class="grand-total-block">
            <div>
              <div class="grand-total-label">TOTAL QUOTED</div>
              <div style="font-size:6pt;opacity:0.75;">Bangladeshi Taka</div>
            </div>
            <div class="grand-total-value">৳${Math.round(Number(quote.grandTotal || 0)).toLocaleString('en-BD')}</div>
          </div>
          ${(quote.totalTaxAmount || 0) > 0 ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#f0fdfa;border-radius:6px;border:1px solid #99f6e4;margin-top:4px;">
            <span style="font-size:7.5pt;color:#0f766e;font-weight:700;">Net Receivable (after AIT):</span>
            <strong style="font-size:8pt;color:#0f766e;">৳${Math.round(Number(quote.netReceivable || (quote.grandTotal - quote.totalTaxAmount))).toLocaleString('en-BD')}</strong>
          </div>` : ''}
        </div>
      </div>

      <!-- BOTTOM SECTION -->
      <div class="quote-bottom-section">

        <!-- Signatures -->
        <div class="signatures">
          <div class="sig-line">Customer Signature</div>
          <div class="sig-line">Prepared By</div>
          <div class="sig-line">Authorized Sign &amp; Seal</div>
        </div>

        <!-- Notes & QR -->
        <div class="notes-qr-row">
          <div style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;">
            ${salesName ? `
            <div class="contact-box-bottom">
              <div style="font-size:6.5pt;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:4px;">YOUR POINT OF CONTACT</div>
              <div class="contact-card-inner">
                <div class="contact-avatar">👤</div>
                <div class="contact-info">
                  <div class="contact-name">${salesName}</div>
                  <div class="contact-details">
                    ${salesPhone ? `<span>📞 ${salesPhone}</span>` : ''}
                    ${(salesPhone && salesEmail) ? '<span style="color:#cbd5e1;">|</span>' : ''}
                    ${salesEmail ? `<span>✉️ ${salesEmail}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>` : ''}
            <div class="notes-box-bottom">
              <div class="notes-title">• Important Notes</div>
              ${quote.narration
                ? quote.narration
                : 'This quotation is valid for the period stated above. Prices are subject to change after the validity date. This document is not a tax invoice.'}
            </div>
          </div>
          <div class="qr-block-bottom">
            <div class="qr-inner">
              <svg width="64" height="64" viewBox="0 0 29 29">
                <path d="M0 0h9v9H0zm1 1h7v7H1zm11 0h9v9h-9zm1 1h7v7h-7zM0 12h9v9H0zm1 1h7v7H1zm18 0h3v3h-3zm-6 2h3v3h-3zm6 2h3v3h-3zm-6 2h3v3h-3zm9-9h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3zm-9 0h3v3h-3zm6 2h3v3h-3zm-6 0h3v3h-3zm12-9h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3z" fill="#000"/>
                <rect x="3" y="3" width="3" height="3" fill="#000"/>
                <rect x="14" y="3" width="3" height="3" fill="#000"/>
                <rect x="3" y="14" width="3" height="3" fill="#000"/>
              </svg>
            </div>
            <div class="qr-label">Scan to Contact</div>
          </div>
        </div>

      </div>

    </div><!-- /body-pad -->

    <!-- FOOTER -->
    <div class="invoice-footer">
      <div class="footer-left">
        ${co.name || ''} ${co.bin ? `• BIN: ${co.bin}` : ''}<br/>
        Thank you for considering our proposal!
        <div class="not-tax-notice">⚠️ This is a Quotation only — NOT a Tax Invoice</div>
      </div>
      <div class="footer-right">
        Quotation ${quote.quoteNo || ''} • Generated ${new Date().toLocaleDateString('en-BD')}<br/>
        <span style="color:#99f6e4;">Powered by ACCOUNTICA</span>
      </div>
    </div>

  </div><!-- /sheet -->
</div><!-- /page-wrapper -->

<script>
  if (document.fonts) {
    document.fonts.ready.then(() => setTimeout(() => window.print(), 400));
  } else {
    setTimeout(() => window.print(), 800);
  }
</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=950,height=780,scrollbars=yes');
  if (!win) return alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
  win.document.write(html);
  win.document.close();
  win.focus();
}

export function printProSalesOrder(so, customer) {
  const s = getSettings();
  const co = s?.company || {};

  const salesEmp = getSalespersonDetails(so.salesperson);
  const salesName = salesEmp?.fullNameEnglish || so.salesperson || '';
  const salesPhone = salesEmp?.mobileNumber || '';
  const salesEmail = salesEmp?.emailAddress || '';

  const logoBlock = co.logo
    ? `<img src="${co.logo}" alt="logo" style="height:56px;max-width:120px;object-fit:contain;" />`
    : `<div style="font-size:2.4rem;line-height:1;">📦</div>`;

  const items = so.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice * (1 - (item.discount || 0) / 100)), 0);
  const vatAmount = items.reduce((sum, item) => sum + (item.vatAmount || (item.qty * item.unitPrice * (1 - (item.discount || 0) / 100) * ((item.vatRate || 0) / 100))), 0);
  const totalTaxAmount = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const discountTotal = so.discountTotal || 0;
  const grandTotal = subtotal + vatAmount - discountTotal;

  const itemRows = items.map((item) => {
    const lineTotal = item.lineTotal ?? (item.qty * item.unitPrice * (1 - (item.discount || 0) / 100));
    return `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <div style="font-weight:700;color:#0f172a;font-size:8.5pt;">${item.productName || '—'}</div>
        ${item.narration ? `<div style="font-size:7.5pt;color:#94a3b8;margin-top:2px;font-style:italic;">${item.narration}</div>` : ''}
      </td>
      <td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:8.5pt;color:#334155;">${item.qty}</td>
      <td style="padding:10px 14px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:8.5pt;color:#475569;">${fmt(item.unitPrice)}</td>
      ${(item.discount || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#dc2626;font-weight:600;">${item.discount}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      ${(item.vatRate || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#0891b2;font-weight:600;">${item.vatRate || 0}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      ${(item.taxRate || 0) > 0
        ? `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#7c3aed;font-weight:600;">${item.taxRate}%</td>`
        : `<td style="padding:10px 14px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:8pt;color:#94a3b8;">—</td>`}
      <td style="padding:10px 14px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700;font-size:8.5pt;color:#0f172a;">${fmt(lineTotal)}</td>
    </tr>`;
  }).join('');

  const statusMap = {
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    processing: 'Dispatched',
    completed: 'Billed'
  };
  const statusText = statusMap[so.status] || so.status || 'Pending';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Sales Order ${so.id || ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      background: #f8fafc; color: #1e293b; font-size: 9pt; line-height: 1.5;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .page-wrapper { display: flex; flex-direction: column; align-items: center; padding: 24px; gap: 16px; }
    .sheet { width: 210mm; min-height: 297mm; background: #ffffff; box-shadow: 0 4px 32px rgba(0,0,0,0.10); border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; }
    .accent-stripe { height: 5px; background: linear-gradient(90deg, #1e1b4b 0%, #4338ca 50%, #818cf8 100%); }
    .body-pad { padding: 28px 36px; flex: 1; display: flex; flex-direction: column; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 1.5px solid #e2e8f0; }
    .company-block { display: flex; gap: 14px; align-items: flex-start; margin-right: 24px; }
    .company-name { font-size: 13.5pt; font-weight: 900; color: #1e1b4b; letter-spacing: -0.5px; line-height: 1.1; white-space: nowrap; }
    .company-sub { font-size: 6.5pt; font-weight: 700; color: #64748b; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 3px; border-top: 1px solid #e2e8f0; padding-top: 3px; white-space: nowrap; }
    .company-contact { margin-top: 10px; font-size: 7.5pt; color: #475569; display: flex; gap: 0; align-items: stretch; }
    .contact-col { display: flex; flex-direction: column; gap: 2px; white-space: nowrap; }
    .contact-divider { width: 1px; background: #cbd5e1; margin: 0 12px; flex-shrink: 0; }
    .so-title-block { text-align: right; }
    .so-word { font-size: 28pt; font-weight: 900; color: #4338ca; letter-spacing: 0.04em; line-height: 1; }
    .so-tagline { font-size: 6pt; font-style: italic; color: #94a3b8; max-width: 200px; margin-top: 4px; line-height: 1.3; text-align: right; }
    .so-no-badge { margin-top: 8px; display: inline-flex; align-items: center; gap: 6px; background: #e0e7ff; border: 1.5px solid #c7d2fe; border-radius: 6px; padding: 4px 10px; font-size: 7.5pt; font-weight: 700; color: #3730a3; }
    .status-badge { margin-top: 5px; display: inline-block; border-radius: 99px; padding: 3px 10px; font-size: 6.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
    .status-pending { background: #fef3c7; color: #b45309; }
    .status-approved { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #dcfce7; color: #15803d; }
    .status-rejected { background: #fee2e2; color: #b91c1c; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-top: 20px; margin-bottom: 18px; }
    .bill-to { border-right: 1px solid #f1f5f9; padding-right: 24px; }
    .meta-right { padding-left: 24px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
    .section-label { font-size: 6pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 6px; }
    .cust-name { font-size: 12pt; font-weight: 800; color: #0f172a; margin-bottom: 3px; }
    .cust-detail { font-size: 7.5pt; color: #475569; margin-bottom: 2px; }
    .meta-row { display: flex; gap: 8px; align-items: baseline; }
    .meta-key { font-size: 7pt; color: #94a3b8; font-weight: 500; min-width: 90px; text-align: right; }
    .meta-val { font-size: 8pt; font-weight: 700; color: #0f172a; }
    .amount-pill { margin-top: 10px; background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); color: #fff; border-radius: 10px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; min-width: 200px; }
    .amount-label { font-size: 6.5pt; font-weight: 700; opacity: 0.85; }
    .amount-value { font-size: 13pt; font-weight: 900; }
    .items-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .items-table thead tr { background: linear-gradient(90deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; }
    .items-table thead th { padding: 10px 14px; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; }
    .items-table thead th:first-child { text-align: left; }
    .items-table thead th:last-child { text-align: right; }
    .items-table tbody tr:nth-child(even) { background: #f8fafc; }
    .totals-section { margin-top: 20px; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 28px; }
    .totals-card { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
    .totals-list { width: 100%; max-width: 220px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 8pt; border-bottom: 1px solid #f1f5f9; }
    .total-row-key { color: #64748b; font-weight: 500; }
    .total-row-val { font-weight: 700; color: #0f172a; }
    .grand-total-block { background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); color: #fff; border-radius: 10px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 220px; margin-top: 6px; }
    .grand-total-label { font-size: 6.5pt; font-weight: 700; opacity: 0.9; }
    .grand-total-value { font-size: 14pt; font-weight: 900; }
    .words-box { margin-top: 12px; font-size: 7.5pt; color: #475569; background: #f8fafc; border-radius: 6px; padding: 8px 10px; border: 1px solid #e2e8f0; font-style: italic; }
    .so-bottom-section { margin-top: auto; display: flex; flex-direction: column; width: 100%; }
    .signatures { margin-top: 0; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; width: 100%; padding-top: 24px; }
    .sig-line { text-align: center; padding-top: 6px; border-top: 1px solid #cbd5e1; font-size: 7pt; color: #64748b; font-weight: 600; }
    .notes-qr-row { margin-top: 12px; display: flex; gap: 20px; align-items: stretch; width: 100%; }
    .notes-box-bottom { flex: 1; min-width: 0; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 7.5pt; color: #78350f; line-height: 1.5; }
    .notes-title { font-weight: 800; color: #b45309; margin-bottom: 4px; font-size: 7.5pt; }
    .contact-box-bottom { margin-bottom: 8px; }
    .contact-card-inner { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px 12px; width: fit-content; max-width: 100%; }
    .contact-avatar { width: 26px; height: 26px; border-radius: 50%; background: #e0e7ff; color: #3730a3; display: flex; align-items: center; justify-content: center; font-size: 9pt; flex-shrink: 0; }
    .contact-info { display: flex; flex-direction: column; gap: 1px; }
    .contact-name { font-size: 8pt; font-weight: 700; color: #0f172a; }
    .contact-details { font-size: 7pt; color: #64748b; display: flex; align-items: center; gap: 6px; }
    .qr-block-bottom { flex-shrink: 0; background: #1e1b4b; color: #fff; border-radius: 12px; padding: 8px; text-align: center; width: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px; }
    .qr-inner { background: #fff; border-radius: 6px; padding: 4px; margin-bottom: 5px; }
    .qr-label { font-size: 5.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .invoice-footer { margin-top: auto; padding: 14px 36px; background: #f8fafc; border-top: 1.5px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .footer-left { font-size: 7pt; color: #94a3b8; }
    .footer-right { font-size: 7pt; color: #94a3b8; }
    .not-tax-notice { font-size: 6.5pt; color: #4f46e5; font-weight: 700; text-align: center; margin-top: 4px; }
    .print-actions { display: flex; gap: 10px; justify-content: center; }
    .btn-print { padding: 10px 28px; background: #3730a3; color: #fff; border: none; border-radius: 8px; font-family: inherit; font-size: 10pt; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(55,48,163,0.3); display: flex; align-items: center; gap: 8px; }
    .btn-close { padding: 10px 20px; background: #f1f5f9; color: #334155; border: none; border-radius: 8px; font-family: inherit; font-size: 10pt; font-weight: 600; cursor: pointer; }
    @media print {
      body { background: #fff; font-size: 9pt; }
      .page-wrapper { padding: 0; background: #fff; }
      .sheet { width: 100%; min-height: 100%; box-shadow: none; border-radius: 0; page-break-after: always; }
      .print-actions { display: none !important; }
      @page { size: A4 portrait; margin: 8mm 10mm; }
    }
  </style>
</head>
<body>
<div class="page-wrapper">
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>

  <div class="sheet">
    <div class="accent-stripe"></div>

    <div class="body-pad">

      <!-- HEADER -->
      <div class="header">
        <div>
          <div class="company-block">
            ${logoBlock}
            <div>
              <div class="company-name">${co.name || 'Company Name'}</div>
              <div class="company-sub">${co.legalName || ''}</div>
            </div>
          </div>
          <div class="company-contact">
            <div class="contact-col">
              ${co.phone   ? `<div style="color:#3730a3;font-weight:600;">${co.phone}</div>`   : ''}
              ${co.website ? `<div style="color:#4f46e5;text-decoration:underline;">${co.website}</div>` : ''}
            </div>
            ${(co.email || co.address) ? `
            <div class="contact-divider"></div>
            <div class="contact-col">
              ${co.email   ? `<div style="color:#3730a3;font-weight:600;">${co.email}</div>`   : ''}
              ${co.address ? `<div style="color:#64748b;white-space:nowrap;">${co.address}</div>` : ''}
            </div>` : ''}
          </div>
        </div>

        <div class="so-title-block">
          <div class="so-word">SALES ORDER</div>
          <div class="so-tagline">Fulfilment document. Awaiting delivery / invoicing. Not a tax invoice.</div>
          <div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
            <div class="so-no-badge">
              <span style="color:#64748b;font-weight:500;">No.</span>
              <span>${so.id || '—'}</span>
            </div>
            <div class="status-badge ${so.status === 'approved' || so.status === 'completed' ? 'status-completed' : (so.status === 'rejected' ? 'status-rejected' : 'status-pending')}">
              ${statusText}
            </div>
          </div>
        </div>
      </div>

      <!-- SO TO / META -->
      <div class="meta-grid">
        <div class="bill-to">
          <div class="section-label">Order For</div>
          <div class="cust-name">${customer?.name || '—'}</div>
          ${customer?.contact ? `<div class="cust-detail" style="font-size:8.5pt;color:#475569;font-weight:600;margin-bottom:5px;">${customer.contact}</div>` : ''}
          ${(customer?.vatNo || customer?.tin) ? `<div class="cust-detail" style="font-size:8.5pt;font-weight:700;color:#1e293b;margin-bottom:5px;">BIN: ${customer.vatNo || customer.tin}</div>` : ''}
          <div style="font-size:8pt;color:#475569;margin-top:2px;font-weight:500;">
            ${(customer?.phone || customer?.email) ? `<div>📞 ${customer.phone || ''} ${customer.phone && customer.email ? '| ✉️' : '✉️'} ${customer.email || ''}</div>` : ''}
            ${customer?.address ? `<div style="margin-top:2px;">📍 ${customer.address}</div>` : ''}
          </div>
        </div>

        <div class="meta-right">
          <div>
            <div class="meta-row"><span class="meta-key">Order Date</span><span class="meta-val">${so.date || '—'}</span></div>
            ${so.quoteId ? `<div class="meta-row"><span class="meta-key">Quotation Ref</span><span class="meta-val" style="color:#4f46e5;">${so.quoteId}</span></div>` : ''}
            <div class="meta-row"><span class="meta-key">Payment Terms</span><span class="meta-val">${so.paymentTerms || 'Net 30'}</span></div>
            ${co.bin ? `<div class="meta-row"><span class="meta-key">Our BIN</span><span class="meta-val">${co.bin}</span></div>` : ''}
          </div>
          <div class="amount-pill">
            <div>
              <div class="amount-label">ORDER AMOUNT</div>
              <div style="font-size:6pt;opacity:0.7;">BDT</div>
            </div>
            <div class="amount-value">৳${Math.round(Number(grandTotal || 0)).toLocaleString('en-BD')}</div>
          </div>
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align:left;">Description of Goods / Services</th>
            <th style="text-align:center;width:45px;">Qty</th>
            <th style="text-align:right;width:100px;">Unit Price</th>
            <th style="text-align:center;width:45px;">Disc%</th>
            <th style="text-align:center;width:45px;">VAT%</th>
            <th style="text-align:center;width:45px;">Tax%</th>
            <th style="text-align:right;width:105px;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- TOTALS -->
      <div class="totals-section">
        <div>
          <div class="words-box">
            <strong>In Words:</strong> ${numberToWords(Math.round(grandTotal || 0))}
          </div>
        </div>

        <div class="totals-card">
          <div class="totals-list">
            <div class="total-row">
              <span class="total-row-key">Subtotal</span>
              <span class="total-row-val">${fmt(subtotal || 0)}</span>
            </div>
            ${(vatAmount || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">VAT</span>
              <span class="total-row-val">${fmt(vatAmount)}</span>
            </div>` : ''}
            ${(discountTotal || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">Discount</span>
              <span class="total-row-val" style="color:#dc2626;">− ${fmt(discountTotal)}</span>
            </div>` : ''}
            ${(totalTaxAmount || 0) > 0 ? `
            <div class="total-row">
              <span class="total-row-key">Tax Withholding (AIT)</span>
              <span class="total-row-val" style="color:#7c3aed;">− ${fmt(totalTaxAmount)}</span>
            </div>` : ''}
          </div>
          <div class="grand-total-block">
            <div>
              <div class="grand-total-label">TOTAL ORDER VALUE</div>
              <div style="font-size:6pt;opacity:0.75;">Bangladeshi Taka</div>
            </div>
            <div class="grand-total-value">৳${Math.round(Number(grandTotal || 0)).toLocaleString('en-BD')}</div>
          </div>
        </div>
      </div>

      <!-- BOTTOM SECTION -->
      <div class="so-bottom-section">

        <!-- Signatures -->
        <div class="signatures">
          <div class="sig-line">Prepared By</div>
          <div class="sig-line">Verified By</div>
          <div class="sig-line">Authorized Approval</div>
        </div>

        <!-- Notes & QR -->
        <div class="notes-qr-row">
          <div style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;">
            ${salesName ? `
            <div class="contact-box-bottom">
              <div style="font-size:6.5pt;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:4px;">ORDER MANAGED BY</div>
              <div class="contact-card-inner">
                <div class="contact-avatar">👤</div>
                <div class="contact-info">
                  <div class="contact-name">${salesName}</div>
                  <div class="contact-details">
                    ${salesPhone ? `<span>📞 ${salesPhone}</span>` : ''}
                    ${(salesPhone && salesEmail) ? '<span style="color:#cbd5e1;">|</span>' : ''}
                    ${salesEmail ? `<span>✉️ ${salesEmail}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>` : ''}
            <div class="notes-box-bottom" style="background:#f5f3ff;border-left:3px solid #818cf8;color:#3730a3;">
              <div class="notes-title" style="color:#4f46e5;">• Important Information</div>
              This is a Sales Order confirmation representing a commitment to supply goods or services specified above. Delivery is scheduled subject to the terms agreed upon. This document is not a tax invoice.
            </div>
          </div>
          <div class="qr-block-bottom" style="background:#1e1b4b;">
            <div class="qr-inner">
              <svg width="64" height="64" viewBox="0 0 29 29">
                <path d="M0 0h9v9H0zm1 1h7v7H1zm11 0h9v9h-9zm1 1h7v7h-7zM0 12h9v9H0zm1 1h7v7H1zm18 0h3v3h-3zm-6 2h3v3h-3zm6 2h3v3h-3zm-6 2h3v3h-3zm9-9h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3zm-9 0h3v3h-3zm6 2h3v3h-3zm-6 0h3v3h-3zm12-9h3v3h-3zm3 3h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3z" fill="#000"/>
                <rect x="3" y="3" width="3" height="3" fill="#000"/>
                <rect x="14" y="3" width="3" height="3" fill="#000"/>
                <rect x="3" y="14" width="3" height="3" fill="#000"/>
              </svg>
            </div>
            <div class="qr-label">Scan to Track</div>
          </div>
        </div>

      </div>

    </div><!-- /body-pad -->

    <!-- FOOTER -->
    <div class="invoice-footer" style="background:#f5f3ff;border-top:1.5px solid #e0e7ff;">
      <div class="footer-left">
        ${co.name || ''} ${co.bin ? `• BIN: ${co.bin}` : ''}<br/>
        We appreciate your partnership!
        <div class="not-tax-notice">⚠️ This is a Sales Order — NOT a Tax Invoice</div>
      </div>
      <div class="footer-right">
        Order Ref: ${so.id || ''} • Printed ${new Date().toLocaleDateString('en-BD')}<br/>
        <span style="color:#818cf8;">Powered by ACCOUNTICA</span>
      </div>
    </div>

  </div><!-- /sheet -->
</div><!-- /page-wrapper -->

<script>
  if (document.fonts) {
    document.fonts.ready.then(() => setTimeout(() => window.print(), 400));
  } else {
    setTimeout(() => window.print(), 800);
  }
</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=950,height=780,scrollbars=yes');
  if (!win) return alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
  win.document.write(html);
  win.document.close();
  win.focus();
}
