/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ComponentType } from 'react';
import { motion, AnimatePresence } from '../motion';
import { 
  Eye, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Maximize2, 
  X, 
  FileCheck, 
  Building2, 
  User, 
  Users, 
  Building, 
  Layers,
  Filter 
} from 'lucide-react';

export type CategoryFilter = 'All' | 'Proprietorship' | 'Partnership' | 'Limited Company';

interface DocumentItem {
  id: number;
  title: string;
  category: string;
  tags: ('Proprietorship' | 'Partnership' | 'Limited Company')[];
  authority: string;
  description: string;
  src: string;
  color: string;
  features: string[];
}

export default function OfficialDocumentsGallery() {
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('All');
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);

  const documents: DocumentItem[] = [
    {
      id: 0,
      title: "Digital E-Trade License Specimen",
      category: "Official Issued License",
      tags: ["Proprietorship", "Partnership", "Limited Company"],
      authority: "Dhaka North City Corporation (DNCC)",
      description: "Our team processes and secures the modern, QR-code enabled digitized trade license matching all municipal standards.",
      src: "https://i.ibb.co.com/4nnsfpDZ/ada320d1-685c-4b42-963e-73cc90013045.png",
      color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20",
      features: ["QR-Code Verifiable", "Instant Digital Copy", "Fully Stamped & Signed"]
    },
    {
      id: 1,
      title: "Government Treasury Payment Challan",
      category: "Official Tax Challan",
      tags: ["Proprietorship", "Partnership", "Limited Company"],
      authority: "Sonali Bank / Government Treasury",
      description: "We provide absolute receipt transparency. Every municipal fee and tax is directly deposited into the government treasury.",
      src: "https://i.ibb.co.com/gbdYxDw9/e6f34923-0212-489c-88d3-6b337b2195a6.png",
      color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
      features: ["Official Treasury Receipt", "No Hidden Bribe Handouts", "Audit-Ready Document"]
    },
    {
      id: 2,
      title: "Traditional Issued Trade License Book",
      category: "Official Issued License",
      tags: ["Proprietorship", "Partnership"],
      authority: "Dhaka South City Corporation (DSCC)",
      description: "Physical municipal collection and processing services. Secure physical book copies stamped and hand-delivered directly to you.",
      src: "https://i.ibb.co.com/4nnsfpDZ/ada320d1-685c-4b42-963e-73cc90013045.png",
      color: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
      features: ["Official Stamped Copy", "Verified Serial ID", "Renewable Registry Record"]
    },
    {
      id: 3,
      title: "Registered Partnership Deed & Form I",
      category: "Legal Partnership Deed",
      tags: ["Partnership"],
      authority: "Sub-Registrar Office & Ward Licensing",
      description: "Notarized and registered partnership agreement executed on non-judicial stamp paper with official registrar endorsements.",
      src: "https://i.ibb.co.com/gbdYxDw9/e6f34923-0212-489c-88d3-6b337b2195a6.png",
      color: "from-indigo-500/10 to-purple-500/10 border-indigo-500/20",
      features: ["Sub-Registrar Stamped", "Partner Share Schedule", "Bank Account Opening Ready"]
    },
    {
      id: 4,
      title: "RJSC Certificate of Incorporation & Form XII",
      category: "Company Incorporation",
      tags: ["Limited Company"],
      authority: "RJSC (Joint Stock Companies)",
      description: "Certified Certificate of Incorporation, Memorandum & Articles of Association, and Form XII for Private Limited Companies.",
      src: "https://i.ibb.co.com/4nnsfpDZ/ada320d1-685c-4b42-963e-73cc90013045.png",
      color: "from-blue-600/10 to-cyan-500/10 border-blue-600/20",
      features: ["Certified MoA & AoA", "Digital Entity Seal", "Official Director List"]
    },
    {
      id: 5,
      title: "RJSC Name Clearance & Commercial Permit",
      category: "Corporate Name Clearance",
      tags: ["Limited Company"],
      authority: "RJSC & Municipal Authority",
      description: "Verified company name clearance certificate paired with municipal commercial trade authorization permits.",
      src: "https://i.ibb.co.com/gbdYxDw9/e6f34923-0212-489c-88d3-6b337b2195a6.png",
      color: "from-teal-500/10 to-emerald-500/10 border-teal-500/20",
      features: ["Name Approval Certificate", "RJSC Tracking No.", "180-Day Name Reservation"]
    }
  ];

  const filterCategories: { id: CategoryFilter; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: 'All', label: 'All Documents', icon: Layers },
    { id: 'Proprietorship', label: 'Proprietorship', icon: User },
    { id: 'Partnership', label: 'Partnership', icon: Users },
    { id: 'Limited Company', label: 'Limited Company', icon: Building },
  ];

  const filteredDocuments = selectedFilter === 'All'
    ? documents
    : documents.filter(doc => doc.tags.includes(selectedFilter));

  return (
    <section className="py-20 bg-slate-50 relative overflow-hidden border-t border-slate-200">
      {/* Dynamic background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50/40 rounded-full blur-3xl -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
            100% Verifiable Documentation
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Real Completed Trade Licenses & Legal Specimen Gallery
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-light leading-relaxed">
            We operate with complete regulatory precision. Review actual examples of authorized, legally binding trade licenses, government challans, and corporate deeds secured for our clients.
          </p>
        </div>

        {/* Category Filter Button Group */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12 max-w-4xl mx-auto">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/60 rounded-full text-slate-500 text-xs font-semibold mr-1">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Category:</span>
          </div>
          {filterCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedFilter === cat.id;
            const count = cat.id === 'All'
              ? documents.length
              : documents.filter(d => d.tags.includes(cat.id as any)).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedFilter(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-slate-900/20 ring-2 ring-slate-900 scale-[1.02]'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isSelected ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gallery Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          <AnimatePresence mode="popLayout">
            {filteredDocuments.map((doc, idx) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Visual Image container with overlay actions */}
                  <div className="relative w-full rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden group/image shadow-inner flex items-center justify-center p-2">
                    <img
                      src={doc.src}
                      alt={doc.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto object-contain rounded-xl group-hover/image:scale-[1.015] transition-transform duration-500"
                    />
                    
                    {/* Subtle confidentiality watermark */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center rotate-12 select-none pointer-events-none opacity-[0.06] sm:opacity-[0.08]">
                      <span className="text-slate-900 text-3xl font-extrabold tracking-widest uppercase border-4 border-slate-900 px-6 py-2 rounded-xl">
                        SPECIMEN
                      </span>
                    </div>

                    {/* Actions overlay on hover */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <button
                        onClick={() => setActiveDoc(doc)}
                        className="p-3 bg-white text-slate-900 rounded-full hover:bg-blue-600 hover:text-white transition shadow-lg cursor-pointer flex items-center justify-center gap-2 font-bold text-xs px-4"
                        title="Inspect Document"
                      >
                        <Maximize2 className="h-4 w-4" />
                        <span>Inspect</span>
                      </button>
                    </div>

                    {/* Badges in visual container */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      <span className="bg-white/95 backdrop-blur border border-slate-200 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">
                        {doc.category}
                      </span>
                      <span className="bg-emerald-600/95 text-white backdrop-blur border border-emerald-500/30 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-white" />
                        Verified Official
                      </span>
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-wider font-sans">{doc.authority}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-display leading-snug">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-light leading-relaxed">
                      {doc.description}
                    </p>
                  </div>
                </div>

                {/* Bullet Features & Footer Action */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {doc.features.map((feat, fIdx) => (
                      <span 
                        key={fIdx} 
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-600"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        {feat}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveDoc(doc)}
                    className="w-full py-2.5 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Verify Document Details</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Dynamic Trust Badge Grid */}
        <div className="mt-12 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-left">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0 border border-emerald-100">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">100% Tax Compliant</h4>
              <p className="text-xs text-slate-500 font-light mt-1">Direct verification systems aligned with municipal rules and RJSC standards.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 border-t sm:border-t-0 sm:border-x border-slate-150 pt-4 sm:pt-0 sm:px-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0 border border-blue-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Zero Legal Risk</h4>
              <p className="text-xs text-slate-500 font-light mt-1">All paperwork is prepared and cross-vetted by senior corporate legal advisors.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 border-t sm:border-t-0 pt-4 sm:pt-0">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0 border border-amber-100">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Secure Vault Access</h4>
              <p className="text-xs text-slate-500 font-light mt-1">Retrieve your official documents anytime directly from your password-free tracker.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {activeDoc !== null && (
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            
            {/* Backdrop click close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDoc(null)}
              className="absolute inset-0 cursor-zoom-out"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh] z-50 text-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 block">
                    {activeDoc.authority}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {activeDoc.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Document Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50 flex items-center justify-center min-h-[300px]">
                <div className="relative shadow-md rounded-xl overflow-hidden border border-slate-200 max-w-full">
                  <img
                    src={activeDoc.src}
                    alt={activeDoc.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[60vh] w-auto mx-auto object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rotate-12 select-none pointer-events-none opacity-[0.05]">
                    <span className="text-slate-950 text-4xl font-extrabold tracking-widest uppercase border-4 border-slate-950 px-8 py-3 rounded-2xl">
                      CONFIDENTIAL
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 font-light text-center sm:text-left">
                  These verified specimen files show the precise quality of output E-Lawyers processes.
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveDoc(null)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer text-center shadow-md"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
