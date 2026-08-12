import { useState, useEffect, useMemo } from 'react';
import { reportService } from '../services/reportService';

/* ── Formatters ─────────────────────────────────────────────────────────── */
const fmt  = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n) => Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct  = (n) => `${Number(n || 0).toFixed(1)}%`;

const thisYear  = new Date().getFullYear();
const fromYr    = `${thisYear}-01-01`;
const toToday   = new Date().toISOString().substring(0, 10);
const thisMonth = toToday.substring(0, 7);

/* ── Date preset helpers ────────────────────────────────────────────────── */
function getPresetRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const pad = (n) => String(n).padStart(2, '0');
  const ymd  = (yr, mo, d) => `${yr}-${pad(mo + 1)}-${pad(d)}`;
  const lastD = (yr, mo) => new Date(yr, mo + 1, 0).getDate();

  switch (preset) {
    case 'this_month':
      return { from: ymd(y, m, 1), to: ymd(y, m, lastD(y, m)) };
    case 'last_month': {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      return { from: ymd(py, pm, 1), to: ymd(py, pm, lastD(py, pm)) };
    }
    case 'this_quarter': {
      const qs = Math.floor(m / 3) * 3;
      return { from: ymd(y, qs, 1), to: ymd(y, qs + 2, lastD(y, qs + 2)) };
    }
    case 'last_quarter': {
      const qs = Math.floor(m / 3) * 3;
      const lqs = qs === 0 ? 9 : qs - 3;
      const lqy = qs === 0 ? y - 1 : y;
      return { from: ymd(lqy, lqs, 1), to: ymd(lqy, lqs + 2, lastD(lqy, lqs + 2)) };
    }
    case 'this_year':
      return { from: `${y}-01-01`, to: ymd(y, 11, 31) };
    case 'last_year':
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:
      return null;
  }
}

/* ── Report types ───────────────────────────────────────────────────────── */
const REPORT_TYPES = [
  { id: 'pl',             label: '📊 Profit & Loss',            group: 'Financial' },
  { id: 'bs',             label: '🏦 Balance Sheet',            group: 'Financial' },
  { id: 'comparative_pl', label: '📊 Comparative P&L',         group: 'Financial' },
  { id: 'comparative_bs', label: '🏦 Comparative B&S',         group: 'Financial' },
  { id: 'ratios',         label: '📊 Financial Ratios',         group: 'Financial' },
  { id: 'cashflow',       label: '💧 Cash Flow',                group: 'Financial' },
  { id: 'trial',          label: '⚖️ Trial Balance',            group: 'Financial' },
  { id: 'ledger',         label: '📖 General Ledger',           group: 'Financial' },
  { id: 'sales',          label: '🧾 Sales Report',             group: 'Business' },
  { id: 'purchases',      label: '🛒 Purchase Report',          group: 'Business' },
  { id: 'customer',       label: '👤 Customer Statement',       group: 'Business' },
  { id: 'supplier',       label: '🏭 Supplier Statement',       group: 'Business' },
  { id: 'stock',          label: '📦 Stock Report',             group: 'Inventory' },
  { id: 'valuation',      label: '💰 Stock Valuation',          group: 'Inventory' },
  { id: 'vat',            label: '🧾 VAT Return',               group: 'Tax' },
  { id: 'aging',          label: '⏱ Aging Report',             group: 'Receivables' },
];

const GROUPS = ['Financial', 'Business', 'Inventory', 'Tax', 'Receivables'];

const DATE_PRESETS = [
  { key: 'this_month',    label: 'This Month' },
  { key: 'last_month',    label: 'Last Month' },
  { key: 'this_quarter',  label: 'This Quarter' },
  { key: 'last_quarter',  label: 'Last Quarter' },
  { key: 'this_year',     label: 'This Year' },
  { key: 'last_year',     label: 'Last Year' },
];

