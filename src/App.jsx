import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { initialProducts, initialSuppliers } from './utils/mockData';
import { defaultCustomers, defaultCategories, seedFirestoreData } from './database/seedData';
import { authService } from './services/authService';
import { accountingService } from './services/accountingService';
import { inventoryService } from './services/inventoryService';
import { auditService } from './services/auditService';
import { salesService } from './services/salesService';
import { purchaseService } from './services/purchaseService';
import {
  findExactDuplicate,
  findNamePhoneDuplicate,
  skuDuplicateMessage,
  productNameWarning,
  customerDuplicateMessage,
  supplierDuplicateMessage,
} from './utils/duplicateChecker';

// Views
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import InventoryView from './views/InventoryView';
import PurchaseView from './views/PurchaseView';
import SalesView from './views/SalesView';
import LedgerView from './views/LedgerView';
import AccountingView from './views/AccountingView';
import ReportsView from './views/ReportsView';
import VoucherView from './views/VoucherView';
import AuditLogView from './views/AuditLogView';
import SettingsView from './views/SettingsView';
import ProcurementPlanningView from './views/ProcurementPlanningView';
import LCAccountingView from './views/LCAccountingView';
import CRMView from './views/CRMView';
import ServiceView from './views/ServiceView';
import TaskManagementView from './views/TaskManagementView';
import TemplateView from './views/TemplateView';
import ProfileView from './views/ProfileView';
import DMSView from './views/DMSView';
import { GoogleDriveProvider } from './context/GoogleDriveContext';

/* ── NAV ITEMS ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',     icon: '📊', permission: null },
  { id: 'inventory',    label: 'Inventory',      icon: '📦', permission: null },
  { id: 'service',      label: 'Service Desk',   icon: '🛠️', permission: null },
  { id: 'dms',          label: 'Service Desk DMS', icon: '📂', permission: null },
  { id: 'task_management', label: 'Operations Board', icon: '📋', permission: null },
  { id: 'procurement',  label: 'Procurement Plan', icon: '📋', permission: null },
  { id: 'purchases',    label: 'Purchases',      icon: '🛒', permission: null },
  { id: 'sales',        label: 'Sales',          icon: '🧾', permission: null },
  { id: 'crm',          label: 'CRM Portal',     icon: '🤝', permission: null },
  { id: 'ledgers',      label: 'Ledgers',        icon: '👥', permission: null },
  { id: 'vouchers',     label: 'Vouchers',       icon: '📝', permission: null },
  { id: 'accounting',   label: 'General Book',   icon: '⚖️', permission: 'accounting:read' },
  { id: 'lc_accounting', label: 'LC Accounting',  icon: '🚢', permission: 'accounting:read' },
  { id: 'reports',      label: 'Financials',     icon: '📈', permission: 'reports:read' },
  { id: 'audit',        label: 'Audit Logs',     icon: '🔍', permission: 'audit:read' },
  { id: 'template',     label: 'Template',       icon: '📋', permission: null },
  { id: 'settings',     label: 'Settings',       icon: '⚙️', permission: 'settings:read' },
];

/* ── SIDEBAR ICON HELPER ────────────────────────────────────── */
const SidebarIcon = ({ id, color, active, size = 18 }) => {
  const strokeColor = active ? '#ffffff' : color;
  const fillColor = 'none';

  switch (id) {
    case 'dashboard':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'inventory':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      );
    case 'service':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case 'dms':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="8" rx="2" />
          <rect x="2" y="13" width="20" height="8" rx="2" />
          <line x1="6" y1="7" x2="6.01" y2="7" />
          <line x1="6" y1="17" x2="6.01" y2="17" />
          <line x1="14" y1="7" x2="14.01" y2="7" />
          <line x1="14" y1="17" x2="14.01" y2="17" />
        </svg>
      );
    case 'purchases':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case 'sales':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="9" y1="22" x2="9" y2="16" />
          <line x1="9" y1="16" x2="15" y2="16" />
          <line x1="15" y1="16" x2="15" y2="22" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="16" y2="11" />
        </svg>
      );
    case 'ledgers':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'vouchers':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="7" y1="15" x2="12" y2="15" />
        </svg>
      );
    case 'accounting':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="6" x2="12" y2="18" />
          <line x1="10" y1="8" x2="14" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="10" y1="16" x2="14" y2="16" />
        </svg>
      );
    case 'reports':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'audit':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'template':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'settings':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'task_management':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="15" y2="16" />
          <polyline points="9 8 10 8 12 8" />
        </svg>
      );
    case 'procurement':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="15" y2="16" />
          <polyline points="9 8 10 8 12 8" />
        </svg>
      );
    case 'lc_accounting':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z" />
          <path d="M12 6v12M8 10h8M12 6l-4 4M12 6l4 4" />
        </svg>
      );
    case 'crm':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <line x1="16" y1="11" x2="22" y2="11" />
          <line x1="19" y1="8" x2="19" y2="14" />
        </svg>
      );

    default:
      return null;
  }
};

