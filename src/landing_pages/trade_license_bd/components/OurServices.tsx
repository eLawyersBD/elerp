/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from '../motion';
import { SERVICE_CATALOG } from '../data';
import { ServiceCatalogItem } from '../types';
import { trackStandardEvent, trackCustomEvent } from '../lib/metaPixel';
import { 
  FileCheck, 
  RefreshCw, 
  Settings, 
  Edit3, 
  XCircle, 
  User, 
  Users, 
  Building, 
  CheckCircle, 
  ArrowLeft, 
  Clock, 
  FileText, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Award,
  ChevronRight,
  HelpCircleIcon
} from 'lucide-react';

// Icon Helper mapping
const getIcon = (name: string) => {
  switch (name) {
    case 'FileCheck': return FileCheck;
    case 'RefreshCw': return RefreshCw;
    case 'Settings': return Settings;
    case 'Edit3': return Edit3;
    case 'XCircle': return XCircle;
    case 'User': return User;
    case 'Users': return Users;
    case 'Building': return Building;
    case 'CheckCircle': return CheckCircle;
    default: return HelpCircleIcon;
  }
};

interface OurServicesProps {
  onSelectService: (serviceTitle: string) => void;
  onActiveServiceChange?: (service: ServiceCatalogItem | null) => void;
  activeService?: ServiceCatalogItem | null;
}

