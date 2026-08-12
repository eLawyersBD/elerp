/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { ConsultationRequest, ServiceCatalogItem } from './types';
import SEO from './components/SEO';
import Hero from './components/Hero';
import ConsultationForm from './components/ConsultationForm';
import WhyChooseUs from './components/WhyChooseUs';
import WhatIsTradeLicense from './components/WhatIsTradeLicense';
import WhoNeedsLicense from './components/WhoNeedsLicense';
import AuthoritiesCovered from './components/AuthoritiesCovered';
import OurServices from './components/OurServices';
import DocumentsRequired from './components/DocumentsRequired';
import RegistrationProcess from './components/RegistrationProcess';
import Benefits from './components/Benefits';
import PricingTimeline from './components/PricingTimeline';
import TrustSection from './components/TrustSection';
import TestimonialsCarousel from './components/TestimonialsCarousel';
import ClientPortal from './components/ClientPortal';
import FAQSection from './components/FAQSection';
import Footer from './components/Footer';
import OfficialDocumentsGallery from './components/OfficialDocumentsGallery';
import MetaPixelDebugConsole from './components/MetaPixelDebugConsole';
import GoogleSheetsModal from './components/GoogleSheetsModal';
import { Phone, MessageSquare, Shield, HelpCircle, FileCheck, ArrowRight, Star, Scale, Search, X, FileText, ChevronRight, MapPin, Mail, Globe, FileSpreadsheet, Menu } from 'lucide-react';
import { FAQ_DATA, SERVICE_CATALOG } from './data';
import { initMetaPixel, initEngagementListeners, trackStandardEvent, trackCustomEvent } from './lib/metaPixel';