/* ── SIDEBAR ────────────────────────────────────────────────── */
function Sidebar({ currentRoute, setCurrentRoute, currentUser, onLogout, collapsed, setCollapsed, isMobile, mobileOpen, onCloseMobile }) {
  const asideLeft = isMobile ? (mobileOpen ? 0 : -220) : 0;
  const asideWidth = isMobile ? 220 : (collapsed ? 68 : 220);

  const ICON_COLORS = {
    dashboard: '#3b82f6',   // Blue
    inventory: '#06b6d4',   // Cyan
    service: '#10b981',     // Emerald
    dms: '#3b82f6',         // Blue
    purchases: '#f97316',   // Orange
    sales: '#22c55e',       // Green
    crm: '#6366f1',         // Indigo
    ledgers: '#a855f7',     // Purple
    vouchers: '#ec4899',    // Pink
    accounting: '#ef4444',  // Red
    lc_accounting: '#10b981', // Emerald
    reports: '#3b82f6',     // Light Blue
    audit: '#eab308',       // Yellow
    template: '#ec4899',    // Pink
    settings: '#94a3b8',    // Slate Gray
    procurement: '#f43f5e', // Rose
  };

  return (
    <aside className="app-sidebar" style={{
      width: asideWidth,
      left: asideLeft,
    }}>
      {/* Brand */}
      <div style={{
        padding: (collapsed && !isMobile) ? '1.25rem 0' : '1.25rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        cursor: 'pointer',
        justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
        position: 'relative',
      }} onClick={() => { if (!isMobile) setCollapsed(c => !c); }}>
        {(collapsed && !isMobile) ? (
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <img src="/logo.png" alt="A" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              <img src="/logo.png" alt="A" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>ERP for EL</div>
              <div style={{ color: '#818cf8', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginTop: '2px' }}>ERP Platform</div>
            </div>
          </div>
        )}
        {isMobile && mobileOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseMobile();
            }}
            style={{
              position: 'absolute',
              right: '1.25rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.45)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'}
          >
            ✕
          </button>
        )}
      </div>

      {/* Label */}
      {(!collapsed || isMobile) && (
        <div style={{ padding: '1rem 1.25rem 0.4rem', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
          Main Menu
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, padding: (collapsed && !isMobile) ? '0.5rem 0' : '0.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          if (item.permission && !authService.hasPermission(currentUser, item.permission)) return null;
          if (item.isDivider) {
            return (collapsed && !isMobile) ? null : (
              <div key={item.id} style={{ padding: '1rem 0.5rem 0.3rem', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '0.5rem' }}>
                {item.label}
              </div>
            );
          }
          const active = currentRoute === item.id;
          const hasChevron = ['inventory', 'purchases', 'sales', 'ledgers', 'accounting', 'reports', 'settings'].includes(item.id);
          const isSubItem = item.isHRSub === true;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentRoute(item.id);
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                let path = item.id;
                if (item.id === 'reports') path = 'financials';
                else if (item.id === 'dashboard') path = '';
                window.open('/' + path, '_blank');
              }}
              title={(collapsed && !isMobile) ? item.label : ''}
              style={{
                display: 'flex', alignItems: 'center',
                gap: (collapsed && !isMobile) ? 0 : '0.6rem',
                padding: (collapsed && !isMobile)
                  ? '0.65rem 0'
                  : isSubItem
                    ? '0.5rem 0.75rem 0.5rem 2rem'
                    : '0.65rem 0.85rem',
                justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active
                  ? isSubItem
                    ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : 'transparent',
                color: active ? '#ffffff' : isSubItem ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.6)',
                fontFamily: 'inherit',
                fontSize: isSubItem ? '0.8rem' : '0.85rem',
                fontWeight: active ? 700 : isSubItem ? 400 : 500,
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                width: '100%',
                marginTop: isSubItem ? '1px' : 0,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = isSubItem ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = isSubItem ? 'rgba(165,180,252,0.9)' : 'rgba(255,255,255,0.85)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isSubItem ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.6)'; } }}
            >
              {(!collapsed || isMobile) && isSubItem && (
                <span style={{ position: 'absolute', left: '0.85rem', color: active ? 'rgba(165,180,252,0.7)' : 'rgba(255,255,255,0.18)', fontSize: '0.6rem', pointerEvents: 'none' }}>└</span>
              )}
              <span style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0, 
                marginRight: (collapsed && !isMobile) ? 0 : '0.35rem',
              }}>
                <SidebarIcon id={item.id} color={ICON_COLORS[item.id] || '#ffffff'} active={active} size={isSubItem ? 15 : 18} />
              </span>
              {(!collapsed || isMobile) && <span>{item.label}</span>}
              {(!collapsed || isMobile) && hasChevron && (
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', opacity: 0.5, color: active ? '#fff' : 'rgba(255,255,255,0.3)' }}>⌄</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile + Logout */}
      <div style={{ padding: (collapsed && !isMobile) ? '0.75rem 0' : '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {(!collapsed || isMobile) ? (
          <div 
            onClick={() => setCurrentRoute('profile')}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              padding: '0.65rem',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                border: '1.5px solid rgba(255,255,255,0.1)'
              }}>{(currentUser.displayName || 'U').charAt(0).toUpperCase()}</div>
              {/* Online status green dot */}
              <span style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #0f172a'
              }} />
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.displayName}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontWeight: 600, textTransform: 'capitalize' }}>{currentUser.role}</div>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setCurrentRoute('profile')}
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              position: 'relative', 
              marginBottom: '0.75rem',
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              border: '1.5px solid rgba(255,255,255,0.1)'
            }}>{(currentUser.displayName || 'U').charAt(0).toUpperCase()}</div>
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 12,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #0f172a'
            }} />
          </div>
        )}
        <button
          onClick={onLogout}
          title="Log Out"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
            gap: '0.5rem', padding: (collapsed && !isMobile) ? '0.65rem 0' : '0.55rem 0.75rem',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
            fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#fca5a5'; }}
        >
          <span>🚪</span>
          {(!collapsed || isMobile) && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}

