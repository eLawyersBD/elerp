/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from '../motion';
import { 
  Rocket, 
  User, 
  Users, 
  Building2, 
  MonitorPlay, 
  ShoppingBag, 
  Truck, 
  Ship, 
  Utensils, 
  Factory, 
  Briefcase, 
  Cpu, 
  GraduationCap, 
  HeartPulse 
} from 'lucide-react';

export default function WhoNeedsLicense() {
  const categories = [
    {
      title: "New Entrepreneurs",
      desc: "Starting a new venture and requiring a pristine initial licensing status.",
      icon: Rocket,
      accent: "from-blue-500/10 to-indigo-500/10 text-blue-600"
    },
    {
      title: "Sole Proprietorships",
      desc: "Retail shops, agencies, freelancers, consultants, and neighborhood businesses.",
      icon: User,
      accent: "from-emerald-500/10 to-teal-500/10 text-emerald-600"
    },
    {
      title: "Partnership Firms",
      desc: "New joint ventures needing joint license registration and deed listings.",
      icon: Users,
      accent: "from-purple-500/10 to-pink-500/10 text-purple-600"
    },
    {
      title: "Private Limited Companies",
      desc: "Corporate entities, subsidiary companies, and local branch offices.",
      icon: Building2,
      accent: "from-amber-500/10 to-orange-500/10 text-amber-600"
    },
    {
      title: "E-Commerce & F-Commerce",
      desc: "Facebook shops, digital stores, and creators requiring licenses for payment gateway integrations.",
      icon: ShoppingBag,
      accent: "from-sky-500/10 to-cyan-500/10 text-sky-600"
    },
    {
      title: "Digital & IT Agencies",
      desc: "Software development houses, marketing agencies, and IT outsourcing experts.",
      icon: Cpu,
      accent: "from-fuchsia-500/10 to-rose-500/10 text-fuchsia-600"
    },
    {
      title: "Courier & Logistics",
      desc: "Delivery agents, warehousing ventures, and courier businesses.",
      icon: Truck,
      accent: "from-indigo-500/10 to-blue-500/10 text-indigo-600"
    },
    {
      title: "Import-Export Businesses",
      desc: "Global traders needing Trade Licenses as prerequisite for IRC/ERC.",
      icon: Ship,
      accent: "from-teal-500/10 to-emerald-500/10 text-teal-600"
    },
    {
      title: "Restaurants & Food Services",
      desc: "Eateries, bakeries, cloud kitchens, and cafes needing food-grade classifications.",
      icon: Utensils,
      accent: "from-rose-500/10 to-red-500/10 text-rose-600"
    },
    {
      title: "Manufacturing Plants",
      desc: "Factories, mills, printing presses, and small-to-medium industrial operations.",
      icon: Factory,
      accent: "from-slate-500/10 to-zinc-500/10 text-slate-700"
    },
    {
      title: "Consulting & Law Firms",
      desc: "Professional advisors, accounting firms, and business setup specialists.",
      icon: Briefcase,
      accent: "from-emerald-500/10 to-indigo-500/10 text-emerald-600"
    },
    {
      title: "Educational Institutions",
      desc: "Coaching centers, private academies, schools, and training institutes.",
      icon: GraduationCap,
      accent: "from-amber-500/10 to-yellow-500/10 text-amber-600"
    },
    {
      title: "Healthcare Providers",
      desc: "Diagnostic centers, pharmacies, dental chambers, and medical offices.",
      icon: HeartPulse,
      accent: "from-red-500/10 to-pink-500/10 text-red-600"
    }
  ];

  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Target Audience
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Who Needs a Trade License?
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
            Our registration service is fully optimized to support all forms of business entities and industries. Select your sector below to secure direct legal assistance.
          </p>
        </div>

        {/* Dynamic Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.02 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left"
            >
              <div className="space-y-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${cat.accent} w-fit`}>
                  <cat.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 font-display tracking-tight">
                  {cat.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-light">
                  {cat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
