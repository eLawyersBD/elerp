/**
 * Meta Pixel & Google Tag Manager Utility for Trade License Registration Landing Page
 * Full support for Meta Standard Events, Custom Events, DataLayer Pushes, Event Deduplication (event_id),
 * Advanced Matching, CAPI readiness (fbp/fbc/hashed data), and engagement listeners.
 */

export interface MetaUserData {
  em?: string; // email
  ph?: string; // phone
  fn?: string; // first name
  ln?: string; // last name
  external_id?: string;
  client_ip?: string;
  user_agent?: string;
}

export interface PixelEventPayload {
  event_id?: string;
  page_name?: string;
  page_type?: string;
  service_name?: string;
  button_name?: string;
  form_name?: string;
  event_category?: string;
  event_action?: string;
  event_label?: string;
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  [key: string]: any;
}

export interface TrackedEventLog {
  id: string;
  timestamp: string;
  eventName: string;
  eventType: 'Standard' | 'Custom' | 'DataLayer';
  eventId: string;
  payload: Record<string, any>;
  userData?: Record<string, any>;
}

// Global state for live event debug log
let eventLogs: TrackedEventLog[] = [];
let logListeners: ((logs: TrackedEventLog[]) => void)[] = [];

export function subscribeEventLogs(listener: (logs: TrackedEventLog[]) => void) {
  logListeners.push(listener);
  listener([...eventLogs]);
  return () => {
    logListeners = logListeners.filter(l => l !== listener);
  };
}

function notifyLogListeners() {
  logListeners.forEach(l => l([...eventLogs]));
}

export function clearEventLogs() {
  eventLogs = [];
  notifyLogListeners();
}

// Generate unique Event ID for deduplication between Pixel & Conversion API (CAPI)
export function generateEventId(eventName: string): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 100000);
  return `${eventName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${ts}_${rand}`;
}

// SHA-256 Helper for hashing sensitive user data before CAPI/Pixel transmission
export async function hashString(value: string): Promise<string> {
  if (!value) return '';
  const clean = value.trim().toLowerCase();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return clean; // fallback
}

