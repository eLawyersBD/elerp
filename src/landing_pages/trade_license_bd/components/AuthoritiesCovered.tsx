/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AUTHORITIES_COVERED } from '../data';
import { Landmark, MapPin, Globe } from 'lucide-react';

export default function AuthoritiesCovered() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Pitch */}
          <div className="lg:col-span-5 space-y-5 text-left">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
              Jurisdictions We Support
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
              Authorities We Cover
            </h2>
            <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
              We process licensing dossiers across all administrative divisions of Bangladesh. Whether your office sits in the heart of Dhaka or a peripheral municipality, E-Lawyers manages your application seamlessly.
            </p>
            
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0 mt-0.5">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-display">Major City Corporations</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Direct connection with online portals of major metropolitan areas for 24-48h submission setups.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0 mt-0.5">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-display">Pourashava & Municipalities</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Dedicated regional representatives handling manual processing and inspector coordination nationwide.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Authority Grid */}
          <div className="lg:col-span-7">
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8">
              <h3 className="text-sm font-semibold text-slate-950 uppercase tracking-widest border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-700" />
                Active Registration Desks
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {AUTHORITIES_COVERED.map((auth, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-xl hover:border-blue-400 hover:shadow-sm transition"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 font-display truncate">{auth.name}</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0 bg-slate-100 px-2 py-0.5 rounded font-mono">
                      {auth.district}
                    </span>
                  </div>
                ))}
              </div>
              
              <p className="text-[10px] text-slate-400 mt-5 text-center leading-relaxed font-light">
                * Note: Processing requirements and municipality fees might fluctuate slightly based on the local executive ward regulations.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
