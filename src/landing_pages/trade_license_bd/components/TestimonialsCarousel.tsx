/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '../motion';
import { 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Quote, 
  CheckCircle, 
  Building, 
  MapPin, 
  Award,
  Sparkles
} from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  companyName: string;
  location: string;
  category: 'it' | 'retail' | 'trade' | 'service';
  categoryLabel: string;
  rating: number;
  feedback: string;
  bengaliFeedback: string;
  businessPhotoUrl: string;
  clientPhotoUrl?: string;
  licenseObtained: string;
  tradeLicenseNo: string;
  tinNo: string;
  authorityBadge: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'আসিফুর রহমান (Asifur Rahman)',
    role: 'Managing Director & Co-Founder',
    companyName: 'NexByte Software Solutions Ltd.',
    location: 'DNCC, Gulshan-2, Dhaka',
    category: 'it',
    categoryLabel: 'IT & Software Startup',
    rating: 5,
    feedback: 'Filing our tech company trade license with E-Lawyers was an absolute breeze. Having a dedicated dashboard where we could watch the RJSC paperwork and municipal processing steps saved us countlessly. 100% transparent pricing with zero inspector hassles!',
    bengaliFeedback: 'ই-লয়ার্স এর মাধ্যমে আমাদের গুলশান টেক স্টার্টআপের ট্রেড লাইসেন্স ও প্রাইভেট লিমিটেড ডকুমেন্টস মাত্র ৫ দিনে কোনো ঝামেলা ছাড়াই প্রসেস হয়েছে। অনলাইন ট্র্যাকিং ও ফিক্সড ফি মডেল অত্যন্ত চমৎকার!',
    businessPhotoUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=600&h=400&q=80',
    clientPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    licenseObtained: 'Sole Proprietorship ➔ Private Ltd.',
    tradeLicenseNo: 'TRAD/DNCC/018492/2024',
    tinNo: 'e-TIN: 8492-3019-4812',
    authorityBadge: 'DNCC (ঢাকা উত্তর)'
  },
  {
    id: '2',
    name: 'নুসরাত জাহান (Nusrat Jahan)',
    role: 'Founder & Head Baker',
    companyName: 'The Crumb & Crust Cafe',
    location: 'DSCC, Dhanmondi 27, Dhaka',
    category: 'retail',
    categoryLabel: 'Food & Boutique Cafe',
    rating: 5,
    feedback: 'I was very worried about getting my food hygiene inspection clearances and municipal approvals for our Dhanmondi cafe. E-Lawyers handled everything—from fire safety compliance to final signboard tax clearance. Very professional and polite!',
    bengaliFeedback: 'ধানমন্ডি এলাকায় আমাদের ক্যাফের ফুড সেফটি ও মিউনিসিপ্যাল সাইনবোর্ড ট্যাক্স ক্লিয়ারেন্স নিয়ে বেশ দুশ্চিন্তায় ছিলাম। ই-লয়ার্স টিম সব কাজ অত্যন্ত প্রফেশনালি শেষ করেছে। ধন্যবাদ ই-লয়ার্স!',
    businessPhotoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&h=400&q=80',
    clientPhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    licenseObtained: 'Food Retail & Commercial License',
    tradeLicenseNo: 'TRAD/DSCC/039102/2024',
    tinNo: 'e-TIN: 3910-2910-1092',
    authorityBadge: 'DSCC (ঢাকা দক্ষিণ)'
  },
  {
    id: '3',
    name: 'কাজী মাসুদ (Kazi Masud)',
    role: 'Chief Logistics Officer',
    companyName: 'Bengal Global Importers',
    location: 'Agrabad C/A, Halishahar, Chattogram',
    category: 'trade',
    categoryLabel: 'Import & Export Hub',
    rating: 5,
    feedback: 'We needed a complex trade license and customs liaison to clear our initial shipping inventory in Chattogram Port. E-Lawyers delivered in under 8 business days! The dynamic cost estimator was accurate down to the last Taka.',
    bengaliFeedback: 'চট্টগ্রাম বন্দর দিয়ে পণ্য খালাসের জন্য আমাদের ট্রেড লাইসেন্স ও আইআরসি পারমিট দ্রুত প্রয়োজন ছিল। ই-লয়ার্স ৮ কার্যদিবসের মধ্যে সরাসরি আমাদের চট্টগ্রাম অফিসে অফিশিয়াল লাইসেন্স ডেলিভারি দিয়েছে।',
    businessPhotoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&h=400&q=80',
    clientPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    licenseObtained: 'Import, Export & Wholesaling License',
    tradeLicenseNo: 'TRAD/CCC/091234/2024',
    tinNo: 'e-TIN: 1923-4019-2091',
    authorityBadge: 'CCC (চট্টগ্রাম)'
  },
  {
    id: '4',
    name: 'ফারহানা ইয়াসমিন (Farhana Yasmin)',
    role: 'Creative Director',
    companyName: 'Zest Digital Media',
    location: 'Zindabazar, Sylhet City Corporation',
    category: 'service',
    categoryLabel: 'Creative Agency & Services',
    rating: 5,
    feedback: 'Operating a creative agency from home during early days, we did not know if we could get a legal trade license. E-Lawyers provided flawless guidance on residential licensing rules, filed our application, and delivered our official booklet to our doorstep.',
    bengaliFeedback: 'সিলেট শহরে হোম-বেসড ক্রিয়েটিভ এজেন্সি হিসেবে বৈধ ট্রেড লাইসেন্স পাব কিনা বুঝতে পারছিলাম না। ই-লয়ার্স লিগ্যাল টিম সব প্রসেস বুঝিয়ে অফিশিয়াল লাইসেন্স বুকলেট আমাদের ঠিকানায় কুরিয়ার করেছে।',
    businessPhotoUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&h=400&q=80',
    clientPhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
    licenseObtained: 'Sole Proprietorship License',
    tradeLicenseNo: 'TRAD/SCC/028192/2024',
    tinNo: 'e-TIN: 9281-0192-8301',
    authorityBadge: 'SCC (সিলেট)'
  },
  {
    id: '5',
    name: 'তানভীর আহমেদ (Tanvir Ahmed)',
    role: 'Operations Director',
    companyName: 'Apex Organic Fertilizers',
    location: 'Savar Pourashava, Dhaka',
    category: 'trade',
    categoryLabel: 'Agro-Business & Manufacturing',
    rating: 5,
    feedback: 'E-Lawyers simplified our manufacturing license processing immensely. They drafted legal resolutions, registered our partnership deed, and coordinated with local Pourashava officials for environmental approvals. Perfect blend of legal competence and digital ease!',
    bengaliFeedback: 'সাভার পৌরসভা এলাকায় এগ্রো-ম্যানুফ্যাকচারিং প্ল্যান্টের জন্য লাইসেন্স ও পরিবেশ ছাড়পত্র পাওয়ার জটিল কাজ ই-লয়ার্স অত্যন্ত দক্ষতার সাথে সম্পন্ন করেছে। তাদের সার্ভিস ১০০০% বিশ্বস্ত!',
    businessPhotoUrl: 'https://images.unsplash.com/photo-1530124560072-aab9aef1988b?auto=format&fit=crop&w=600&h=400&q=80',
    clientPhotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    licenseObtained: 'Pourashava Manufacturing Permit',
    tradeLicenseNo: 'TRAD/SAVAR/041902/2024',
    tinNo: 'e-TIN: 4190-2019-3821',
    authorityBadge: 'সাভার পৌরসভা'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Industries' },
  { id: 'it', label: 'IT & Startups' },
  { id: 'retail', label: 'Retail & Cafe' },
  { id: 'trade', label: 'Trade & Logistics' },
  { id: 'service', label: 'Agencies & Services' }
];