/* ── TOP HEADER ─────────────────────────────────────────────── */
function TopHeader({ currentRoute, currentUser, sidebarWidth, theme, onToggleTheme, isMobile, onToggleMobileSidebar, onProfileClick, setCurrentRoute, products, customers, suppliers }) {
  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const routeLabel = NAV_ITEMS.find(n => n.id === currentRoute)?.label || 'Dashboard';

  // Filter modules/pages
  const matchedPages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return NAV_ITEMS.filter(item => {
      if (item.permission) {
        const [mod, act] = item.permission.split(':');
        if (!authService.can(currentUser, mod, act || 'read')) return false;
      }
      return item.label.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, currentUser]);

  // Filter products
  const matchedProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const hasAccess = authService.can(currentUser, 'inventory', 'read');
    if (!hasAccess) return [];
    return (products || []).filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [searchQuery, products, currentUser]);

  // Filter customers
  const matchedCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const hasAccess = authService.can(currentUser, 'sales', 'read');
    if (!hasAccess) return [];
    return (customers || []).filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 5);
  }, [searchQuery, customers, currentUser]);

  // Filter suppliers
  const matchedSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const hasAccess = authService.can(currentUser, 'purchases', 'read');
    if (!hasAccess) return [];
    return (suppliers || []).filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery)) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 5);
  }, [searchQuery, suppliers, currentUser]);

  const hasAnyResults = matchedPages.length > 0 || matchedProducts.length > 0 || matchedCustomers.length > 0 || matchedSuppliers.length > 0;

  const handlePageClick = (id) => {
    setCurrentRoute(id);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleProductClick = () => {
    setCurrentRoute('inventory');
    setSearchQuery('');
    setShowResults(false);
  };

  const handleCustomerClick = () => {
    setCurrentRoute('sales');
    setSearchQuery('');
    setShowResults(false);
  };

  const handleSupplierClick = () => {
    setCurrentRoute('purchases');
    setSearchQuery('');
    setShowResults(false);
  };

  const resultItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.45rem 0.6rem',
    borderRadius: 8,
    border: 'none',
    background: 'none',
    textAlign: 'left',
    fontSize: '0.76rem',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'background 0.15s ease',
  };

  return (
    <header style={{
      position: 'fixed', top: 0, left: isMobile ? 0 : sidebarWidth, right: 0,
      height: 60, zIndex: 150,
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem',
      transition: 'left 0.25s ease',
      boxShadow: '0 1px 12px rgba(15,23,42,0.06)',
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {isMobile && (
          <button
            onClick={onToggleMobileSidebar}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '0.25rem',
            }}
          >
            ☰
          </button>
        )}
        <span>Home</span>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{routeLabel}</span>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1.25rem' }}>
        {/* Search box */}
        {!isMobile && (
          <div ref={searchRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none' }}>🔍</span>
            <input
              ref={searchInputRef}
              type="text" placeholder="Global search..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              style={{
                padding: '0.45rem 1rem 0.45rem 2.2rem',
                borderRadius: 20, border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)', fontSize: '0.82rem',
                outline: 'none', width: showResults && searchQuery ? 230 : 180,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-light)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            {(!searchQuery) && <span style={{ position: 'absolute', right: 10, fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', pointerEvents: 'none' }}>Ctrl+E</span>}

            {showResults && searchQuery.trim() && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: 340,
                maxHeight: 380,
                overflowY: 'auto',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-lg)',
                zIndex: 1000,
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}>
                {!hasAnyResults ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    No accessible matching records found.
                  </div>
                ) : (
                  <>
                    {matchedPages.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0.2rem 0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>📁 PAGES & MODULES</div>
                        {matchedPages.map(p => (
                          <button key={p.id} onClick={() => handlePageClick(p.id)} style={resultItemStyle}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <span>{p.icon}</span>
                            <span style={{ fontWeight: 600 }}>{p.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {matchedProducts.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0.2rem 0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>📦 PRODUCTS IN STOCK</div>
                        {matchedProducts.map(p => (
                          <button key={p.id} onClick={handleProductClick} style={resultItemStyle}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> (SKU: {p.sku})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {matchedCustomers.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0.2rem 0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>👥 ACTIVE CUSTOMERS</div>
                        {matchedCustomers.map(c => (
                          <button key={c.id} onClick={handleCustomerClick} style={resultItemStyle}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                            {c.phone && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> · {c.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {matchedSuppliers.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0.2rem 0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>🏭 SYSTEM SUPPLIERS</div>
                        {matchedSuppliers.map(s => (
                          <button key={s.id} onClick={handleSupplierClick} style={resultItemStyle}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                            {s.phone && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> · {s.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clock */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <span>🕐</span>
            <span style={{ fontFamily: 'monospace' }}>{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          </div>
        )}

        {/* Dark / Light Mode Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: theme === 'dark' ? 'rgba(59,130,246,0.15)' : 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '1rem',
            transition: 'all 0.2s ease',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.transform = 'rotate(20deg) scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications bell */}
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 4, fontSize: '1.1rem' }} title="Notifications">
          🔔
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 8, height: 8, borderRadius: '50%',
            background: '#ef4444', border: '1px solid #fff',
            display: 'block',
          }} />
        </button>

        {/* User avatar */}
        <div 
          onClick={onProfileClick}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: isMobile ? '0.2rem' : '0.3rem 0.75rem 0.3rem 0.3rem', borderRadius: 24, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
          }}>{(currentUser?.displayName || 'U').charAt(0).toUpperCase()}</div>
          {!isMobile && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.displayName?.split(' ')[0] || 'User'}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>{currentUser?.role || 'Staff'}</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── MOBILE BOTTOM NAVIGATION DOCK ────────────────────────────── */
function MobileBottomNav({ currentRoute, setCurrentRoute, onOpenMenu }) {
  const dockItems = [
    { id: 'dashboard', label: 'Home', icon: '📊' },
    { id: 'sales', label: 'Sales', icon: '🧾' },
    { id: 'inventory', label: 'Stock', icon: '📦' },
    { id: 'purchases', label: 'Buy', icon: '🛒' },
    { id: 'crm', label: 'CRM', icon: '🤝' },
  ];

  return (
    <nav className="mobile-bottom-dock">
      {dockItems.map(item => {
        const active = currentRoute === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentRoute(item.id)}
            className={`mobile-dock-btn ${active ? 'active' : ''}`}
          >
            <span className="dock-icon">{item.icon}</span>
            <span className="dock-label">{item.label}</span>
          </button>
        );
      })}
      <button onClick={onOpenMenu} className="mobile-dock-btn">
        <span className="dock-icon">☰</span>
        <span className="dock-label">Menu</span>
      </button>
    </nav>
  );
}

/* ── APP ─────────────────────────────────────────────────────── */
function App() {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [currentRoute, setCurrentRoute] = useState(() => {
    const path = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
    if (!path) return 'dashboard';
    if (path === 'financials') return 'reports';
    const validRoutes = ['dashboard', 'inventory', 'service', 'dms', 'task_management', 'purchases', 'sales', 'crm', 'ledgers', 'vouchers', 'accounting', 'lc_accounting', 'reports', 'audit', 'template', 'settings', 'procurement', 'profile'];
    return validRoutes.includes(path) ? path : 'dashboard';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen to authentication changes
  useEffect(() => {
    const handleAuthChange = (e) => {
      setCurrentUser(e.detail);
    };
    window.addEventListener('mock_auth_change', handleAuthChange);
    return () => window.removeEventListener('mock_auth_change', handleAuthChange);
  }, []);

  // Google login request expiration checker
  useEffect(() => {
    const checkExpiry = () => {
      const loggedOut = authService.checkGoogleRequestExpiry();
      if (loggedOut) {
        setCurrentUser(null);
        showToast('Your pending Google registration request expired and you were signed out.', 'danger');
      }
    };
    
    checkExpiry();
    const interval = setInterval(checkExpiry, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Update browser URL and tab title when route changes
  useEffect(() => {
    let path = currentRoute;
    if (currentRoute === 'reports') path = 'financials';
    else if (currentRoute === 'dashboard') path = '';

    const currentPath = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
    if (currentPath !== path.toLowerCase()) {
      window.history.pushState(null, '', '/' + path);
    }

    const routeTitles = {
      dashboard: 'Dashboard',
      inventory: 'Inventory',
      service: 'Service Desk',
      purchases: 'Purchases',
      sales: 'Sales',
      ledgers: 'Ledgers',
      vouchers: 'Vouchers',
      accounting: 'General Book',
      reports: 'Financials',
      audit: 'Audit Logs',
      template: 'Template',
      settings: 'Settings',
      procurement: 'Procurement Plan',
      profile: 'User Profile',
    };
    const title = routeTitles[currentRoute] || 'Dashboard';
    document.title = `ERP for EL - ${title}`;
  }, [currentRoute]);

  // Handle popstate (browser back/forward button clicks)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
      let route = 'dashboard';
      if (path === 'financials') route = 'reports';
      else {
        const validRoutes = ['dashboard', 'inventory', 'service', 'dms', 'task_management', 'purchases', 'sales', 'crm', 'ledgers', 'vouchers', 'accounting', 'lc_accounting', 'reports', 'audit', 'template', 'settings', 'procurement', 'profile'];
        if (validRoutes.includes(path)) route = path;
      }
      setCurrentRoute(route);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 68 : 220);

  const [products, setProducts] = useState(() => {
    const local = localStorage.getItem('erp_products');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.length > 0 && parsed.some(p => p.id && p.id.startsWith('SRV-'))) {
        localStorage.setItem('erp_products', JSON.stringify(initialProducts));
        return initialProducts;
      }
      return parsed;
    }
    localStorage.setItem('erp_products', JSON.stringify(initialProducts));
    return initialProducts;
  });

  const [suppliers, setSuppliers] = useState(() => {
    const local = localStorage.getItem('erp_suppliers');
    if (local) return JSON.parse(local);
    localStorage.setItem('erp_suppliers', JSON.stringify(initialSuppliers));
    return initialSuppliers;
  });

  const [customers, setCustomers] = useState(() => {
    const local = localStorage.getItem('erp_customers');
    if (local) return JSON.parse(local);
    localStorage.setItem('erp_customers', JSON.stringify(defaultCustomers));
    return defaultCustomers;
  });

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  };
  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id));



  const loadERPData = () => {
    const lp = localStorage.getItem('erp_products');
    if (lp) {
      const parsed = JSON.parse(lp);
      if (parsed.length > 0 && parsed.some(p => p.id && p.id.startsWith('SRV-'))) {
        setProducts(initialProducts);
        localStorage.setItem('erp_products', JSON.stringify(initialProducts));
      } else {
        setProducts(parsed);
      }
    } else {
      setProducts(initialProducts);
    }
    const ls = localStorage.getItem('erp_suppliers');
    setSuppliers(ls ? JSON.parse(ls) : initialSuppliers);
    const lc = localStorage.getItem('erp_customers');
    setCustomers(lc ? JSON.parse(lc) : defaultCustomers);
  };

  const [theme, setTheme] = useState(() => localStorage.getItem('erp_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('erp_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchLatestData = async () => {
      try {
        const prodData = await inventoryService.getProducts();
        if (prodData) setProducts(prodData);
      } catch (err) {
        console.warn('Failed to load products from DB:', err.message);
      }
      
      try {
        const supData = await purchaseService.getSuppliers();
        if (supData) setSuppliers(supData);
      } catch (err) {
        console.warn('Failed to load suppliers from DB:', err.message);
      }

      try {
        const custData = await salesService.getCustomers();
        if (custData) setCustomers(custData);
      } catch (err) {
        console.warn('Failed to load customers from DB:', err.message);
      }
    };

    fetchLatestData();
  }, [currentUser]);

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    setCurrentRoute('dashboard');
    showToast(`Welcome back, ${user.displayName}! Access granted as ${user.role}.`);
    await auditService.logLogin(user);
    // Seed Firestore only after successful login (requires authentication)
    try { await seedFirestoreData(); } catch (err) { console.warn('Firestore seeding skipped:', err.message); }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await auditService.logLogout(currentUser);
    }
    await authService.logout();
    setCurrentUser(null);
    showToast('Signed out successfully.', 'warning');
  };

  const handleSaveProduct = async (productData, isEdit) => {
    const local = localStorage.getItem('erp_products');
    let productsList = local ? JSON.parse(local) : initialProducts;

    if (!isEdit) {
      // ── Layer 2: Duplicate guard ─────────────────────────────────────────
      // Hard block: duplicate SKU
      const skuDup = findExactDuplicate(productsList, 'sku', productData.sku);
      if (skuDup) {
        showToast(skuDuplicateMessage(skuDup), 'error');
        return;
      }

      // Soft warning: same product name — user must consciously correct it
      const nameDup = findExactDuplicate(productsList, 'name', productData.name);
      if (nameDup) {
        const proceed = window.confirm(
          productNameWarning(nameDup) +
          '\n\nClick OK only if these are genuinely different products. Cancel to go back and correct the name or SKU.'
        );
        if (!proceed) return;
      }
      // ────────────────────────────────────────────────────────────────────

      const costBasis = Number(productData.price);
      const qtyNum    = Number(productData.qty);
      const subtotal  = costBasis * qtyNum;

      productsList = [...productsList, productData];
      localStorage.setItem('erp_products', JSON.stringify(productsList));

      if (qtyNum > 0) {
        await inventoryService.purchaseStockIn(productData.id, null, qtyNum, costBasis, `INIT-${productData.sku}`);
        await accountingService.postJournalEntry({
          date: new Date().toISOString(),
          refNo: `INIT-${productData.sku}`,
          narration: `Initial inventory load: ${productData.name}`,
          lines: [
            { accountId: 'acc-1200', type: 'debit',  amount: subtotal },
            { accountId: 'acc-3010', type: 'credit', amount: subtotal },
          ],
          sourceModule: 'adjustment', sourceRefId: productData.id,
        });
      }
      showToast(`Registered "${productData.name}" and posted inventory asset balance.`);
      await auditService.logCreate(currentUser, 'inventory', productData.id, productData.sku, `Registered inventory item: ${productData.name} (SKU: ${productData.sku})`, productData);
    } else {
      const oldProduct = productsList.find(p => p.id === productData.id);
      productsList = productsList.map(p => p.id === productData.id ? { ...p, ...productData } : p);
      localStorage.setItem('erp_products', JSON.stringify(productsList));
      showToast(`Updated details for "${productData.name}".`);
      await auditService.logUpdate(currentUser, 'inventory', productData.id, productData.sku, `Updated inventory item: ${productData.name}`, oldProduct, productData);
    }
    loadERPData();
  };

  const handleDeleteProduct = async (productId) => {
    const match = products.find(p => p.id === productId);
    if (!match) return;
    const writtenOffValue = match.qty * match.price;
    const list = products.filter(p => p.id !== productId);
    localStorage.setItem('erp_products', JSON.stringify(list));
    if (writtenOffValue > 0) {
      await accountingService.postJournalEntry({
        date: new Date().toISOString(),
        refNo: `DEL-EXP-${Date.now().toString().slice(-6)}`,
        narration: `Write off ${match.qty} units of ${match.name}`,
        lines: [
          { accountId: 'acc-6080', type: 'debit',  amount: writtenOffValue },
          { accountId: 'acc-1200', type: 'credit', amount: writtenOffValue },
        ],
        sourceModule: 'adjustment', sourceRefId: productId,
      });
    }
    showToast(`Removed "${match.name}" and posted write-off entry.`, 'warning');
    await auditService.logDelete(currentUser, 'inventory', productId, match.sku, `Deleted inventory item: ${match.name}`, match);
    loadERPData();
  };

  const handleClearAllInventory = async () => {
    if (!window.confirm("WARNING: Are you sure you want to delete all products, stock movements, and reorders? This action is permanent and cannot be undone.")) {
      return;
    }
    
    // Clear Local Storage
    localStorage.setItem('erp_products', JSON.stringify([]));
    localStorage.setItem('erp_movements', JSON.stringify([]));
    localStorage.setItem('erp_reorder_requests', JSON.stringify([]));

    // Clear Firestore if active
    const { isFirebaseConfigured } = await import('./config/firebase');
    if (isFirebaseConfigured()) {
      try {
        const { deleteFromFirestore, fetchCollectionFromFirestore } = await import('./utils/hrmsFirebase');
        
        // Delete all products
        const productsList = await fetchCollectionFromFirestore('products');
        for (const p of productsList) {
          await deleteFromFirestore('products', p.id);
        }
        
        // Delete all stock movements
        const movementsList = await fetchCollectionFromFirestore('stock_movements');
        for (const m of movementsList) {
          await deleteFromFirestore('stock_movements', m.id);
        }
        
        // Delete all reorder requests
        const reorderList = await fetchCollectionFromFirestore('reorder_requests');
        for (const r of reorderList) {
          await deleteFromFirestore('reorder_requests', r.id);
        }
      } catch (err) {
        console.error('Failed to clear Firestore inventory data:', err);
      }
    }

    showToast('Cleared all inventory, movements, and requests.', 'warning');
    loadERPData();
  };

  const handleSaveCustomer = async (customerData, isEdit) => {
    if (!isEdit) {
      // ── Layer 2: Duplicate guard (name + phone combination) ──────────────
      const namePhoeDup = findNamePhoneDuplicate(customers, customerData.name, customerData.phone);
      if (namePhoeDup) {
        showToast(customerDuplicateMessage(namePhoeDup), 'error');
        alert(customerDuplicateMessage(namePhoeDup));
        return;
      }
      // ────────────────────────────────────────────────────────────────────
    }
    await salesService.saveCustomer(customerData, isEdit, currentUser);
    showToast(`${isEdit ? 'Updated' : 'Registered'} Customer: "${customerData.name}"`);
    loadERPData();
  };

  const handleDeleteCustomer = async (customerId) => {
    const match = customers.find(c => c.id === customerId);
    if (!match) return;
    await salesService.deleteCustomer(customerId, currentUser);
    showToast(`Removed Customer: "${match.name}"`, 'warning');
    loadERPData();
  };

  const handleSaveSupplier = async (supplierData, isEdit) => {
    if (!isEdit) {
      // ── Layer 2: Duplicate guard (name + phone combination) ──────────────
      const namePhoeDup = findNamePhoneDuplicate(suppliers, supplierData.name, supplierData.phone);
      if (namePhoeDup) {
        showToast(supplierDuplicateMessage(namePhoeDup), 'error');
        alert(supplierDuplicateMessage(namePhoeDup));
        return;
      }
      // ────────────────────────────────────────────────────────────────────
    }
    await purchaseService.saveSupplier(supplierData, isEdit, currentUser);
    showToast(`${isEdit ? 'Updated' : 'Registered'} Supplier: "${supplierData.name}"`);
    loadERPData();
  };

  const handleDeleteSupplier = async (supplierId) => {
    const match = suppliers.find(s => s.id === supplierId);
    if (!match) return;
    await purchaseService.deleteSupplier(supplierId, currentUser);
    showToast(`Removed Supplier: "${match.name}"`, 'warning');
    loadERPData();
  };

  const renderView = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardView products={products} customers={customers} suppliers={suppliers} currentUser={currentUser} activeRouteHandler={setCurrentRoute} isMobile={isMobile} />;
      case 'inventory':
        return <InventoryView products={products} categories={defaultCategories} suppliers={suppliers} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} onClearAllInventory={handleClearAllInventory} onRefresh={loadERPData} currentUser={currentUser} isMobile={isMobile} />;
      case 'service':
        return <ServiceView currentUser={currentUser} products={products} customers={customers} onRefresh={loadERPData} isMobile={isMobile} />;
      case 'dms':
        return <DMSView customers={customers} onSaveCustomer={handleSaveCustomer} currentUser={currentUser} isMobile={isMobile} />;
      case 'task_management':
        return <TaskManagementView currentUser={currentUser} isMobile={isMobile} />;
      case 'purchases':
        return <PurchaseView products={products} suppliers={suppliers} onRefresh={loadERPData} currentUser={currentUser} activeRouteHandler={setCurrentRoute} isMobile={isMobile} />;
      case 'sales':
        return <SalesView products={products} customers={customers} onRefresh={loadERPData} currentUser={currentUser} activeRouteHandler={setCurrentRoute} isMobile={isMobile} />;
      case 'crm':
        return <CRMView currentUser={currentUser} onRefresh={loadERPData} isMobile={isMobile} />;
      case 'ledgers':
        return (
          <LedgerView 
            customers={customers} 
            suppliers={suppliers} 
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onRefresh={loadERPData} 
            currentUser={currentUser}
            isMobile={isMobile}
          />
        );
      case 'vouchers':
        return <VoucherView currentUser={currentUser} onRefresh={loadERPData} isMobile={isMobile} />;
      case 'audit':
        return <AuditLogView currentUser={currentUser} isMobile={isMobile} />;
      case 'template':
        return <TemplateView currentUser={currentUser} isMobile={isMobile} />;
      case 'settings':
        return (
          <SettingsView
            currentUser={currentUser}
            isMobile={isMobile}
            products={products}
            customers={customers}
            suppliers={suppliers}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
            onSaveSupplier={handleSaveSupplier}
            onRefresh={loadERPData}
          />
        );
      case 'profile':
        return <ProfileView currentUser={currentUser} activeRouteHandler={setCurrentRoute} />;
      case 'procurement':
        return <ProcurementPlanningView currentUser={currentUser} products={products} onRefresh={loadERPData} />;
      case 'accounting':
        if (!authService.can(currentUser, 'accounting', 'read'))
          return <div style={{ padding: '2rem', textAlign: 'center' }}>🚫 Access Denied: Accounting module requires Accountant or Admin role.</div>;
        return <AccountingView currentUser={currentUser} />;
      case 'lc_accounting':
        if (!authService.can(currentUser, 'accounting', 'read'))
          return <div style={{ padding: '2rem', textAlign: 'center' }}>🚫 Access Denied: LC Accounting module requires Accountant or Admin role.</div>;
        return <LCAccountingView currentUser={currentUser} />;
      case 'reports':
        if (!authService.can(currentUser, 'reports', 'read'))
          return <div style={{ padding: '2rem', textAlign: 'center' }}>🚫 Access Denied: Reports module requires Accountant or Admin role.</div>;
        return <ReportsView currentUser={currentUser} />;
      default:
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Route not found</div>;
    }
  };



  if (!currentUser) {
    return (
      <div className="app-container" style={{ justifyContent: 'center' }}>
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <GoogleDriveProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Backdrop for mobile */}
      {isMobile && mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 240,
          }}
        />
      )}
      {/* Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        setCurrentRoute={setCurrentRoute}
        currentUser={currentUser}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main content area */}
      <div style={{
        marginLeft: isMobile ? 0 : sidebarWidth,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.25s ease',
        minWidth: 0,
      }}>
        {/* Top header */}
        <TopHeader
          currentRoute={currentRoute}
          currentUser={currentUser}
          sidebarWidth={sidebarWidth}
          theme={theme}
          onToggleTheme={toggleTheme}
          isMobile={isMobile}
          onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
          onProfileClick={() => setCurrentRoute('profile')}
          setCurrentRoute={setCurrentRoute}
          products={products}
          customers={customers}
          suppliers={suppliers}
        />

        {/* Page content */}
        <main style={{
          marginTop: 60,
          padding: isMobile ? '1rem' : '2rem',
          flex: 1,
          maxWidth: '100%',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {renderView()}
        </main>
      </div>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
          </div>
        ))}
      </div>

      {/* Mobile Bottom Dock Navigation */}
      {isMobile && (
        <MobileBottomNav
          currentRoute={currentRoute}
          setCurrentRoute={setCurrentRoute}
          onOpenMenu={() => setMobileSidebarOpen(true)}
        />
      )}
      </div>
    </GoogleDriveProvider>
  );
}

export default App;