// Helper to get or set _fbp cookie
export function getFbpCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/_fbp=([^;]+)/);
  if (match) return match[1];
  const createdFbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1000000000)}`;
  document.cookie = `_fbp=${createdFbp}; path=/; max-age=${60 * 60 * 24 * 90}`;
  return createdFbp;
}

// Helper to get _fbc cookie
export function getFbcCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/_fbc=([^;]+)/);
  if (match) return match[1];
  // Check URL parameters for fbclid
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get('fbclid');
    if (fbclid) {
      const createdFbc = `fb.1.${Date.now()}.${fbclid}`;
      document.cookie = `_fbc=${createdFbc}; path=/; max-age=${60 * 60 * 24 * 90}`;
      return createdFbc;
    }
  }
  return '';
}

// Default Pixel ID
export let currentPixelId = typeof window !== 'undefined' && (window as any).META_PIXEL_ID ? (window as any).META_PIXEL_ID : '1555655519489557';

export function setPixelId(id: string) {
  currentPixelId = id;
  if (typeof window !== 'undefined') {
    (window as any).META_PIXEL_ID = id;
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('init', id);
    }
  }
}

// Initialize Meta Pixel & DataLayer
export function initMetaPixel(pixelId: string = currentPixelId) {
  if (typeof window === 'undefined') return;

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];

  // Define fbq stub if not already injected
  if (!(window as any).fbq) {
    const n: any = function () {
      if (n.callMethod) {
        n.callMethod.apply(n, arguments);
      } else {
        n.queue.push(arguments);
      }
    };
    if (!(window as any)._fbq) (window as any)._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    (window as any).fbq = n;
  }

  // Set default Pixel ID
  currentPixelId = pixelId;

  // Track initial PageView
  trackStandardEvent('PageView', {
    page_name: 'Register Your Trade License - Quickly & Legally',
    page_type: 'landing_page',
    service_name: 'Trade License Registration Services in Bangladesh'
  });

  // Track Returning Visitor vs New
  const isReturning = localStorage.getItem('elawyers_visited');
  if (isReturning) {
    trackCustomEvent('TradeLicense_Returning_Visitor', {
      visitor_type: 'Returning',
      last_visit: isReturning
    });
  } else {
    localStorage.setItem('elawyers_visited', new Date().toISOString());
  }
}

// Track Standard Meta Events
export function trackStandardEvent(
  eventName: 'PageView' | 'ViewContent' | 'Lead' | 'Contact' | 'Schedule' | 'CompleteRegistration' | 'Search',
  payload: PixelEventPayload = {},
  userData?: MetaUserData
) {
  const eventId = payload.event_id || generateEventId(eventName);
  const fbp = getFbpCookie();
  const fbc = getFbcCookie();

  const finalPayload = {
    page_name: 'Register Your Trade License',
    service_name: 'Trade License Registration Bangladesh',
    country: 'Bangladesh',
    fbp,
    fbc,
    timestamp: new Date().toISOString(),
    ...payload
  };

  // 1. Meta Pixel Call
  if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
    if (userData && Object.keys(userData).length > 0) {
      (window as any).fbq('track', eventName, finalPayload, { eventID: eventId });
    } else {
      (window as any).fbq('track', eventName, finalPayload, { eventID: eventId });
    }
  }

  // 2. Data Layer Push
  pushToDataLayer({
    event: `meta_${eventName.toLowerCase()}`,
    meta_event_name: eventName,
    meta_event_type: 'Standard',
    event_id: eventId,
    fbp,
    fbc,
    ...finalPayload,
    ...userData
  });

  // 3. Log to debug viewer
  logEvent(eventName, 'Standard', eventId, finalPayload, userData);
}

// Track Custom Meta Events
export function trackCustomEvent(
  eventName:
    | 'TradeLicense_Consultation'
    | 'TradeLicense_Form_Start'
    | 'TradeLicense_Form_Submit'
    | 'TradeLicense_Form_Success'
    | 'TradeLicense_Form_Error'
    | 'TradeLicense_WhatsApp_Click'
    | 'TradeLicense_Call_Click'
    | 'TradeLicense_Email_Click'
    | 'TradeLicense_Download_Checklist'
    | 'TradeLicense_Download_Guide'
    | 'TradeLicense_CTA_Click'
    | 'TradeLicense_Header_CTA'
    | 'TradeLicense_Hero_CTA'
    | 'TradeLicense_Sticky_CTA'
    | 'TradeLicense_Footer_CTA'
    | 'TradeLicense_Scroll_25'
    | 'TradeLicense_Scroll_50'
    | 'TradeLicense_Scroll_75'
    | 'TradeLicense_Scroll_90'
    | 'TradeLicense_FAQ_Open'
    | 'TradeLicense_Video_Play'
    | 'TradeLicense_Video_Complete'
    | 'TradeLicense_Outbound_Click'
    | 'TradeLicense_Returning_Visitor'
    | string,
  payload: PixelEventPayload = {},
  userData?: MetaUserData
) {
  const eventId = payload.event_id || generateEventId(eventName);
  const fbp = getFbpCookie();
  const fbc = getFbcCookie();

  const finalPayload = {
    page_name: 'Register Your Trade License',
    service_name: 'Trade License Registration Bangladesh',
    country: 'Bangladesh',
    fbp,
    fbc,
    timestamp: new Date().toISOString(),
    ...payload
  };

  // 1. Meta Pixel Custom Call
  if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
    (window as any).fbq('trackCustom', eventName, finalPayload, { eventID: eventId });
  }

  // 2. Data Layer Push
  pushToDataLayer({
    event: eventName,
    meta_event_name: eventName,
    meta_event_type: 'Custom',
    event_id: eventId,
    fbp,
    fbc,
    ...finalPayload,
    ...userData
  });

  // 3. Log to debug viewer
  logEvent(eventName, 'Custom', eventId, finalPayload, userData);
}

// Push to GTM DataLayer
export function pushToDataLayer(data: Record<string, any>) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }
}

// Helper logger for debug panel
function logEvent(
  eventName: string,
  eventType: 'Standard' | 'Custom' | 'DataLayer',
  eventId: string,
  payload: Record<string, any>,
  userData?: Record<string, any>
) {
  const newLog: TrackedEventLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    eventName,
    eventType,
    eventId,
    payload,
    userData
  };
  eventLogs = [newLog, ...eventLogs.slice(0, 99)]; // Keep last 100
  notifyLogListeners();
}

// Global Engagement Listeners (30s, 60s, 120s, 180s & Scroll Depths 25%, 50%, 75%, 90%)
export function initEngagementListeners() {
  if (typeof window === 'undefined') return () => {};

  // 1. Timer engagement
  const timers = [
    { seconds: 30, fired: false },
    { seconds: 60, fired: false },
    { seconds: 120, fired: false },
    { seconds: 180, fired: false }
  ];

  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - performance.timing.navigationStart) / 1000);
    timers.forEach(t => {
      if (!t.fired && elapsed >= t.seconds) {
        t.fired = true;
        trackCustomEvent(`TradeLicense_Time_${t.seconds}s`, {
          event_category: 'User Engagement',
          event_action: 'Time Spent',
          event_label: `${t.seconds} Seconds`,
          time_seconds: t.seconds
        });
      }
    });
  }, 2000);

  // 2. Scroll depth
  const scrollDepths = [
    { percentage: 25, event: 'TradeLicense_Scroll_25', fired: false },
    { percentage: 50, event: 'TradeLicense_Scroll_50', fired: false },
    { percentage: 75, event: 'TradeLicense_Scroll_75', fired: false },
    { percentage: 90, event: 'TradeLicense_Scroll_90', fired: false }
  ];

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const currentPercent = Math.round((scrollTop / docHeight) * 100);

    scrollDepths.forEach(s => {
      if (!s.fired && currentPercent >= s.percentage) {
        s.fired = true;
        trackCustomEvent(s.event, {
          event_category: 'User Engagement',
          event_action: 'Scroll Depth',
          event_label: `${s.percentage}% Scroll`,
          scroll_percentage: s.percentage
        });
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  // 3. Copy tracking listener
  const handleCopy = (e: ClipboardEvent) => {
    const selection = window.getSelection()?.toString() || '';
    if (selection.length > 0) {
      if (selection.includes('+880') || selection.includes('09612345678')) {
        trackCustomEvent('TradeLicense_Copy_Phone', {
          event_category: 'Copy Interaction',
          event_action: 'Copy Phone',
          event_label: selection
        });
      } else if (selection.includes('elawyers') || selection.includes('@')) {
        trackCustomEvent('TradeLicense_Copy_Email', {
          event_category: 'Copy Interaction',
          event_action: 'Copy Email',
          event_label: selection
        });
      } else if (selection.toLowerCase().includes('dhaka') || selection.toLowerCase().includes('banani')) {
        trackCustomEvent('TradeLicense_Copy_Address', {
          event_category: 'Copy Interaction',
          event_action: 'Copy Address',
          event_label: selection
        });
      }
    }
  };

  document.addEventListener('copy', handleCopy);

  return () => {
    clearInterval(interval);
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('copy', handleCopy);
  };
}