/* ── CSV helpers ─────────────────────────────────────────────────────────── */
function downloadCSV(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const content = 'data:text/csv;charset=utf-8,\uFEFF'
    + [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = encodeURI(content);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function ReportsView({ currentUser }) {
  const [activeReport, setActiveReport] = useState('pl');
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [activePreset, setActivePreset] = useState('this_year');
  const [searchQuery, setSearchQuery]   = useState('');
  const [drillDown, setDrillDown]       = useState(null); // { title, type, data }
  const [dashboard, setDashboard]       = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Date filters
  const [fromDate, setFromDate] = useState(fromYr);
  const [toDate,   setToDate]   = useState(toToday);
  const [yearMonth, setYearMonth] = useState(thisMonth);
  const [asOfDate,  setAsOfDate]  = useState(toToday);
  const [agingType, setAgingType] = useState('ar');

  // Party selectors (read fresh on each render)
  const customers = useMemo(() => JSON.parse(localStorage.getItem('erp_customers') || '[]'), []);
  const suppliers  = useMemo(() => JSON.parse(localStorage.getItem('erp_suppliers')  || '[]'), []);
  const coa        = useMemo(() => JSON.parse(localStorage.getItem('erp_coa')        || '[]'), []);
  const [custId, setCustId] = useState('');
  const [supId,  setSupId]  = useState('');
  const [accId,  setAccId]  = useState('');

  // Init selectors once data is available
  useEffect(() => {
    if (!custId && customers.length) setCustId(customers[0].id);
    if (!supId  && suppliers.length)  setSupId(suppliers[0].id);
    if (!accId  && coa.length)        setAccId(coa[0].id);
  }, [customers, suppliers, coa]);

  // Auto-compute dashboard KPIs on mount
  useEffect(() => {
    try {
      const yr = new Date().getFullYear();
      const pl = reportService.getProfitAndLoss(`${yr}-01-01`, toToday);
      const ar = reportService.getAgingReport('ar', toToday);
      const ap = reportService.getAgingReport('ap', toToday);
      const cf = reportService.getCashFlow(`${yr}-01-01`, toToday);
      setDashboard({ pl, ar, ap, cf });
    } catch { /* silent */ }
  }, []);

  /* ── Preset handler ───────────────────────────────────────────────────── */
  const applyPreset = (key) => {
    setActivePreset(key);
    const range = getPresetRange(key);
    if (!range) return;
    setFromDate(range.from);
    setToDate(range.to);
    setAsOfDate(range.to);
  };

  /* ── Generate report ──────────────────────────────────────────────────── */
  const run = () => {
    setLoading(true);
    setSearchQuery('');
    try {
      let data;
      switch (activeReport) {
        case 'pl':             data = reportService.getProfitAndLoss(fromDate, toDate);            break;
        case 'bs':             data = reportService.getBalanceSheet(asOfDate);                     break;
        case 'comparative_pl': data = reportService.getComparativeProfitAndLoss(fromDate, toDate); break;
        case 'comparative_bs': data = reportService.getComparativeBalanceSheet(asOfDate);          break;
        case 'ratios':         data = reportService.getFinancialRatios(asOfDate);                  break;
        case 'cashflow':       data = reportService.getCashFlow(fromDate, toDate);                 break;
        case 'trial':          data = reportService.getTrialBalance(asOfDate);                     break;
        case 'ledger':         data = reportService.getGeneralLedger(accId, fromDate, toDate);     break;
        case 'sales':          data = reportService.getSalesReport(fromDate, toDate, custId || undefined); break;
        case 'purchases':      data = reportService.getPurchaseReport(fromDate, toDate, supId || undefined); break;
        case 'customer':       data = reportService.getCustomerStatement(custId, fromDate, toDate);  break;
        case 'supplier':       data = reportService.getSupplierStatement(supId,  fromDate, toDate);  break;
        case 'stock':          data = reportService.getStockReport();                              break;
        case 'valuation':      data = reportService.getStockValuation();                           break;
        case 'vat':            data = reportService.getVATReturn(yearMonth);                       break;
        case 'aging':          data = reportService.getAgingReport(agingType, asOfDate);           break;
        default:               data = null;
      }
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const handleReportChange = (id) => {
    setActiveReport(id);
    setResult(null);
    setSearchQuery('');
    setDrillDown(null);
  };

  /* ── Universal CSV Export ─────────────────────────────────────────────── */
  const handleExportCSV = () => {
    if (!result) return;
    const fname = `${activeReport}_${new Date().toISOString().substring(0,10)}.csv`;
    switch (activeReport) {
      case 'pl': {
        const h = ['Section', 'Account Code', 'Account Name', 'Amount (৳)'];
        const rows = [
          ...result.revenueLines.map(a => ['Revenue', a.code, a.name, a.amount]),
          ['Revenue', '', 'Gross Revenue', result.grossRevenue],
          ['Revenue', '', 'Net Revenue', result.netRevenue],
          ...result.cogsLines.map(a => ['COGS', a.code, a.name, a.amount]),
          ['COGS', '', 'Total COGS', result.cogs],
          ['Summary', '', 'Gross Profit', result.grossProfit],
          ...result.expenseLines.map(a => ['Operating Expenses', a.code, a.name, a.amount]),
          ['Summary', '', 'Total Operating Expenses', result.operatingExpenses],
          ['Summary', '', 'NET PROFIT / (LOSS)', result.netProfit],
        ];
        downloadCSV(fname, h, rows); break;
      }
      case 'bs': {
        const h = ['Section', 'Sub-Section', 'Account Code', 'Account Name', 'Balance (৳)'];
        const rows = [
          ...result.currentAssets.map(a => ['Assets', 'Current Assets', a.code, a.name, Math.abs(a.balance)]),
          ['Assets', '', '', 'Total Current Assets', result.currentAssets.reduce((s,a) => s+Math.abs(a.balance),0)],
          ...result.fixedAssets.map(a => ['Assets', 'Fixed Assets', a.code, a.name, Math.abs(a.balance)]),
          ['Assets', '', '', 'TOTAL ASSETS', result.totalAssets],
          ...result.currentLiab.map(a => ['Liabilities', 'Current Liabilities', a.code, a.name, Math.abs(a.balance)]),
          ...result.longTermLiab.map(a => ['Liabilities', 'Long-term Liabilities', a.code, a.name, Math.abs(a.balance)]),
          ['Liabilities', '', '', 'TOTAL LIABILITIES', result.totalLiab],
          ...result.equity.map(a => ['Equity', '', a.code, a.name, Math.abs(a.balance)]),
          ['Equity', '', '', 'TOTAL EQUITY', result.totalEquity],
          ['Summary', '', '', 'TOTAL LIAB + EQUITY', result.totalLiabEquity],
        ];
        downloadCSV(fname, h, rows); break;
      }
      case 'cashflow': {
        const h = ['Date', 'Ref No.', 'Narration', 'Module', 'Direction', 'Amount (৳)'];
        const rows = result.details.map(d => [d.date, d.refNo, d.narration, d.module, d.direction, d.amount]);
        rows.push(['', '', '', '', 'Cash In', result.cashIn]);
        rows.push(['', '', '', '', 'Cash Out', result.cashOut]);
        rows.push(['', '', '', '', 'Net Cash Flow', result.netCashFlow]);
        downloadCSV(fname, h, rows); break;
      }
      case 'trial': {
        const h = ['Account Code', 'Account Name', 'Type', 'Debit (DR)', 'Credit (CR)'];
        const rows = result.rows.map(r => [r.code, r.name, r.type, r.debit || 0, r.credit || 0]);
        rows.push([]);
        rows.push(['TOTAL', '', '', result.totalDebit, result.totalCredit]);
        downloadCSV(fname, h, rows); break;
      }
      case 'ledger': {
        const h = ['Date', 'Ref No.', 'Narration', 'Debit (৳)', 'Credit (৳)', 'Balance (৳)', 'Module'];
        const rows = result.lines.map(l => [l.date, l.refNo, l.narration, l.debit || 0, l.credit || 0, l.balance, l.sourceModule]);
        downloadCSV(fname, h, rows); break;
      }
      case 'sales': {
        const h = ['Invoice No.', 'Date', 'Customer', 'Revenue (৳)', 'COGS (৳)', 'Gross Profit (৳)', 'GP%', 'VAT (৳)', 'Status'];
        const rows = result.lines.map(l => [l.invoiceNo, l.date, l.customerName, l.grandTotal, l.cogs, l.grossProfit, l.gpPct + '%', l.vatAmount, l.paymentStatus]);
        rows.push([]);
        rows.push(['TOTAL', '', '', result.summary.totalRev, result.summary.totalCOGS, result.summary.grossProfit, result.summary.avgGPPct + '%', result.summary.totalVAT, '']);
        downloadCSV(fname, h, rows); break;
      }
      case 'purchases': {
        const h = ['Invoice No.', 'Date', 'Supplier', 'Subtotal (৳)', 'VAT (৳)', 'Total (৳)', 'Status'];
        const rows = result.lines.map(l => [l.invoiceNo, l.date, l.supplierName, l.subtotal, l.vatAmount, l.grandTotal, l.paymentStatus]);
        rows.push([]);
        rows.push(['TOTAL', '', '', '', result.summary.totalVAT, result.summary.totalPurch, '']);
        downloadCSV(fname, h, rows); break;
      }
      case 'customer': {
        const h = ['Date', 'Ref No.', 'Type', 'Description', 'Debit (৳)', 'Credit (৳)', 'Balance (৳)'];
        const rows = result.lines.map(l => [l.date, l.refNo, l.type, l.desc, l.debit || 0, l.credit || 0, l.balance]);
        rows.push(['', '', '', 'CLOSING BALANCE', '', '', result.closingBalance]);
        downloadCSV(fname, h, rows); break;
      }
      case 'supplier': {
        const h = ['Date', 'Ref No.', 'Type', 'Description', 'Debit (৳)', 'Credit (৳)', 'Balance (৳)'];
        const rows = result.lines.map(l => [l.date, l.refNo, l.type, l.desc, l.debit || 0, l.credit || 0, l.balance]);
        rows.push(['', '', '', 'CLOSING BALANCE', '', '', result.closingBalance]);
        downloadCSV(fname, h, rows); break;
      }
      case 'stock': {
        const h = ['SKU', 'Product Name', 'Quantity', 'Avg Cost (৳)', 'Stock Value (৳)', 'Sale Price (৳)', 'Potential Revenue (৳)', 'Status'];
        const rows = result.map(p => [p.sku, p.name, p.qty, p.avgCost, p.stockValue, p.salePrice, p.potentialRevenue, Number(p.qty) <= Number(p.minStock || 5) ? 'Low Stock' : 'OK']);
        downloadCSV(fname, h, rows); break;
      }
      case 'valuation': {
        const h = ['SKU', 'Product Name', 'Quantity', 'Avg Cost (৳)', 'Stock Value (৳)'];
        const rows = result.lines.map(l => [l.sku, l.name, l.qty, l.avgCost, l.stockValue]);
        rows.push(['', 'TOTAL INVENTORY VALUE', result.totalUnits, '', result.totalValue]);
        downloadCSV(fname, h, rows); break;
      }
      case 'vat': {
        const h = ['Box', 'Description', 'Amount (৳)'];
        const f = result.filing;
        const rows = [
          ['Box 1', 'Output VAT (Tax on Sales)', f.box1_outputVat],
          ['Box 2', 'Input VAT (Tax on Purchases)', f.box2_inputVat],
          ['Box 3', 'Net VAT Payable (Box 1 − Box 2)', f.box3_netPayable],
          ['Box 4', 'Refund Claim (if Box 2 > Box 1)', f.box4_refundClaim],
        ];
        downloadCSV(fname, h, rows); break;
      }
      case 'aging': {
        const h = [agingType === 'ar' ? 'Customer' : 'Supplier', 'Current (0-30)', '31-60 days', '61-90 days', '91-120 days', 'Over 120', 'Total (৳)'];
        const rows = result.lines.map(r => [r.name, r.current || 0, r.days30 || 0, r.days60 || 0, r.days90 || 0, r.over90 || 0, r.total]);
        rows.push(['TOTAL', result.buckets.current, result.buckets.days30, result.buckets.days60, result.buckets.days90, result.buckets.over90, result.totalOutstanding]);
        downloadCSV(fname, h, rows); break;
      }
      case 'comparative_pl': {
        const h = ['Description', 'Current Period', 'Previous Period', 'Variance (৳)', 'Variance %'];
        const items = [
          ['Gross Revenue', result.current.grossRevenue, result.previous.grossRevenue],
          ['Net Revenue', result.current.netRevenue, result.previous.netRevenue],
          ['COGS', result.current.cogs, result.previous.cogs],
          ['Gross Profit', result.current.grossProfit, result.previous.grossProfit],
          ['Operating Expenses', result.current.operatingExpenses, result.previous.operatingExpenses],
          ['Net Profit / (Loss)', result.current.netProfit, result.previous.netProfit],
        ];
        const rows = items.map(([label, curr, prev]) => {
          const v = curr - prev;
          const vp = prev !== 0 ? ((curr - prev) / Math.abs(prev) * 100).toFixed(1) : '0.0';
          return [label, curr, prev, v, vp + '%'];
        });
        downloadCSV(fname, h, rows); break;
      }
      case 'comparative_bs': {
        const h = ['Description', 'Current YTD', 'Previous YTD', 'Variance (৳)', 'Variance %'];
        const items = [
          ['Total Assets', result.current.totalAssets, result.previous.totalAssets],
          ['Total Liabilities', result.current.totalLiab, result.previous.totalLiab],
          ['Total Equity', result.current.totalEquity, result.previous.totalEquity],
          ['Total Liab + Equity', result.current.totalLiabEquity, result.previous.totalLiabEquity],
        ];
        const rows = items.map(([label, curr, prev]) => {
          const v = curr - prev;
          const vp = prev !== 0 ? ((curr - prev) / Math.abs(prev) * 100).toFixed(1) : '0.0';
          return [label, curr, prev, v, vp + '%'];
        });
        downloadCSV(fname, h, rows); break;
      }
      case 'ratios': {
        const h = ['Ratio Category', 'Ratio Name', 'Value', 'Benchmark', 'Formula / Description'];
        const rows = [
          ['Liquidity Ratios', 'Current Ratio', result.currentRatio.toFixed(2), '>= 1.5', `Current Assets (${result.currentAssets}) / Current Liabilities (${result.currentLiab})`],
          ['Liquidity Ratios', 'Quick (Acid-Test) Ratio', result.quickRatio.toFixed(2), '>= 1.0', `Quick Assets (${result.quickAssets}) / Current Liabilities (${result.currentLiab})`],
          ['Profitability Ratios', 'Gross Profit Margin', result.grossMargin.toFixed(1) + '%', '—', 'Gross Profit / Net Revenue'],
          ['Profitability Ratios', 'Net Profit Margin', result.netMargin.toFixed(1) + '%', '—', 'Net Profit / Net Revenue'],
          ['Profitability Ratios', 'Return on Assets (ROA)', result.roa.toFixed(1) + '%', '—', 'Profit / Total Assets'],
          ['Solvency & Equity Ratios', 'Debt-to-Equity Ratio', result.debtToEquity.toFixed(2), '< 1.5', `Total Liabilities (${result.totalLiab}) / Total Equity (${result.totalEquity})`],
          ['Solvency & Equity Ratios', 'Equity Ratio', (result.equityRatio * 100).toFixed(1) + '%', '>= 40%', `Total Equity (${result.totalEquity}) / Total Assets (${result.totalAssets})`],
        ];
        downloadCSV(fname, h, rows); break;
      }
      default:
        break;
    }
  };

  /* ── Drill-down helper ────────────────────────────────────────────────── */
  const openDrillDown = (type, params) => {
    let title = '';
    let data  = null;
    try {
      if (type === 'gl') {
        data  = reportService.getGeneralLedger(params.accountId, fromDate, toDate);
        title = `General Ledger — ${data.account?.code} ${data.account?.name}`;
      } else if (type === 'customer_stmt') {
        data  = reportService.getCustomerStatement(params.partyId, fromDate, toDate);
        const cust = customers.find(c => c.id === params.partyId);
        title = `Customer Statement — ${cust?.name || params.partyId}`;
      } else if (type === 'supplier_stmt') {
        data  = reportService.getSupplierStatement(params.partyId, fromDate, toDate);
        const sup = suppliers.find(s => s.id === params.partyId);
        title = `Supplier Statement — ${sup?.name || params.partyId}`;
      } else if (type === 'sales_invoice') {
        const invoices = JSON.parse(localStorage.getItem('erp_sales_invoices') || '[]');
        data = invoices.find(i => i.invoiceNo === params.invoiceNo || i.id === params.id);
        title = `Invoice — ${params.invoiceNo}`;
      } else if (type === 'purchase_invoice') {
        const invoices = JSON.parse(localStorage.getItem('erp_purchase_invoices') || '[]');
        data = invoices.find(i => i.invoiceNo === params.invoiceNo || i.id === params.id);
        title = `Purchase — ${params.invoiceNo}`;
      }
    } catch { /* silent */ }
    if (data) setDrillDown({ title, type, data });
  };

  /* ── Label for current report ─────────────────────────────────────────── */
  const activeLabel = REPORT_TYPES.find(r => r.id === activeReport)?.label;

  /* ── Date-range reports ───────────────────────────────────────────────── */
  const isDateRange  = ['pl','comparative_pl','cashflow','sales','purchases','customer','supplier','ledger'].includes(activeReport);
  const isAsOf       = ['bs','comparative_bs','ratios','trial','aging'].includes(activeReport);
  const showPresets  = isDateRange || isAsOf;

  return (
    <div className="reports-grid" style={{ display: 'grid', gap: '1.5rem', alignItems: 'start' }}>

      {/* ── Left sidebar ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1rem' }}>
        {/* Sidebar Search */}
        <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            className="form-control"
            placeholder="Search reports..."
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            style={{ paddingLeft: '1.85rem', fontSize: '0.75rem', height: '34px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          />
        </div>

        {GROUPS.map(group => {
          const reports = REPORT_TYPES.filter(r => r.group === group && r.label.toLowerCase().includes(sidebarSearch.toLowerCase()));
          if (reports.length === 0) return null;
          return (
            <div key={group} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', padding: '0 0.5rem', marginBottom: '0.45rem' }}>{group}</div>
              {reports.map(r => (
                <button key={r.id} onClick={() => handleReportChange(r.id)}
                  style={{ display: 'block', width: '100%', padding: '0.55rem 0.65rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.8rem', fontWeight: activeReport === r.id ? 800 : 500, textAlign: 'left',
                    background: activeReport === r.id ? 'var(--bg-secondary)' : 'transparent',
                    color:      activeReport === r.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                    borderLeft: activeReport === r.id ? '3px solid var(--accent-color)' : '3px solid transparent',
                    marginBottom: 2, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (activeReport !== r.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                  onMouseLeave={e => {
                    if (activeReport !== r.id) e.currentTarget.style.background = 'transparent';
                  }}
                >{r.label}</button>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Right: filters + results ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* ── Cockpit Banner ── */}
        <div className="no-print" style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: 20,
          padding: '1.25rem 1.5rem',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: '0 8px 32px rgba(49,46,129,0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.05, fontSize: '6rem', pointerEvents: 'none', userSelect: 'none' }}>📈</div>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
            📊
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 2 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>Financial Cockpit</h2>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', padding: '2px 8px', borderRadius: 9999 }}>
                Unified intelligence
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>
              Real-time accounting validation, business analytics, and tax filings
            </div>
            <div style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 800, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              View: {activeLabel || 'Dashboard'}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flexShrink: 0 }}>
            {result && (
              <>
                <button onClick={handleExportCSV} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                  📥 Export CSV
                </button>
                <button onClick={() => setShowPrintPreview(true)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                  🖨️ Print / PDF
                </button>
              </>
            )}
            <button onClick={run} disabled={loading} style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none', borderRadius: 8, color: '#fff',
              padding: '6px 14px', fontWeight: 800, fontSize: '0.72rem',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              {loading ? '⏳ Generating…' : '▶ Generate'}
            </button>
          </div>
        </div>

        {/* ── Date Presets ── */}
        {showPresets && (
          <div className="no-print" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {DATE_PRESETS.map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)}
                className={`btn ${activePreset === p.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', borderRadius: 20 }}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>

            {isDateRange && (
              <>
                <div className="form-group">
                  <label className="form-label">From Date</label>
                  <input type="date" className="form-control" value={fromDate} onChange={e => { setFromDate(e.target.value); setActivePreset(''); }} />
                </div>
                <div className="form-group">
                  <label className="form-label">To Date</label>
                  <input type="date" className="form-control" value={toDate} onChange={e => { setToDate(e.target.value); setActivePreset(''); }} />
                </div>
              </>
            )}

            {isAsOf && (
              <div className="form-group">
                <label className="form-label">As of Date</label>
                <input type="date" className="form-control" value={asOfDate} onChange={e => { setAsOfDate(e.target.value); setActivePreset(''); }} />
              </div>
            )}

            {activeReport === 'vat' && (
              <div className="form-group">
                <label className="form-label">Period (Month)</label>
                <input type="month" className="form-control" value={yearMonth} onChange={e => setYearMonth(e.target.value)} />
              </div>
            )}

            {['customer', 'sales'].includes(activeReport) && (
              <div className="form-group">
                <label className="form-label">{activeReport === 'sales' ? 'Customer (All)' : 'Customer'}</label>
                <select className="form-control" value={custId} onChange={e => setCustId(e.target.value)}>
                  {activeReport === 'sales' && <option value="">All Customers</option>}
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {['supplier', 'purchases'].includes(activeReport) && (
              <div className="form-group">
                <label className="form-label">{activeReport === 'purchases' ? 'Supplier (All)' : 'Supplier'}</label>
                <select className="form-control" value={supId} onChange={e => setSupId(e.target.value)}>
                  {activeReport === 'purchases' && <option value="">All Suppliers</option>}
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {activeReport === 'ledger' && (
              <div className="form-group">
                <label className="form-label">Account</label>
                <select className="form-control" value={accId} onChange={e => setAccId(e.target.value)}>
                  {coa.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
            )}

            {activeReport === 'aging' && (
              <div className="form-group">
                <label className="form-label">Aging Type</label>
                <select className="form-control" value={agingType} onChange={e => setAgingType(e.target.value)}>
                  <option value="ar">AR — Accounts Receivable (Customers)</option>
                  <option value="ap">AP — Accounts Payable (Suppliers)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Dashboard (empty state) ── */}
        {!result && !loading && (
          <ReportsDashboard dashboard={dashboard} onSelect={handleReportChange} />
        )}

        {/* ── In-report search bar ── */}
        {result && ['sales','purchases','ledger','trial','aging','stock','valuation','customer','supplier','cashflow'].includes(activeReport) && (
          <div className="no-print" style={{ marginBottom: '0.75rem', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Search in results…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>
        )}

        {/* ── Report output ── */}
        {result && activeReport === 'pl'             && <PLReport data={result} onDrillDown={openDrillDown} />}
        {result && activeReport === 'bs'             && <BSReport data={result} />}
        {result && activeReport === 'comparative_pl' && <ComparativePLReport data={result} />}
        {result && activeReport === 'comparative_bs' && <ComparativeBSReport data={result} />}
        {result && activeReport === 'ratios'         && <RatiosReport data={result} />}
        {result && activeReport === 'cashflow'       && <CashFlowReport data={result} search={searchQuery} />}
        {result && activeReport === 'trial'          && <TrialBalanceReport data={result} search={searchQuery} onDrillDown={openDrillDown} />}
        {result && activeReport === 'ledger'         && <LedgerReport data={result} search={searchQuery} />}
        {result && activeReport === 'sales'          && <SalesReport data={result} search={searchQuery} onDrillDown={openDrillDown} />}
        {result && activeReport === 'purchases'      && <PurchaseReport data={result} search={searchQuery} onDrillDown={openDrillDown} />}
        {result && activeReport === 'customer'       && <PartyStatement data={result} type="customer" search={searchQuery} />}
        {result && activeReport === 'supplier'       && <PartyStatement data={result} type="supplier" search={searchQuery} />}
        {result && activeReport === 'stock'          && <StockReport data={result} search={searchQuery} />}
        {result && activeReport === 'valuation'      && <ValuationReport data={result} search={searchQuery} />}
        {result && activeReport === 'vat'            && <VATReturn data={result} />}
        {result && activeReport === 'aging'          && <AgingReport data={result} search={searchQuery} onDrillDown={openDrillDown} agingType={agingType} />}

                {/* ── Drill-down modal ── */}
        {drillDown && (
          <div className="modal-overlay" onClick={() => setDrillDown(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '85vh' }}>
              <div className="modal-header">
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-color)', marginBottom: 2 }}>Drill-Down Detail</div>
                  <div className="modal-title">{drillDown.title}</div>
                </div>
                <button className="modal-close" onClick={() => setDrillDown(null)}>&times;</button>
              </div>
              <div className="modal-form-content" style={{ flex: 1 }}>
                {(drillDown.type === 'gl') && <LedgerReport data={drillDown.data} search="" />}
                {(drillDown.type === 'customer_stmt') && <PartyStatement data={drillDown.data} type="customer" search="" />}
                {(drillDown.type === 'supplier_stmt') && <PartyStatement data={drillDown.data} type="supplier" search="" />}
                {(drillDown.type === 'sales_invoice') && <InvoiceDetail data={drillDown.data} type="sales" />}
                {(drillDown.type === 'purchase_invoice') && <InvoiceDetail data={drillDown.data} type="purchase" />}
              </div>
            </div>
          </div>
        )}

        {/* ── Print Preview Modal ── */}
        {showPrintPreview && result && (
          <div className="modal-overlay" onClick={() => setShowPrintPreview(false)}>
            <div className="modal-content print-section" style={{ background: '#fff', color: '#000', padding: '2rem', borderRadius: 12, width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              {/* Print header */}
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.4rem' }}>ACCOUNTICA Cloud ERP PLATFORM</h2>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>House 42, Road 11, Banani, Dhaka, Bangladesh</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>BIN: 001234567-0101 | TIN: 9876543210</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: '#0f172a', color: '#fff', fontWeight: 800, padding: '4px 12px', borderRadius: 4, fontSize: '0.75rem' }}>OFFICIAL REPORT</span>
                    <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#475569' }}>Printed: {new Date().toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a' }}>
                  {activeLabel?.substring(3)}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  {isDateRange && `Period: ${fromDate} to ${toDate}`}
                  {isAsOf && `As of: ${asOfDate}`}
                  {activeReport === 'vat' && `Period: ${yearMonth}`}
                </div>
              </div>

              <div className="printable-report-body" style={{ color: '#000' }}>
                {activeReport === 'pl'             && <PLReport data={result} />}
                {activeReport === 'bs'             && <BSReport data={result} />}
                {activeReport === 'comparative_pl' && <ComparativePLReport data={result} />}
                {activeReport === 'comparative_bs' && <ComparativeBSReport data={result} />}
                {activeReport === 'ratios'         && <RatiosReport data={result} />}
                {activeReport === 'cashflow'       && <CashFlowReport data={result} search="" />}
                {activeReport === 'trial'          && <TrialBalanceReport data={result} search="" />}
                {activeReport === 'ledger'         && <LedgerReport data={result} search="" />}
                {activeReport === 'sales'          && <SalesReport data={result} search="" />}
                {activeReport === 'purchases'      && <PurchaseReport data={result} search="" />}
                {activeReport === 'customer'       && <PartyStatement data={result} type="customer" search="" />}
                {activeReport === 'supplier'       && <PartyStatement data={result} type="supplier" search="" />}
                {activeReport === 'stock'          && <StockReport data={result} search="" />}
                {activeReport === 'valuation'      && <ValuationReport data={result} search="" />}
                {activeReport === 'vat'            && <VATReturn data={result} />}
                {activeReport === 'aging'          && <AgingReport data={result} search="" agingType={agingType} />}
              </div>

              {/* Signature block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', borderTop: '1px dashed #cbd5e1', paddingTop: '2rem', fontSize: '0.8rem', color: '#475569' }}>
                <div>
                  <div>Prepared By</div>
                  <div style={{ marginTop: '2rem', borderTop: '1px solid #94a3b8', width: '150px', textAlign: 'center', paddingTop: '0.25rem' }}>{currentUser?.displayName || 'System Analyst'}</div>
                </div>
                <div>
                  <div>Authorized Signature</div>
                  <div style={{ marginTop: '2rem', borderTop: '1px solid #94a3b8', width: '150px', textAlign: 'center', paddingTop: '0.25rem' }}>Office Seal &amp; Sign</div>
                </div>
              </div>

              <div className="no-print" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button onClick={() => window.print()} className="btn btn-primary">🖨️ Print / Save PDF</button>
                <button onClick={() => setShowPrintPreview(false)} className="btn btn-secondary">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   REPORTS DASHBOARD (shown before any report is generated)
══════════════════════════════════════════════════════════════════════════ */
function ReportsDashboard({ dashboard, onSelect }) {
  if (!dashboard) {
    return (
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📈</div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Financial Reports Dashboard</div>
        <div style={{ fontSize: '0.85rem' }}>Select a report from the left panel and click Generate to view results.</div>
      </div>
    );
  }

  const { pl, ar, ap, cf } = dashboard;

  const kpis = [
    { label: 'Revenue YTD', value: fmt(pl.netRevenue), color: '#10b981', icon: '📈', sub: 'Net Revenue' },
    { label: 'Net Profit YTD', value: fmt(pl.netProfit), color: pl.netProfit >= 0 ? '#3b82f6' : '#ef4444', icon: '💰', sub: pct(pl.npMargin) + ' Net Margin' },
    { label: 'Cash Flow YTD', value: fmt(cf.netCashFlow), color: cf.netCashFlow >= 0 ? '#10b981' : '#ef4444', icon: '💧', sub: `In: ${fmt(cf.cashIn)}` },
    { label: 'AR Outstanding', value: fmt(ar.totalOutstanding), color: '#f59e0b', icon: '📤', sub: `${ar.lines.length} customers` },
    { label: 'AP Outstanding', value: fmt(ap.totalOutstanding), color: '#8b5cf6', icon: '📥', sub: `${ap.lines.length} suppliers` },
    { label: 'Gross Profit', value: fmt(pl.grossProfit), color: '#06b6d4', icon: '📊', sub: pct(pl.gpMargin) + ' GP Margin' },
  ];

  const quickLinks = [
    { id: 'pl', emoji: '📊', label: 'P&L Statement' },
    { id: 'bs', emoji: '🏦', label: 'Balance Sheet' },
    { id: 'aging', emoji: '⏱', label: 'Aging Report' },
    { id: 'vat', emoji: '🧾', label: 'VAT Return' },
    { id: 'trial', emoji: '⚖️', label: 'Trial Balance' },
    { id: 'cashflow', emoji: '💧', label: 'Cash Flow' },
  ];

  // Working capital ratio calculation
  const totalOutstanding = ar.totalOutstanding + ap.totalOutstanding;
  const arRatio = totalOutstanding > 0 ? (ar.totalOutstanding / totalOutstanding) * 100 : 50;
  const apRatio = totalOutstanding > 0 ? (ap.totalOutstanding / totalOutstanding) * 100 : 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── KPI cards grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            borderRadius: 16, padding: '1.1rem',
            background: `linear-gradient(135deg, ${k.color}0d, ${k.color}03)`,
            border: `1px solid ${k.color}25`,
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}>
            <div style={{ position: 'absolute', top: 8, right: 10, fontSize: '1.8rem', opacity: 0.12 }}>{k.icon}</div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: k.color, fontFamily: 'monospace', lineHeight: 1.2, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Working Capital Ratio Bar ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>📊 Outstanding Working Capital Exposure</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ratio: AR / AP</span>
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: '0.65rem' }}>
          <div style={{ width: `${arRatio}%`, background: '#f59e0b', transition: 'width 0.4s ease' }} title={`AR: ${arRatio.toFixed(1)}%`} />
          <div style={{ width: `${apRatio}%`, background: '#8b5cf6', transition: 'width 0.4s ease' }} title={`AP: ${apRatio.toFixed(1)}%`} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700 }}>
          <span style={{ color: '#f59e0b' }}>AR Receivable YTD: {fmt(ar.totalOutstanding)}</span>
          <span style={{ color: '#8b5cf6' }}>AP Payable YTD: {fmt(ap.totalOutstanding)}</span>
        </div>
      </div>

      {/* ── Quick-access reports ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.1rem' }}>
        <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>⚡ Quick Access Statements</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
          {quickLinks.map(ql => (
            <button key={ql.id} onClick={() => onSelect(ql.id)}
              style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                padding: '0.6rem 0.5rem', fontSize: '0.72rem', fontWeight: 700,
                color: 'var(--text-primary)', borderRadius: 10, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{ql.emoji}</span>
              <span>{ql.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Top outstanding receivables list ── */}
      {ar.lines.length > 0 && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>⏱ Top Outstanding Accounts Receivables</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {ar.lines.slice(0, 5).map((r, i) => {
              const maxVal = Math.max(...ar.lines.map(l => l.total));
              const pct = (r.total / maxVal) * 100;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#f59e0b' }}>{fmt(r.total)}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #d97706)', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Shared helpers
══════════════════════════════════════════════════════════════════════════ */
function ReportCard({ title, children, footer }) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      {title && <div style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>{title}</div>}
      {children}
      {footer && <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>{footer}</div>}
    </div>
  );
}

function ReportRow({ label, amount, bold, indent, color, onClick }) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', justifyContent: 'space-between', padding: `${bold ? '0.5rem' : '0.3rem'} 0`,
        paddingLeft: indent ? '1.25rem' : 0, borderTop: bold ? '1px solid var(--border-color)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: onClick ? 6 : 0,
        transition: onClick ? 'background 0.12s' : 'none',
      }}
      onMouseEnter={onClick ? e => e.currentTarget.style.background = 'rgba(37,99,235,0.06)' : undefined}
      onMouseLeave={onClick ? e => e.currentTarget.style.background = '' : undefined}
    >
      <span style={{ fontSize: '0.85rem', fontWeight: bold ? 800 : 400, color: color || (bold ? 'var(--text-primary)' : 'var(--text-secondary)') }}>
        {onClick && <span style={{ opacity: 0.4, fontSize: '0.7rem', marginRight: '0.3rem' }}>🔍</span>}
        {label}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: bold ? 800 : 600, color: color || (bold ? 'var(--text-primary)' : 'var(--text-secondary)') }}>
        {fmt(amount)}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   P&L REPORT
══════════════════════════════════════════════════════════════════════════ */
function PLReport({ data, onDrillDown }) {
  return (
    <div>
      <div className="grid-three-col" style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { label: 'Net Revenue',  value: fmt(data.netRevenue),  color: '#059669' },
          { label: 'Gross Profit', value: fmt(data.grossProfit), color: data.grossProfit >= 0 ? '#2563eb' : '#dc2626', sub: pct(data.gpMargin) + ' GP' },
          { label: 'Net Profit',   value: fmt(data.netProfit),   color: data.netProfit >= 0 ? '#059669' : '#dc2626', sub: pct(data.npMargin) + ' NP' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: s.color }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      <ReportCard title="Revenue">
        {data.revenueLines.map(a => (
          <ReportRow key={a.id} label={`${a.code} — ${a.name}`} amount={a.amount} indent
            onClick={onDrillDown ? () => onDrillDown('gl', { accountId: a.id }) : undefined} />
        ))}
        <ReportRow label="Gross Revenue" amount={data.grossRevenue} bold />
        {data.salesReturns > 0 && <ReportRow label="Less: Sales Returns" amount={-data.salesReturns} indent color="#dc2626" />}
        <ReportRow label="Net Revenue" amount={data.netRevenue} bold color="#059669" />
      </ReportCard>

      <ReportCard title="Cost of Goods Sold">
        {data.cogsLines.map(a => (
          <ReportRow key={a.id} label={`${a.code} — ${a.name}`} amount={a.amount} indent
            onClick={onDrillDown ? () => onDrillDown('gl', { accountId: a.id }) : undefined} />
        ))}
        <ReportRow label="Total COGS" amount={data.cogs} bold />
        <ReportRow label="Gross Profit" amount={data.grossProfit} bold color={data.grossProfit >= 0 ? '#2563eb' : '#dc2626'} />
      </ReportCard>

      <ReportCard title="Operating Expenses">
        {data.expenseLines.map(a => (
          <ReportRow key={a.id} label={`${a.code} — ${a.name}`} amount={a.amount} indent
            onClick={onDrillDown ? () => onDrillDown('gl', { accountId: a.id }) : undefined} />
        ))}
        <ReportRow label="Total Operating Expenses" amount={data.operatingExpenses} bold />
      </ReportCard>

      <ReportCard>
        <ReportRow label="NET PROFIT / (LOSS)" amount={data.netProfit} bold color={data.netProfit >= 0 ? '#059669' : '#dc2626'} />
        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Period: {data.fromDate} → {data.toDate} · Net Profit Margin: {pct(data.npMargin)}
        </div>
      </ReportCard>
      {onDrillDown && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
          💡 Click any account line to drill down into its General Ledger transactions.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   BALANCE SHEET
══════════════════════════════════════════════════════════════════════════ */
function BSReport({ data }) {
  const sumRows = (rows) => rows.reduce((s, r) => s + Math.abs(r.balance || 0), 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <ReportCard title="Assets">
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Current Assets</div>
          {data.currentAssets.map(a => <ReportRow key={a.id} label={`${a.code} ${a.name}`} amount={Math.abs(a.balance)} indent />)}
          <ReportRow label="Total Current Assets" amount={sumRows(data.currentAssets)} bold />

          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '0.75rem', textTransform: 'uppercase' }}>Fixed Assets</div>
          {data.fixedAssets.map(a => <ReportRow key={a.id} label={`${a.code} ${a.name}`} amount={Math.abs(a.balance)} indent />)}
          {data.fixedAssets.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1.25rem' }}>No fixed assets</div>}
          <ReportRow label="Total Fixed Assets" amount={sumRows(data.fixedAssets)} bold />

          <div style={{ height: 1, background: 'var(--border-color)', margin: '0.75rem 0' }} />
          <ReportRow label="TOTAL ASSETS" amount={data.totalAssets} bold color="#2563eb" />
        </ReportCard>
      </div>

      <div>
        <ReportCard title="Liabilities">
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Current Liabilities</div>
          {data.currentLiab.map(a => <ReportRow key={a.id} label={`${a.code} ${a.name}`} amount={Math.abs(a.balance)} indent />)}
          <ReportRow label="Total Current Liabilities" amount={sumRows(data.currentLiab)} bold />

          {data.longTermLiab.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '0.75rem', textTransform: 'uppercase' }}>Long-term Liabilities</div>
              {data.longTermLiab.map(a => <ReportRow key={a.id} label={`${a.code} ${a.name}`} amount={Math.abs(a.balance)} indent />)}
              <ReportRow label="Total Long-term Liabilities" amount={sumRows(data.longTermLiab)} bold />
            </>
          )}
          <ReportRow label="TOTAL LIABILITIES" amount={data.totalLiab} bold color="#dc2626" />

          <div style={{ height: 1, background: 'var(--border-color)', margin: '0.75rem 0' }} />
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Equity</div>
          {data.equity.map(a => <ReportRow key={a.id} label={`${a.code} ${a.name}`} amount={Math.abs(a.balance)} indent />)}
          <ReportRow label="TOTAL EQUITY" amount={data.totalEquity} bold color="#7c3aed" />

          <div style={{ height: 1, background: 'var(--border-color)', margin: '0.75rem 0' }} />
          <ReportRow label="TOTAL LIAB + EQUITY" amount={data.totalLiabEquity} bold color="#2563eb" />
        </ReportCard>

        <div className="card" style={{ padding: '1rem', borderLeft: `3px solid ${data.isBalanced ? '#059669' : '#dc2626'}` }}>
          <div style={{ fontWeight: 800, color: data.isBalanced ? '#059669' : '#dc2626' }}>
            {data.isBalanced ? '✅ Balance Sheet Balanced' : `❌ Difference: ${fmt(data.difference)}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>As of {data.asOfDate}</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CASH FLOW
══════════════════════════════════════════════════════════════════════════ */
function CashFlowReport({ data, search }) {
  const q = (search || '').toLowerCase();
  const rows = data.details.filter(d =>
    !q || d.narration?.toLowerCase().includes(q) || d.refNo?.toLowerCase().includes(q) || d.module?.toLowerCase().includes(q)
  );
  return (
    <div>
      <div className="grid-three-col" style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { label: 'Cash Inflow',   value: fmt(data.cashIn),      color: '#059669' },
          { label: 'Cash Outflow',  value: fmt(data.cashOut),     color: '#dc2626' },
          { label: 'Net Cash Flow', value: fmt(data.netCashFlow), color: data.netCashFlow >= 0 ? '#2563eb' : '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Ref</th><th>Narration</th><th>Module</th><th style={{ textAlign: 'right' }}>Cash In</th><th style={{ textAlign: 'right' }}>Cash Out</th></tr></thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No results{q ? ' matching search' : ' in this period'}.</td></tr>
              : rows.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{d.date}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent-color)' }}>{d.refNo}</td>
                  <td style={{ fontSize: '0.83rem' }}>{d.narration?.substring(0, 50)}</td>
                  <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{d.module}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: d.direction === 'in' ? 700 : 400 }}>{d.direction === 'in' ? fmtN(d.amount) : '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#dc2626', fontWeight: d.direction === 'out' ? 700 : 400 }}>{d.direction === 'out' ? fmtN(d.amount) : '—'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TRIAL BALANCE
══════════════════════════════════════════════════════════════════════════ */
function TrialBalanceReport({ data, search, onDrillDown }) {
  const TYPE_COLORS = { asset: '#2563eb', liability: '#dc2626', equity: '#7c3aed', revenue: '#059669', expense: '#d97706' };
  const q = (search || '').toLowerCase();
  const rows = data.rows.filter(r => !q || r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Premium Trial Balance Hero Badge */}
      <div style={{
        background: data.isBalanced
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        borderRadius: 16,
        padding: '1.25rem 1.5rem',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span style={{ fontSize: '1.8rem' }}>{data.isBalanced ? '✅' : '🛑'}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>
              {data.isBalanced ? 'Ledgers Perfectly Balanced' : 'Ledger Mismatch Detected'}
            </h3>
            <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
              {data.isBalanced
                ? 'All double-entry debits match credits.'
                : `Difference: ${fmt(Math.abs(data.totalDebit - data.totalCredit))}`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.1)', padding: '0.6rem 1rem', borderRadius: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', opacity: 0.7, fontWeight: 700, textTransform: 'uppercase' }}>Debits (DR)</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>{fmt(data.totalDebit)}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', opacity: 0.7, fontWeight: 700, textTransform: 'uppercase' }}>Credits (CR)</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>{fmt(data.totalCredit)}</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              {['Code', 'Account Name', 'Type', 'Debit (DR)', 'Credit (CR)'].map(h => (
                <th key={h} style={{ padding: '0.65rem 0.85rem', textAlign: h.includes('Debit') || h.includes('Credit') ? 'right' : 'left', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} onClick={onDrillDown ? () => onDrillDown('gl', { accountId: r.id }) : undefined}
                style={{ borderBottom: '1px solid var(--border-color)', cursor: onDrillDown ? 'pointer' : 'default', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '0.65rem 0.85rem' }}><code style={{ fontSize: '0.75rem', fontWeight: 700, color: TYPE_COLORS[r.type] }}>{r.code}</code></td>
                <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {onDrillDown && <span style={{ opacity: 0.3, fontSize: '0.65rem', marginRight: 4 }}>🔍</span>}
                  {r.name}
                </td>
                <td style={{ padding: '0.65rem 0.85rem' }}>
                  <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 9999, fontWeight: 700, background: `${TYPE_COLORS[r.type]}15`, color: TYPE_COLORS[r.type], textTransform: 'capitalize' }}>
                    {r.type}
                  </span>
                </td>
                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', color: '#3b82f6', fontWeight: r.debit > 0 ? 800 : 400 }}>{r.debit > 0 ? fmtN(r.debit) : '—'}</td>
                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: r.credit > 0 ? 800 : 400 }}>{r.credit > 0 ? fmtN(r.credit) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No accounts match search.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 900, borderTop: '2px solid var(--border-color)' }}>
              <td colSpan={3} style={{ padding: '0.75rem 0.85rem' }}>TOTAL</td>
              <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', color: '#3b82f6', fontSize: '0.82rem' }}>{fmtN(data.totalDebit)}</td>
              <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontSize: '0.82rem' }}>{fmtN(data.totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {onDrillDown && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>💡 Tip: Click any row line to inspect its General Ledger entries.</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GENERAL LEDGER
══════════════════════════════════════════════════════════════════════════ */
function LedgerReport({ data, search }) {
  if (!data.account) return <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Account not found.</div>;
  const q = (search || '').toLowerCase();
  const lines = data.lines.filter(l => !q || l.narration?.toLowerCase().includes(q) || l.refNo?.toLowerCase().includes(q));
  return (
    <div>
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', background: 'rgba(37,99,235,0.05)', borderLeft: '3px solid var(--accent-color)' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{data.account.code} — {data.account.name}</div>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>OPENING</span> <strong>{fmt(data.openingBalance)}</strong></div>
          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TRANSACTIONS</span> <strong>{data.lines.length}</strong></div>
          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CLOSING</span> <strong style={{ color: data.closingBalance >= 0 ? '#059669' : '#dc2626' }}>{fmt(data.closingBalance)}</strong></div>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Ref</th><th>Narration</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
          <tbody>
            {lines.length === 0
              ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions{q ? ' matching search' : ''}.</td></tr>
              : lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.date}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent-color)' }}>{l.refNo}</td>
                  <td style={{ fontSize: '0.83rem' }}>{l.narration?.substring(0, 55)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2563eb', fontWeight: l.debit > 0 ? 700 : 400 }}>{l.debit > 0 ? fmtN(l.debit) : '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: l.credit > 0 ? 700 : 400 }}>{l.credit > 0 ? fmtN(l.credit) : '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: l.balance >= 0 ? '#059669' : '#dc2626' }}>
                    {fmtN(Math.abs(l.balance))} {l.balance < 0 ? 'Cr' : 'Dr'}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SALES REPORT
══════════════════════════════════════════════════════════════════════════ */
function SalesReport({ data, search, onDrillDown }) {
  const q = (search || '').toLowerCase();
  const lines = data.lines.filter(l => !q || l.invoiceNo?.toLowerCase().includes(q) || l.customerName?.toLowerCase().includes(q));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { l: 'Invoices',     v: data.summary.count,              c: '#2563eb' },
          { l: 'Revenue',      v: fmt(data.summary.totalRev),      c: '#059669' },
          { l: 'COGS',         v: fmt(data.summary.totalCOGS),     c: '#d97706' },
          { l: 'Gross Profit', v: fmt(data.summary.grossProfit),   c: '#7c3aed' },
          { l: 'Avg GP %',     v: pct(data.summary.avgGPPct),      c: '#0891b2' },
          { l: 'VAT Collected',v: fmt(data.summary.totalVAT),      c: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '0.85rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>COGS</th><th style={{ textAlign: 'right' }}>GP</th><th style={{ textAlign: 'right' }}>GP%</th><th style={{ textAlign: 'right' }}>VAT</th><th>Status</th></tr></thead>
          <tbody>
            {lines.length === 0
              ? <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No results{q ? ' matching search' : ' in this period'}.</td></tr>
              : lines.map((l, i) => (
                <tr key={i} onClick={onDrillDown ? () => onDrillDown('sales_invoice', { invoiceNo: l.invoiceNo }) : undefined}
                  style={{ cursor: onDrillDown ? 'pointer' : 'default' }}
                  onMouseEnter={onDrillDown ? e => e.currentTarget.style.background = 'rgba(37,99,235,0.05)' : undefined}
                  onMouseLeave={onDrillDown ? e => e.currentTarget.style.background = '' : undefined}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                    {onDrillDown && <span style={{ opacity: 0.4, fontSize: '0.7rem', marginRight: '0.3rem' }}>🔍</span>}{l.invoiceNo}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.date}</td>
                  <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.customerName}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtN(l.grandTotal)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#d97706' }}>{fmtN(l.cogs)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700 }}>{fmtN(l.grossProfit)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#0891b2' }}>{pct(l.gpPct)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>{fmtN(l.vatAmount)}</td>
                  <td><span className={`status-pill ${l.paymentStatus === 'paid' ? 'instock' : 'outstock'}`}>{l.paymentStatus}</span></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {onDrillDown && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>💡 Click any row to view the full invoice detail.</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PURCHASE REPORT
══════════════════════════════════════════════════════════════════════════ */
function PurchaseReport({ data, search, onDrillDown }) {
  const q = (search || '').toLowerCase();
  const lines = data.lines.filter(l => !q || l.invoiceNo?.toLowerCase().includes(q) || l.supplierName?.toLowerCase().includes(q));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { l: 'Invoices',     v: data.summary.count,              c: '#2563eb' },
          { l: 'Total Purch.', v: fmt(data.summary.totalPurch),    c: '#d97706' },
          { l: 'VAT Paid',     v: fmt(data.summary.totalVAT),      c: '#0891b2' },
          { l: 'Outstanding',  v: fmt(data.summary.outstanding),   c: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '0.85rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Supplier</th><th style={{ textAlign: 'right' }}>Subtotal</th><th style={{ textAlign: 'right' }}>VAT</th><th style={{ textAlign: 'right' }}>Total</th><th>Status</th></tr></thead>
          <tbody>
            {lines.length === 0
              ? <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No results{q ? ' matching search' : ' in this period'}.</td></tr>
              : lines.map((l, i) => (
                <tr key={i} onClick={onDrillDown ? () => onDrillDown('purchase_invoice', { invoiceNo: l.invoiceNo }) : undefined}
                  style={{ cursor: onDrillDown ? 'pointer' : 'default' }}
                  onMouseEnter={onDrillDown ? e => e.currentTarget.style.background = 'rgba(37,99,235,0.05)' : undefined}
                  onMouseLeave={onDrillDown ? e => e.currentTarget.style.background = '' : undefined}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                    {onDrillDown && <span style={{ opacity: 0.4, fontSize: '0.7rem', marginRight: '0.3rem' }}>🔍</span>}{l.invoiceNo}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.date}</td>
                  <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.supplierName}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtN(l.subtotal)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#0891b2' }}>{fmtN(l.vatAmount)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmtN(l.grandTotal)}</td>
                  <td><span className={`status-pill ${l.paymentStatus === 'paid' ? 'instock' : 'outstock'}`}>{l.paymentStatus}</span></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {onDrillDown && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>💡 Click any row to view the full purchase invoice detail.</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PARTY STATEMENT (Customer / Supplier)
══════════════════════════════════════════════════════════════════════════ */
function PartyStatement({ data, type, search }) {
  const party = type === 'customer' ? data.customer : data.supplier;
  const q = (search || '').toLowerCase();
  const lines = data.lines.filter(l => !q || l.refNo?.toLowerCase().includes(q) || l.type?.toLowerCase().includes(q) || l.desc?.toLowerCase().includes(q));
  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem', borderLeft: '3px solid var(--accent-color)', padding: '1rem' }}>
        <div style={{ fontWeight: 800 }}>{party?.name || 'Unknown'}</div>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PHONE:</span> {party?.phone || '—'}</div>
          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CLOSING BALANCE:</span> <strong style={{ color: data.closingBalance > 0 ? '#dc2626' : '#059669' }}>{fmt(data.closingBalance)}</strong></div>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Ref</th><th>Type</th><th>Description</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
          <tbody>
            {lines.length === 0
              ? <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions{q ? ' matching search' : ' in this period'}.</td></tr>
              : lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.date}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent-color)' }}>{l.refNo}</td>
                  <td><span className="chip chip-blue" style={{ fontSize: '0.68rem' }}>{l.type}</span></td>
                  <td style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{(l.desc || '').substring(0, 50)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2563eb', fontWeight: l.debit > 0 ? 700 : 400 }}>{l.debit > 0 ? fmtN(l.debit) : '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: l.credit > 0 ? 700 : 400 }}>{l.credit > 0 ? fmtN(l.credit) : '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: l.balance > 0 ? '#dc2626' : '#059669' }}>{fmt(l.balance)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STOCK REPORT
══════════════════════════════════════════════════════════════════════════ */
function StockReport({ data, search }) {
  const q = (search || '').toLowerCase();
  const rows = (Array.isArray(data) ? data : []).filter(p => !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  return (
    <div className="table-container">
      <table className="data-table">
        <thead><tr><th>SKU</th><th>Product</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Avg Cost</th><th style={{ textAlign: 'right' }}>Stock Value</th><th style={{ textAlign: 'right' }}>Sale Price</th><th style={{ textAlign: 'right' }}>Potential Rev.</th><th>Status</th></tr></thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No products{q ? ' matching search' : ''}.</td></tr>
            : rows.map((p, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.sku}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: Number(p.qty) <= Number(p.minStock || 5) ? '#dc2626' : 'inherit', fontWeight: 700 }}>{p.qty}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtN(p.avgCost)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{fmtN(p.stockValue)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#059669' }}>{fmtN(p.salePrice)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700 }}>{fmtN(p.potentialRevenue)}</td>
                <td>
                  <span className={`status-pill ${Number(p.qty) <= Number(p.minStock || 5) ? 'outstock' : 'instock'}`}>
                    {Number(p.qty) === 0 ? 'Out' : Number(p.qty) <= Number(p.minStock || 5) ? 'Low' : 'OK'}
                  </span>
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STOCK VALUATION
══════════════════════════════════════════════════════════════════════════ */
function ValuationReport({ data, search }) {
  const q = (search || '').toLowerCase();
  const lines = (data.lines || []).filter(l => !q || l.name?.toLowerCase().includes(q) || l.sku?.toLowerCase().includes(q));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { l: 'Products', v: data.productCount, c: '#2563eb' },
          { l: 'Total Units', v: data.totalUnits, c: '#059669' },
          { l: 'Total Inventory Value', v: fmt(data.totalValue), c: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '0.85rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>SKU</th><th>Product Name</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Avg Cost</th><th style={{ textAlign: 'right' }}>Stock Value</th></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l.sku}</td>
                <td style={{ fontWeight: 600 }}>{l.name}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{l.qty}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtN(l.avgCost)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{fmtN(l.stockValue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 800 }}>
              <td colSpan={4} style={{ padding: '0.75rem 1rem' }}>TOTAL INVENTORY VALUE (AVCO)</td>
              <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#059669' }}>{fmtN(data.totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   VAT RETURN
══════════════════════════════════════════════════════════════════════════ */
function VATReturn({ data }) {
  const f = data.filing;
  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem', background: 'rgba(37,99,235,0.04)', borderLeft: '3px solid var(--accent-color)' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>VAT Return — Period: {data.period}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{data.fromDate} → {data.toDate}</div>
      </div>
      <div className="grid-three-col" style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { l: 'Output VAT (Sales)',     v: fmt(data.outputVat),    c: '#dc2626', desc: 'VAT collected from customers' },
          { l: 'Input VAT (Purchases)',  v: fmt(data.inputVat),     c: '#2563eb', desc: 'VAT paid to suppliers' },
          { l: data.vatBalance === 'payable' ? 'Net VAT Payable' : 'VAT Refund Claim', v: fmt(data.netVatPayable), c: data.vatBalance === 'payable' ? '#dc2626' : '#059669', desc: data.vatBalance === 'payable' ? 'Payable to NBR' : 'Refund from NBR' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div style={{ fontWeight: 800, marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase' }}>NBR Filing Boxes</div>
        {[
          { box: 'Box 1', label: 'Output VAT (Tax on Sales)',       value: fmt(f.box1_outputVat) },
          { box: 'Box 2', label: 'Input VAT (Tax on Purchases)',    value: fmt(f.box2_inputVat)  },
          { box: 'Box 3', label: 'Net VAT Payable (Box 1 − Box 2)',  value: fmt(f.box3_netPayable) },
          { box: 'Box 4', label: 'Refund Claim (if Box 2 > Box 1)', value: fmt(f.box4_refundClaim) },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 3 ? '1px dashed var(--border-color)' : 'none' }}>
            <div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, marginRight: '0.5rem', fontWeight: 700 }}>{r.box}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.label}</span>
            </div>
            <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AGING REPORT
══════════════════════════════════════════════════════════════════════════ */
function AgingReport({ data, search, onDrillDown, agingType }) {
  const cols = [
    { key: 'current', label: 'Current (0-30 days)', color: '#059669' },
    { key: 'days30',  label: '31-60 days',           color: '#d97706' },
    { key: 'days60',  label: '61-90 days',           color: '#f97316' },
    { key: 'days90',  label: '91-120 days',          color: '#dc2626' },
    { key: 'over90',  label: 'Over 120 days',        color: '#7f1d1d' },
  ];
  const q = (search || '').toLowerCase();
  const lines = data.lines.filter(r => !q || r.name?.toLowerCase().includes(q));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {cols.map(c => (
          <div key={c.key} className="card" style={{ padding: '0.85rem', borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: c.color }}>{fmt(data.buckets[c.key])}</div>
          </div>
        ))}
        <div className="card" style={{ padding: '0.85rem', borderTop: '3px solid #2563eb' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Outstanding</div>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#2563eb' }}>{fmt(data.totalOutstanding)}</div>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{data.type === 'ar' ? 'Customer' : 'Supplier'}</th>
              {cols.map(c => <th key={c.key} style={{ textAlign: 'right' }}>{c.label.split(' ')[0]}</th>)}
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0
              ? <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No outstanding {data.type === 'ar' ? 'receivables' : 'payables'}{q ? ' matching search' : ''}.</td></tr>
              : lines.map((r, i) => (
                <tr key={i}
                  onClick={onDrillDown ? () => onDrillDown(data.type === 'ar' ? 'customer_stmt' : 'supplier_stmt', { partyId: r.id }) : undefined}
                  style={{ cursor: onDrillDown ? 'pointer' : 'default' }}
                  onMouseEnter={onDrillDown ? e => e.currentTarget.style.background = 'rgba(37,99,235,0.05)' : undefined}
                  onMouseLeave={onDrillDown ? e => e.currentTarget.style.background = '' : undefined}>
                  <td style={{ fontWeight: 600 }}>
                    {onDrillDown && <span style={{ opacity: 0.4, fontSize: '0.7rem', marginRight: '0.3rem' }}>🔍</span>}{r.name}
                  </td>
                  {cols.map(c => <td key={c.key} style={{ textAlign: 'right', fontFamily: 'monospace', color: r[c.key] > 0 ? c.color : 'var(--text-muted)', fontWeight: r[c.key] > 0 ? 700 : 400 }}>{r[c.key] > 0 ? fmtN(r[c.key]) : '—'}</td>)}
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#2563eb' }}>{fmtN(r.total)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {onDrillDown && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>💡 Click any row to view the full {data.type === 'ar' ? 'customer' : 'supplier'} statement.</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FINANCIAL RATIOS
══════════════════════════════════════════════════════════════════════════ */
function RatiosReport({ data }) {
  // Helpers for progress bars
  const limitPercent = (val, max) => Math.min(100, Math.max(0, (val / max) * 100));

  const liquidity = [
    { label: 'Current Ratio', val: data.currentRatio, ok: data.currentRatio >= 1.5, bench: '>= 1.5', pct: limitPercent(data.currentRatio, 3.0), maxLabel: '3.0', desc: `Current Assets (${fmt(data.currentAssets)}) / Current Liabilities (${fmt(data.currentLiab)})` },
    { label: 'Quick (Acid-Test) Ratio', val: data.quickRatio, ok: data.quickRatio >= 1.0, bench: '>= 1.0', pct: limitPercent(data.quickRatio, 2.0), maxLabel: '2.0', desc: `Quick Assets (${fmt(data.quickAssets)}) / Current Liabilities (${fmt(data.currentLiab)})` },
  ];

  const profitability = [
    { label: 'Gross Profit Margin', val: data.grossMargin, color: '#3b82f6', desc: 'Gross Profit / Net Revenue' },
    { label: 'Net Profit Margin', val: data.netMargin, color: '#10b981', desc: 'Net Profit / Net Revenue' },
    { label: 'Return on Assets (ROA)', val: data.roa, color: '#8b5cf6', desc: 'Profit / Total Assets' },
  ];

  const solvency = [
    { label: 'Debt-to-Equity Ratio', val: data.debtToEquity, ok: data.debtToEquity <= 1.5, bench: '<= 1.5', pct: limitPercent(data.debtToEquity, 3.0), maxLabel: '3.0', desc: `Total Liabilities (${fmt(data.totalLiab)}) / Total Equity (${fmt(data.totalEquity)})` },
    { label: 'Equity Ratio', val: data.equityRatio * 100, ok: data.equityRatio >= 0.4, bench: '>= 40%', pct: limitPercent(data.equityRatio * 100, 100), maxLabel: '100%', desc: `Total Equity (${fmt(data.totalEquity)}) / Total Assets (${fmt(data.totalAssets)})` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Liquidity Ratios */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>💧 Liquidity Ratios (Short-Term Solvency)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {liquidity.map((r, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{r.label}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, background: r.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: r.ok ? '#10b981' : '#ef4444', padding: '2px 8px', borderRadius: 9999 }}>
                  {r.ok ? `Healthy (${r.bench})` : `Below Target (${r.bench})`}
                </span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', marginBottom: '0.5rem' }}>{r.val.toFixed(2)}</div>
              
              {/* Reference indicator bar */}
              <div style={{ position: 'relative', height: 6, background: 'var(--border-color)', borderRadius: 3, marginBottom: '0.65rem' }}>
                <div style={{ width: `${r.pct}%`, height: '100%', background: r.ok ? '#10b981' : '#ef4444', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Profitability Ratios */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📈 Profitability Ratios</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
          {profitability.map((r, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>{r.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: r.color, fontFamily: 'monospace', marginBottom: '0.5rem' }}>{r.val.toFixed(1)}%</div>
              
              <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, marginBottom: '0.65rem' }}>
                <div style={{ width: `${Math.max(0, Math.min(100, r.val))}%`, height: '100%', background: r.color, borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Solvency & Equity Ratios */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🛡️ Solvency & Equity Ratios</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {solvency.map((r, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{r.label}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, background: r.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: r.ok ? '#10b981' : '#ef4444', padding: '2px 8px', borderRadius: 9999 }}>
                  {r.ok ? `Healthy (${r.bench})` : `Action Req (${r.bench})`}
                </span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', marginBottom: '0.5rem' }}>{r.val.toFixed(2)}{r.label.includes('Ratio %') || r.label.includes('Equity Ratio') ? '%' : ''}</div>
              
              <div style={{ position: 'relative', height: 6, background: 'var(--border-color)', borderRadius: 3, marginBottom: '0.65rem' }}>
                <div style={{ width: `${r.pct}%`, height: '100%', background: r.ok ? '#10b981' : '#ef4444', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPARATIVE P&L
══════════════════════════════════════════════════════════════════════════ */
function ComparativePLReport({ data }) {
  const renderCompRow = (label, currVal, prevVal, bold, color) => {
    const varAmt = currVal - prevVal;
    const varPct = prevVal !== 0 ? ((currVal - prevVal) / Math.abs(prevVal)) * 100 : 0;
    const varColor = varAmt >= 0 ? 'var(--success)' : 'var(--danger)';
    const pctStr = varPct >= 0 ? `+${varPct.toFixed(1)}%` : `${varPct.toFixed(1)}%`;
    const amtStr = varAmt >= 0 ? `+${fmtN(varAmt)}` : `-${fmtN(Math.abs(varAmt))}`;
    return (
      <tr style={{ fontWeight: bold ? 800 : 400, borderTop: bold ? '1.5px solid var(--border-color)' : 'none' }}>
        <td style={{ fontSize: '0.85rem', color: color || 'inherit', padding: '0.5rem 0.75rem' }}>{label}</td>
        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.5rem 0.75rem' }}>{fmt(currVal)}</td>
        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{fmt(prevVal)}</td>
        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.5rem 0.75rem', color: varColor }}>{amtStr}</td>
        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.5rem 0.75rem', color: varColor, fontWeight: 700 }}>{pctStr}</td>
      </tr>
    );
  };
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr style={{ background: 'var(--bg-tertiary)' }}>
            <th>Description</th>
            <th style={{ textAlign: 'right' }}>Current ({data.fromDate} to {data.toDate})</th>
            <th style={{ textAlign: 'right' }}>Previous ({data.prevFromDate} to {data.prevToDate})</th>
            <th style={{ textAlign: 'right' }}>Variance (৳)</th>
            <th style={{ textAlign: 'right' }}>Var %</th>
          </tr>
        </thead>
        <tbody>
          {renderCompRow('Gross Revenue', data.current.grossRevenue, data.previous.grossRevenue)}
          {data.current.salesReturns > 0 && renderCompRow('Less: Sales Returns', -data.current.salesReturns, -data.previous.salesReturns, false, 'var(--danger)')}
          {renderCompRow('Net Sales Revenue', data.current.netRevenue, data.previous.netRevenue, true, 'var(--success)')}
          {renderCompRow('Cost of Goods Sold (COGS)', data.current.cogs, data.previous.cogs)}
          {renderCompRow('Gross Profit Margin', data.current.grossProfit, data.previous.grossProfit, true, 'var(--accent-color)')}
          {renderCompRow('Operating Expenses', data.current.operatingExpenses, data.previous.operatingExpenses)}
          {renderCompRow('NET PROFIT / (LOSS)', data.current.netProfit, data.previous.netProfit, true, data.current.netProfit >= 0 ? 'var(--success)' : 'var(--danger)')}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPARATIVE BALANCE SHEET
══════════════════════════════════════════════════════════════════════════ */
function ComparativeBSReport({ data }) {
  const renderCompRow = (label, currVal, prevVal, bold, color) => {
    const varAmt = currVal - prevVal;
    const varPct = prevVal !== 0 ? ((currVal - prevVal) / Math.abs(prevVal)) * 100 : 0;
    const varColor = varAmt >= 0 ? 'var(--success)' : 'var(--danger)';
    const pctStr = varPct >= 0 ? `+${varPct.toFixed(1)}%` : `${varPct.toFixed(1)}%`;
    const amtStr = varAmt >= 0 ? `+${fmtN(varAmt)}` : `-${fmtN(Math.abs(varAmt))}`;
    return (
      <tr style={{ fontWeight: bold ? 800 : 400, borderTop: bold ? '1.5px solid var(--border-color)' : 'none' }}>
        <td style={{ fontSize: '0.85rem', color: color || 'inherit', padding: '0.5rem 0.75rem' }}>{label}</td>
        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.5rem 0.75rem' }}>{fmt(currVal)}</td>
        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{fmt(prevVal)}</td>
        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.5rem 0.75rem', color: varColor }}>{amtStr}</td>
        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.5rem 0.75rem', color: varColor, fontWeight: 700 }}>{pctStr}</td>
      </tr>
    );
  };
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr style={{ background: 'var(--bg-tertiary)' }}>
            <th>Balance Sheet Items</th>
            <th style={{ textAlign: 'right' }}>Current YTD ({data.asOfDate})</th>
            <th style={{ textAlign: 'right' }}>Previous YTD ({data.prevAsOfDate})</th>
            <th style={{ textAlign: 'right' }}>Variance (৳)</th>
            <th style={{ textAlign: 'right' }}>Var %</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
            <td colSpan={5} style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ASSETS</td>
          </tr>
          {renderCompRow('Current Assets', data.current.totalAssets - (data.current.fixedAssets?.reduce((s,a)=>s+Math.abs(a.balance),0)||0), data.previous.totalAssets - (data.previous.fixedAssets?.reduce((s,a)=>s+Math.abs(a.balance),0)||0))}
          {renderCompRow('Fixed Assets (Net)', data.current.fixedAssets?.reduce((s,a)=>s+Math.abs(a.balance),0)||0, data.previous.fixedAssets?.reduce((s,a)=>s+Math.abs(a.balance),0)||0)}
          {renderCompRow('TOTAL ASSETS', data.current.totalAssets, data.previous.totalAssets, true, 'var(--accent-color)')}
          <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
            <td colSpan={5} style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LIABILITIES & EQUITY</td>
          </tr>
          {renderCompRow('Current Liabilities', data.current.currentLiab?.reduce((s,a)=>s+Math.abs(a.balance),0)||0, data.previous.currentLiab?.reduce((s,a)=>s+Math.abs(a.balance),0)||0)}
          {renderCompRow('Long-Term Liabilities', data.current.longTermLiab?.reduce((s,a)=>s+Math.abs(a.balance),0)||0, data.previous.longTermLiab?.reduce((s,a)=>s+Math.abs(a.balance),0)||0)}
          {renderCompRow('TOTAL LIABILITIES', data.current.totalLiab, data.previous.totalLiab, true, 'var(--danger)')}
          {renderCompRow('TOTAL EQUITY', data.current.totalEquity, data.previous.totalEquity, true, 'var(--success)')}
          {renderCompRow('TOTAL LIABILITIES & EQUITY', data.current.totalLiabEquity, data.previous.totalLiabEquity, true, 'var(--accent-color)')}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   INVOICE DETAIL (Drill-down for Sales / Purchase)
══════════════════════════════════════════════════════════════════════════ */
function InvoiceDetail({ data, type }) {
  if (!data) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Invoice not found.</div>;
  const isSales = type === 'sales';
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Invoice No.</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-color)' }}>{data.invoiceNo}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Date</div>
          <div style={{ fontWeight: 600 }}>{data.date}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{isSales ? 'Customer' : 'Supplier'}</div>
          <div style={{ fontWeight: 600 }}>{data.customerName || data.supplierName || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
          <span className={`status-pill ${data.paymentStatus === 'paid' ? 'instock' : 'outstock'}`}>{data.paymentStatus}</span>
        </div>
      </div>

      {data.items && data.items.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Item</th><th>SKU</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{item.name || item.productName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.sku || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{item.qty || item.quantity}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtN(item.unitPrice || item.price)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmtN(item.total || item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 800 }}>
                <td colSpan={4} style={{ padding: '0.75rem 1rem' }}>Subtotal</td>
                <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{fmtN(data.subtotal)}</td>
              </tr>
              {data.vatAmount > 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '0.35rem 1rem', color: 'var(--text-muted)' }}>VAT</td>
                  <td style={{ textAlign: 'right', padding: '0.35rem 1rem', fontFamily: 'monospace', color: '#dc2626' }}>{fmtN(data.vatAmount)}</td>
                </tr>
              )}
              <tr style={{ fontWeight: 900, background: 'rgba(37,99,235,0.07)' }}>
                <td colSpan={4} style={{ padding: '0.75rem 1rem', color: 'var(--accent-color)' }}>Grand Total</td>
                <td style={{ textAlign: 'right', padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--accent-color)', fontSize: '1rem' }}>{fmtN(data.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {data.narration && <div style={{ marginTop: '1rem', fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Note: {data.narration}</div>}
    </div>
  );
}
