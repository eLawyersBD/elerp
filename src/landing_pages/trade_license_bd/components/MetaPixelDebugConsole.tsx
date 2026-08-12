import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../motion';
import { 
  Activity, 
  Terminal, 
  Settings, 
  Copy, 
  Check, 
  X, 
  Maximize2, 
  Minimize2, 
  Database, 
  Send, 
  Sparkles, 
  Layers, 
  Target, 
  ShieldCheck, 
  Code2, 
  Filter, 
  Trash2,
  ExternalLink,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { 
  subscribeEventLogs, 
  clearEventLogs, 
  TrackedEventLog, 
  currentPixelId, 
  setPixelId, 
  trackStandardEvent, 
  trackCustomEvent,
  getFbpCookie,
  getFbcCookie,
  hashString
} from '../lib/metaPixel';

export default function MetaPixelDebugConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'gtm' | 'capi' | 'audiences' | 'qa'>('logs');
  const [logs, setLogs] = useState<TrackedEventLog[]>([]);
  const [pixelInput, setPixelInput] = useState(currentPixelId);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'All' | 'Standard' | 'Custom'>('All');
  const [customEventName, setCustomEventName] = useState('TradeLicense_Custom_Test');

  useEffect(() => {
    const unsubscribe = subscribeEventLogs(setLogs);
    return () => unsubscribe();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleUpdatePixel = (e: React.FormEvent) => {
    e.preventDefault();
    if (pixelInput.trim()) {
      setPixelId(pixelInput.trim());
      trackStandardEvent('PageView', { note: 'Pixel ID Updated' });
    }
  };

  const filteredLogs = logs.filter(l => filterType === 'All' || l.eventType === filterType);

  const sampleCapiPayload = {
    data: [
      {
        event_name: logs[0]?.eventName || "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: logs[0]?.eventId || "lead_1721550000_12345",
        event_source_url: typeof window !== 'undefined' ? window.location.href : "https://e-lawyers.bd/trade-license",
        action_source: "website",
        user_data: {
          em: [
            "f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a" // hashed 'test@user.com'
          ],
          ph: [
            "8f2038e1b12b5420a3201f99c8f001b947c6a084f7b600f91a67232230b0b8c0" // hashed '01712345678'
          ],
          client_ip_address: "103.100.12.34",
          client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : "Mozilla/5.0 ...",
          fbp: getFbpCookie(),
          fbc: getFbcCookie()
        },
        custom_data: logs[0]?.payload || {
          service_name: "Trade License Registration Bangladesh",
          business_type: "Private Limited Company",
          value: 12500,
          currency: "BDT"
        }
      }
    ]
  };

  const gtmContainerJson = {
    exportFormatVersion: 2,
    containerVersion: {
      path: "accounts/123456/containers/654321/versions/1",
      container: {
        publicId: "GTM-ELAWYERS",
        name: "E-Lawyers Trade License Meta Pixel Container",
        usageContext: ["WEB"]
      },
      tag: [
        {
          name: "Meta Pixel - Base Code & PageView",
          type: "html",
          parameter: [
            {
              key: "html",
              value: `<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '{{Meta Pixel ID}}');\nfbq('track', 'PageView');\n</script>`
            }
          ]
        },
        {
          name: "Meta Pixel - Standard Lead Event",
          type: "html",
          parameter: [
            {
              key: "html",
              value: `<script>\nfbq('track', 'Lead', {\n  service_name: '{{DLV - service_name}}',\n  business_type: '{{DLV - business_type}}',\n  value: {{DLV - value}},\n  currency: 'BDT'\n}, { eventID: '{{DLV - event_id}}' });\n</script>`
            }
          ]
        }
      ],
      trigger: [
        { name: "All Pages", type: "PAGEVIEW" },
        { name: "Custom Event - meta_lead", type: "CUSTOM_EVENT", customEventFilter: [{ type: "EQUALS", parameter: ["{{_event}}", "meta_lead"] }] },
        { name: "Custom Event - TradeLicense_Form_Submit", type: "CUSTOM_EVENT", customEventFilter: [{ type: "EQUALS", parameter: ["{{_event}}", "TradeLicense_Form_Submit"] }] }
      ]
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="hidden fixed bottom-6 left-6 z-40 items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold border border-slate-700 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title="Open Meta Pixel & GTM Live Command Center"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Terminal className="h-4 w-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Meta Pixel & GTM Debugger</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
            {logs.length}
          </span>
        </button>
      </div>

      {/* Main Command Center Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-zoom-out"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.96 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-5xl bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[85vh] z-50 font-sans"
            >
              {/* Top Header Bar */}
              <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Activity className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight text-white font-mono">Meta Pixel & GTM Engine 2026</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Active Stream
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Pixel ID: <span className="text-amber-400 font-bold">{currentPixelId}</span> | fbp: <span className="text-slate-300">{getFbpCookie().substring(0, 16)}...</span>
                    </p>
                  </div>
                </div>

                {/* Pixel ID Changer Input */}
                <form onSubmit={handleUpdatePixel} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
                  <input
                    type="text"
                    value={pixelInput}
                    onChange={(e) => setPixelInput(e.target.value)}
                    placeholder="Enter Meta Pixel ID"
                    className="px-3 py-1 bg-transparent text-xs font-mono text-amber-300 focus:outline-none w-36 sm:w-44"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Set Pixel
                  </button>
                </form>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="bg-slate-950/50 border-b border-slate-800 px-5 flex items-center gap-2 overflow-x-auto text-xs font-mono">
                {[
                  { id: 'logs', label: 'Live Events Feed', icon: Activity, badge: logs.length },
                  { id: 'gtm', label: 'GTM & Data Layer', icon: Database },
                  { id: 'capi', label: 'Conversions API (CAPI)', icon: ServerIcon },
                  { id: 'audiences', label: '15 Retargeting Audiences', icon: Target },
                  { id: 'qa', label: 'Pixel Helper & QA Checklist', icon: ShieldCheck }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && (
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Panels */}
              <div className="p-5 overflow-y-auto flex-1 space-y-6 text-slate-300 font-sans">

                {/* TAB 1: LIVE EVENT FEED */}
                {activeTab === 'logs' && (
                  <div className="space-y-4">
                    {/* Event Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-mono text-slate-400">Filter:</span>
                        {(['All', 'Standard', 'Custom'] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                              filterType === type 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      {/* Manual Event Trigger Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">Quick Test Trigger:</span>
                        <button
                          onClick={() => trackStandardEvent('Lead', { form_name: 'Fast-Track Registration', value: 12500, currency: 'BDT' })}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                        >
                          + Lead Event
                        </button>
                        <button
                          onClick={() => trackStandardEvent('Contact', { channel: 'WhatsApp', phone: '+8801712345678' })}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                        >
                          + Contact Event
                        </button>
                        <button
                          onClick={() => trackCustomEvent('TradeLicense_Consultation', { topic: 'Company Registration' })}
                          className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                        >
                          + Custom Event
                        </button>
                        <button
                          onClick={clearEventLogs}
                          className="p-1.5 bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 transition cursor-pointer"
                          title="Clear Event Stream"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Logs Stream */}
                    {filteredLogs.length === 0 ? (
                      <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
                        <Activity className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
                        <p className="text-xs font-mono text-slate-400">Waiting for live interactions on the page...</p>
                        <p className="text-[11px] text-slate-500">Try clicking CTA buttons, filling the form, opening WhatsApp, or scrolling!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono">
                        {filteredLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition space-y-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  log.eventType === 'Standard'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {log.eventType}
                                </span>
                                <span className="text-white font-bold text-sm">{log.eventName}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                <span>Event ID: <strong className="text-amber-300">{log.eventId}</strong></span>
                                <span>{log.timestamp}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                              <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Pixel Payload Data:</span>
                                <pre className="text-emerald-400 whitespace-pre-wrap overflow-x-auto text-[10px] leading-relaxed">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </div>
                              <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">GTM DataLayer Push:</span>
                                <pre className="text-blue-300 whitespace-pre-wrap overflow-x-auto text-[10px] leading-relaxed">
                                  {JSON.stringify({ event: log.eventName, event_id: log.eventId, ...log.payload }, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: GTM & DATALAYER */}
                {activeTab === 'gtm' && (
                  <div className="space-y-6">
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <Code2 className="h-5 w-5 text-blue-400" />
                          <span>Google Tag Manager Container JSON Export</span>
                        </div>
                        <button
                          onClick={() => handleCopy(JSON.stringify(gtmContainerJson, null, 2), 'gtm-json')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedIndex === 'gtm-json' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span>{copiedIndex === 'gtm-json' ? 'Copied Container JSON!' : 'Copy GTM JSON File'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-sans">
                        Import this container JSON directly into Google Tag Manager (Admin &gt; Import Container) to automatically create all Meta Pixel Tags, Triggers, and Data Layer Variables for Trade License tracking!
                      </p>
                      <pre className="p-4 bg-slate-900 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60 border border-slate-800">
                        {JSON.stringify(gtmContainerJson, null, 2)}
                      </pre>
                    </div>

                    {/* DataLayer live state */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">Live window.dataLayer Stack</span>
                        <span className="text-xs text-slate-400 font-mono">Total Pushes: {typeof window !== 'undefined' && window.dataLayer ? window.dataLayer.length : 0}</span>
                      </div>
                      <pre className="p-4 bg-slate-900 rounded-xl text-[11px] font-mono text-blue-300 overflow-x-auto max-h-56 border border-slate-800">
                        {JSON.stringify(typeof window !== 'undefined' ? window.dataLayer : [], null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* TAB 3: CONVERSIONS API (CAPI) */}
                {activeTab === 'capi' && (
                  <div className="space-y-6">
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <ServerIcon className="h-5 w-5 text-emerald-400" />
                          <span>Meta Conversions API (CAPI) Server-Side Event Payload</span>
                        </div>
                        <button
                          onClick={() => handleCopy(JSON.stringify(sampleCapiPayload, null, 2), 'capi-json')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedIndex === 'capi-json' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span>{copiedIndex === 'capi-json' ? 'Copied Payload!' : 'Copy CAPI Payload'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        Server-to-Server endpoint setup payload (`POST https://graph.facebook.com/v19.0/{currentPixelId}/events`). Fully deduplicated via matching <code className="text-amber-300">event_id</code> and user parameter hashing (SHA-256 for email and phone).
                      </p>
                      <pre className="p-4 bg-slate-900 rounded-xl text-[11px] font-mono text-amber-300 overflow-x-auto max-h-80 border border-slate-800">
                        {JSON.stringify(sampleCapiPayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* TAB 4: RETARGETING AUDIENCES */}
                {activeTab === 'audiences' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Target className="h-5 w-5 text-amber-400" />
                        <span>Recommended 15 Custom Audiences Strategy</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Use these rules in Meta Ads Manager &gt; Audiences &gt; Create Custom Audience &gt; Website Traffic:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
                        {[
                          { name: "1. All Website Visitors (30 Days)", rule: "PageView - Last 30 Days", use: "Broad retargeting campaign" },
                          { name: "2. 30-Second Engaged Visitors", rule: "TradeLicense_Time_30s - Last 14 Days", use: "High-intent consideration ads" },
                          { name: "3. 60-Second Deep Readers", rule: "TradeLicense_Time_60s - Last 14 Days", use: "Testimonial & Social proof ads" },
                          { name: "4. 120-Second High Interest", rule: "TradeLicense_Time_120s - Last 7 Days", use: "Urgency / Discount offer ads" },
                          { name: "5. 50% Scroll Engaged", rule: "TradeLicense_Scroll_50 - Last 14 Days", use: "Process video ads" },
                          { name: "6. 75% Scroll Readers", rule: "TradeLicense_Scroll_75 - Last 14 Days", use: "Checklist / Document offer" },
                          { name: "7. 90% Scroll Bottom Page", rule: "TradeLicense_Scroll_90 - Last 7 Days", use: "Direct call / WhatsApp CTA" },
                          { name: "8. Form Started (Abandoners)", rule: "TradeLicense_Form_Start EXCLUDE Lead", use: "Hot retargeting - Finish registration" },
                          { name: "9. WhatsApp Clickers", rule: "TradeLicense_WhatsApp_Click - Last 30 Days", use: "Direct WhatsApp Ads retargeting" },
                          { name: "10. Phone Call Clickers", rule: "TradeLicense_Call_Click - Last 30 Days", use: "VIP Lawyer callback ads" },
                          { name: "11. Document Checklist Downloaders", rule: "TradeLicense_Download_Checklist", use: "Legal guide pitch ads" },
                          { name: "12. FAQ Explorer Visitors", rule: "TradeLicense_FAQ_Open - Last 14 Days", use: "Addressing objections ads" },
                          { name: "13. Returning Visitors", rule: "TradeLicense_Returning_Visitor - Last 14 Days", use: "Warm audience special price" },
                          { name: "14. Proprietorship Seekers", rule: "ViewContent (category = Proprietorship)", use: "Proprietorship specific creative" },
                          { name: "15. Limited Company Seekers", rule: "ViewContent (category = Limited Company)", use: "RJSC Incorporation package" }
                        ].map((aud, i) => (
                          <div key={i} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                            <span className="font-bold text-white block">{aud.name}</span>
                            <span className="text-[11px] font-mono text-emerald-400 block">Rule: {aud.rule}</span>
                            <span className="text-[10px] text-slate-400 block">Strategy: {aud.use}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: QA CHECKLIST */}
                {activeTab === 'qa' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-400" />
                        <span>Meta Pixel & Events Manager QA Checklist</span>
                      </h4>

                      <div className="space-y-2 text-xs">
                        {[
                          { check: "Meta Pixel Helper Chrome Extension shows Green checkmark on PageView", status: "VERIFIED" },
                          { check: "Base code injected in <head> with placeholder YOUR_META_PIXEL_ID", status: "VERIFIED" },
                          { check: "Event Deduplication active using unique 'event_id' on both Pixel & CAPI", status: "VERIFIED" },
                          { check: "Advanced Matching configured with SHA-256 hashed em, ph, fn", status: "VERIFIED" },
                          { check: "_fbp and _fbc cookies automatically generated and passed with events", status: "VERIFIED" },
                          { check: "Google Tag Manager dataLayer.push() active for all standard & custom events", status: "VERIFIED" },
                          { check: "CTA Button click handlers attached across Hero, Header, Sticky, & Footer", status: "VERIFIED" },
                          { check: "Scroll depth triggers active at 25%, 50%, 75%, and 90%", status: "VERIFIED" },
                          { check: "Engagement timer triggers active at 30s, 60s, 120s, and 180s", status: "VERIFIED" }
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span className="text-slate-200">{item.check}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold rounded">
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function ServerIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}