export default function App() {
  const [activeRequest, setActiveRequest] = useState<ConsultationRequest | null>(null);
  const [preselectedService, setPreselectedService] = useState<string>('');
  const [preselectedBusinessType, setPreselectedBusinessType] = useState<string>('');
  const [preselectedLocation, setPreselectedLocation] = useState<string>('');
  const [activeService, setActiveService] = useState<ServiceCatalogItem | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedFaqIndex, setHighlightedFaqIndex] = useState<number | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [allRequests, setAllRequests] = useState<ConsultationRequest[]>([]);

  // Load all local requests for Google Sheets export
  useEffect(() => {
    const loadRequests = () => {
      const stored = localStorage.getItem('elawyers_requests');
      if (stored) {
        try {
          setAllRequests(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadRequests();
    window.addEventListener('storage', loadRequests);
    return () => window.removeEventListener('storage', loadRequests);
  }, []);

  // Initialize Meta Pixel & Engagement Listeners
  useEffect(() => {
    initMetaPixel();
    const cleanup = initEngagementListeners();
    return () => cleanup();
  }, []);

  // Tracking helpers for WhatsApp and Phone Call clicks
  const handleWhatsAppClick = (location: string) => {
    trackStandardEvent('Contact', {
      channel: 'WhatsApp',
      location,
      value: 12500,
      currency: 'BDT'
    });
    trackCustomEvent('TradeLicense_WhatsApp_Click', {
      location,
      phone_number: '+8801335230184'
    });
  };

  const handleCallClick = (location: string) => {
    trackStandardEvent('Contact', {
      channel: 'Phone Call',
      location,
      value: 12500,
      currency: 'BDT'
    });
    trackCustomEvent('TradeLicense_Call_Click', {
      location,
      phone_number: '+8801335230184'
    });
  };

  const handleHeaderCtaClick = () => {
    trackCustomEvent('TradeLicense_Header_CTA', {
      button_name: 'Register Now',
      section: 'Header Navigation'
    });
    trackCustomEvent('TradeLicense_CTA_Click', {
      button_name: 'Register Now',
      section: 'Header Navigation'
    });
    handleScrollTo('consultation-form-section');
  };

  // Search input auto-focus ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hotkey support for search bar: '/' or 'cmd+k' / 'ctrl+k'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  }, [isSearchOpen]);

  // Close search on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSelectService = (serviceTitle: string) => {
    setPreselectedService(serviceTitle);
    setPreselectedBusinessType('');
    setPreselectedLocation('');
    handleScrollTo('consultation-form-section');
  };

  const handleEstimateApply = (serviceTitle: string, businessType: string, location: string) => {
    setPreselectedService(serviceTitle);
    setPreselectedBusinessType(businessType);
    setPreselectedLocation(location);
    handleScrollTo('consultation-form-section');
  };

  // Scroll to targeted section
  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // When form submission is successful, focus tracker and scroll down smoothly
  const handleSubmissionSuccess = (request: ConsultationRequest) => {
    setActiveRequest(request);
    setTimeout(() => {
      const portalEl = document.getElementById('active-portal-section');
      if (portalEl) {
        portalEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 400);
  };

  // Scroll Progress indicator
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Filter search results
  const getFilteredResults = () => {
    if (!searchQuery.trim()) return { services: [], faqs: [] };
    
    const query = searchQuery.toLowerCase().trim();
    
    const matchedServices = SERVICE_CATALOG.filter(service => 
      service.title.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query) ||
      service.tagline.toLowerCase().includes(query) ||
      (service.details && service.details.overview && service.details.overview.toLowerCase().includes(query))
    );
    
    const matchedFaqs = FAQ_DATA.filter(faq => 
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query)
    );
    
    return { services: matchedServices, faqs: matchedFaqs };
  };

  const { services: matchedServices, faqs: matchedFaqs } = getFilteredResults();
  const hasResults = matchedServices.length > 0 || matchedFaqs.length > 0;

  const popularQueries = [
    { label: "Proprietorship", query: "proprietorship" },
    { label: "Renewal", query: "renewal" },
    { label: "Fees", query: "fee" },
    { label: "Documents Required", query: "document" },
    { label: "Company", query: "company" },
  ];

  const handleServiceClick = (service: ServiceCatalogItem) => {
    setActiveService(service);
    setIsSearchOpen(false);
    setTimeout(() => {
      handleScrollTo('services-section');
    }, 100);
  };

  const handleFaqClick = (faqQuestion: string) => {
    const index = FAQ_DATA.findIndex(f => f.question === faqQuestion);
    if (index !== -1) {
      setHighlightedFaqIndex(index);
    }
    setIsSearchOpen(false);
    setTimeout(() => {
      handleScrollTo('faq-section');
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* React SEO Head Manager (Helmet) */}
      <SEO 
        title={activeService ? `${activeService.landingPageTitle} | E-Lawyers` : undefined}
        description={activeService ? activeService.description : undefined}
        ogImage={activeService ? activeService.imageUrl : undefined}
      />

      {/* Top Page Scroll Progress */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[3.5px] bg-blue-700 origin-left z-50" 
        style={{ scaleX }} 
      />



      {/* Top Contact Announcement Bar */}
      <div className="fixed top-0 inset-x-0 bg-slate-950 text-slate-300 text-[11px] h-8 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-50 border-b border-slate-800">
        <div className="mx-auto max-w-7xl w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-slate-300 truncate">
            <span className="hidden sm:flex items-center gap-1.5 truncate">
              <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="truncate">G-5, BTI Centara Grand, Panthapath, Dhaka-1205</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-emerald-400 shrink-0" />
              <a href="mailto:info@elawyersbd.com" className="hover:text-white transition">info@elawyersbd.com</a>
            </span>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 font-medium">
            <a 
              href="tel:+8801335230184" 
              onClick={() => handleCallClick('Top Announcement Bar')}
              className="flex items-center gap-1 hover:text-amber-300 transition"
            >
              <Phone className="h-3 w-3 text-amber-400" />
              <span>+88 01335230184-81</span>
            </a>
            <a 
              href="https://wa.me/8801335230184" 
              target="_blank" 
              rel="noreferrer"
              onClick={() => handleWhatsAppClick('Top Announcement Bar')}
              className="hidden md:flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition font-bold"
            >
              <MessageSquare className="h-3 w-3" />
              <span>WhatsApp: +880 1335 230184</span>
            </a>
          </div>
        </div>
      </div>

      {/* Modern Fixed Header */}
      <header className="fixed top-8 inset-x-0 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-40 text-slate-800 shadow-md shadow-slate-900/5">
        <div className="mx-auto max-w-7xl w-full flex items-center justify-between gap-4">
          {/* Logo brand */}
          <a 
            href="https://elawyersbd.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
            title="Visit elawyersbd.com"
          >
            <img 
              src="https://i.ibb.co/xTnDkSS/Logo-E-Layers-02.png" 
              alt="E-Lawyers Logo" 
              className="h-10 sm:h-11 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </a>

          {/* Search Trigger Button (acting as standard input search bar) */}
          <div className="hidden sm:block flex-1 max-w-xs sm:max-w-sm">
            <button
              onClick={() => {
                setIsSearchOpen(true);
                trackCustomEvent('TradeLicense_CTA_Click', { button_name: 'Search Bar', section: 'Header' });
              }}
              className="w-full flex items-center justify-between pl-3 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-full text-xs text-slate-400 hover:text-slate-500 hover:bg-slate-100/50 focus:outline-none transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">Search services or help topics...</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 font-mono text-[9px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400 select-none">
                <span>/</span>
              </div>
            </button>
          </div>

          {/* Nav links */}
          <nav className="hidden xl:flex items-center gap-6 text-xs uppercase font-bold tracking-wider text-slate-600 shrink-0">
            <button onClick={() => handleScrollTo('consultation-form-section')} className="hover:text-blue-700 transition cursor-pointer">Request Quote</button>
            <button onClick={() => handleScrollTo('why-us-section')} className="hover:text-blue-700 transition cursor-pointer">Why Us</button>
            <button onClick={() => handleScrollTo('checklist-section')} className="hover:text-blue-700 transition cursor-pointer">Checklist</button>
            <button onClick={() => handleScrollTo('timeline-section')} className="hover:text-blue-700 transition cursor-pointer">Timeline</button>
            <button onClick={() => handleScrollTo('pricing-section')} className="hover:text-blue-700 transition cursor-pointer">Pricing</button>
            <button onClick={() => handleScrollTo('faq-section')} className="hover:text-blue-700 transition cursor-pointer">FAQs</button>
          </nav>

          {/* Quick CTA */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={handleHeaderCtaClick}
              className="inline-flex items-center gap-1.5 justify-center px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-lg transition shrink-0 cursor-pointer shadow shadow-emerald-600/10"
              title="Register Trade License"
            >
              <FileCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Register Now</span>
            </button>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              aria-label="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Enhanced Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 xl:hidden"
            />

            {/* Slide-over menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 max-w-full bg-white shadow-2xl z-50 flex flex-col xl:hidden"
            >
              <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
                <a 
                  href="https://elawyersbd.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                  title="Visit elawyersbd.com"
                >
                  <img 
                    src="https://i.ibb.co/xTnDkSS/Logo-E-Layers-02.png" 
                    alt="E-Lawyers Logo" 
                    className="h-8 w-auto object-contain brightness-0 invert"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-xs font-mono font-bold text-emerald-400">🇧🇩 Bangladesh</span>
                </a>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Navigation Links</p>
                  
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleScrollTo('consultation-form-section'); }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Request Quote</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleScrollTo('why-us-section'); }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Why Choose E-Lawyers</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleScrollTo('checklist-section'); }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Documents Checklist</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleScrollTo('timeline-section'); }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Timeline & Fees</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleScrollTo('pricing-section'); }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Pricing Estimator</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleScrollTo('faq-section'); }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-between transition cursor-pointer"
                  >
                    <span>FAQs & Legal Help</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>

                {/* Contact Card */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Direct Support</p>
                  <a
                    href="tel:+8801335230184"
                    className="flex items-center gap-2 text-xs font-bold text-slate-900 bg-white p-3 rounded-xl border border-slate-200 shadow-sm"
                  >
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>+880 1335 230184</span>
                  </a>
                  <a
                    href="https://wa.me/8801335230184?text=Hello%20E-Lawyers,%20I'm%20interested%20in%20registering%20a%20Trade%20License%20in%20Bangladesh."
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Legal Desk</span>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                <p className="text-[11px] text-slate-500 font-mono">E-Lawyers Bangladesh • Trusted Legal Partner</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT CONTAINERS */}
      <main className="relative">
        
        {/* Step 1: Hero Banner */}
        <Hero onScrollToForm={() => handleScrollTo('consultation-form-section')} />

        {/* Step 2: Our Services Section */}
        <OurServices 
          onSelectService={handleSelectService} 
          onActiveServiceChange={setActiveService}
          activeService={activeService}
        />

        {/* Step 3: Consultation Form Section */}
        <ConsultationForm 
          onSubmitSuccess={handleSubmissionSuccess} 
          preselectedService={preselectedService} 
          preselectedBusinessType={preselectedBusinessType}
          preselectedLocation={preselectedLocation}
        />

        {/* Step 4: Why Choose E-Lawyers Section */}
        <div id="why-us-section" className="scroll-mt-20">
          <WhyChooseUs />
        </div>

        {/* Step 5: What is a Trade License Section */}
        <WhatIsTradeLicense />

        {/* Step 5.5: Official completed government document samples gallery */}
        <OfficialDocumentsGallery />

        {/* Step 6: Who Needs Trade License Section */}
        <WhoNeedsLicense />

        {/* Step 7: Authorities We Cover */}
        <AuthoritiesCovered />

        {/* Step 8: Documents Required (Dossier Checklist) */}
        <div id="checklist-section" className="scroll-mt-20">
          <DocumentsRequired />
        </div>

        {/* Step 9: Registration Process Timeline */}
        <div id="timeline-section" className="scroll-mt-20">
          <RegistrationProcess />
        </div>

        {/* Step 10: Benefits Section */}
        <Benefits />

        {/* Step 11: Pricing & Timeline Grid */}
        <div id="pricing-section" className="scroll-mt-20">
          <PricingTimeline 
            onScrollToForm={() => handleScrollTo('consultation-form-section')} 
            onEstimateApply={handleEstimateApply}
          />
        </div>

        {/* Step 12: Why Businesses Trust Us */}
        <TrustSection />

        {/* Step 12.5: Interactive Client Testimonials Carousel */}
        <TestimonialsCarousel />

        {/* Step 13: Secure Client Portal Dashboard (Active application tracker!) */}
        <ClientPortal activeRequest={activeRequest} />

        {/* Step 14: Frequently Asked Questions Accordion */}
        <div id="faq-section" className="scroll-mt-20">
          <FAQSection highlightedFaqIndex={highlightedFaqIndex} />
        </div>

        {/* Final Convincing Call-to-Action banner */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white py-20 px-4 text-center border-y border-slate-900">
          <div className="absolute inset-0 bg-blue-500/5" />
          <div className="relative mx-auto max-w-4xl space-y-6">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1 w-fit mx-auto">
              <Star className="h-3 w-3 fill-amber-400" />
              Start Your Business with Complete Legal Compliance
            </span>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight">
              Ready to Register Your Trade License?
            </h2>
            
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
              Don't delay your business launch. Our licensing experts will prepare your documents, submit your application, and obtain your Trade License with complete legal compliance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {/* Call Now */}
              <a
                href="tel:+8801335230184"
                onClick={() => handleCallClick('Bottom CTA Banner')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm transition shadow cursor-pointer"
              >
                <Phone className="h-4.5 w-4.5 text-blue-700 shrink-0" />
                Call Now (+88 01335230184)
              </a>

              {/* WhatsApp Us */}
              <a
                href="https://wa.me/8801335230184?text=Hello%20E-Lawyers,%20I'm%20interested%20in%20registering%20a%20Trade%20License%20in%20Bangladesh."
                target="_blank"
                rel="noreferrer"
                onClick={() => handleWhatsAppClick('Bottom CTA Banner')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow shadow-emerald-600/10 cursor-pointer uppercase tracking-wider"
              >
                <MessageSquare className="h-4.5 w-4.5 shrink-0" />
                WhatsApp Us
              </a>

              {/* Free Consultation */}
              <button
                onClick={() => {
                  trackCustomEvent('TradeLicense_Footer_CTA', {
                    button_name: 'Get Free Consultation',
                    section: 'Bottom Banner'
                  });
                  trackCustomEvent('TradeLicense_CTA_Click', {
                    button_name: 'Get Free Consultation',
                    section: 'Bottom Banner'
                  });
                  handleScrollTo('consultation-form-section');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-bold text-sm transition cursor-pointer"
              >
                Get Free Consultation
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Step 15: Footer & SEO Optimization Badges */}
      <Footer onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

      {/* Meta Pixel & GTM Live Command Center Debug Console */}
      <MetaPixelDebugConsole />

      {/* Premium Search Command Palette / Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 sm:p-6 md:p-10">
            {/* Backdrop click close */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="absolute inset-0 cursor-zoom-out"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[80vh] mt-12 md:mt-20 z-50"
            >
              {/* Search Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-150">
                <Search className="h-5 w-5 text-blue-600 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type to search services, help topics, FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-none text-sm md:text-base font-medium py-1"
                />
                <div className="flex items-center gap-2 shrink-0">
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 border border-slate-200 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-mono select-none"
                  >
                    <span>ESC</span>
                  </button>
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="sm:hidden p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Search Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {!searchQuery.trim() ? (
                  // Default Popular searches & categories
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono">Popular Searches</h3>
                      <div className="flex flex-wrap gap-2">
                        {popularQueries.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSearchQuery(item.query)}
                            className="px-3.5 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-full text-xs font-semibold text-slate-700 hover:text-blue-700 transition cursor-pointer"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono">Quick Help Links</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button 
                          onClick={() => { setIsSearchOpen(false); handleScrollTo('pricing-section'); }}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition text-left cursor-pointer group"
                        >
                          <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">৳</div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">Pricing & Fee Estimator</p>
                            <p className="text-[10px] text-slate-400">Calculate government dues & service charges</p>
                          </div>
                        </button>
                        <button 
                          onClick={() => { setIsSearchOpen(false); handleScrollTo('checklist-section'); }}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition text-left cursor-pointer group"
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">Required Documents</p>
                            <p className="text-[10px] text-slate-400">View exact dossier check-list by entity type</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : hasResults ? (
                  // Search Results
                  <div className="space-y-6">
                    {/* Matching Services */}
                    {matchedServices.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Services & Licensing Packages</h3>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{matchedServices.length} {matchedServices.length === 1 ? 'match' : 'matches'}</span>
                        </div>
                        <div className="space-y-2">
                          {matchedServices.map((service) => (
                            <button
                              key={service.id}
                              onClick={() => handleServiceClick(service)}
                              className="w-full flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 transition text-left cursor-pointer group"
                            >
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors flex items-center gap-1.5">
                                  <span>{service.title}</span>
                                  <span className="text-[9px] font-normal text-slate-400 font-mono">Timeline: {service.timeline}</span>
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-light mt-1 line-clamp-2">{service.description}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all shrink-0 mt-2" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching FAQs */}
                    {matchedFaqs.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Help Topics & FAQs</h3>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{matchedFaqs.length} {matchedFaqs.length === 1 ? 'match' : 'matches'}</span>
                        </div>
                        <div className="space-y-2">
                          {matchedFaqs.map((faq, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleFaqClick(faq.question)}
                              className="w-full flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/30 border border-slate-200 hover:border-emerald-200 transition text-left cursor-pointer group"
                            >
                              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                                <HelpCircle className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{faq.question}</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-light mt-1 line-clamp-2">{faq.answer}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all shrink-0 mt-2" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Empty State
                  <div className="text-center py-12 px-4 space-y-4 animate-in fade-in duration-200">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <Search className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">No matching services or topics found</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">We couldn't find matches for "{searchQuery}". Try searching for categories like "Proprietorship", "Renewal", "RJSC", or "NID".</p>
                    </div>
                    <a
                      href="https://wa.me/8801712345678?text=Hello%20E-Lawyers,%20I'm%20having%20trouble%20finding%20information%20on%20your%20website%20regarding%20my%2520Trade%252520License."
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Ask Our Legal Advisor on WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Keyboard tips footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="hidden sm:inline">Use ESC or click backdrop to close search</span>
                <span className="sm:hidden">Swipe or click backdrop to close</span>
                <span>E-Lawyers Smart Search</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Sheets Integration Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        requests={allRequests}
      />

    </div>
  );
}