export default function TestimonialsCarousel() {
  const [selectedCat, setSelectedCat] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter testimonials based on selected category
  const filteredTestimonials = TESTIMONIALS.filter(t => 
    selectedCat === 'all' ? true : t.category === selectedCat
  );

  // Reset index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCat]);

  // Autoplay functionality
  useEffect(() => {
    if (isAutoPlaying && filteredTestimonials.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % filteredTestimonials.length);
      }, 6000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAutoPlaying, filteredTestimonials]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(prev => 
      prev === 0 ? filteredTestimonials.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(prev => 
      (prev + 1) % filteredTestimonials.length
    );
  };

  const currentTestimonial = filteredTestimonials[currentIndex];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200 overflow-hidden relative" id="testimonials-section">
      {/* Decorative ambient elements */}
      <div className="absolute top-1/4 left-0 h-72 w-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 h-72 w-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mx-auto">
            <Award className="h-3.5 w-3.5 text-blue-600" />
            Social Proof & Verification
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Registered Businesses Speak
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
            See how entrepreneurs, startups, and traders across Bangladesh successfully set up and scale their businesses with E-Lawyers. Real clients, verified outcomes.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12 max-w-2xl mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCat(cat.id);
                setIsAutoPlaying(false);
              }}
              className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                selectedCat === cat.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                  : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Testimonials Carousel Display */}
        {filteredTestimonials.length > 0 ? (
          <div className="max-w-5xl mx-auto">
            <div 
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12 relative"
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              
              {/* Left Side: Business Photo & License Details (md:col-span-5) */}
              <div className="md:col-span-5 relative min-h-[240px] md:min-h-[400px] bg-slate-900 flex flex-col justify-end p-6 sm:p-8 text-white">
                <div className="absolute inset-0 z-0">
                  <img 
                    src={currentTestimonial.businessPhotoUrl} 
                    alt={`${currentTestimonial.companyName} workplace`} 
                    className="h-full w-full object-cover opacity-60"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Category Badge */}
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest bg-blue-600 border border-blue-500 text-white px-2.5 py-1 rounded-full w-fit block">
                    {currentTestimonial.categoryLabel}
                  </span>

                  {/* Business Name */}
                  <div className="space-y-1 text-left">
                    <h4 className="text-base sm:text-lg font-bold font-serif leading-tight">
                      {currentTestimonial.companyName}
                    </h4>
                    <p className="text-xs text-slate-300 font-light flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      {currentTestimonial.location}
                    </p>
                  </div>

                  {/* License Obtained Status Banner */}
                  <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-3 rounded-xl text-left space-y-1">
                    <span className="text-[9px] text-slate-300 font-mono uppercase tracking-wider block">License Secured</span>
                    <p className="text-xs font-bold flex items-center gap-1.5 text-white">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      {currentTestimonial.licenseObtained}
                    </p>
                  </div>
                </div>

              </div>

              {/* Right Side: Quote & Star Ratings & Client profile (md:col-span-7) */}
              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between text-left space-y-6 relative">
                <div className="absolute top-6 right-8 text-slate-100 opacity-80 pointer-events-none hidden sm:block">
                  <Quote className="h-16 w-16 text-slate-100 fill-slate-100/30 shrink-0" />
                </div>

                <div className="space-y-4">
                  {/* Rating Stars & Authority Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(currentTestimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4.5 w-4.5 text-amber-400 fill-amber-400 shrink-0" />
                      ))}
                      <span className="text-xs text-slate-500 font-mono ml-1 font-semibold">5.0 / 5.0</span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      <span>🇧🇩 {currentTestimonial.authorityBadge}</span>
                    </span>
                  </div>

                  {/* Bengali Feedback Quote Block */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-600" /> ক্লায়েন্ট বাংলা বার্তা
                    </span>
                    <p className="text-slate-800 text-xs sm:text-sm leading-relaxed font-normal">
                      "{currentTestimonial.bengaliFeedback}"
                    </p>
                  </div>

                  {/* English Feedback Text */}
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-light italic">
                    "{currentTestimonial.feedback}"
                  </p>

                  {/* Verified Trade License Details Tag */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 pt-1">
                    <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold">
                      {currentTestimonial.tradeLicenseNo}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{currentTestimonial.tinNo}</span>
                  </div>
                </div>

                {/* Client Profile details */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    {currentTestimonial.clientPhotoUrl && (
                      <img 
                        src={currentTestimonial.clientPhotoUrl} 
                        alt={currentTestimonial.name} 
                        className="h-11 w-11 rounded-full object-cover border-2 border-blue-50 shrink-0 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-none">
                        {currentTestimonial.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-light mt-1">
                        {currentTestimonial.role}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-lg flex items-center gap-1 shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[10px] text-emerald-900 font-bold uppercase tracking-wider font-mono">Verified Client 🇧🇩</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Navigation buttons and Indicators */}
            <div className="flex items-center justify-between mt-6 px-2">
              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5">
                {filteredTestimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsAutoPlaying(false);
                    }}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      index === currentIndex 
                        ? 'w-6 bg-blue-600' 
                        : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Navigation arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-950 transition-colors shadow-sm cursor-pointer"
                  aria-label="Previous client"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-950 transition-colors shadow-sm cursor-pointer"
                  aria-label="Next client"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center p-12 bg-white border border-slate-200 rounded-3xl max-w-xl mx-auto">
            <p className="text-slate-500">No testimonials found in this industry. Check other industries!</p>
          </div>
        )}

      </div>
    </section>
  );
}
