/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from '../motion';
import { 
  CheckCircle, 
  Sparkles, 
  Users, 
  ShieldCheck, 
  Clock, 
  Globe2, 
  FileCheck2, 
  KeyRound 
} from 'lucide-react';

export default function TrustSection() {
  const trusts = [
    {
      title: "Thousands of Successful Registrations",
      desc: "Over 2,400+ businesses legally established under municipal regions nationwide.",
      icon: Users,
      color: "text-blue-500 bg-blue-50"
    },
    {
      title: "100% Transparent Flat Pricing",
      desc: "Zero hidden inspector handouts, premium charges, or surprise administrative bills.",
      icon: ShieldCheck,
      color: "text-emerald-500 bg-emerald-50"
    },
    {
      title: "Dedicated Relationship Manager",
      desc: "A designated legal executive assigned to answer questions and file documents directly.",
      icon: Sparkles,
      color: "text-amber-500 bg-amber-50"
    },
    {
      title: "Complete Nationwide Service",
      desc: "We coordinate applications from major City Corporations to remote union councils.",
      icon: Globe2,
      color: "text-indigo-500 bg-indigo-50"
    },
    {
      title: "Expert Legal Professionals",
      desc: "Dossiers prepared and double-verified by corporate solicitors and licensing attorneys.",
      icon: FileCheck2,
      color: "text-purple-500 bg-purple-50"
    },
    {
      title: "Fast Guaranteed Response",
      desc: "Consultants respond on WhatsApp or direct call within 30 minutes of submission.",
      icon: Clock,
      color: "text-rose-500 bg-rose-50"
    },
    {
      title: "Online Document Submission",
      desc: "Drag-and-drop your certificates safely using your phone or desktop web browser.",
      icon: CheckCircle,
      color: "text-teal-500 bg-teal-50"
    },
    {
      title: "Secure Client Portal Dashboard",
      desc: "Track Step 1 to Step 8 of your license progress in real-time with continuous transparency.",
      icon: KeyRound,
      color: "text-sky-500 bg-sky-50"
    }
  ];

  return (
    <section className="py-20 bg-[#0f172a] text-white relative overflow-hidden border-t border-slate-900">
      {/* Background radial overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_60%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-400/20 px-3 py-1 rounded-full">
            Our Reputation
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-white">
            Why Businesses Trust E-Lawyers
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-light leading-relaxed">
            We bridge the gap between complex legal bureaucracy and modern corporate efficiency. Thousands of entrepreneurs have legally set up shop in Bangladesh under our watch.
          </p>
        </div>

        {/* 8 points Trust Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {trusts.map((item, index) => (
            <div 
              key={index}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between text-left hover:border-blue-500/50 transition-all group"
            >
              <div className="space-y-4">
                <div className={`p-2.5 rounded-xl w-fit ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-white font-display tracking-tight leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