export default function OurServices({ onSelectService, onActiveServiceChange, activeService }: OurServicesProps) {
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null);

  React.useEffect(() => {
    if (activeService !== undefined) {
      setSelectedService(activeService);
    }
  }, [activeService]);

  React.useEffect(() => {
    if (selectedService) {
      trackStandardEvent('ViewContent', {
        content_name: selectedService.title,
        content_category: 'Service Portfolio',
        value: 12500,
        currency: 'BDT'
      });
    }
  }, [selectedService]);

  React.useEffect(() => {
    if (onActiveServiceChange) {
      onActiveServiceChange(selectedService);
    }
  }, [selectedService, onActiveServiceChange]);

  const handleApplyNow = (service: ServiceCatalogItem) => {
    trackCustomEvent('TradeLicense_CTA_Click', {
      button_name: `Apply - ${service.title}`,
      service_name: service.title,
      section: 'Our Services Portfolio'
    });
    onSelectService(service.title);
  };

  return (
    <section id="services-section" className="py-20 bg-slate-50 border-y border-slate-200 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <AnimatePresence mode="wait">
          {!selectedService ? (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-16"
            >
              {/* Section Header */}
              <div className="text-center max-w-3xl mx-auto space-y-3">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                  Service Portfolio
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
                  Licensing Services & Solutions
                </h2>
                <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
                  E-Lawyers manages the entire lifecycle of your business licenses. Select a service below to view its dedicated requirements, official timelines, and legal roadmaps.
                </p>
              </div>

              {/* Services Grid - 9 services */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SERVICE_CATALOG.map((service, index) => {
                  const IconComponent = getIcon(service.iconName);
                  return (
                    <div 
                      key={service.id}
                      className="bg-white border border-slate-200 hover:border-blue-600 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-left group"
                    >
                      <div className="space-y-4">
                        {/* Service Icon with soft blue background / Full picture for first and second boxes */}
                        {index === 0 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/gbdYxDw9/e6f34923-0212-489c-88d3-6b337b2195a6.png"
                              alt="Government Treasury Payment Challan"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : index === 1 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/q3kKGtHL/80cc1441-42f0-45f0-8e43-cd054064ea2d.png"
                              alt="Trade License Renewal Document"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : index === 2 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/ZR1sy7tJ/6521615d-d4cc-45d2-8061-c50d86201799.png"
                              alt="Trade License Category Changes Document"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : index === 3 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/tMTknjWr/25c8cd08-1996-4078-8ac4-5199a2075d1e-1.png"
                              alt="Trade License Name Update Document"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : index === 4 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/kVdg9y0X/4c0a0b62-1d46-454f-9595-5c89100b6fa4-1.png"
                              alt="Trade License Cancellation Document"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : index === 5 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/JWGN95nf/03e4444a-4559-4341-834e-23ec79289b38-2.png"
                              alt="Proprietorship Trade License Document"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : index === 6 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/JWGN95nf/03e4444a-4559-4341-834e-23ec79289b38-2.png"
                              alt="Partnership Trade License Document"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : index === 7 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/5gt4vhPZ/a1cfdd38-8bc0-4816-983a-910d311fa238.png"
                              alt="Private Limited Company Trade License Document"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : index === 8 ? (
                          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900 mb-2">
                            <img
                              src="https://i.ibb.co/5gt4vhPZ/a1cfdd38-8bc0-4816-983a-910d311fa238.png"
                              alt="Trade License Correction Document"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                          </div>
                        ) : (
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <IconComponent className="h-6 w-6" />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <h3 className="text-base font-bold text-slate-900 font-display tracking-tight group-hover:text-blue-700 transition-colors">
                            {service.title}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Timeline: {service.timeline}
                          </p>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed font-light line-clamp-3">
                          {service.description}
                        </p>
                      </div>

                      <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedService(service)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 group/btn cursor-pointer"
                        >
                          View Requirements
                          <ChevronRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                        </button>

                        <button
                          onClick={() => handleApplyNow(service)}
                          className="px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl text-left space-y-10 relative overflow-hidden"
            >
              {/* Back to main catalog button */}
              <button
                onClick={() => setSelectedService(null)}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 text-blue-600" />
                Back to All Services
              </button>

              {/* Service Hero / Landing Page Main Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Left Column - Service Landing Page Description */}
                <div className="lg:col-span-7 space-y-6">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-widest font-mono">
                    Service Landing Page Details
                  </span>
                  
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
                    {selectedService.landingPageTitle}
                  </h1>

                  <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed border-l-4 border-amber-500 pl-4 italic bg-slate-50 py-3 rounded-r-xl">
                    "{selectedService.tagline}"
                  </p>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Service Overview</h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-light">
                      {selectedService.details.overview}
                    </p>
                  </div>

                  {/* Who Needs This checklist */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Who Needs This Service?</h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {selectedService.details.whoNeedsIt.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <span className="text-xs text-slate-600 font-light leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Immediate CTA triggers scroll to consultation form with prefilled state */}
                  <div className="pt-6 flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => handleApplyNow(selectedService)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition cursor-pointer shadow-lg shadow-blue-600/10"
                    >
                      Apply for This Service
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => setSelectedService(null)}
                      className="inline-flex items-center justify-center px-6 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold uppercase tracking-wider text-xs transition cursor-pointer"
                    >
                      See Other Services
                    </button>
                  </div>
                </div>

                {/* Right Column - Beautiful Poster Poster Image & Key Specs */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Poster Image Container */}
                  <div className="relative rounded-2xl overflow-hidden shadow-md aspect-4/3 group border border-slate-100 bg-slate-900">
                    <img 
                      src={selectedService.imageUrl} 
                      alt={`${selectedService.title} Poster`} 
                      className={`${
                        selectedService.imageUrl.includes('ibb.co')
                          ? 'object-contain p-2'
                          : 'object-cover'
                      } w-full h-full group-hover:scale-105 transition-transform duration-700`}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                      <p className="text-[9px] font-bold tracking-widest text-amber-400 uppercase font-mono">Service Poster Visual</p>
                      <h4 className="text-sm font-bold truncate">{selectedService.title}</h4>
                    </div>
                  </div>

                  {/* Fast timeline card */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">Expected Timeline</span>
                      <span className="text-xs font-bold text-slate-900 font-mono flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                        <Clock className="h-3.5 w-3.5" />
                        {selectedService.timeline}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Guaranteed Deliverables</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-light">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>100% government fee transparency</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-light">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>Complete physical license booklet delivery</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-light">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>High-resolution PDF uploaded to Portal</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Lower Section - Split: Documents Required vs process roadmaps */}
              <div className="border-t border-slate-200 pt-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* Documents Column */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 font-display">
                    <FileText className="h-4.5 w-4.5 text-blue-600" />
                    Required Documents Checklist
                  </h3>
                  <p className="text-xs text-slate-500 font-light leading-relaxed">
                    Please prepare these documents for submission. High-resolution photos or scans are accepted in our secure digital portal.
                  </p>
                  
                  <div className="space-y-2.5">
                    {selectedService.details.requiredDocs.map((doc, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                        <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-medium text-slate-700">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Processing Steps Roadmap Column */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 font-display">
                    <Award className="h-4.5 w-4.5 text-blue-600" />
                    Step-by-Step Service Delivery
                  </h3>
                  <p className="text-xs text-slate-500 font-light leading-relaxed">
                    Here is the operational workflow our case officers follow once your consultation and documents are approved.
                  </p>

                  <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4 py-1">
                    {selectedService.details.processSteps.map((step, idx) => (
                      <div key={idx} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                        <span className="text-xs text-slate-600 font-light leading-relaxed block">
                          <strong className="font-semibold text-slate-800">Stage {idx + 1}:</strong> {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
