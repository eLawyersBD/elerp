import { useState, useEffect, useMemo, useRef } from 'react';
import { accountingService } from '../services/accountingService';
import { auditService } from '../services/auditService';
import { salesService } from '../services/salesService';
import { purchaseService } from '../services/purchaseService';
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

/* ─── Tiny SVG Sparkline ─────────────────────────────────────────────────── */
function Sparkline({ data = [], color = '#34d399', width = 80, height = 32 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(' L ')}`;
  const areaD = `M ${pts[0]} L ${pts.join(' L ')} L ${width},${height} L 0,${height} Z`;
  const gradId = `sg-${color.replace(/[^a-z0-9]/gi,'')}`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

/* ─── Business Pulse Metric Card ─────────────────────────────────────────── */
function PulseCard({ label, value, icon, color, trend, trendLabel, sparkData, onClick, loading }) {
  const [hov, setHov] = useState(false);
  const isUp = trend >= 0;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: `1px solid ${hov ? color + '55' : 'var(--border-color)'}`,
        borderRadius: 20, padding: '1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s ease',
        transform: hov ? 'translateY(-3px)' : 'none',
        boxShadow: hov ? `0 12px 32px rgba(0,0,0,0.15)` : '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: color, borderRadius: '0 3px 3px 0', opacity: hov ? 1 : 0.5, transition: 'opacity 0.25s' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: '1rem', width: 32, height: 32, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 28, width: '70%', borderRadius: 6 }} />
          ) : (
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
          )}
          {!loading && trendLabel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: isUp ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)', color: isUp ? '#34d399' : '#ef4444' }}>
                {isUp ? '▲' : '▼'} {Math.abs(trend)}%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{trendLabel}</span>
            </div>
          )}
        </div>
        {sparkData && sparkData.length > 1 && <Sparkline data={sparkData} color={color} width={72} height={40} />}
      </div>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────────────────── */
function SectionHeader({ icon, label, gradient, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 9999, fontSize: 'var(--font-size-xs)', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', background: gradient, color: '#fff' }}>{icon} {label}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(99,102,241,0.25) 0%, transparent 100%)' }} />
      {action && (
        <button onClick={onAction} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '4px 12px', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >{action}</button>
      )}
    </div>
  );
}

/* ─── Animated KPI Card ──────────────────────────────────────────────────── */
function KpiCard({ label, rawValue, bg, icon, loading }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0.75rem', borderRadius: 16,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ padding: '0.5rem', borderRadius: 10, background: bg, flexShrink: 0 }}>
        <span style={{ fontSize: 'var(--font-size-sm)' }}>{icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <div className="skeleton" style={{ height: 16, width: '70%', margin: '2px 0' }} />
        ) : (
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 'var(--font-size-md)', lineHeight: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rawValue}</p>
        )}
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 3, marginBottom: 0, lineHeight: 1 }}>{label}</p>
      </div>
    </div>
  );
}

/* ─── Quick-Access Gradient Card ─────────────────────────────────────────── */
function QuickCard({ label, category, icon, gradient, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: '0.85rem',
        padding: '1rem', borderRadius: 20,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        cursor: 'pointer', textAlign: 'left',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative gradient background glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: gradient,
        opacity: hovered ? 0.08 : 0.02,
        transition: 'opacity 0.25s ease',
        pointerEvents: 'none',
      }} />

      {/* Left Icon Badge with category gradient */}
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.15rem', flexShrink: 0,
        color: '#fff',
        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
        transform: hovered ? 'scale(1.08) rotate(4deg)' : 'none',
        transition: 'transform 0.3s ease',
      }}>
        {icon}
      </div>

      {/* Texts info */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 2 }}>
          {category}
        </span>
        <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>

      {/* Arrow Indicator */}
      <div style={{
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        transform: hovered ? 'translateX(4px)' : 'none',
        transition: 'transform 0.25s',
        display: 'flex', alignItems: 'center',
        opacity: hovered ? 1 : 0.6,
      }}>
        →
      </div>
    </button>
  );
}



/* ─── Main Dashboard Component ───────────────────────────────────────────── */

export default function DashboardView({ products = [], customers = [], suppliers = [], currentUser = null, activeRouteHandler }) {
  const matchedEmp = useMemo(() => {
    if (!currentUser) return null;
    return SEED_EMPLOYEES.find(emp => 
      emp.employeeCode === currentUser.employeeCode || 
      emp.employeeCode === currentUser.uid ||
      emp.emailAddress?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase()
    );
  }, [currentUser]);

  const empName = matchedEmp?.fullNameEnglish || currentUser?.displayName || 'User';
  const empMobile = matchedEmp?.mobileNumber || currentUser?.mobileNumber || '+88 01819-556751';
  const empDept = matchedEmp?.department || currentUser?.department || 'Administration';
  const empEmail = matchedEmp?.emailAddress || currentUser?.email || 'admin@erpforu.com';

  const [currentTime, setCurrentTime] = useState(new Date());
  const [journalEntries, setJournalEntries] = useState([]);
  const [activities, setActivities] = useState([]);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [coa, setCoa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('6months');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      accountingService.getJournalEntries().catch(() => []),
      auditService.getLogs({ limit: 12 }).catch(() => []),
      salesService.getSalesInvoices().catch(() => []),
      purchaseService.getPurchaseInvoices().catch(() => []),
      accountingService.getChartOfAccounts().catch(() => []),
    ]).then(([journals, logs, sales, purchases, coaData]) => {
      setJournalEntries(journals || []);
      setActivities(logs || []);
      setSalesInvoices(sales || []);
      setPurchaseInvoices(purchases || []);
      setCoa(coaData || []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  /* ── Derived KPIs ── */
  const totalProducts   = products.length;
  const lowStockCount   = products.filter(p => p.qty <= (p.minStock || 5)).length;
  const inventoryValue  = products.reduce((s, p) => s + (p.qty || 0) * (p.price || 0), 0);
  const totalCustomers  = customers.length;
  const totalSuppliers  = suppliers.length;

  const cashAndBankBalance = useMemo(() => {
    return coa
      .filter(acc => acc.code && acc.code.startsWith('10'))
      .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
  }, [coa]);

  const greeting = useMemo(() => {
    const h = currentTime.getHours();
    if (h < 12) return { text: 'Good Morning',   emoji: '☀️' };
    if (h < 17) return { text: 'Good Afternoon',  emoji: '🌤️' };
    return       { text: 'Good Evening',    emoji: '🌙' };
  }, [currentTime]);

  /* ── Financial derived values ── */
  const { totalReceivables, totalPayables, salesThisMonth, purchasesThisMonth, salesSparkData, purchasesSparkData } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalReceivables = salesInvoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((s, inv) => s + Number(inv.grandTotal || 0), 0);
    const totalPayables = purchaseInvoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((s, inv) => s + Number(inv.grandTotal || 0), 0);
    const salesThisMonth = salesInvoices.filter(inv => inv.date && new Date(inv.date) >= monthStart).reduce((s, inv) => s + Number(inv.grandTotal || 0), 0);
    const purchasesThisMonth = purchaseInvoices.filter(inv => inv.date && new Date(inv.date) >= monthStart).reduce((s, inv) => s + Number(inv.grandTotal || 0), 0);
    const buildSparkline = (invoices) => {
      const weeks = Array(6).fill(0);
      invoices.forEach(inv => {
        if (!inv.date) return;
        const daysAgo = Math.floor((now - new Date(inv.date)) / 86400000);
        const weekIdx = Math.min(5, Math.floor(daysAgo / 7));
        weeks[5 - weekIdx] += Number(inv.grandTotal || 0);
      });
      return weeks;
    };
    return { totalReceivables, totalPayables, salesThisMonth, purchasesThisMonth, salesSparkData: buildSparkline(salesInvoices), purchasesSparkData: buildSparkline(purchaseInvoices) };
  }, [salesInvoices, purchaseInvoices]);

  /* ── Stagger animation helper ── */
  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(22px)',
    transition: `opacity 0.45s ease ${i * 90}ms, transform 0.45s ease ${i * 90}ms`,
  });

  /* ── Activity icon helper ── */
  const getActionStyle = (act) => {
    switch (act?.toLowerCase()) {
      case 'login':   return { icon: '🔑', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' };
      case 'logout':  return { icon: '🚪', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
      case 'create':  return { icon: '➕', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
      case 'update':  return { icon: '✏️', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
      case 'delete':  return { icon: '🗑️', color: '#f87171', bg: 'rgba(248,113,113,0.12)' };
      case 'post':    return { icon: '🧾', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' };
      case 'approve': return { icon: '✅', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
      default:        return { icon: '📝', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
    }
  };

  /* ── Quick-access actions ── */
  const quickActions = [
    // Sales Services
    { label: 'Create Quotation', category: 'Sales & Invoicing', icon: '📄', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', onClick: () => { localStorage.setItem('sales_open_quotation_modal', 'true'); activeRouteHandler('sales'); } },
    { label: 'New Sales Invoice', category: 'Sales & Invoicing', icon: '🧾', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', onClick: () => { localStorage.setItem('sales_open_new_invoice', 'true'); activeRouteHandler('sales'); } },
    { label: 'Sales Dashboard', category: 'Sales & Invoicing', icon: '📊', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', onClick: () => { activeRouteHandler('sales'); } },

    // Procurement
    { label: 'Purchase Requisition', category: 'Purchase & Bills', icon: '📝', gradient: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)', onClick: () => { localStorage.setItem('purchase_open_pr_modal', 'true'); activeRouteHandler('purchases'); } },
    { label: 'New Purchase Invoice', category: 'Purchase & Bills', icon: '🛒', gradient: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)', onClick: () => { localStorage.setItem('purchase_open_new_invoice', 'true'); activeRouteHandler('purchases'); } },
    { label: 'Procurement Dashboard', category: 'Purchase & Bills', icon: '📊', gradient: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)', onClick: () => { activeRouteHandler('purchases'); } },

    // Add Product
    { label: 'Add New Product', category: 'Inventory Catalog', icon: '📦', gradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', onClick: () => { localStorage.setItem('inventory_open_add_product', 'true'); activeRouteHandler('inventory'); } },
    { label: 'Add Service Item', category: 'Inventory Catalog', icon: '🛠️', gradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', onClick: () => { localStorage.setItem('inventory_open_add_service', 'true'); activeRouteHandler('inventory'); } },
    { label: 'Stock Summary', category: 'Inventory Catalog', icon: '📋', gradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', onClick: () => { activeRouteHandler('inventory'); } },

    // Journal Entry
    { label: 'Receivable Voucher', category: 'Accounting & Vouchers', icon: '💵', gradient: 'linear-gradient(135deg, #0e7490 0%, #2563eb 100%)', onClick: () => { localStorage.setItem('voucher_open_type', 'receipt'); activeRouteHandler('vouchers'); } },
    { label: 'Payment Voucher', category: 'Accounting & Vouchers', icon: '💳', gradient: 'linear-gradient(135deg, #0e7490 0%, #2563eb 100%)', onClick: () => { localStorage.setItem('voucher_open_type', 'payment'); activeRouteHandler('vouchers'); } },
    { label: 'Journal Voucher', category: 'Accounting & Vouchers', icon: '⚖️', gradient: 'linear-gradient(135deg, #0e7490 0%, #2563eb 100%)', onClick: () => { localStorage.setItem('voucher_open_type', 'journal'); activeRouteHandler('vouchers'); } },
    { label: 'Expense Voucher', category: 'Accounting & Vouchers', icon: '📉', gradient: 'linear-gradient(135deg, #0e7490 0%, #2563eb 100%)', onClick: () => { localStorage.setItem('voucher_open_type', 'expense'); activeRouteHandler('vouchers'); } },

    // New Client
    { label: 'New Deal (CRM)', category: 'CRM & Contacts', icon: '🤝', gradient: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)', onClick: () => { localStorage.setItem('crm_open_add_lead', 'true'); activeRouteHandler('crm'); } },
    { label: 'New Customer', category: 'CRM & Contacts', icon: '👤', gradient: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)', onClick: () => { localStorage.setItem('open_add_customer_on_load', 'true'); activeRouteHandler('sales'); } },
    { label: 'CRM Pipeline', category: 'CRM & Contacts', icon: '📈', gradient: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)', onClick: () => { activeRouteHandler('crm'); } }
  ];


  /* ── Custom SVG Areas/Trend Processing ── */
  const chartData = useMemo(() => {
    const intervals = [];
    const now = new Date();

    if (timeframe === '30days') {
      for (let i = 5; i >= 0; i--) {
        const dStart = new Date(now.getTime() - (i * 5 + 4) * 24 * 60 * 60 * 1000);
        const dEnd = new Date(now.getTime() - (i * 5) * 24 * 60 * 60 * 1000);
        const label = `${dStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dEnd.toLocaleDateString('en-US', { day: 'numeric' })}`;
        intervals.push({
          start: new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate(), 0, 0, 0),
          end: new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate(), 23, 59, 59),
          label,
          sales: 0,
          purchases: 0,
        });
      }
    } else if (timeframe === 'year') {
      for (let i = 5; i >= 0; i--) {
        const dStart = new Date(now.getFullYear(), now.getMonth() - (i * 2 + 1), 1);
        const dEnd = new Date(now.getFullYear(), now.getMonth() - (i * 2) + 1, 0);
        const label = `${dStart.toLocaleDateString('en-US', { month: 'short' })} - ${dEnd.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`;
        intervals.push({
          start: new Date(dStart.getFullYear(), dStart.getMonth(), 1, 0, 0, 0),
          end: new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate(), 23, 59, 59),
          label,
          sales: 0,
          purchases: 0,
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        intervals.push({
          start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0),
          end: new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate(), 23, 59, 59),
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          sales: 0,
          purchases: 0,
        });
      }
    }

    let hasRealData = false;

    salesInvoices.forEach(inv => {
      if (!inv.date) return;
      const idate = new Date(inv.date);
      intervals.forEach(interval => {
        if (idate >= interval.start && idate <= interval.end) {
          interval.sales += Number(inv.grandTotal || 0);
          hasRealData = true;
        }
      });
    });

    purchaseInvoices.forEach(inv => {
      if (!inv.date) return;
      const idate = new Date(inv.date);
      intervals.forEach(interval => {
        if (idate >= interval.start && idate <= interval.end) {
          interval.purchases += Number(inv.grandTotal || 0) + Number(inv.landedCost?.total || 0);
          hasRealData = true;
        }
      });
    });

    if (!hasRealData) {
      if (timeframe === '30days') {
        intervals[0].sales = 10000; intervals[0].purchases = 8000;
        intervals[1].sales = 15000; intervals[1].purchases = 12000;
        intervals[2].sales = 12000; intervals[2].purchases = 15000;
        intervals[3].sales = 20000; intervals[3].purchases = 11000;
        intervals[4].sales = 22000; intervals[4].purchases = 14000;
        intervals[5].sales = 28000; intervals[5].purchases = 18000;
      } else if (timeframe === 'year') {
        intervals[0].sales = 110000; intervals[0].purchases = 70000;
        intervals[1].sales = 140000; intervals[1].purchases = 90000;
        intervals[2].sales = 120000; intervals[2].purchases = 110000;
        intervals[3].sales = 180000; intervals[3].purchases = 95000;
        intervals[4].sales = 200000; intervals[4].purchases = 130000;
        intervals[5].sales = 250000; intervals[5].purchases = 160000;
      } else {
        intervals[0].sales = 45000;  intervals[0].purchases = 30000;
        intervals[1].sales = 65000;  intervals[1].purchases = 40000;
        intervals[2].sales = 55000;  intervals[2].purchases = 50000;
        intervals[3].sales = 85000;  intervals[3].purchases = 45000;
        intervals[4].sales = 95000;  intervals[4].purchases = 60000;
        intervals[5].sales = 120000; intervals[5].purchases = 75000;
      }
    }

    return { intervals, isDemo: !hasRealData };
  }, [salesInvoices, purchaseInvoices, timeframe]);

  const { intervals: trendIntervals, isDemo: isDemoData } = chartData;

  // Donut values for Inventory
  const donutData = useMemo(() => {
    const map = {};
    products.forEach(p => {
      const cat = p.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + (p.qty || 0) * (p.price || 0);
    });
    const sorted = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Cap at 4 items + "Others"
    if (sorted.length > 4) {
      const top = sorted.slice(0, 4);
      const othersVal = sorted.slice(4).reduce((sum, item) => sum + item.value, 0);
      top.push({ name: 'Others', value: othersVal });
      return top;
    }
    return sorted;
  }, [products]);

  const totalDonutValue = donutData.reduce((sum, item) => sum + item.value, 0);

  // SVG dimensions & charting helper variables
  const maxVal = Math.max(...trendIntervals.map(m => Math.max(m.sales, m.purchases, 10000))) * 1.15;
  const svgW = 500;
  const svgH = 200;
  const padL = 60;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const salesPoints = trendIntervals.map((d, i) => ({
    x: padL + (i * (plotW / 5)),
    y: svgH - padB - ((d.sales / maxVal) * plotH)
  }));
  const salesPathStr = salesPoints.length > 0 ? `M ${salesPoints.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  const salesAreaStr = salesPoints.length > 0 ? `${salesPathStr} L ${salesPoints[salesPoints.length-1].x},${svgH-padB} L ${salesPoints[0].x},${svgH-padB} Z` : '';

  const purchasePoints = trendIntervals.map((d, i) => ({
    x: padL + (i * (plotW / 5)),
    y: svgH - padB - ((d.purchases / maxVal) * plotH)
  }));
  const purchasePathStr = purchasePoints.length > 0 ? `M ${purchasePoints.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  const purchaseAreaStr = purchasePoints.length > 0 ? `${purchasePathStr} L ${purchasePoints[purchasePoints.length-1].x},${svgH-padB} L ${purchasePoints[0].x},${svgH-padB} Z` : '';

  // Donut colors mapping
  const donutColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#7c3aed'];

  const lowStockItems = products.filter(p => p.qty <= (p.minStock || 5)).slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* GUEST LOCK BANNER */}
      {currentUser?.isPendingGoogleUser && (
        <div className="card" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', color: '#d97706', fontSize: 'var(--font-size-sm)', padding: '1rem 1.25rem', borderRadius: 18, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: 'var(--font-size-lg)' }}>🔑</span>
          <div><strong style={{ fontWeight: 800 }}>Temporary Guest Preview Session:</strong> You are exploring ACCOUNTICA using a Google login. Because your registration request is still pending approval, you have read-only access. Your preview session will expire in 3 hours.</div>
        </div>
      )}

      {/* AURORA HERO */}
      <div style={stagger(0)}>
        <div className="dashboard-hero" style={{ position: 'relative', overflow: 'hidden', borderRadius: 36, padding: '2rem', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 25%, #24243e 50%, #1a1a2e 75%, #0f0c29 100%)', backgroundSize: '300% 300%', animation: 'aurora 12s ease infinite', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ position: 'absolute', top: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(139,92,246,0.4)', filter: 'blur(100px)', animation: 'pulse-glow 6s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, right: -60, width: 288, height: 288, borderRadius: '50%', background: 'rgba(236,72,153,0.32)', filter: 'blur(90px)', animation: 'pulse-glow 8s ease-in-out infinite 2s', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '33%', left: '50%', transform: 'translate(-50%,0)', width: 240, height: 128, borderRadius: '50%', background: 'rgba(6,182,212,0.22)', filter: 'blur(80px)', animation: 'float-slow 10s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.08, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 'var(--font-size-xl)' }}>{greeting.emoji}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '4px 12px', borderRadius: 9999, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.2)' }}>{greeting.text}</span>
                {currentUser?.displayName && <span style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}> — {currentUser.displayName}</span>}
              </div>
              <h2 style={{ margin: 0, fontSize: 'clamp(var(--font-size-2xl), 4vw, var(--font-size-3xl))', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, color: '#fff' }}>
                আসসালামু আলাইকুম ওয়ারাহমাতুল্লাহ
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: 600, fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
                স্বাগতম, <strong style={{ color: '#fff' }}>{empName}</strong> (মোবাইল: <span style={{ color: '#c084fc' }}>{empMobile}</span>, বিভাগ: <span style={{ color: '#60a5fa' }}>{empDept}</span>, ইমেইল: <span style={{ color: '#34d399' }}>{empEmail}</span>)
              </p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', marginTop: 4 }}>
                {currentTime.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="dashboard-hero-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 3, border: '1px solid rgba(255,255,255,0.1)' }}>
                {[{ key: '30days', label: '30 Days' }, { key: '6months', label: '6 Months' }, { key: 'year', label: '1 Year' }].map(tf => (
                  <button key={tf.key} onClick={() => setTimeframe(tf.key)} style={{ padding: '6px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', background: timeframe === tf.key ? 'rgba(255,255,255,0.15)' : 'transparent', color: timeframe === tf.key ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, transition: 'all 0.2s ease' }}>{tf.label}</button>
                ))}
              </div>
              <button onClick={() => activeRouteHandler('reports')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)', color: '#fff', fontSize: 'var(--font-size-sm)', fontWeight: 700, fontFamily: 'inherit' }}>
                📥 Export Reports
              </button>
            </div>
          </div>

          {/* KPI bar */}
          <div style={{ position: 'relative', zIndex: 10, marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Total Products',   value: totalProducts,  icon: '📦', color: '#60a5fa', bg: 'rgba(59,130,246,0.2)' },
              { label: 'Active Customers', value: totalCustomers, icon: '👥', color: '#c084fc', bg: 'rgba(168,85,247,0.2)' },
              { label: 'Suppliers',        value: totalSuppliers, icon: '🏭', color: '#34d399', bg: 'rgba(52,211,153,0.2)' },
              { label: 'Low Stock Items',  value: lowStockCount,  icon: '⚠️', color: lowStockCount > 0 ? '#fbbf24' : '#34d399', bg: lowStockCount > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)' },
              { label: 'Cash & Bank',      value: `BDT ${cashAndBankBalance.toLocaleString()}`, icon: '💼', color: '#a855f7', bg: 'rgba(168,85,247,0.2)' },
            ].map((s, i) => <KpiCard key={i} {...s} rawValue={s.value} loading={loading} />)}
          </div>

          {/* Live Ticker Strip */}
          {!loading && (
            <div style={{ position: 'relative', zIndex: 10, marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div className="animate-ticker" style={{ display: 'flex', gap: '2.5rem', width: 'max-content' }}>
                {[...Array(3)].flatMap(() => [
                  { label: 'Inventory Value', value: `BDT ${inventoryValue.toLocaleString()}`, color: '#34d399' },
                  { label: 'Cash & Bank', value: `BDT ${cashAndBankBalance.toLocaleString()}`, color: '#c084fc' },
                  { label: 'Products', value: totalProducts, color: '#60a5fa' },
                  { label: 'Customers', value: totalCustomers, color: '#c084fc' },
                  { label: 'Suppliers', value: totalSuppliers, color: '#fb923c' },
                  { label: 'Low Stock', value: lowStockCount, color: '#fbbf24' },
                  { label: 'Receivables', value: `BDT ${totalReceivables.toLocaleString()}`, color: '#22d3ee' },
                  { label: 'Journal Entries', value: journalEntries.length, color: '#a78bfa' },
                ]).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</span>
                    <span style={{ fontSize: '0.75rem', color: item.color, fontWeight: 800 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BUSINESS PULSE */}
      <div style={stagger(1)}>
        <SectionHeader icon="📈" label="Business Pulse" gradient="linear-gradient(135deg, #059669 0%, #0891b2 100%)" action="View Reports →" onAction={() => activeRouteHandler('reports')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <PulseCard label="Sales This Month" value={`BDT ${salesThisMonth.toLocaleString()}`} icon="🧾" color="#a78bfa" trend={salesThisMonth > 0 ? 12 : 0} trendLabel="vs last month" sparkData={salesSparkData} onClick={() => activeRouteHandler('sales')} loading={loading} />
          <PulseCard label="Purchases This Month" value={`BDT ${purchasesThisMonth.toLocaleString()}`} icon="🛒" color="#34d399" trend={purchasesThisMonth > 0 ? -5 : 0} trendLabel="vs last month" sparkData={purchasesSparkData} onClick={() => activeRouteHandler('purchases')} loading={loading} />
          <PulseCard label="Total Receivables" value={`BDT ${totalReceivables.toLocaleString()}`} icon="💵" color="#60a5fa" trend={totalReceivables > 0 ? 8 : 0} trendLabel="outstanding" sparkData={null} onClick={() => activeRouteHandler('ledgers')} loading={loading} />
          <PulseCard label="Total Payables" value={`BDT ${totalPayables.toLocaleString()}`} icon="💳" color="#fb923c" trend={totalPayables > 0 ? -3 : 0} trendLabel="outstanding" sparkData={null} onClick={() => activeRouteHandler('ledgers')} loading={loading} />
        </div>
      </div>

      {/* QUICK ACCESS */}
      <div style={stagger(2)}>
        <SectionHeader icon="⚡" label="Quick Access Shortcuts" gradient="linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.75rem' }}>
          {quickActions.map((action, i) => <QuickCard key={i} {...action} />)}
        </div>
      </div>


      {/* ALERTS & ACTIVITY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', ...stagger(3) }}>

        {/* Low Stock Panel */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ Critical Low Stock
                {lowStockCount > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', animation: 'pulse-badge 2s ease-in-out infinite' }}>{lowStockCount} items</span>}
              </h3>
              <button onClick={() => activeRouteHandler('purchases')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: 'var(--font-size-xs)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Order All →</button>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: 0 }}>Items below minimum safety margins requiring immediate procurement.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {loading ? [1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 52, width: '100%', borderRadius: 10 }} />) :
              lowStockItems.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', background: 'var(--bg-tertiary)', borderRadius: 14 }}>✅ All inventory items exceed safety stock margins.</div>
              ) : lowStockItems.map(p => {
                const ratio = Math.max(0, Math.min(100, (p.qty / (p.minStock || 5)) * 100));
                const isCritical = p.qty === 0;
                const isLow = p.qty <= Math.ceil((p.minStock || 5) * 0.3);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0.75rem', borderRadius: 12, background: isCritical ? 'rgba(239,68,68,0.06)' : isLow ? 'rgba(251,191,36,0.05)' : 'var(--bg-tertiary)', border: `1px solid ${isCritical ? 'rgba(239,68,68,0.15)' : isLow ? 'rgba(251,191,36,0.12)' : 'var(--border-color)'}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isCritical ? '#ef4444' : '#f59e0b', boxShadow: isCritical ? '0 0 8px #ef4444' : '0 0 6px #f59e0b', animation: isCritical ? 'ping-dot 1.5s ease-in-out infinite' : 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{p.name}</span>
                        <code style={{ fontSize: '0.62rem', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 4, color: 'var(--accent-color)', fontWeight: 700 }}>{p.sku}</code>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <div style={{ height: 4, width: 60, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', width: `${ratio}%`, background: isCritical ? '#ef4444' : ratio <= 40 ? '#f59e0b' : '#34d399', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{isCritical ? '🚨 Out of stock' : `${p.qty} / ${p.minStock || 5} ${p.unit || ''}`}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { localStorage.setItem('purchase_open_pr_modal', 'true'); activeRouteHandler('purchases'); }}
                      style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 8, border: `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, background: isCritical ? 'rgba(239,68,68,0.15)' : 'var(--bg-tertiary)', color: isCritical ? '#f87171' : 'var(--text-muted)', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = 'var(--accent-color)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isCritical ? 'rgba(239,68,68,0.15)' : 'var(--bg-tertiary)'; e.currentTarget.style.color = isCritical ? '#f87171' : 'var(--text-muted)'; }}
                    >{isCritical ? '⚡ Rush PO' : '🛒 Order PO'}</button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                🔍 Activity Feed
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', animation: 'ping-dot 2s ease-in-out infinite', display: 'inline-block' }} />
                  <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700 }}>LIVE</span>
                </span>
              </h3>
              <button onClick={() => activeRouteHandler('audit')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: 'var(--font-size-xs)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>View All →</button>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: 0 }}>Real-time database operations log audit trail.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 1, background: 'linear-gradient(to bottom, var(--border-color) 0%, transparent 100%)', pointerEvents: 'none' }} />
            {loading ? [1,2,3,4].map(n => <div key={n} className="skeleton" style={{ height: 44, width: '100%', borderRadius: 8, marginBottom: 8 }} />) :
              activities.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', background: 'var(--bg-tertiary)', borderRadius: 14 }}>📝 No recent activity log entries found.</div>
              ) : activities.map((log, logIdx) => {
                const astyle = getActionStyle(log.action);
                return (
                  <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 'var(--font-size-sm)', padding: '0.5rem 0', borderBottom: logIdx < activities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', position: 'relative' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: astyle.bg, border: `1px solid ${astyle.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0, position: 'relative', zIndex: 1 }}>{astyle.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: 20, background: astyle.bg, color: astyle.color, border: `1px solid ${astyle.color}25`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{log.action || 'event'}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>by <strong style={{ color: 'var(--text-secondary)' }}>{log.userName}</strong></span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{log.time?.substring(0, 5)}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description}</div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>

      {/* INVENTORY SUMMARY */}
      <div style={stagger(4)}>
        <SectionHeader icon="📦" label="Complete Stock Register" gradient="linear-gradient(135deg, #0891b2 0%, #2563eb 100%)" action="View All →" onAction={() => activeRouteHandler('inventory')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total SKUs',       value: totalProducts,  suffix: 'products',  grad: 'linear-gradient(135deg,#2563eb,#4f46e5)', icon: '📦', spark: [3,5,4,7,totalProducts,totalProducts] },
            { label: 'Inventory Value',  value: `BDT ${inventoryValue.toLocaleString()}`, suffix: 'AVCO cost', grad: 'linear-gradient(135deg,#059669,#0891b2)', icon: '💰', spark: [inventoryValue*0.6, inventoryValue*0.75, inventoryValue*0.85, inventoryValue*0.9, inventoryValue, inventoryValue] },
            { label: 'Low Stock Alerts', value: lowStockCount,  suffix: 'items low', grad: lowStockCount > 0 ? 'linear-gradient(135deg,#d97706,#ea580c)' : 'linear-gradient(135deg,#15803d,#059669)', icon: lowStockCount > 0 ? '⚠️' : '✅', spark: null },
            { label: 'Total Customers',  value: totalCustomers, suffix: 'active',    grad: 'linear-gradient(135deg,#7c3aed,#a855f7)', icon: '👥', spark: [1,2,2,3,totalCustomers,totalCustomers] },
          ].map((s, i) => (
            <div key={i} style={{ background: s.grad, borderRadius: 22, padding: '1.35rem', boxShadow: '0 6px 24px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden', transition: 'transform 0.25s, box-shadow 0.25s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.28)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.18)'; }}>
              <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(18px)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                  {loading ? <div className="skeleton" style={{ height: 24, width: '60%', margin: '4px 0', background: 'rgba(255,255,255,0.25)' }} /> : <div style={{ color: '#fff', fontWeight: 900, fontSize: 'var(--font-size-xl)', lineHeight: 1 }}>{s.value}</div>}
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.suffix}</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
                </div>
                {s.spark && s.spark.length > 1 && <Sparkline data={s.spark} color="rgba(255,255,255,0.7)" width={70} height={36} />}
              </div>
            </div>
          ))}
        </div>

        {loading ? <div className="skeleton" style={{ height: 280, width: '100%', borderRadius: 16 }} /> :
          products.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 18, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📋 Stock Register
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontWeight: 700, border: '1px solid var(--border-color)' }}>{products.length} SKUs</span>
                </span>
                <button onClick={() => activeRouteHandler('inventory')} style={{ background: 'var(--accent-light)', border: 'none', borderRadius: 8, padding: '0.35rem 0.85rem', color: 'var(--accent-color)', fontSize: 'var(--font-size-sm)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>View All →</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                      {['SKU', 'Product Name', 'Category', 'Stock Level', 'Unit Cost', 'Stock Value', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 700, fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.slice(0, 10).map((p, i) => {
                      const isLow = p.qty <= (p.minStock || 5);
                      const isCritical = p.qty === 0;
                      const stockRatio = Math.max(0, Math.min(100, (p.qty / (p.minStock || 5)) * 100));
                      return (
                        <tr key={p.id} style={{ borderTop: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-color)', fontWeight: 700, fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>{p.sku}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                            {p.category ? <span style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--bg-tertiary)', fontSize: 'var(--font-size-xs)', fontWeight: 600, border: '1px solid var(--border-color)' }}>{p.category}</span> : '—'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 48, height: 5, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ height: '100%', width: `${stockRatio}%`, background: isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#34d399', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontWeight: 700, color: isCritical ? '#ef4444' : isLow ? '#f59e0b' : 'var(--text-primary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{p.qty} {p.unit}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>BDT {Number(p.price || 0).toLocaleString()}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--success)' }}>BDT {((p.qty || 0) * (p.price || 0)).toLocaleString()}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 'var(--font-size-xs)', fontWeight: 700, background: isCritical ? 'rgba(239,68,68,0.12)' : isLow ? 'var(--warning-light)' : 'var(--success-light)', color: isCritical ? '#f87171' : isLow ? 'var(--warning)' : 'var(--success)' }}>
                              {isCritical ? '🚨 Critical' : isLow ? '⚠ Low' : '✓ OK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes aurora { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes rainbow-slide { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.08); } }
        @keyframes float-slow { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
        @keyframes skeleton-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.35; } }
        @keyframes dropdown-in { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes ping-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes pulse-badge { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes modal-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-slide-up { from { opacity: 0; transform: translateY(40px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-ticker { animation: ticker-scroll 32s linear infinite; will-change: transform; }
        .animate-ticker:hover { animation-play-state: paused; }
        .skeleton { background: rgba(255,255,255,0.08); animation: skeleton-pulse 1.5s ease-in-out infinite; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
      `}</style>
    </div>
  );
}

