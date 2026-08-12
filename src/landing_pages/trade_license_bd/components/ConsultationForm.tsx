/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from '../motion';
import { ConsultationRequest } from '../types';
import { SERVICE_CATALOG } from '../data';
import { CheckCircle2, Upload, Trash2, ShieldCheck, Mail, Phone, Clock, FileText, MessageSquare, Cloud, X } from 'lucide-react';
import ConsultationChat from './ConsultationChat';
import { trackStandardEvent, trackCustomEvent, hashString } from '../lib/metaPixel';
import { getAccessToken, appendRequestsToGoogleSheet } from '../lib/googleAuthAndSheets';

interface ConsultationFormProps {
  onSubmitSuccess: (request: ConsultationRequest) => void;
  preselectedService?: string;
  preselectedBusinessType?: string;
  preselectedLocation?: string;
}

// Subtle confetti burst & animated checkmark component
const SuccessConfettiAnimation = () => {
  // Generate a set of 24 confetti burst particles
  const particles = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i / 24) * 360 + (i % 2 === 0 ? 6 : -6);
    const radius = 60 + (i % 5) * 16;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius - 10;
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6'];
    const color = colors[i % colors.length];
    const size = i % 3 === 0 ? 'w-2.5 h-2.5 rounded-full' : i % 3 === 1 ? 'w-2 h-3 rounded-xs' : 'w-2 h-2 rotate-45';
    const delay = (i % 6) * 0.04;
    const duration = 0.85 + (i % 4) * 0.1;
    const rotation = (i * 45) % 360;

    return { id: i, x, y, color, size, delay, duration, rotation };
  });

  return (
    <div className="relative inline-flex items-center justify-center py-2 my-1">
      {/* Burst Particles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-visible">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 1.25, 1, 0.2],
              x: p.x,
              y: p.y,
              rotate: [0, p.rotation + 180]
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.215, 0.61, 0.355, 1]
            }}
            style={{ backgroundColor: p.color }}
            className={`absolute ${p.size} shadow-xs`}
          />
        ))}
      </div>

      {/* Backlight Glow */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.8, 1.4, 1.1], opacity: [0, 0.5, 0.25] }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute h-24 w-24 rounded-full bg-emerald-400/30 blur-xl pointer-events-none"
      />

      {/* Animated Checkmark Circle */}
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 18,
          delay: 0.05
        }}
        className="relative z-20 h-20 w-20 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 ring-8 ring-emerald-50"
      >
        <svg
          className="h-10 w-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M5 13l4 4L19 7"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.45, delay: 0.25, ease: "easeOut" },
              opacity: { duration: 0.1, delay: 0.25 }
            }}
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default function ConsultationForm({ 
  onSubmitSuccess, 
  preselectedService, 
  preselectedBusinessType,
  preselectedLocation
}: ConsultationFormProps) {
  // Check if draft exists in localStorage on startup
  const getDraft = () => {
    try {
      const draftStr = localStorage.getItem('elawyers_consultation_form_draft');
      if (draftStr) return JSON.parse(draftStr);
    } catch (e) {
      console.error("Error reading draft", e);
    }
    return null;
  };

  const initialDraft = getDraft();

  const [isPopUpOpen, setIsPopUpOpen] = useState(false);

  const [fullName, setFullName] = useState(() => initialDraft?.fullName || '');
  const [mobileNumber, setMobileNumber] = useState(() => initialDraft?.mobileNumber || '');
  const [email, setEmail] = useState(() => initialDraft?.email || '');
  const [businessName, setBusinessName] = useState(() => initialDraft?.businessName || '');
  const [businessType, setBusinessType] = useState(() => initialDraft?.businessType || 'Sole Proprietorship');
  const [businessLocation, setBusinessLocation] = useState(() => initialDraft?.businessLocation || '');
  const [businessAddress, setBusinessAddress] = useState(() => initialDraft?.businessAddress || '');
  const [natureOfBusiness, setNatureOfBusiness] = useState(() => initialDraft?.natureOfBusiness || '');
  const [preferredContact, setPreferredContact] = useState<'Mobile' | 'WhatsApp' | 'Email'>(() => initialDraft?.preferredContact || 'WhatsApp');
  const [additionalInfo, setAdditionalInfo] = useState(() => initialDraft?.additionalInfo || '');
  const [requestedService, setRequestedService] = useState(() => initialDraft?.requestedService || 'Trade License Registration');
  const [currentFormStep, setCurrentFormStep] = useState(() => initialDraft?.currentFormStep || 1);
  const [draftRestored, setDraftRestored] = useState(!!initialDraft);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => initialDraft?.savedAt || null);

  React.useEffect(() => {
    if (preselectedService && !initialDraft) {
      setRequestedService(preselectedService);
      setCurrentFormStep(1);
    }
    if (preselectedBusinessType && !initialDraft) {
      setBusinessType(preselectedBusinessType);
    } else if (preselectedService && !initialDraft) {
      if (preselectedService.includes('Proprietorship')) {
        setBusinessType('Sole Proprietorship');
      } else if (preselectedService.includes('Partnership')) {
        setBusinessType('Partnership Firm');
      } else if (preselectedService.includes('Private Limited Company') || preselectedService.includes('Corporate') || preselectedService.includes('Pvt')) {
        setBusinessType('Private Limited Company');
      }
    }
    if (preselectedLocation && !initialDraft) {
      setBusinessLocation(preselectedLocation);
    }
  }, [preselectedService, preselectedBusinessType, preselectedLocation]);
  
  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; status: 'Uploaded' }[]>(() => initialDraft?.uploadedFiles || []);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newRequest, setNewRequest] = useState<ConsultationRequest | null>(null);

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files).map((file: File) => ({
        name: file.name,
        size: formatBytes(file.size),
        status: 'Uploaded' as const
      }));
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files).map((file: File) => ({
        name: file.name,
        size: formatBytes(file.size),
        status: 'Uploaded' as const
      }));
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateField = (name: string, value: string) => {
    let errorMsg = '';
    
    switch (name) {
      case 'fullName':
        if (!value.trim()) {
          errorMsg = 'Full Name is required';
        }
        break;
      case 'mobileNumber':
        if (!value.trim()) {
          errorMsg = 'Mobile Number is required';
        } else {
          const cleaned = value.replace(/[-\s]/g, '');
          if (!/^(?:\+88|01)?\d{11}$/.test(cleaned)) {
            errorMsg = 'Enter a valid 11-digit Bangladeshi mobile number';
          }
        }
        break;
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errorMsg = 'Please enter a valid email address';
        }
        break;
      case 'businessLocation':
        if (!value.trim()) {
          errorMsg = 'City Corporation or Municipality location is required';
        }
        break;
      default:
        break;
    }

    setErrors(prev => {
      const next = { ...prev };
      if (errorMsg) {
        next[name] = errorMsg;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const validateStep = (step: number) => {
    const tempErrors: { [key: string]: string } = {};
    if (step === 1) {
      if (!fullName.trim()) tempErrors.fullName = "Full Name is required";
      if (!mobileNumber.trim()) {
        tempErrors.mobileNumber = "Mobile Number is required";
      } else {
        const cleaned = mobileNumber.replace(/[-\s]/g, '');
        if (!/^(?:\+88|01)?\d{11}$/.test(cleaned)) {
          tempErrors.mobileNumber = "Enter a valid 11-digit Bangladeshi mobile number";
        }
      }
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        tempErrors.email = "Please enter a valid email address";
      }
    } else if (step === 2) {
      if (!businessLocation.trim()) {
        tempErrors.businessLocation = "City Corporation or Municipality location is required";
      }
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentFormStep)) {
      trackCustomEvent('TradeLicense_Form_Start', {
        form_name: 'Trade License Consultation Form',
        completed_step: currentFormStep,
        next_step: currentFormStep + 1,
        requested_service: requestedService,
        business_type: businessType
      });
      setCurrentFormStep(prev => prev + 1);
    } else {
      trackCustomEvent('TradeLicense_Form_Error', {
        form_name: 'Trade License Consultation Form',
        step: currentFormStep,
        errors: errors
      });
    }
  };

  const handlePrevStep = () => {
    setCurrentFormStep(prev => prev - 1);
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!fullName.trim()) tempErrors.fullName = "Full Name is required";
    if (!mobileNumber.trim()) {
      tempErrors.mobileNumber = "Mobile Number is required";
    } else {
      const cleaned = mobileNumber.replace(/[-\s]/g, '');
      if (!/^(?:\+88|01)?\d{11}$/.test(cleaned)) {
        tempErrors.mobileNumber = "Enter a valid 11-digit Bangladeshi mobile number";
      }
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      tempErrors.email = "Please enter a valid email address";
    }
    if (!businessLocation.trim()) {
      tempErrors.businessLocation = "City Corporation or Municipality location is required";
    }
    setErrors(tempErrors);
    if (Object.keys(tempErrors).length > 0) {
      trackCustomEvent('TradeLicense_Form_Error', {
        form_name: 'Trade License Consultation Form',
        errors: tempErrors
      });
    }
    return Object.keys(tempErrors).length === 0;
  };

  const clearDraft = () => {
    localStorage.removeItem('elawyers_consultation_form_draft');
    setFullName('');
    setMobileNumber('');
    setEmail('');
    setBusinessName('');
    setBusinessType('Sole Proprietorship');
    setBusinessLocation('');
    setBusinessAddress('');
    setNatureOfBusiness('');
    setUploadedFiles([]);
    setAdditionalInfo('');
    setCurrentFormStep(1);
    setErrors({});
    setDraftRestored(false);
    setLastSavedTime(null);
  };

  // Auto-save form fields to localStorage
  React.useEffect(() => {
    if (isSuccess) {
      localStorage.removeItem('elawyers_consultation_form_draft');
      setLastSavedTime(null);
      return;
    }

    const hasData = !!(
      fullName.trim() ||
      mobileNumber.trim() ||
      email.trim() ||
      businessName.trim() ||
      businessLocation.trim() ||
      businessAddress.trim() ||
      natureOfBusiness.trim() ||
      additionalInfo.trim() ||
      uploadedFiles.length > 0
    );

    if (hasData) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const draft = {
        fullName,
        mobileNumber,
        email,
        businessName,
        businessType,
        businessLocation,
        businessAddress,
        natureOfBusiness,
        preferredContact,
        additionalInfo,
        requestedService,
        currentFormStep,
        uploadedFiles,
        savedAt: nowStr
      };
      localStorage.setItem('elawyers_consultation_form_draft', JSON.stringify(draft));
      setLastSavedTime(nowStr);
    } else {
      localStorage.removeItem('elawyers_consultation_form_draft');
      setLastSavedTime(null);
    }
  }, [
    fullName,
    mobileNumber,
    email,
    businessName,
    businessType,
    businessLocation,
    businessAddress,
    natureOfBusiness,
    preferredContact,
    additionalInfo,
    requestedService,
    currentFormStep,
    uploadedFiles,
    isSuccess
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    trackCustomEvent('TradeLicense_Form_Submit', {
      form_name: 'Trade License Consultation Form',
      service_name: requestedService,
      business_type: businessType,
      location: businessLocation
    });

    // Simulate database write
    setTimeout(async () => {
      const submission: ConsultationRequest = {
        id: 'EL-' + Math.floor(100000 + Math.random() * 900000),
        fullName,
        mobileNumber,
        email: email || undefined,
        businessName: businessName || undefined,
        businessType,
        businessLocation,
        businessAddress: businessAddress || undefined,
        natureOfBusiness: natureOfBusiness || undefined,
        requestedService,
        preferredContactMethod: preferredContact,
        additionalInformation: additionalInfo || undefined,
        documents: uploadedFiles.map(f => ({ name: f.name, size: f.size, status: 'Uploaded' })),
        status: 'Received',
        step: 1,
        submittedAt: new Date().toLocaleString('en-US', { hour12: true }),
        notes: "Thank you for choosing E-Lawyers. A specialized licensing agent has been assigned to verify your location and prepare your Trade License draft application."
      };

      // Hash user data for Advanced Matching & CAPI deduplication
      const hashedEm = email ? await hashString(email) : '';
      const hashedPh = await hashString(mobileNumber);

      // Meta Standard Lead Event
      trackStandardEvent('Lead', {
        content_name: requestedService,
        content_category: businessType,
        value: businessType === 'Private Limited Company' ? 12500 : businessType === 'Partnership Firm' ? 8500 : 5500,
        currency: 'BDT',
        form_name: 'Consultation Form',
        submission_id: submission.id
      }, {
        em: hashedEm,
        ph: hashedPh,
        fn: fullName.split(' ')[0]
      });

      // Meta Standard CompleteRegistration Event
      trackStandardEvent('CompleteRegistration', {
        content_name: 'Trade License Registration Docket',
        status: true,
        value: 12500,
        currency: 'BDT'
      });

      // Meta Custom Events
      trackCustomEvent('TradeLicense_Form_Success', {
        submission_id: submission.id,
        service_name: requestedService,
        business_type: businessType,
        contact_method: preferredContact
      });

      trackCustomEvent('TradeLicense_Consultation', {
        client_name: fullName,
        requested_service: requestedService,
        submission_id: submission.id
      });

      // Save to localStorage
      const existing = localStorage.getItem('elawyers_requests');
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(submission);
      localStorage.setItem('elawyers_requests', JSON.stringify(list));

      // Attempt background Google Sheets auto-sync if autoSync is enabled
      try {
        const isAutoSyncEnabled = localStorage.getItem('elawyers_auto_sync_sheets') !== 'false';
        const token = await getAccessToken();
        if (isAutoSyncEnabled && token) {
          const sheetId = localStorage.getItem('elawyers_google_spreadsheet_id') || undefined;
          await appendRequestsToGoogleSheet([submission], token, sheetId);
        }
      } catch (sheetsErr) {
        console.warn('Google Sheets background auto-sync note:', sheetsErr);
      }

      setNewRequest(submission);
      setIsSuccess(true);
      setIsSubmitting(false);
      onSubmitSuccess(submission);

      // Reset form fields
      setFullName('');
      setMobileNumber('');
      setEmail('');
      setBusinessName('');
      setBusinessType('Sole Proprietorship');
      setBusinessLocation('');
      setBusinessAddress('');
      setNatureOfBusiness('');
      setUploadedFiles([]);
      setAdditionalInfo('');
      setDraftRestored(false);
      localStorage.removeItem('elawyers_consultation_form_draft');
    }, 1500);
  };

  return (
    <div id="consultation-form-section" className="relative scroll-mt-24 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-500 to-blue-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]" />
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-lg overflow-hidden">
        {/* Banner header inside card */}
        <div className="bg-[#0f172a] text-white p-6 sm:p-8 text-center relative overflow-hidden border-b border-slate-800 group/header">
          <div 
            onClick={() => setIsPopUpOpen(true)}
            className="absolute inset-0 bg-blue-500/5 hover:bg-blue-500/20 active:bg-blue-600/30 cursor-pointer transition-all duration-300 z-20 flex items-center justify-center"
            title="Click to launch high-elevation Fast-Track Registration Pop-up"
          />
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight relative z-10 group-hover/header:text-amber-300 transition-colors pointer-events-none">Request Your Free Consultation</h2>
          <p className="text-amber-400 text-sm font-semibold mt-1.5 relative z-10 flex items-center justify-center gap-1.5 pointer-events-none">
            <Clock className="h-4 w-4 animate-pulse text-amber-400" />
            Get a Quote and Plan in Under 30 Minutes
          </p>
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-wider rounded-full relative z-30 transition-all cursor-pointer pointer-events-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>Fast-Track Register Pop-up Available (Click Header Area)</span>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          {/* Quick Support Ribbon with Live Flashing Badge */}
          <div className="mb-6 p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3.5 shadow-sm text-left">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  <strong className="text-blue-900 font-bold">Unsure about requirements?</strong> Speak directly with Sabrina or our trade licensing legal experts instantly.
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Average wait time: &lt; 60 seconds</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition cursor-pointer shrink-0 shadow-sm hover:shadow-md"
            >
              <MessageSquare className="h-4 w-4 text-white" />
              Chat with Consultant
            </button>
          </div>

          {/* Draft Restored Banner */}
          {!isSuccess && draftRestored && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 border border-amber-200">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">In-Progress Registration Restored</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    We found unsaved progress from your previous visit and restored your form inputs automatically.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setDraftRestored(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-100 bg-white rounded-lg cursor-pointer transition shadow-sm"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="px-3.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer transition border border-amber-200 shadow-sm animate-pulse hover:animate-none"
                >
                  Start Fresh
                </button>
              </div>
            </motion.div>
          )}

          {/* Visual Progress Stepper */}
          {!isSuccess && (
            <div className="mb-10 mt-2 px-2 sm:px-6">
              {/* Auto-save live indicator */}
              {lastSavedTime && (
                <div className="flex items-center justify-end mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-[10px] font-bold text-emerald-800 shadow-2xs">
                    <Cloud className="h-3 w-3 text-emerald-600 animate-pulse" />
                    <span>Auto-saved to local storage ({lastSavedTime})</span>
                  </div>
                </div>
              )}
              <div className="relative flex items-center justify-between">
                {/* Connection Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
                    style={{ width: `${((currentFormStep - 1) / 2) * 100}%` }}
                  />
                </div>

                {/* Steps */}
                {[
                  { step: 1, label: 'Personal Info', desc: 'Contact details' },
                  { step: 2, label: 'Business Profile', desc: 'Company specs' },
                  { step: 3, label: 'Documentation', desc: 'Uploads & contact' }
                ].map((item) => {
                  const isCompleted = item.step < currentFormStep;
                  const isActive = item.step === currentFormStep;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => {
                        if (item.step < currentFormStep) {
                          setCurrentFormStep(item.step);
                        } else if (item.step > currentFormStep) {
                          let canNavigate = true;
                          for (let s = currentFormStep; s < item.step; s++) {
                            if (!validateStep(s)) {
                              canNavigate = false;
                              break;
                            }
                          }
                          if (canNavigate) {
                            setCurrentFormStep(item.step);
                          }
                        }
                      }}
                      className="flex flex-col items-center focus:outline-none cursor-pointer group"
                    >
                      <div 
                        className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 relative border-2 ${
                          isCompleted 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                            : isActive
                              ? 'bg-white border-blue-600 text-blue-700 ring-4 ring-blue-50 shadow-md'
                              : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-white stroke-[2.5px]" />
                        ) : (
                          <span>{item.step}</span>
                        )}
                      </div>
                      <span 
                        className={`text-[11px] font-bold mt-2 transition-all duration-300 tracking-tight leading-none ${
                          isActive ? 'text-blue-700 font-extrabold' : 'text-slate-500 group-hover:text-slate-800'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="text-[9px] text-slate-400 font-light mt-1 hidden sm:block">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.form 
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (currentFormStep < 3) {
                    handleNextStep();
                  } else {
                    handleSubmit(e);
                  }
                }} 
                className="space-y-6"
              >
                {/* Step 1: Personal Info */}
                {currentFormStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6 text-left"
                  >
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-4">
                        1. Contact Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-fullname">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="form-fullname"
                            type="text"
                            required
                            aria-labelledby="lbl-fullname"
                            placeholder="e.g. Abul Kalam"
                            value={fullName}
                            onChange={(e) => {
                              setFullName(e.target.value);
                              if (errors.fullName) {
                                validateField('fullName', e.target.value);
                              }
                            }}
                            onBlur={(e) => validateField('fullName', e.target.value)}
                            className={`w-full px-4 py-2.5 bg-slate-50 rounded-xl border text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 ${
                              errors.fullName 
                                ? 'border-red-400 focus:ring-red-200' 
                                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/50'
                            }`}
                          />
                          {errors.fullName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.fullName}</p>}
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-mobile">
                            Mobile Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="form-mobile"
                            type="tel"
                            required
                            aria-labelledby="lbl-mobile"
                            placeholder="e.g. 01712345678"
                            value={mobileNumber}
                            onChange={(e) => {
                              setMobileNumber(e.target.value);
                              if (errors.mobileNumber) {
                                validateField('mobileNumber', e.target.value);
                              }
                            }}
                            onBlur={(e) => validateField('mobileNumber', e.target.value)}
                            className={`w-full px-4 py-2.5 bg-slate-50 rounded-xl border text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 ${
                              errors.mobileNumber 
                                ? 'border-red-400 focus:ring-red-200' 
                                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/50'
                            }`}
                          />
                          {errors.mobileNumber && <p className="text-xs text-red-500 mt-1 font-medium">{errors.mobileNumber}</p>}
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-email">
                            Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            id="form-email"
                            type="email"
                            aria-labelledby="lbl-email"
                            placeholder="e.g. name@example.com"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (errors.email) {
                                validateField('email', e.target.value);
                              }
                            }}
                            onBlur={(e) => validateField('email', e.target.value)}
                            className={`w-full px-4 py-2.5 bg-slate-50 rounded-xl border text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 ${
                              errors.email 
                                ? 'border-red-400 focus:ring-red-200' 
                                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/50'
                            }`}
                          />
                          {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Business Profile */}
                {currentFormStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6 text-left"
                  >
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-4">
                        2. Business Specifications
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-reqservice">
                            Service Required <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="form-reqservice"
                            aria-labelledby="lbl-reqservice"
                            value={requestedService}
                            onChange={(e) => setRequestedService(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-xs font-semibold text-slate-800"
                          >
                            {SERVICE_CATALOG.map((srv) => (
                              <option key={srv.id} value={srv.title}>
                                {srv.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-bizname">
                            Business Name
                          </label>
                          <input
                            id="form-bizname"
                            type="text"
                            aria-labelledby="lbl-bizname"
                            placeholder="Proposed or existing trade name"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-xs font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-biztype">
                            Business Type
                          </label>
                          <select
                            id="form-biztype"
                            aria-labelledby="lbl-biztype"
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-xs font-semibold text-slate-800"
                          >
                            <option value="Sole Proprietorship">Sole Proprietorship</option>
                            <option value="Partnership Firm">Partnership Firm</option>
                            <option value="Private Limited Company">Private Limited Company</option>
                            <option value="E-Commerce / Facebook Shop">E-Commerce / Facebook Shop</option>
                            <option value="Freelancer / Consultant">Freelancer / Consultant</option>
                            <option value="Restaurant / Food Business">Restaurant / Food Business</option>
                            <option value="Import / Export Business">Import / Export Business</option>
                            <option value="Other Business Structure">Other Business Structure</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-bizlocation">
                            Business Location (City Corp / Municipality) <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="form-bizlocation"
                            type="text"
                            required
                            aria-labelledby="lbl-bizlocation"
                            placeholder="e.g. DNCC Zone 3, Chattogram, Savar Pourashava"
                            value={businessLocation}
                            onChange={(e) => {
                              setBusinessLocation(e.target.value);
                              if (errors.businessLocation) {
                                validateField('businessLocation', e.target.value);
                              }
                            }}
                            onBlur={(e) => validateField('businessLocation', e.target.value)}
                            className={`w-full px-4 py-2.5 bg-slate-50 rounded-xl border text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 ${
                              errors.businessLocation 
                                ? 'border-red-400 focus:ring-red-200' 
                                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/50'
                            }`}
                          />
                          {errors.businessLocation && <p className="text-xs text-red-500 mt-1 font-medium">{errors.businessLocation}</p>}
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-nature">
                            Nature of Business
                          </label>
                          <input
                            id="form-nature"
                            type="text"
                            aria-labelledby="lbl-nature"
                            placeholder="e.g. IT Services, Retail Clothing, Restaurant"
                            value={natureOfBusiness}
                            onChange={(e) => setNatureOfBusiness(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-bizaddress">
                          Business Address
                        </label>
                        <textarea
                          id="form-bizaddress"
                          aria-labelledby="lbl-bizaddress"
                          rows={2}
                          placeholder="Full office, shop, or home address (for online business)"
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Documents & Support */}
                {currentFormStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6 text-left"
                  >
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-4">
                        3. Documents & Preferred Contact Method
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                        <div className="md:col-span-1">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-3">
                            Preferred Contact Method
                          </label>
                          <div className="space-y-3">
                            {[
                              { id: 'WhatsApp', label: 'WhatsApp Messenger', icon: Phone },
                              { id: 'Mobile', label: 'Direct Mobile Call', icon: Clock },
                              { id: 'Email', label: 'Official Email', icon: Mail }
                            ].map((item) => (
                              <label key={item.id} className="flex items-center gap-3 p-3 border border-slate-200 hover:border-blue-400 bg-slate-50 rounded-xl cursor-pointer transition select-none">
                                <input
                                  type="radio"
                                  name="contactMethod"
                                  checked={preferredContact === item.id}
                                  onChange={() => setPreferredContact(item.id as any)}
                                  className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-2">
                                  <item.icon className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">
                            Upload Documents <span className="text-slate-400 font-normal">(Optional - e.g. Lease, NID, Photo)</span>
                          </label>
                          
                          {/* Drag & Drop Area */}
                          <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center bg-slate-50 ${
                              dragActive 
                                ? 'border-blue-600 bg-blue-50/40' 
                                : 'border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={handleFileChange}
                            />
                            <Upload className="h-8 w-8 text-slate-400 mb-2.5 animate-bounce" />
                            <p className="text-xs font-semibold text-slate-700">Drag and drop documents here or <span className="text-blue-600 font-extrabold hover:underline">browse</span></p>
                            <p className="text-[10px] text-slate-400 mt-1">Accepts NID, Photos, PDFs, Word, or Image files up to 10MB</p>
                          </div>

                          {/* Uploaded Files Display */}
                          {uploadedFiles.length > 0 && (
                            <div className="mt-4 space-y-2 max-h-36 overflow-y-auto">
                              {uploadedFiles.map((file, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold text-slate-800">
                                  <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                                    <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                                    <span className="text-slate-400 font-normal shrink-0">({file.size})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFile(i);
                                    }}
                                    className="text-slate-400 hover:text-red-500 transition p-1"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5" id="lbl-additional">
                          Additional Information
                        </label>
                        <textarea
                          id="form-additional"
                          aria-labelledby="lbl-additional"
                          rows={3}
                          placeholder="Tell us any specific requirements, timeline constraints, or queries you may have..."
                          value={additionalInfo}
                          onChange={(e) => setAdditionalInfo(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Submit & trust items */}
                <div className="pt-4 border-t border-slate-100 space-y-6">
                  {/* Autosave Status Indicator */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-slate-500">
                      <Cloud className="h-3.5 w-3.5 text-blue-500 animate-pulse shrink-0" />
                      <span>Changes saved automatically to local draft</span>
                    </div>
                    {draftRestored && (
                      <button
                        type="button"
                        onClick={clearDraft}
                        className="text-slate-400 hover:text-amber-700 hover:underline transition cursor-pointer text-[10px]"
                      >
                        Reset Form & Clear Draft
                      </button>
                    )}
                  </div>

                  {currentFormStep < 3 ? (
                    <div className="flex justify-between items-center">
                      {currentFormStep > 1 ? (
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                        >
                          Back
                        </button>
                      ) : (
                        <div />
                      )}
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md hover:shadow-lg"
                      >
                        Next: {currentFormStep === 1 ? 'Business Profile' : 'Documentation'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex gap-4 items-center">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                        >
                          Back
                        </button>
                        <p className="text-xs font-semibold text-slate-500 max-w-sm hidden sm:block">
                          By submitting this form, you authorize our consultants to contact you regarding licensing regulations.
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition shadow-md shrink-0 cursor-pointer disabled:opacity-50 uppercase tracking-wide"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing Dossier...
                          </div>
                        ) : (
                          "Get My Trade License"
                        )}
                      </button>
                    </div>
                  )}

                  {/* Bullet points under button */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dashed border-slate-100 text-center sm:text-left">
                    {[
                      "Free Initial Consultation",
                      "No Hidden Charges",
                      "100% Confidential",
                      "Response within 30 Minutes"
                    ].map((bullet, i) => (
                      <div key={i} className="flex items-center justify-center sm:justify-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 uppercase tracking-tight">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.form>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10 space-y-6"
              >
                <div className="flex justify-center mb-2">
                  <SuccessConfettiAnimation />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 font-display">Consultation Request Received!</h3>
                  <p className="text-slate-500 text-sm max-w-lg mx-auto mt-2 font-normal">
                    Your request has been successfully filed under Application ID <strong className="text-slate-800 font-mono">{newRequest?.id}</strong>. 
                    An E-Lawyers Licensing Consultant is already reviewing your details.
                  </p>
                </div>

                <div className="max-w-md mx-auto p-5 border border-emerald-100 bg-emerald-50/30 rounded-2xl text-left text-xs space-y-3.5">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Applicant:</span>
                    <span className="text-slate-900">{newRequest?.fullName}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Mobile Number:</span>
                    <span className="text-slate-900">{newRequest?.mobileNumber}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Business Location:</span>
                    <span className="text-slate-900">{newRequest?.businessLocation}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Contact Channel:</span>
                    <span className="text-emerald-600 font-bold bg-emerald-100/50 px-2 py-0.5 rounded">{newRequest?.preferredContactMethod}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Application Status:</span>
                    <span className="text-emerald-600 font-bold bg-emerald-100/50 px-2 py-0.5 rounded">{newRequest?.status} (Step 1 of 8)</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <p className="text-xs text-slate-400">
                    We have stored your application details in your secure workspace. 
                    Scroll down to the <strong className="text-slate-700">Client Portal Dashboard</strong> to track your processing status (Step 1 to Step 8) in real-time or upload supplementary files.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setIsSuccess(false)}
                      className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
                    >
                      Submit Another Application
                    </button>
                    <a
                      href="#active-portal-section"
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition cursor-pointer"
                    >
                      Go to Client Tracker Portal
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Real-time Consultation Support Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <ConsultationChat 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
            selectedService={requestedService}
            businessType={businessType}
          />
        )}
      </AnimatePresence>

      {/* Highly elevated Floating Fast-Track Registration Pop-up Modal */}
      <AnimatePresence>
        {isPopUpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
            {/* Backdrop with high blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPopUpOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-zoom-out"
            />

            {/* Highly Elevated Modal Card (The "Selected box" that "will be high and come up within the pop-up box") */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] shadow-blue-950/20 border border-slate-200 overflow-hidden flex flex-col my-8 z-50 text-slate-800"
            >
              {/* Header inside pop-up */}
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 relative overflow-hidden border-b border-slate-800">
                <div className="absolute inset-0 bg-blue-500/5" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="text-left">
                    <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      Fast-Track Modal Desk
                    </span>
                    <h3 className="text-xl font-bold tracking-tight mt-1">Sleek Elevated Registration</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPopUpOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto text-left">
                {/* Embedded dynamic form */}
                {isSuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="flex justify-center mb-2">
                      <SuccessConfettiAnimation />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">Registration Dossier Collated!</h4>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Your fast-track registration has been filed successfully. You can close this pop-up and view real-time pipeline progress in the Client Portal below.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSuccess(false);
                        setIsPopUpOpen(false);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer transition shadow-md"
                    >
                      Done & Close
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (currentFormStep < 3) {
                        handleNextStep();
                      } else {
                        handleSubmit(e);
                      }
                    }}
                    className="space-y-5"
                  >
                    {/* Stepper Inside Modal */}
                    <div className="mb-8 px-2">
                      <div className="relative flex items-center justify-between">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${((currentFormStep - 1) / 2) * 100}%` }}
                          />
                        </div>
                        {[1, 2, 3].map((sNum) => {
                          const isC = sNum < currentFormStep;
                          const isA = sNum === currentFormStep;
                          return (
                            <div key={sNum} className="flex flex-col items-center">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                                isC ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25' : isA ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-50' : 'bg-white border-slate-200 text-slate-400'
                              }`}>
                                {isC ? <CheckCircle2 className="h-4 w-4 text-white" /> : sNum}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 1: Personal Info */}
                    {currentFormStep === 1 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-150">Contact Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Full Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Abul Kalam"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Mobile Number *</label>
                            <input
                              type="tel"
                              required
                              placeholder="e.g. 01712345678"
                              value={mobileNumber}
                              onChange={(e) => setMobileNumber(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 2: Business Profile */}
                    {currentFormStep === 2 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-150">Business Specifications</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Proposed Company Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Kalam Enterprise"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Entity Type *</label>
                            <select
                              value={businessType}
                              onChange={(e) => setBusinessType(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                            >
                              <option>Sole Proprietorship</option>
                              <option>Partnership Firm</option>
                              <option>Private Limited Company</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Jurisdiction / Ward Location *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Zone 3, DNCC"
                              value={businessLocation}
                              onChange={(e) => setBusinessLocation(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Office Physical Address *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Banani, Dhaka"
                              value={businessAddress}
                              onChange={(e) => setBusinessAddress(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Detailed Nature of Business *</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Describe what services or products your company offers..."
                            value={natureOfBusiness}
                            onChange={(e) => setNatureOfBusiness(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 3: Documentation */}
                    {currentFormStep === 3 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-150">Dossier Collation & Channel</h4>
                        
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Preferred Contact Method *</label>
                          <div className="grid grid-cols-3 gap-3">
                            {(['WhatsApp', 'Mobile', 'Email'] as const).map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setPreferredContact(method)}
                                className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                                  preferredContact === method 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Additional Directives / Custom Requests</label>
                          <textarea
                            rows={2}
                            placeholder="Any special instructions or expedited timeline queries..."
                            value={additionalInfo}
                            onChange={(e) => setAdditionalInfo(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>

                        {/* File upload notice */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                          <Cloud className="h-5 w-5 text-blue-500 shrink-0" />
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Note: supplementary physical files (NID, rental deeds) can be uploaded securely once the registration dossier is saved.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Footer Nav Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      {currentFormStep > 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentFormStep(prev => prev - 1)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer transition"
                        >
                          Back
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-2">
                        {currentFormStep < 3 ? (
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow"
                          >
                            Next Stage
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer transition shadow flex items-center gap-1.5"
                          >
                            {isSubmitting ? "Processing..." : "Complete Registration"}
                          </button>
                        )}
                      </div>
                    </div>

                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
