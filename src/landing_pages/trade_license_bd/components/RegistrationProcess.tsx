/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from '../motion';
import { 
  PhoneCall, 
  FolderDown, 
  SearchCheck, 
  FileEdit, 
  Send, 
  Settings, 
  FileSpreadsheet, 
  Truck 
} from 'lucide-react';

export default function RegistrationProcess() {
  const steps = [
    {
      num: "01",
      title: "Free Consultation",
      desc: "Our licensing expert analyzes your business activity and location to draft the perfect strategy.",
      icon: PhoneCall,
      bg: "bg-blue-500/10 text-blue-600 border-blue-200"
    },
    {
      num: "02",
      title: "Document Collection",
      desc: "Submit your NID, photos, space deeds, and utility proofs securely via our portal.",
      icon: FolderDown,
      bg: "bg-emerald-500/10 text-emerald-600 border-emerald-200"
    },
    {
      num: "03",
      title: "Verification",
      desc: "E-Lawyers legal staff reviews and validates all spaces and credentials for alignment.",
      icon: SearchCheck,
      bg: "bg-amber-500/10 text-amber-600 border-amber-200"
    },
    {
      num: "04",
      title: "App Preparation",
      desc: "We accurately fill out the official government license forms and dossiers.",
      icon: FileEdit,
      bg: "bg-indigo-500/10 text-indigo-600 border-indigo-200"
    },
    {
      num: "05",
      title: "Gov Submission",
      desc: "We file the physical or electronic dossier directly with your licensing zone officer.",
      icon: Send,
      bg: "bg-sky-500/10 text-sky-600 border-sky-200"
    },
    {
      num: "06",
      title: "Gov Processing",
      desc: "The licensing inspector reviews the file and updates coordinates/tax rates.",
      icon: Settings,
      bg: "bg-purple-500/10 text-purple-600 border-purple-200"
    },
    {
      num: "07",
      title: "License Issued",
      desc: "The authority issues the physical smart card or printed Trade License paper.",
      icon: FileSpreadsheet,
      bg: "bg-teal-500/10 text-teal-600 border-teal-200"
    },
    {
      num: "08",
      title: "Safe Delivery",
      desc: "We scan the license for your active digital portal and courier the original directly.",
      icon: Truck,
      bg: "bg-rose-500/10 text-rose-600 border-rose-200"
    }
  ];

  return (
    <section className="py-20 bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            The Roadmap
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Our 8-Step Registration Process
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
            From your very first click to the physical collection of your license, E-Lawyers provides a systematic, highly trackable roadmap.
          </p>
        </div>

        {/* Timeline Grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm relative flex flex-col justify-between text-left group"
            >
              {/* Connector line for large screens */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3.5 w-7 border-t border-dashed border-slate-300 z-10" />
              )}
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold font-mono text-slate-300 group-hover:text-blue-700 transition-colors">
                    STEP {step.num}
                  </span>
                  <div className={`p-2.5 rounded-xl border shrink-0 ${step.bg}`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900 font-display tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">
                    {step.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

        </div>

      </div>
    </section>
  );
}
