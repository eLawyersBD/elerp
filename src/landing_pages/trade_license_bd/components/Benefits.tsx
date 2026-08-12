/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BENEFITS_LIST } from '../data';
import { 
  Scale, 
  Building, 
  Percent, 
  Briefcase, 
  ShieldCheck, 
  BadgeAlert,
  HelpCircleIcon
} from 'lucide-react';

export default function Benefits() {
  const icons = [Scale, Building, Percent, Briefcase, ShieldCheck, BadgeAlert];

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Commercial Advantages
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Benefits of a Valid Trade License
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
            A Trade License is more than just a regulatory checkmark—it is a core business asset that unlocks growth, credibility, and security.
          </p>
        </div>

        {/* Benefits Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS_LIST.map((benefit, index) => {
            const IconComponent = icons[index] || HelpCircleIcon;
            return (
              <div 
                key={index}
                className="bg-slate-50 border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm text-left flex flex-col justify-between hover:bg-white hover:border-blue-400 hover:shadow-md transition"
              >
                <div className="space-y-4">
                  <div className="p-3 bg-blue-500/10 text-blue-700 rounded-xl w-fit">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 font-display tracking-tight">
                    {benefit.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
