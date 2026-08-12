/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from '../motion';
import { Shield, CheckCircle2, ArrowDownCircle, Users, Award } from 'lucide-react';
import { trackCustomEvent } from '../lib/metaPixel';

export default function Hero({ onScrollToForm }: { onScrollToForm: () => void }) {
  const handleHeroCtaClick = () => {
    trackCustomEvent('TradeLicense_Hero_CTA', {
      button_name: 'Get Your Trade License Today',
      section: 'Hero Banner'
    });
    trackCustomEvent('TradeLicense_CTA_Click', {
      button_name: 'Get Your Trade License Today',
      section: 'Hero Banner'
    });
    onScrollToForm();
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] text-white pt-28 pb-20 md:pt-36 md:pb-28 border-b border-slate-900">
      {/* Decorative background vectors */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(30,58,138,0.2),transparent_50%)]" />
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute top-1/2 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Hero Pitch */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-widest"
            >
              <Shield className="h-3.5 w-3.5" />
              100% Legally Compliant Registration Service
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-serif text-3xl sm:text-4xl lg:text-[2.85rem] xl:text-5xl font-bold tracking-tight leading-[1.2]"
            >
              Register Your Trade License <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 font-extrabold">
                Quickly & Legally
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-300 text-sm text-justify max-w-2xl font-light leading-relaxed"
            >
              Planning to start a business in Bangladesh? A valid Trade License is the first legal requirement for operating any business. 
              <strong className="text-amber-400 font-semibold"> E-Lawyers </strong> handles the complete registration process—from document preparation and application submission to license collection—so you can focus on growing your business.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              <button
                onClick={handleHeroCtaClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/10 group cursor-pointer uppercase tracking-wider"
              >
                Get Your Trade License Today
                <ArrowDownCircle className="h-4 w-4 transition-transform group-hover:translate-y-0.5 text-amber-400" />
              </button>
              
              <div className="flex flex-col justify-center text-left pl-1">
                <span className="text-xs text-slate-400 uppercase tracking-widest">Professional Fee Starts From</span>
                <span className="text-xl font-bold text-amber-400 font-display">৳3,000*</span>
              </div>
            </motion.div>

            {/* Quick stats / trust list */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-300 font-light">Nationwide Service</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-300 font-light">Zero Hidden Fees</span>
              </div>
              <div className="flex items-center gap-2.5 col-span-2 sm:col-span-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-300 font-light">Online Portal Access</span>
              </div>
            </motion.div>
          </div>

          {/* Side Creative Layout (Official Document/Challan Image) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative mt-6 lg:mt-0 flex justify-center items-center"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 rounded-3xl blur-2xl opacity-60" />
            <div className="relative border border-slate-800/80 bg-[#0f172a]/40 backdrop-blur-sm p-2 rounded-3xl shadow-2xl overflow-hidden group max-w-md sm:max-w-lg lg:max-w-full w-full">
              <img 
                src="https://i.ibb.co.com/gbdYxDw9/e6f34923-0212-489c-88d3-6b337b2195a6.png" 
                alt="Government Treasury Payment Challan" 
                referrerPolicy="no-referrer"
                className="w-full h-auto rounded-2xl object-cover shadow-lg transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>100% Gov Verified Challan</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
