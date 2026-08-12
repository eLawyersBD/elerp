/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PRICING_PLANS } from '../data';
import { Check, Info, CalendarRange, Scale } from 'lucide-react';
import PriceEstimator from './PriceEstimator';
import { trackCustomEvent } from '../lib/metaPixel';

interface PricingTimelineProps {
  onScrollToForm: () => void;
  onEstimateApply: (serviceTitle: string, businessType: string, location: string) => void;
}

export default function PricingTimeline({ onScrollToForm, onEstimateApply }: PricingTimelineProps) {
  return (
    <section className="py-20 bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Professional Pricing & Timeline
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
            E-Lawyers maintains complete bill transparency. We charge a flat professional fee for our services, while you pay only the actual government charges with zero hidden markups.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PRICING_PLANS.map((plan, index) => {
            const isUrgent = plan.name.includes("Urgent");
            return (
              <div 
                key={index} 
                className={`bg-white border rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-sm hover:shadow-xl transition-all ${
                  isUrgent 
                    ? 'border-blue-600 ring-4 ring-blue-600/10' 
                    : 'border-slate-200'
                }`}
              >
                {/* Popular / Urgent Badge */}
                {isUrgent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider shadow">
                    Most Popular
                  </span>
                )}

                <div className="space-y-6">
                  {/* Name and Pitch */}
                  <div className="text-left">
                    <h3 className="text-base font-bold text-slate-900 font-display tracking-tight">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">{plan.fee}</span>
                      <span className="ml-1 text-xs font-medium text-slate-400">/ license</span>
                    </div>
                  </div>

                  {/* Pricing Breakdown items */}
                  <div className="border-y border-slate-100 py-4 space-y-2.5 text-left text-xs font-medium">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1">
                        Government Fee:
                        <span className="group relative cursor-pointer text-slate-400">
                          <Info className="h-3.5 w-3.5" />
                          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950 text-white p-2 rounded text-[10px] w-48 hidden group-hover:block leading-relaxed font-light z-20">
                            The official fee charged by the municipal authority based on your specific business category.
                          </span>
                        </span>
                      </span>
                      <span className="text-slate-900 font-semibold">{plan.govFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Government VAT:</span>
                      <span className="text-slate-900">{plan.vat}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Hidden Charges:</span>
                      <span className="text-blue-700 font-bold bg-blue-100/30 px-1.5 py-0.5 rounded uppercase text-[9px] tracking-wide">None</span>
                    </div>
                  </div>

                  {/* Processing Duration */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2.5 border border-slate-100">
                    <CalendarRange className="h-4.5 w-4.5 text-blue-700 shrink-0" />
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">TIMELINE</p>
                      <p className="text-xs font-bold text-slate-900">{plan.timeline}</p>
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-3 pt-2 text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Service Highlights</p>
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-600 leading-relaxed font-light">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => {
                      trackCustomEvent('TradeLicense_CTA_Click', {
                        button_name: `Select Plan - ${plan.name}`,
                        plan_name: plan.name,
                        plan_fee: plan.fee,
                        section: 'Pricing Section'
                      });
                      onScrollToForm();
                    }}
                    className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition cursor-pointer ${
                      isUrgent 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10' 
                        : 'bg-[#0f172a] hover:bg-slate-800 text-white'
                    }`}
                  >
                    Select Plan & Register
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Price Estimator Section */}
        <div className="mt-20 max-w-5xl mx-auto">
          <PriceEstimator onEstimateApply={onEstimateApply} />
        </div>

        {/* Supplementary footnote */}
        <div className="max-w-3xl mx-auto mt-12 p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 text-left">
          <Scale className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed font-light">
            * <strong className="text-slate-800 font-semibold">Important Disclaimer:</strong> Government fees, commercial holding taxes, and fire service license prerequisites depend on the location and specific business activity. Our licensing case manager will submit the official government breakdown during your initial free consultation.
          </p>
        </div>

      </div>
    </section>
  );
}
