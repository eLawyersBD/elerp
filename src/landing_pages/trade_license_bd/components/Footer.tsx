/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SEO_KEYWORDS } from '../data';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Scale, 
  Building2,
  ChevronRight,
  ArrowUpCircle
} from 'lucide-react';

export default function Footer({ onScrollToTop }: { onScrollToTop: () => void }) {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Segment: Brand, Navigation & Contacts */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Col 1: Brand & Bio */}
          <div className="md:col-span-4 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <img 
                src="https://i.ibb.co/xTnDkSS/Logo-E-Layers-02.png" 
                alt="E-Lawyers Logo" 
                className="h-10 w-auto object-contain brightness-0 invert"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              E-Lawyers is a premier corporate legal and compliance advisory firm in Bangladesh, specializing in Trade Licensing, RJSC Company Incorporation, VAT/BIN registration, and tax filings.
            </p>

            <div className="pt-2 flex items-center gap-2.5 text-xs text-slate-300 font-medium bg-slate-900/40 p-3 rounded-xl border border-slate-800 w-fit">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
              <span>Registered Legal Advisory Firm</span>
            </div>
          </div>

          {/* Col 2: Fast Navigation Links */}
          <div className="md:col-span-3 text-left space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest font-display">Service Sections</h4>
            <ul className="space-y-2.5 text-xs">
              {[
                { name: 'Request Quote Form', href: '#consultation-form-section' },
                { name: 'Why E-Lawyers', href: '#active-portal-section' },
                { name: 'Licensing Authorities', href: '#active-portal-section' },
                { name: 'Checklist Required', href: '#active-portal-section' },
                { name: '8-Step Timeline', href: '#active-portal-section' },
                { name: 'Client Portal Tracker', href: '#active-portal-section' }
              ].map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} className="hover:text-emerald-400 transition flex items-center gap-1 group">
                    <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-emerald-400 transition" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Direct Conversion Contact Handles */}
          <div className="md:col-span-5 text-left space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest font-display">Contact Licensing Team</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Call Now */}
              <a 
                href="tel:+8801335230184" 
                className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/30 transition group cursor-pointer"
              >
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-slate-950 transition">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wide">📞 CALL NOW</p>
                  <p className="text-xs font-bold text-white mt-0.5">+88 01335230184-81</p>
                </div>
              </a>

              {/* WhatsApp Us */}
              <a 
                href="https://wa.me/8801335230184?text=Hello%20E-Lawyers,%20I'm%20interested%20in%20registering%20a%20Trade%20License%20in%20Bangladesh." 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/30 transition group cursor-pointer"
              >
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wide">💬 WHATSAPP US</p>
                  <p className="text-xs font-bold text-white mt-0.5">+880 1335 230184</p>
                </div>
              </a>

              {/* Email Address */}
              <a 
                href="mailto:info@elawyersbd.com" 
                className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/30 transition group cursor-pointer"
              >
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-slate-950 transition">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wide">📩 EMAIL CONSULTATION</p>
                  <p className="text-xs font-bold text-white mt-0.5 truncate">info@elawyersbd.com</p>
                </div>
              </a>

              {/* Office Address */}
              <div 
                className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-emerald-500/30 transition group cursor-default sm:col-span-2"
              >
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500 group-hover:text-slate-950 transition shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wide">📍 BANGLADESH HEADQUARTERS</p>
                  <p className="text-xs font-medium text-slate-200 mt-0.5 leading-snug">
                    G-5, BTI Centara Grand, 144-144/1 Green Road, Panthapath, Dhaka-1205
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                    <span>Official Portal:</span>
                    <a href="https://elawyersbd.com/" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">elawyersbd.com</a>
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Middle Segment: SEO Optimization Keywords */}
        <div className="hidden border-t border-slate-900 pt-8 text-left space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest font-display">
            <Scale className="h-4 w-4 text-emerald-500" />
            SEO Search Optimization tags
          </div>
          
          <div className="flex flex-wrap gap-2">
            {SEO_KEYWORDS.map((kw, idx) => (
              <span 
                key={idx} 
                className="text-[10px] font-medium text-slate-500 bg-slate-900/30 border border-slate-900 px-2.5 py-1 rounded hover:text-emerald-400 hover:border-emerald-500/20 transition cursor-default"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Segment: Copyright & back to top */}
        <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-light text-slate-500">
          <div className="text-center sm:text-left space-y-1">
            <p>© {new Date().getFullYear()} E-Lawyers Bangladesh. All rights reserved.</p>
            <p className="text-[10px] text-slate-600">The information on this website is for general setup guidelines and does not constitute formal judiciary bar counsel advise.</p>
          </div>
          
          <button
            onClick={onScrollToTop}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-800 rounded-lg hover:border-emerald-400 hover:text-white transition cursor-pointer"
          >
            <span>Back to Top</span>
            <ArrowUpCircle className="h-4 w-4" />
          </button>
        </div>

      </div>
    </footer>
  );
}
