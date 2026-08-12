/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from '../motion';
import { 
  FolderOpen, 
  UserCheck, 
  Zap, 
  DollarSign, 
  Building, 
  UserPlus, 
  Scale, 
  Globe2, 
  Laptop, 
  Sparkles 
} from 'lucide-react';

export default function WhyChooseUs() {
  const points = [
    {
      title: "Complete Documentation Support",
      description: "We handle drafting, formatting, and verifying all space contracts, municipal holding certifications, and corporate bylaws.",
      icon: FolderOpen,
      color: "text-blue-500 bg-blue-50"
    },
    {
      title: "Experienced Licensing Consultants",
      description: "Our legal staff has decade-long direct experience working with regional inspectors and municipal committees.",
      icon: UserCheck,
      color: "text-emerald-500 bg-emerald-50"
    },
    {
      title: "Fast Processing Guarantee",
      description: "We optimize submissions through official fast-track pathways to ensure prompt regulatory clearance.",
      icon: Zap,
      color: "text-amber-500 bg-amber-50"
    },
    {
      title: "100% Transparent Pricing",
      description: "You pay only our flat professional fee and the exact government fees. Absolutely no hidden inspector payoffs.",
      icon: DollarSign,
      color: "text-rose-500 bg-rose-50"
    },
    {
      title: "City Corporation & Pourashava Experts",
      description: "Unrivaled expertise navigating both advanced online portals (DNCC/DSCC) and legacy rural pourashava desks.",
      icon: Building,
      color: "text-indigo-500 bg-indigo-50"
    },
    {
      title: "Dedicated Case Manager",
      description: "Get daily WhatsApp updates, personal follow-ups, and an expert answering all your structural queries directly.",
      icon: UserPlus,
      color: "text-teal-500 bg-teal-50"
    },
    {
      title: "Legal Compliance Guaranteed",
      description: "We verify appropriate industrial and trade categories, shielding your business from audits and sudden municipal fines.",
      icon: Scale,
      color: "text-purple-500 bg-purple-50"
    },
    {
      title: "Online & Offline Service",
      description: "Submit documents safely via our secure portal. We manage the physical municipal runs and courier the smart card to your desk.",
      icon: Laptop,
      color: "text-sky-500 bg-sky-50"
    },
    {
      title: "Nationwide Coverage",
      description: "E-Lawyers legally processes trade registrations across all 64 districts and all major City Corporations of Bangladesh.",
      icon: Globe2,
      color: "text-cyan-500 bg-cyan-50"
    },
    {
      title: "One Trusted Legal Partner",
      description: "From Trade Licenses to VAT/BIN, RJSC Incorporation, and Trademark Filings—we handle your entire growth stack.",
      icon: Sparkles,
      color: "text-fuchsia-500 bg-fuchsia-50"
    }
  ];

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <section className="py-20 bg-slate-50 border-y border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Unmatched Professional Quality
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Why Choose E-Lawyers?
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
            One trusted partner for complete, hassle-free Trade License registration anywhere in Bangladesh. We combine elite legal expertise with a modern digital client experience.
          </p>
        </div>

        {/* Benefits Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
        >
          {points.map((point, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="bg-white border border-slate-200/60 hover:border-blue-600 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className={`p-3 rounded-xl w-fit ${point.color}`}>
                  <point.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 font-display tracking-tight leading-snug">
                  {point.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-light">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
