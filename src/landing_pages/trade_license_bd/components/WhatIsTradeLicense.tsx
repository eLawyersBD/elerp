/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from '../motion';
import { Landmark, FileCheck, LandmarkIcon, ClipboardList } from 'lucide-react';

export default function WhatIsTradeLicense() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Interactive Visual Cards */}
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-0 bg-blue-100 rounded-3xl blur-2xl opacity-40 -z-10" />
            <div className="space-y-6">
              
              {/* Card 1 */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm"
              >
                <div className="p-3 bg-blue-500/10 text-blue-700 rounded-xl shrink-0">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 font-display">Official Authority</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Issued exclusively by local bodies—City Corporations (DNCC, DSCC, etc.) or Municipalities (Pourashava) matching your active business boundary.
                  </p>
                </div>
              </motion.div>

              {/* Card 2 */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-md relative lg:-right-8"
              >
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
                  <FileCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 font-display">Core Gateway</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Required before registering for VAT, securing a Business Identification Number (BIN), or establishing any corporate bank accounts in Bangladesh.
                  </p>
                </div>
              </motion.div>

              {/* Card 3 */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm"
              >
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 font-display">Mandatory Validity</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Obtaining a Trade License is legally mandatory before initiating commercial transactions. Licenses are subject to annual renewal each fiscal year.
                  </p>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Right: Rich Informational Content */}
          <div className="lg:col-span-7 space-y-6 lg:pl-6 text-left">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
              Legal Foundation
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
              What is a Trade License?
            </h2>
            
            <div className="space-y-4 text-slate-600 font-light text-sm sm:text-base leading-relaxed">
              <p>
                A <strong className="text-slate-950 font-medium">Trade License</strong> is an official legal authorization issued by the respective City Corporation or Municipality allowing an individual or business entity to legally conduct commercial, manufacturing, or service activities within its designated jurisdiction.
              </p>
              <p>
                Obtaining a Trade License is <strong className="text-slate-950 font-medium">mandatory</strong> before commencing any business in Bangladesh. It serves as your foundational legal proof of existence and is strictly required for crucial financial and administrative operations including:
              </p>
            </div>

            {/* List with icons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {[
                "Opening Business Bank Accounts",
                "VAT & BIN Registrations",
                "Securing Import-Export (IRC/ERC) Licenses",
                "Supplier Registrations & Contracts",
                "Participating in Government Tenders",
                "Protecting from sudden municipal shutdowns"
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="text-xs font-medium text-slate-700">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="pt-4">
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                <LandmarkIcon className="h-5 w-5 text-blue-700 shrink-0" />
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Important: Failing to acquire a Trade License before starting business can lead to heavy municipal penalties, fines, and immediate legal enforcement actions by authorities.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
