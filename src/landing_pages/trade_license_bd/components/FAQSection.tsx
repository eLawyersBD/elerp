/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../motion';
import { FAQ_DATA } from '../data';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import { trackCustomEvent } from '../lib/metaPixel';

interface FAQSectionProps {
  highlightedFaqIndex?: number | null;
}

export default function FAQSection({ highlightedFaqIndex }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First open by default

  useEffect(() => {
    if (highlightedFaqIndex !== undefined && highlightedFaqIndex !== null) {
      setOpenIndex(highlightedFaqIndex);
    }
  }, [highlightedFaqIndex]);

  const toggleFAQ = (index: number) => {
    const nextState = openIndex === index ? null : index;
    if (nextState !== null) {
      trackCustomEvent('TradeLicense_FAQ_Open', {
        faq_index: index,
        faq_question: FAQ_DATA[index]?.question
      });
    }
    setOpenIndex(nextState);
  };

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
            Any Queries?
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
            Get instant legal answers regarding Trade License categories, government tariffs, space clearances, and physical deliveries in Bangladesh.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {FAQ_DATA.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`border rounded-2xl transition-all duration-300 ${
                  isOpen 
                    ? 'border-emerald-400 bg-emerald-50/10 shadow-sm' 
                    : 'border-slate-200 hover:border-emerald-300 bg-white'
                }`}
              >
                {/* Trigger Header */}
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3.5 pr-4">
                    <HelpCircle className={`h-5 w-5 shrink-0 transition-colors ${isOpen ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 font-display leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg shrink-0 transition-all ${isOpen ? 'bg-emerald-500 text-slate-950' : 'bg-slate-50 text-slate-400'}`}>
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </div>
                </button>

                {/* Collapsible Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 border-t border-slate-100 text-xs sm:text-sm text-slate-500 leading-relaxed font-light text-left whitespace-pre-line">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
