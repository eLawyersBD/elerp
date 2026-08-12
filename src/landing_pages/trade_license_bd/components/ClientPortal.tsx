/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '../motion';
import { jsPDF } from 'jspdf';
import { ConsultationRequest } from '../types';
import { 
  KeyRound, 
  MapPin, 
  Calendar, 
  FileText, 
  FileCheck2, 
  User, 
  Clock, 
  ArrowRight, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  Trash2, 
  Sparkles, 
  Play, 
  Lock,
  Activity,
  Eye,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  Download,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Bell,
  BellOff,
  Mail,
  MessageSquare
} from 'lucide-react';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
  delay: number;
}

const generateParticles = (count = 100): ConfettiParticle[] => {
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'];
  const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];
  return Array.from({ length: count }).map((_, i) => {
    const angle = (Math.random() * 110 + 215) * (Math.PI / 180); // Arc shooting upwards and outward
    const velocity = Math.random() * 500 + 250;
    const distanceX = Math.cos(angle) * velocity;
    const distanceY = Math.sin(angle) * velocity;
    return {
      id: i,
      x: distanceX,
      y: distanceY,
      rotate: Math.random() * 720,
      scale: Math.random() * 0.7 + 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      delay: Math.random() * 0.15
    };
  });
};

const getSimplifiedStatus = (step: number) => {
  if (step >= 7) {
    return {
      label: 'Completed',
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      dotClass: 'bg-emerald-400',
    };
  } else if (step >= 3) {
    return {
      label: 'In Progress',
      colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      dotClass: 'bg-blue-400',
    };
  } else {
    return {
      label: 'Pending',
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-400/20',
      dotClass: 'bg-amber-400',
    };
  }
};

export interface RequiredDocItem {
  id: string;
  name: string;
  detail: string;
  keywords: string[];
  exampleFilename: string;
}

const isCorporateOrPartnership = (type?: string) => {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes('company') || t.includes('partnership') || t.includes('limited') || t.includes('pvt') || t.includes('ltd');
};

const getRequiredDocuments = (businessType?: string): RequiredDocItem[] => {
  if (isCorporateOrPartnership(businessType)) {
    return [
      {
        id: 'nid_directors',
        name: 'NID of Directors',
        detail: 'Photocopy of National ID or passport copy of company directors',
        keywords: ['nid', 'national id', 'passport', 'director'],
        exampleFilename: 'NID_Directors'
      },
      {
        id: 'lease_agreement',
        name: 'Office Tenancy Proof',
        detail: 'Commercial lease agreement matching company or landlord name',
        keywords: ['lease', 'rent', 'agreement', 'tenancy', 'ownership', 'deed'],
        exampleFilename: 'Office_Tenancy_Agreement'
      },
      {
        id: 'incorporation_cert',
        name: 'Certificate of Incorporation',
        detail: 'RJSC Incorporation Certification copy',
        keywords: ['incorporation', 'cert', 'certificate', 'rjsc'],
        exampleFilename: 'Certificate_of_Incorporation_RJSC'
      },
      {
        id: 'moa_aoa',
        name: 'Memorandum & Articles of Association',
        detail: 'Complete MoA / AoA copies registered with RJSC',
        keywords: ['moa', 'aoa', 'memorandum', 'articles', 'association'],
        exampleFilename: 'Memorandum_Articles_Association'
      },
      {
        id: 'form_xii',
        name: 'Form XII (Directors Particulars)',
        detail: 'Approved Form XII copy from RJSC',
        keywords: ['form xii', 'form-xii', 'form12', 'directors particulars'],
        exampleFilename: 'Form_XII_RJSC'
      },
      {
        id: 'utility_tax',
        name: 'Utility & Tax Proofs',
        detail: 'Holding tax receipts or recent utility bill copies of company office',
        keywords: ['utility', 'tax', 'bill', 'electricity', 'holding tax'],
        exampleFilename: 'Utility_Holding_Tax_Proof'
      }
    ];
  } else {
    return [
      {
        id: 'nid_applicant',
        name: 'National ID (NID)',
        detail: "Applicant's National ID or valid Passport photocopy",
        keywords: ['nid', 'national id', 'passport'],
        exampleFilename: 'NID_Applicant'
      },
      {
        id: 'photo',
        name: 'Passport Size Photograph',
        detail: "Applicant's recent passport size color photograph",
        keywords: ['photo', 'photograph', 'image', 'picture'],
        exampleFilename: 'Passport_Photograph'
      },
      {
        id: 'lease_agreement',
        name: 'Rent Agreement or Ownership Proof',
        detail: 'Registered tenancy deed or space ownership proof',
        keywords: ['lease', 'rent', 'agreement', 'tenancy', 'ownership', 'deed'],
        exampleFilename: 'Office_Tenancy_Agreement'
      },
      {
        id: 'utility_bill',
        name: 'Utility Bill Copy',
        detail: 'Recent Electricity, Gas, or Water bill copy of commercial space',
        keywords: ['utility', 'bill', 'electricity', 'gas', 'water'],
        exampleFilename: 'Utility_Bill_Copy'
      },
      {
        id: 'holding_tax',
        name: 'Holding Tax Receipt',
        detail: 'Latest Municipal Holding tax payment proof (if applicable)',
        keywords: ['holding tax', 'municipal tax', 'tax receipt'],
        exampleFilename: 'Holding_Tax_Receipt'
      }
    ];
  }
};

const isDocSatisfied = (reqDoc: RequiredDocItem, uploadedDocs?: { name: string; size: string; status: 'Uploaded' | 'Pending' | 'In Review' | 'Verified' | 'Rejected'; previewUrl?: string }[]) => {
  if (!uploadedDocs) return null;
  return uploadedDocs.find(doc => {
    const filename = doc.name.toLowerCase();
    return reqDoc.keywords.some(keyword => filename.includes(keyword)) ||
           filename.includes(reqDoc.name.toLowerCase()) ||
           filename.includes(reqDoc.id.toLowerCase());
  });
};

export default function ClientPortal({ activeRequest }: { activeRequest: ConsultationRequest | null }) {
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequest | null>(null);
  const [uploadActive, setUploadActive] = useState(false);
  const [activeUploadSlot, setActiveUploadSlot] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; size: string; status: 'Uploaded' | 'Pending' | 'In Review' | 'Verified' | 'Rejected'; previewUrl?: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);
  const prevStepRef = useRef<number | null>(null);
  const prevIdRef = useRef<string | null>(null);

  // Trigger confetti success animation when application step is changed to 5 (Government Submitted)
  useEffect(() => {
    if (selectedRequest) {
      const prevStep = prevStepRef.current;
      const prevId = prevIdRef.current;

      // Trigger if we are on the same request and the step becomes 5 (Submission)
      if (selectedRequest.step === 5 && prevStep !== 5 && prevId === selectedRequest.id) {
        setConfettiParticles(generateParticles(100));
        setShowConfetti(true);
        const timer = setTimeout(() => {
          setShowConfetti(false);
        }, 5000);
        return () => clearTimeout(timer);
      }

      prevStepRef.current = selectedRequest.step;
      prevIdRef.current = selectedRequest.id;
    } else {
      prevStepRef.current = null;
      prevIdRef.current = null;
    }
  }, [selectedRequest]);

  // Load submissions from localStorage or load a default high-quality demo
  useEffect(() => {
    const loadRequests = () => {
      const stored = localStorage.getItem('elawyers_requests');
      let list: ConsultationRequest[] = stored ? JSON.parse(stored) : [];
      
      // If empty, create a realistic default demo application so the portal is never empty
      if (list.length === 0) {
        const demoApp: ConsultationRequest = {
          id: 'EL-782914',
          fullName: "Mahmudur Rahman",
          mobileNumber: "01712345678",
          email: "mahmud@techventures-bd.com",
          businessName: "Aura Tech Ventures BD",
          businessType: "Private Limited Company",
          businessLocation: "Dhaka North City Corporation (DNCC) - Zone 3",
          businessAddress: "House 45, Road 12, Banani, Dhaka 1213",
          natureOfBusiness: "Software Development & IT Outsourcing",
          preferredContactMethod: "WhatsApp",
          additionalInformation: "We need the trade license urgently to open our corporate bank account at Mutual Trust Bank and register our VAT/BIN.",
          documents: [
            { name: "NID_Mahmudur_Rahman.pdf", size: "1.2 MB", status: "Uploaded" },
            { name: "Office_Lease_Banani.pdf", size: "3.4 MB", status: "Uploaded" },
            { name: "Certificate_of_Incorporation_RJSC.pdf", size: "2.1 MB", status: "Uploaded" }
          ],
          status: "Verification",
          step: 3,
          submittedAt: new Date(Date.now() - 48 * 3600 * 1000).toLocaleString('en-US', { hour12: true }),
          notes: "Our legal executive has verified your Banani Office Lease agreement and RJSC certificates. We are currently drafting the Form-K municipal submission. Please expect a call shortly."
        };
        list = [demoApp];
        localStorage.setItem('elawyers_requests', JSON.stringify(list));
      }
      setRequests(list);

      // Prefer the newly submitted active request if passed, else first in list
      if (activeRequest) {
        setSelectedRequest(activeRequest);
      } else {
        setSelectedRequest(list[0]);
      }
    };

    loadRequests();
    
    // Set listener for localstorage changes
    window.addEventListener('storage', loadRequests);
    return () => window.removeEventListener('storage', loadRequests);
  }, [activeRequest]);

  // Sync when activeRequest updates
  useEffect(() => {
    if (activeRequest) {
      setSelectedRequest(activeRequest);
    }
  }, [activeRequest]);

  // Status step configuration
  const stepsConfig = [
    { label: "Consultation", desc: "Strategy Assessment" },
    { label: "Collection", desc: "Document Gathering" },
    { label: "Verification", desc: "Legal Verification" },
    { label: "Preparation", desc: "Application Draft" },
    { label: "Submission", desc: "Government filing" },
    { label: "Processing", desc: "Municipal Inspector review" },
    { label: "Issued", desc: "License print and stamp" },
    { label: "Delivered", desc: "Digital & courier delivery" }
  ];

  // Map step index to status string
  const getStatusFromStep = (step: number): ConsultationRequest['status'] => {
    const statuses: ConsultationRequest['status'][] = [
      'Received', 'Documents Collected', 'Verification', 
      'Application Prepared', 'Government Submitted', 'Processing', 
      'Issued', 'Delivered'
    ];
    return statuses[step - 1] || 'Received';
  };

  // Simulate advancing progress
  const handleAdvanceStep = () => {
    if (!selectedRequest) return;
    const nextStep = selectedRequest.step < 8 ? selectedRequest.step + 1 : 1;
    const nextStatus = getStatusFromStep(nextStep);
    
    let defaultNotes = "A specialized licensing agent has been assigned to verify your location and prepare your Trade License draft application.";
    if (nextStep === 2) defaultNotes = "Your initial documents have been collected successfully. We are reviewing them for compliance.";
    if (nextStep === 3) defaultNotes = "Legal verification in progress. Our advisors are confirming municipal holding taxes and lease authenticity.";
    if (nextStep === 4) defaultNotes = "We have prepared and drafted the official government application Form-K for your Trade License.";
    if (nextStep === 5) defaultNotes = "Dossier submitted! The application has been logged under municipal system. Official payment completed.";
    if (nextStep === 6) defaultNotes = "Under regional government inspection. Our local liaison agent is coordinating with the Ward assessor.";
    if (nextStep === 7) defaultNotes = "Success! Your physical Trade License smart card / printed ledger has been issued and signed by the licensing officer.";
    if (nextStep === 8) defaultNotes = "License Dispatched! We uploaded a high-resolution digital copy to your portal and dispatched the original via courier.";

    const updated: ConsultationRequest = {
      ...selectedRequest,
      step: nextStep,
      status: nextStatus,
      notes: defaultNotes
    };

    // Save back to list and localStorage
    const updatedList = requests.map(r => r.id === selectedRequest.id ? updated : r);
    setRequests(updatedList);
    setSelectedRequest(updated);
    localStorage.setItem('elawyers_requests', JSON.stringify(updatedList));
  };

  // Drop extra dummy document
  const handlePortalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRequest || !e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;

    let filename = file.name;
    if (activeUploadSlot) {
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      filename = `${activeUploadSlot}${ext}`;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;

      const newDoc = {
        name: filename,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        status: 'Uploaded' as const,
        previewUrl: base64String
      };

      let nextStep = selectedRequest.step;
      let nextStatus = selectedRequest.status;
      let nextNotes = selectedRequest.notes;

      if (selectedRequest.step === 1) {
        nextStep = 2;
        nextStatus = 'Documents Collected';
        nextNotes = "Thank you! You have uploaded a required document. We have updated your status to Documents Collected. Our compliance team is now verifying it.";
      }

      const updated: ConsultationRequest = {
        ...selectedRequest,
        documents: [...(selectedRequest.documents || []), newDoc],
        step: nextStep,
        status: nextStatus,
        notes: nextNotes
      };

      const updatedList = requests.map(r => r.id === selectedRequest.id ? updated : r);
      setRequests(updatedList);
      setSelectedRequest(updated);
      localStorage.setItem('elawyers_requests', JSON.stringify(updatedList));
      setActiveUploadSlot(null);
    };

    reader.readAsDataURL(file);
  };

  const handleToggleManualVerify = (docId: string) => {
    if (!selectedRequest) return;
    const currentList = selectedRequest.manuallyVerifiedDocs || [];
    const isVerified = currentList.includes(docId);
    const updatedList = isVerified
      ? currentList.filter(id => id !== docId)
      : [...currentList, docId];

    let nextStep = selectedRequest.step;
    let nextStatus = selectedRequest.status;
    let nextNotes = selectedRequest.notes;

    if (selectedRequest.step === 1 && !isVerified) {
      nextStep = 2;
      nextStatus = 'Documents Collected';
      nextNotes = "You have marked documents as manually submitted. We have updated your dossier status to Documents Collected while our legal team performs verified reviews.";
    }

    const updated: ConsultationRequest = {
      ...selectedRequest,
      manuallyVerifiedDocs: updatedList,
      step: nextStep,
      status: nextStatus,
      notes: nextNotes
    };

    const updatedRequestsList = requests.map(r => r.id === selectedRequest.id ? updated : r);
    setRequests(updatedRequestsList);
    setSelectedRequest(updated);
    localStorage.setItem('elawyers_requests', JSON.stringify(updatedRequestsList));
  };

  const handleRemoveDoc = (docIndex: number) => {
    if (!selectedRequest) return;
    const updatedDocs = (selectedRequest.documents || []).filter((_, i) => i !== docIndex);
    const updated: ConsultationRequest = {
      ...selectedRequest,
      documents: updatedDocs
    };
    const updatedList = requests.map(r => r.id === selectedRequest.id ? updated : r);
    setRequests(updatedList);
    setSelectedRequest(updated);
    localStorage.setItem('elawyers_requests', JSON.stringify(updatedList));
  };

  const handleChangeDocStatus = (docName: string, newStatus: 'In Review' | 'Verified' | 'Rejected' | 'Pending') => {
    if (!selectedRequest) return;
    
    const updatedDocs = (selectedRequest.documents || []).map(doc => 
      doc.name === docName ? { ...doc, status: newStatus as any } : doc
    );
    
    const updated: ConsultationRequest = {
      ...selectedRequest,
      documents: updatedDocs
    };
    
    const updatedList = requests.map(r => r.id === selectedRequest.id ? updated : r);
    setRequests(updatedList);
    setSelectedRequest(updated);
    localStorage.setItem('elawyers_requests', JSON.stringify(updatedList));
  };

  const [reminderToast, setReminderToast] = useState<{ message: string; visible: boolean } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerReminderToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setReminderToast({ message: msg, visible: true });
    toastTimeoutRef.current = setTimeout(() => {
      setReminderToast(prev => prev ? { ...prev, visible: false } : null);
    }, 4000);
  };

  const handleToggleReminder = (docId: string) => {
    if (!selectedRequest) return;
    
    const currentReminders = selectedRequest.reminders || {};
    const exists = !!currentReminders[docId]?.enabled;
    
    const updatedReminders = {
      ...currentReminders,
      [docId]: {
        enabled: !exists,
        channel: currentReminders[docId]?.channel || 'Both' as const,
        frequency: currentReminders[docId]?.frequency || 'Daily' as const
      }
    };
    
    const updated: ConsultationRequest = {
      ...selectedRequest,
      reminders: updatedReminders
    };
    
    const updatedList = requests.map(r => r.id === selectedRequest.id ? updated : r);
    setRequests(updatedList);
    setSelectedRequest(updated);
    localStorage.setItem('elawyers_requests', JSON.stringify(updatedList));

    const docName = getRequiredDocuments(selectedRequest.businessType).find(d => d.id === docId)?.name || 'Document';
    if (!exists) {
      triggerReminderToast(`🔔 Simulated reminders activated via SMS & Email for ${docName}!`);
    } else {
      triggerReminderToast(`🔕 Reminders deactivated for ${docName}.`);
    }
  };

  const handleUpdateReminder = (docId: string, field: 'channel' | 'frequency', value: any) => {
    if (!selectedRequest) return;
    
    const currentReminders = selectedRequest.reminders || {};
    const docReminder = currentReminders[docId] || { enabled: true, channel: 'Both' as const, frequency: 'Daily' as const };
    
    const updatedReminders = {
      ...currentReminders,
      [docId]: {
        ...docReminder,
        [field]: value
      }
    };
    
    const updated: ConsultationRequest = {
      ...selectedRequest,
      reminders: updatedReminders
    };
    
    const updatedList = requests.map(r => r.id === selectedRequest.id ? updated : r);
    setRequests(updatedList);
    setSelectedRequest(updated);
    localStorage.setItem('elawyers_requests', JSON.stringify(updatedList));

    const docName = getRequiredDocuments(selectedRequest.businessType).find(d => d.id === docId)?.name || 'Document';
    const channelLabel = value === 'Both' ? 'SMS & Email' : value === 'SMS' ? 'SMS' : 'Email';
    if (field === 'channel') {
      triggerReminderToast(`📱 Notification channel updated to ${channelLabel} for ${docName}.`);
    } else {
      triggerReminderToast(`⏱️ Schedule frequency adjusted to ${value} for ${docName}.`);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedRequest) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Branding Header Bar
    doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
    doc.rect(20, 15, 170, 26, 'F');

    // Branding text
    doc.setTextColor(245, 158, 11); // Amber-500 (#f59e0b)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.text("E-LAWYERS", 28, 26);

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("PREMIUM MUNICIPAL REGISTRATION & LEGAL TECH PORTAL", 28, 31);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("OFFICIAL DOSSIER SUMMARY REPORT", 116, 29);

    // 2. Metadata / Summary status bar
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, 46, 170, 15, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont("Helvetica", "normal");
    doc.text("DOSSIER ID:", 25, 51);
    doc.text("SUBMISSION DATE:", 75, 51);
    doc.text("PIPELINE STATUS:", 135, 51);

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(selectedRequest.id, 25, 56);
    doc.text(selectedRequest.submittedAt.split(',')[0], 75, 56);
    
    // Status color
    const statusText = selectedRequest.status.toUpperCase();
    if (selectedRequest.step >= 7) {
      doc.setTextColor(16, 185, 129); // emerald-500
    } else if (selectedRequest.step >= 3) {
      doc.setTextColor(59, 130, 246); // blue-500
    } else {
      doc.setTextColor(245, 158, 11); // amber-500
    }
    doc.text(statusText, 135, 56);

    // 3. Section: Applicant & Company Details
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont("Helvetica", "bold");
    doc.text("1. Applicant & Business Entity Details", 20, 71);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 73, 190, 73);

    doc.setFontSize(8.5);
    const detailsY = 79;

    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "normal");
    doc.text("Applicant Full Name:", 20, detailsY);
    doc.text("Mobile Contact:", 20, detailsY + 6);
    doc.text("Preferred Channel:", 20, detailsY + 12);

    doc.setTextColor(15, 23, 42);
    doc.setFont("Helvetica", "bold");
    doc.text(selectedRequest.fullName || "N/A", 52, detailsY);
    doc.text(selectedRequest.mobileNumber || "N/A", 52, detailsY + 6);
    doc.text((selectedRequest as any).preferredContactMethod || selectedRequest.preferredContact || 'WhatsApp', 52, detailsY + 12);

    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "normal");
    doc.text("Proposed Company:", 105, detailsY);
    doc.text("Registration Type:", 105, detailsY + 6);
    doc.text("Jurisdiction Area:", 105, detailsY + 12);

    doc.setTextColor(15, 23, 42);
    doc.setFont("Helvetica", "bold");
    const bName = selectedRequest.businessName || "Pending Name Clearance";
    doc.text(bName.length > 32 ? bName.substring(0, 32) + "..." : bName, 135, detailsY);
    doc.text(selectedRequest.businessType || "N/A", 135, detailsY + 6);
    const bLoc = selectedRequest.businessLocation || "N/A";
    doc.text(bLoc.length > 28 ? bLoc.substring(0, 28) + "..." : bLoc, 135, detailsY + 12);

    // Nature of business & physical office address
    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "normal");
    doc.text("Nature of Business:", 20, detailsY + 18);
    doc.text("Physical Address:", 20, detailsY + 24);

    doc.setTextColor(15, 23, 42);
    doc.setFont("Helvetica", "bold");
    const nature = selectedRequest.natureOfBusiness || "N/A";
    doc.text(nature.length > 70 ? nature.substring(0, 70) + "..." : nature, 52, detailsY + 18);
    const address = selectedRequest.businessAddress || "N/A";
    doc.text(address.length > 70 ? address.substring(0, 70) + "..." : address, 52, detailsY + 24);

    // 4. Section: Progress Pipeline Gauge
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont("Helvetica", "bold");
    doc.text("2. Live Compliance Process Timeline & Progress Tracker", 20, 115);
    
    doc.line(20, 117, 190, 117);

    // Draw track
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(20, 122, 170, 6, 'F');

    // Draw percentage filled
    const percentComplete = Math.round((selectedRequest.step / 8) * 100);
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(20, 122, 170 * (selectedRequest.step / 8), 6, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "bold");
    doc.text(`${percentComplete}% Pipeline Milestones Reached`, 20, 133);
    
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Completed Stage ${selectedRequest.step} of 8: ${selectedRequest.status}`, 112, 133);

    // 5. Section: Documents Checklist Status
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont("Helvetica", "bold");
    doc.text("3. Document Intake Checklist Compliance", 20, 145);
    
    doc.line(20, 147, 190, 147);

    const requiredDocs = getRequiredDocuments(selectedRequest.businessType);
    let currentY = 154;

    // Table Header
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("DOCUMENT NAME", 22, currentY);
    doc.text("INTAKE CLASSIFICATION DETAILS", 72, currentY);
    doc.text("COMPLIANCE STATE", 146, currentY);

    doc.line(20, currentY + 2, 190, currentY + 2);
    currentY += 7;

    requiredDocs.forEach((reqDoc) => {
      const isSatisfiedByFile = isDocSatisfied(reqDoc, selectedRequest.documents);
      const isSatisfiedManually = selectedRequest.manuallyVerifiedDocs?.includes(reqDoc.id);

      let statusLabel = "PENDING / NOT FOUND";
      let statusColor = [245, 158, 11]; // Amber

      if (isSatisfiedManually) {
        statusLabel = "VERIFIED BY ATTORNEY ✔";
        statusColor = [16, 185, 129]; // Emerald
      } else if (isSatisfiedByFile) {
        if (isSatisfiedByFile.status === 'Verified') {
          statusLabel = "VERIFIED BY ATTORNEY ✔";
          statusColor = [16, 185, 129]; // Emerald
        } else if (isSatisfiedByFile.status === 'Uploaded' || isSatisfiedByFile.status === 'In Review') {
          statusLabel = "IN REVIEW ⟳";
          statusColor = [59, 130, 246]; // Blue
        } else if (isSatisfiedByFile.status === 'Rejected') {
          statusLabel = "REJECTED BY REVIEWER ✘";
          statusColor = [244, 63, 94]; // Rose
        }
      }

      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      
      const docName = reqDoc.name.length > 25 ? reqDoc.name.substring(0, 25) + "..." : reqDoc.name;
      doc.text(docName, 22, currentY);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      const docDetail = reqDoc.detail.length > 45 ? reqDoc.detail.substring(0, 45) + "..." : reqDoc.detail;
      doc.text(docDetail, 72, currentY);

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(statusLabel, 146, currentY);

      currentY += 6;
    });

    // 6. Section: Advisor notes / logs
    const notesBoxY = currentY + 6;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont("Helvetica", "bold");
    doc.text("4. Legal Counsel Remarks & Activity Logs", 20, notesBoxY);
    
    doc.line(20, notesBoxY + 2, 190, notesBoxY + 2);

    // BG box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, notesBoxY + 5, 170, 22, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.rect(20, notesBoxY + 5, 170, 22, 'S');

    doc.setFontSize(8);
    doc.setFont("Helvetica", "italic");
    doc.setTextColor(71, 85, 105); // slate-600
    const rawNotes = selectedRequest.notes || "No active log notes found. The application file is currently queued for initial background dossier collation and compliance profiling.";
    const splitNotes = doc.splitTextToSize(rawNotes, 160);
    doc.text(splitNotes, 25, notesBoxY + 11);

    // 7. Footer details
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 260, 190, 260);

    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("This official dossier status sheet is auto-generated on behalf of the customer via the E-Lawyers interactive client portal.", 20, 265);
    doc.text("Status updates are pushed live directly from municipal registrars and Ward licensing offices.", 20, 269);

    const timestamp = new Date().toLocaleString();
    doc.text(`Document Generation Timestamp: ${timestamp}`, 20, 274);

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("SECURE PORTAL VERIFICATION REF: EL-SHA256-491A80X7", 114, 274);

    doc.save(`EL_Dossier_Summary_${selectedRequest.id}.pdf`);
    triggerReminderToast(`🎉 PDF dossier summary downloaded successfully for ${selectedRequest.businessName || "your business"}!`);
  };

  return (
    <section id="active-portal-section" className="hidden relative py-20 bg-[#0f172a] text-white scroll-mt-24 border-t border-slate-900 overflow-hidden">
      
      {/* Confetti Particle & Success Banner Overlay */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30 flex items-center justify-center">
            {/* Center-Bottom aligned burst origin */}
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2">
              {confettiParticles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    opacity: [1, 1, 0.8, 0],
                    rotate: p.rotate,
                    scale: p.scale,
                  }}
                  transition={{
                    duration: 3,
                    ease: [0.1, 0.8, 0.25, 1],
                    delay: p.delay,
                  }}
                  className="absolute pointer-events-none"
                  style={{
                    backgroundColor: p.shape === 'triangle' ? 'transparent' : p.color,
                    width: p.shape === 'circle' ? '12px' : '14px',
                    height: p.shape === 'triangle' ? '0px' : '14px',
                    borderRadius: p.shape === 'circle' ? '50%' : '2px',
                    borderLeft: p.shape === 'triangle' ? '6px solid transparent' : undefined,
                    borderRight: p.shape === 'triangle' ? '6px solid transparent' : undefined,
                    borderBottom: p.shape === 'triangle' ? `14px solid ${p.color}` : undefined,
                  }}
                />
              ))}
            </div>

            {/* Glowing Success Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -30 }}
              transition={{ type: "spring", damping: 15 }}
              className="relative bg-slate-900/95 border border-emerald-500/30 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 text-left pointer-events-auto max-w-sm sm:max-w-md mx-4 select-none"
            >
              <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 animate-pulse text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
                  Application Filed Successfully!
                </h4>
                <p className="text-slate-300 text-xs font-light mt-1 leading-relaxed">
                  Government fees paid and application successfully logged under the municipal system.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-400/20 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit mx-auto">
            <Lock className="h-3 w-3" />
            My Secure Client Portal Dashboard
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-white">
            Track Your Trade License Live
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-light leading-relaxed">
            Submit documents, download active drafts, and follow your application step-by-step through the municipal pipeline in real-time.
          </p>
        </div>

        {/* Overall Summary Progress Bar Card */}
        {selectedRequest && (() => {
          const requiredDocs = getRequiredDocuments(selectedRequest.businessType);
          const verifiedDocsCount = requiredDocs.filter(reqDoc => {
            const isSatisfiedByFile = isDocSatisfied(reqDoc, selectedRequest.documents);
            const isSatisfiedManually = selectedRequest.manuallyVerifiedDocs?.includes(reqDoc.id);
            if (isSatisfiedManually) return true;
            if (isSatisfiedByFile && (isSatisfiedByFile.status === 'Verified')) return true;
            return false;
          }).length;
          
          const inReviewCount = requiredDocs.filter(reqDoc => {
            const isSatisfiedByFile = isDocSatisfied(reqDoc, selectedRequest.documents);
            const isSatisfiedManually = selectedRequest.manuallyVerifiedDocs?.includes(reqDoc.id);
            if (!isSatisfiedManually && isSatisfiedByFile && (isSatisfiedByFile.status === 'Uploaded' || isSatisfiedByFile.status === 'In Review')) return true;
            return false;
          }).length;

          const rejectedCount = requiredDocs.filter(reqDoc => {
            const isSatisfiedByFile = isDocSatisfied(reqDoc, selectedRequest.documents);
            const isSatisfiedManually = selectedRequest.manuallyVerifiedDocs?.includes(reqDoc.id);
            if (!isSatisfiedManually && isSatisfiedByFile && isSatisfiedByFile.status === 'Rejected') return true;
            return false;
          }).length;

          const percentComplete = Math.round((selectedRequest.step / 8) * 100);

          return (
            <div className="max-w-6xl mx-auto mb-8 bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 text-left relative overflow-hidden shadow-xl">
              {/* Background decorative glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                      Active Dossier Progress Summary
                    </span>
                    <span className="text-xs font-semibold text-slate-400 font-mono">
                      {selectedRequest.id}
                    </span>
                  </div>
                  <h3 className="text-md sm:text-lg font-bold text-white font-display">
                    {selectedRequest.businessName || "Sole Proprietorship"}
                  </h3>
                  <p className="text-xs text-slate-400 font-light">
                    Applicant: <span className="text-slate-300 font-normal">{selectedRequest.fullName}</span> • Location: <span className="text-slate-300 font-normal">{selectedRequest.businessLocation}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs md:text-right">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Current Status</p>
                    <p className="font-bold text-blue-400 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 animate-pulse" />
                      {selectedRequest.status}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-slate-800 hidden sm:block" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Document Clearance</p>
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <span className="text-emerald-400" title="Verified">{verifiedDocsCount} ✔</span>
                      <span className="text-blue-400" title="In Review">{inReviewCount} ⟳</span>
                      {rejectedCount > 0 && <span className="text-rose-400" title="Rejected">{rejectedCount} ✘</span>}
                      <span className="text-slate-500 font-light text-[10px] ml-1">of {requiredDocs.length}</span>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-800 hidden sm:block" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Process Pipeline</p>
                    <p className="font-bold text-white font-mono">
                      Step {selectedRequest.step} <span className="text-slate-500 font-light">/ 8</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Interactive Summary Progress Bar */}
              <div className="space-y-3.5">
                <div className="relative w-full h-3 bg-slate-900 border border-slate-850 rounded-full overflow-hidden p-[1px]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentComplete}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    {/* Subtle highlight effect on progress head */}
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white opacity-80 blur-[1.5px] animate-pulse rounded-full" />
                  </motion.div>
                </div>

                {/* Milestone checkpoints on progress timeline */}
                <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                  {[
                    { label: "1. Strategy & Scope", activeSteps: [1, 2] },
                    { label: "2. Document Audit", activeSteps: [3, 4] },
                    { label: "3. Govt Submission", activeSteps: [5, 6] },
                    { label: "4. License Delivery", activeSteps: [7, 8] }
                  ].map((milestone, idx) => {
                    const isPast = selectedRequest.step > Math.max(...milestone.activeSteps);
                    const isCurrent = milestone.activeSteps.includes(selectedRequest.step);
                    const isUpcoming = selectedRequest.step < Math.min(...milestone.activeSteps);
                    
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`text-[10px] font-bold font-display uppercase tracking-tight transition-colors ${
                            isPast 
                              ? 'text-emerald-400' 
                              : isCurrent 
                                ? 'text-blue-400 font-extrabold' 
                                : 'text-slate-600'
                          }`}>
                            {milestone.label}
                          </span>
                        </div>
                        <p className="text-[8px] text-slate-500 font-light uppercase tracking-wider hidden sm:block">
                          {isPast ? "✔ Completed" : isCurrent ? "● Active Stage" : "⟳ Upcoming"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Dashboard Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
          
          {/* Left Column: Applications selector list */}
          <div className="lg:col-span-4 bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2.5 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-amber-400" />
                My Licensing Dossiers
              </h3>

              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {requests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedRequest?.id === req.id 
                        ? 'bg-slate-900 border-blue-600 shadow-lg' 
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                          {req.id}
                        </span>
                        {(() => {
                          const statusInfo = getSimplifiedStatus(req.step);
                          return (
                            <span className={`inline-flex items-center gap-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${statusInfo.colorClass}`}>
                              {statusInfo.label === 'Completed' && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0" />}
                              {statusInfo.label === 'In Progress' && <Activity className="h-2.5 w-2.5 text-blue-400 shrink-0 animate-pulse" />}
                              {statusInfo.label === 'Pending' && <Clock className="h-2.5 w-2.5 text-amber-400 shrink-0" />}
                              <span>{statusInfo.label}</span>
                            </span>
                          );
                        })()}
                      </div>
                      <span className="text-[10px] text-slate-500 font-light">
                        {req.submittedAt.split(',')[0]}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white mt-2 truncate font-display">
                      {req.businessName || "Pending Name Clearance"}
                    </h4>
                    
                    <div className="flex justify-between items-center mt-2.5">
                      <span className="text-[10px] text-slate-400 truncate max-w-[60%] font-light">
                        {req.fullName}
                      </span>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                        Step {req.step} / 8
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Portal notice info */}
            <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5 text-xs text-left">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">Simulator Controls</p>
              <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                Click below to simulate how the licensing inspector advances your application status.
              </p>
              <button
                onClick={handleAdvanceStep}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-bold text-xs transition cursor-pointer uppercase tracking-wider"
              >
                <Play className="h-3 w-3 fill-white" />
                Advance Progress Step
              </button>
            </div>
          </div>

          {/* Right Column: Tracking Details Pane */}
          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 p-6 sm:p-8 rounded-2xl flex flex-col justify-between text-left">
            {selectedRequest ? (
              <div className="space-y-6">
                
                {/* Header detail */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5 gap-3">
                  <div>
                    <span className="text-[10px] font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                      REGISTRATION DOSSIER: {selectedRequest.id}
                    </span>
                    <h3 className="text-lg font-bold text-white font-display mt-2">
                      {selectedRequest.businessName || "Unnamed Proprietorship"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Simplified status indicator */}
                    {(() => {
                      const statusInfo = getSimplifiedStatus(selectedRequest.step);
                      return (
                        <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${statusInfo.colorClass}`}>
                          {statusInfo.label === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                          {statusInfo.label === 'In Progress' && <Activity className="h-3.5 w-3.5 text-blue-400 shrink-0 animate-pulse" />}
                          {statusInfo.label === 'Pending' && <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                          <span className="uppercase tracking-wider text-[10px]">{statusInfo.label}</span>
                        </div>
                      );
                    })()}

                    {/* Detailed step indicator */}
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-full">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getSimplifiedStatus(selectedRequest.step).dotClass} animate-ping`} />
                      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                        {selectedRequest.status}
                      </span>
                    </div>

                    {/* Download Application Summary PDF Button */}
                    <button
                      id="download-summary-pdf-btn"
                      onClick={handleDownloadPDF}
                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-wider cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                      title="Download live application summary PDF"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-950" />
                      <span>Download Summary</span>
                    </button>
                  </div>
                </div>

                {/* Linear horizontal progress step bar */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Process Pipeline Progress</p>
                    <span className="text-xs font-bold text-blue-400">{selectedRequest.step * 12.5}% Completed</span>
                  </div>
                  
                  {/* Step dots row */}
                  <div className="grid grid-cols-8 gap-1.5">
                    {stepsConfig.map((st, idx) => {
                      const stepNum = idx + 1;
                      const isCompleted = selectedRequest.step >= stepNum;
                      const isActive = selectedRequest.step === stepNum;
                      return (
                        <div key={idx} className="space-y-1 text-center">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isCompleted 
                                ? isActive 
                                  ? 'bg-blue-400 ring-2 ring-blue-500/20' 
                                  : 'bg-blue-500' 
                                : 'bg-slate-800'
                            }`} 
                          />
                          <p className="hidden sm:block text-[8px] font-semibold text-slate-500 truncate" title={st.label}>
                            {st.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assigned consultant notes */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Advisor's Active Log Note</h4>
                  </div>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    "{selectedRequest.notes}"
                  </p>
                </div>

                {/* Business Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-start gap-3">
                    <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Applicant Details</p>
                      <p className="text-xs font-bold text-white mt-1">{selectedRequest.fullName}</p>
                      <p className="text-xs text-slate-400 font-light mt-0.5">{selectedRequest.mobileNumber}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Business Jurisdiction</p>
                      <p className="text-xs font-bold text-white mt-1 truncate" title={selectedRequest.businessLocation}>
                        {selectedRequest.businessLocation}
                      </p>
                      <p className="text-xs text-slate-400 font-light mt-0.5 truncate">{selectedRequest.businessType}</p>
                    </div>
                  </div>
                </div>
                
                {/* Required Documents Progress & Checklist */}
                {(() => {
                  const requiredDocs = getRequiredDocuments(selectedRequest.businessType);
                  const satisfiedCount = requiredDocs.filter(reqDoc => {
                    const isSatisfiedByFile = isDocSatisfied(reqDoc, selectedRequest.documents);
                    const isSatisfiedManually = selectedRequest.manuallyVerifiedDocs?.includes(reqDoc.id);
                    return isSatisfiedByFile || isSatisfiedManually;
                  }).length;
                  const percentComplete = Math.round((satisfiedCount / requiredDocs.length) * 100);

                  return (
                    <div className="space-y-4 border-t border-slate-800 pt-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="p-1 bg-amber-500/10 text-amber-400 rounded-lg">
                              <FileCheck2 className="h-4 w-4" />
                            </span>
                            Required Document Checklist
                          </h4>
                          <p className="text-slate-400 text-[11px] font-light">
                            Tracking legal mandates for: <span className="font-semibold text-blue-400">{selectedRequest.businessType || "Sole Proprietorship"}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                            {satisfiedCount} of {requiredDocs.length} Complete
                          </span>
                          <span className="text-xs font-bold text-slate-400">{percentComplete}%</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-amber-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentComplete}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>

                      {/* Checklist grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {requiredDocs.map((reqDoc) => {
                          const uploadedFile = isDocSatisfied(reqDoc, selectedRequest.documents);
                          const isManuallyVerified = selectedRequest.manuallyVerifiedDocs?.includes(reqDoc.id);
                          const isCompleted = !!uploadedFile || isManuallyVerified;

                          // Get calculated document status
                          let docStatus: 'Pending' | 'In Review' | 'Verified' | 'Rejected' = 'Pending';
                          if (isManuallyVerified) {
                            docStatus = 'Verified';
                          } else if (uploadedFile) {
                            if (uploadedFile.status === 'Verified') docStatus = 'Verified';
                            else if (uploadedFile.status === 'Rejected') docStatus = 'Rejected';
                            else docStatus = 'In Review';
                          }

                          return (
                            <div
                              key={reqDoc.id}
                              className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between gap-3 transition-all duration-300 ${
                                docStatus === 'Verified'
                                  ? 'bg-slate-900/30 border-emerald-500/20 hover:border-emerald-500/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.05)]'
                                  : docStatus === 'Rejected'
                                    ? 'bg-rose-950/10 border-rose-500/25 hover:border-rose-500/40 shadow-[0_0_15px_-3px_rgba(239,68,68,0.05)]'
                                    : docStatus === 'In Review'
                                      ? 'bg-blue-950/10 border-blue-500/20 hover:border-blue-500/40 shadow-[0_0_15px_-3px_rgba(59,130,246,0.05)]'
                                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-750'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <button
                                  onClick={() => handleToggleManualVerify(reqDoc.id)}
                                  className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                                    isCompleted
                                      ? isManuallyVerified
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                                        : docStatus === 'Verified'
                                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30'
                                          : docStatus === 'Rejected'
                                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30'
                                            : 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30'
                                      : 'border-slate-700 hover:border-slate-500 hover:bg-slate-900/60'
                                  }`}
                                  title={isCompleted ? "Mark as Incomplete" : "Mark as Submitted (Manual/Physical)"}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                                  )}
                                </button>
                                <div className="space-y-1 text-left min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h5 className={`font-semibold text-[11px] font-display uppercase tracking-tight ${isCompleted ? 'text-white' : 'text-slate-300'}`}>
                                      {reqDoc.name}
                                    </h5>
                                    
                                    {/* Status Badge */}
                                    {docStatus === 'Pending' && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-500 shrink-0">
                                        <Clock className="h-2 w-2 shrink-0" />
                                        Pending
                                      </span>
                                    )}
                                    {docStatus === 'In Review' && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                                        <Activity className="h-2 w-2 shrink-0 animate-pulse" />
                                        In Review
                                      </span>
                                    )}
                                    {docStatus === 'Verified' && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                                        <CheckCircle2 className="h-2 w-2 shrink-0" />
                                        Verified
                                      </span>
                                    )}
                                    {docStatus === 'Rejected' && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                                        <XCircle className="h-2 w-2 shrink-0" />
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-500 text-[10px] font-light leading-snug">
                                    {reqDoc.detail}
                                  </p>
                                </div>
                              </div>

                              {/* Rejection Alert Box */}
                              {docStatus === 'Rejected' && (
                                <div className="text-[9px] text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg flex items-start gap-1.5 leading-normal">
                                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-rose-400" />
                                  <span>
                                    <strong>Compliance Issue:</strong> Signature mismatch or low-quality scan. Please re-upload a clear copy.
                                  </span>
                                </div>
                              )}

                              {/* Remind Me Feature */}
                              {docStatus !== 'Verified' && (() => {
                                const reminder = selectedRequest.reminders?.[reqDoc.id];
                                const hasReminder = !!reminder?.enabled;
                                return (
                                  <div className="mt-1 bg-slate-900/40 border border-slate-800/50 rounded-lg p-2 flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleToggleReminder(reqDoc.id)}
                                        className={`p-1 rounded cursor-pointer transition-all flex items-center justify-center border ${
                                          hasReminder 
                                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                                            : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-300 border-slate-800'
                                        }`}
                                        title={hasReminder ? "Disable reminders" : "Enable Email/SMS alerts"}
                                      >
                                        {hasReminder ? (
                                          <Bell className="h-3 w-3" />
                                        ) : (
                                          <BellOff className="h-3 w-3" />
                                        )}
                                      </button>
                                      <span className={`text-[10px] font-medium ${hasReminder ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {hasReminder ? 'Reminders Active' : 'Remind Me'}
                                      </span>
                                    </div>

                                    {hasReminder && reminder && (
                                      <div className="flex items-center gap-1.5">
                                        <select
                                          value={reminder.channel}
                                          onChange={(e) => handleUpdateReminder(reqDoc.id, 'channel', e.target.value)}
                                          className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded px-1.5 py-0.5 outline-none cursor-pointer font-mono"
                                          title="Reminder channel"
                                        >
                                          <option value="Both">📱 SMS & Email</option>
                                          <option value="SMS">💬 SMS Only</option>
                                          <option value="Email">📧 Email Only</option>
                                        </select>

                                        <select
                                          value={reminder.frequency}
                                          onChange={(e) => handleUpdateReminder(reqDoc.id, 'frequency', e.target.value)}
                                          className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-300 rounded px-1.5 py-0.5 outline-none cursor-pointer font-mono"
                                          title="Schedule frequency"
                                        >
                                          <option value="Daily">Daily</option>
                                          <option value="Weekly">Weekly</option>
                                          <option value="Before Due Date">Before Due</option>
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Status Footer inside card */}
                              <div className="flex items-center justify-between gap-2 border-t border-slate-900/60 pt-2.5 mt-0.5">
                                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
                                  {uploadedFile ? (
                                    <>
                                      <span className="text-[10px] text-emerald-400 font-mono truncate flex items-center gap-1 max-w-[130px]" title={uploadedFile.name}>
                                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{uploadedFile.name}</span>
                                      </span>

                                      {/* Interactive Simulator dropdown */}
                                      <div className="flex items-center gap-1 text-[8px] text-slate-500 shrink-0">
                                        <span className="text-[8px] text-slate-600 font-mono uppercase">Status:</span>
                                        <select
                                          value={uploadedFile.status === 'Uploaded' ? 'In Review' : uploadedFile.status}
                                          onChange={(e) => handleChangeDocStatus(uploadedFile.name, e.target.value as any)}
                                          className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded px-1 py-0.5 text-[9px] font-mono outline-none cursor-pointer transition-colors"
                                          title="Simulate compliance review status"
                                        >
                                          <option value="In Review">In Review</option>
                                          <option value="Verified">Verified</option>
                                          <option value="Rejected">Rejected</option>
                                        </select>
                                      </div>
                                    </>
                                  ) : isManuallyVerified ? (
                                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                                      <Calendar className="h-3 w-3 shrink-0" />
                                      <span>Marked Submitted</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">
                                      Pending file attachment
                                    </span>
                                  )}
                                </div>

                                <div className="flex gap-1.5 shrink-0">
                                  {uploadedFile && (
                                    <button
                                      onClick={() => {
                                        setZoomScale(1);
                                        setPreviewDoc(uploadedFile);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase transition cursor-pointer"
                                      title="Preview uploaded document"
                                    >
                                      <Eye className="h-3 w-3" />
                                      View
                                    </button>
                                  )}
                                  {!uploadedFile && (
                                    <button
                                      onClick={() => {
                                        setActiveUploadSlot(reqDoc.exampleFilename);
                                        setTimeout(() => {
                                          fileRef.current?.click();
                                        }, 100);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-[9px] uppercase transition cursor-pointer"
                                    >
                                      <Upload className="h-3 w-3" />
                                      Attach
                                    </button>
                                  )}
                                  {isCompleted && isManuallyVerified && (
                                    <button
                                      onClick={() => handleToggleManualVerify(reqDoc.id)}
                                      className="text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                                      title="Clear manual status"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Uploaded Documents List inside portal */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center border-t border-slate-800 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" />
                      Uploaded Documents ({selectedRequest.documents?.length || 0})
                    </h4>
                    
                    <button
                      onClick={() => {
                        setActiveUploadSlot(null);
                        setTimeout(() => {
                          fileRef.current?.click();
                        }, 100);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-[10px] uppercase transition cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload File
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={handlePortalFile}
                    />
                  </div>

                  {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-36 overflow-y-auto pr-1">
                      {selectedRequest.documents.map((doc, idx) => (
                        <div key={idx} className="group/doc flex items-center justify-between p-2.5 border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition-colors rounded-xl text-xs">
                          <button
                            onClick={() => {
                              setZoomScale(1);
                              setPreviewDoc(doc);
                            }}
                            className="flex items-center gap-2.5 truncate max-w-[70%] text-left cursor-pointer group-hover/doc:text-blue-400 transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="font-semibold text-white group-hover/doc:text-blue-400 truncate text-[11px] font-display">{doc.name}</span>
                            <span className="text-slate-500 text-[10px] shrink-0 font-light">({doc.size})</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setZoomScale(1);
                                setPreviewDoc(doc);
                              }}
                              className="text-slate-500 hover:text-emerald-400 p-1 transition cursor-pointer"
                              title="Preview document"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveDoc(idx)}
                              className="text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                              title="Delete document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                      No documents uploaded yet. Upload your NID or Rent agreement to expedite processing.
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 space-y-3">
                <p className="text-sm font-light">No application selected. Select a dossier from the sidebar tracker.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-950/40">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-white truncate max-w-[220px] sm:max-w-md font-display">
                      {previewDoc.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-light">
                      Size: {previewDoc.size} • Status: <span className="text-emerald-400 font-semibold">{previewDoc.status}</span>
                    </p>
                  </div>
                </div>

                {/* Quick controls */}
                <div className="flex items-center gap-2">
                  {/* Zoom buttons */}
                  <div className="flex items-center gap-1 bg-slate-950/60 p-1 border border-slate-800/60 rounded-xl mr-2">
                    <button
                      onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 0.5))}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] font-mono text-slate-400 w-12 text-center select-none">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setZoomScale(1)}
                      className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition cursor-pointer text-[10px] font-semibold px-2"
                      title="Reset Zoom"
                    >
                      Reset
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                    title="Print Document"
                  >
                    <Printer className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-2 bg-slate-850 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                    title="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Viewer Body */}
              <div className="flex-1 overflow-auto bg-slate-950/50 p-6 flex justify-center items-start relative select-none">
                <div 
                  className="transition-transform duration-200 ease-out origin-top"
                  style={{ transform: `scale(${zoomScale})` }}
                >
                  {previewDoc.previewUrl ? (
                    <div className="bg-white p-2 rounded-2xl shadow-xl max-w-full">
                      <img
                        src={previewDoc.previewUrl}
                        alt={previewDoc.name}
                        referrerPolicy="no-referrer"
                        className="max-h-[60vh] object-contain rounded-xl select-text"
                      />
                    </div>
                  ) : (
                    /* Generate dynamic high-fidelity gorgeous vector mock documents */
                    <div className="w-[500px] bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-8 relative flex flex-col justify-between overflow-hidden text-left font-sans">
                      
                      {(() => {
                        const nameLower = previewDoc.name.toLowerCase();
                        
                        // --- 1. BANGLADESH NATIONAL ID CARD (SMART CARD) ---
                        if (nameLower.includes('nid') || nameLower.includes('national id') || nameLower.includes('applicant')) {
                          return (
                            <div className="space-y-6">
                              {/* Header */}
                              <div className="flex justify-between items-start border-b border-emerald-650 pb-4">
                                <div className="flex items-center gap-2">
                                  {/* Bangladesh Gov logo mock */}
                                  <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[9px] shadow-sm border border-emerald-500">
                                    BD
                                  </div>
                                  <div>
                                    <h4 className="text-[12px] font-bold text-emerald-800 leading-tight">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h4>
                                    <p className="text-[9px] text-slate-500 font-medium">Government of the People's Republic of Bangladesh</p>
                                    <p className="text-[9px] text-emerald-700 font-bold tracking-widest">National ID Card / জাতীয় পরিচয়পত্র</p>
                                  </div>
                                </div>
                                <div className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  SMART CARD
                                </div>
                              </div>

                              {/* Card content */}
                              <div className="grid grid-cols-12 gap-4">
                                {/* Photo Section */}
                                <div className="col-span-4 flex flex-col items-center gap-2">
                                  <div className="w-28 h-32 bg-slate-100 rounded-lg border border-slate-300 overflow-hidden relative flex items-center justify-center shadow-inner">
                                    {/* Avatar */}
                                    <User className="h-16 w-16 text-slate-400" />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent" />
                                  </div>
                                  <span className="text-[8px] font-mono text-slate-400 select-text">Holder Signature</span>
                                  <div className="h-4 w-20 border-b border-dashed border-slate-400 font-mono text-[9px] text-slate-600 text-center italic">
                                    Mahmudur
                                  </div>
                                </div>

                                {/* Info list */}
                                <div className="col-span-8 space-y-3 text-[10px]">
                                  <div className="space-y-0.5">
                                    <span className="text-slate-400 block text-[8px] uppercase font-semibold">Name (বাংলা)</span>
                                    <p className="font-bold text-slate-800 text-[11px]">মাহমুদুর রহমান</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-slate-400 block text-[8px] uppercase font-semibold">Name (English)</span>
                                    <p className="font-bold text-slate-800 text-[11px] select-text">MAHMUDUR RAHMAN</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-slate-400 block text-[8px] uppercase font-semibold">Father's Name</span>
                                    <p className="font-medium text-slate-700">M. R. Rahman</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-slate-400 block text-[8px] uppercase font-semibold">Mother's Name</span>
                                    <p className="font-medium text-slate-700">Rabeya Rahman</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-0.5">
                                      <span className="text-slate-400 block text-[8px] uppercase font-semibold">Date of Birth</span>
                                      <p className="font-medium text-slate-700">12 Mar 1988</p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-slate-400 block text-[8px] uppercase font-semibold">Blood Group</span>
                                      <p className="font-semibold text-red-600">O+</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Footer ID banner */}
                              <div className="bg-slate-100 border border-slate-200/60 p-3.5 rounded-xl flex justify-between items-center mt-4">
                                <div>
                                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">National ID No</span>
                                  <span className="text-md font-mono font-bold text-emerald-800 tracking-wider select-text">554 902 1845</span>
                                </div>
                                {/* Hologram or chip */}
                                <div className="h-7 w-10 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 rounded-lg border border-amber-500 shadow-sm flex items-center justify-center font-mono text-[7px] text-amber-950 font-bold">
                                  CHIP
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // --- 2. RENT AGREEMENT / OFFICE LEASE ---
                        if (nameLower.includes('lease') || nameLower.includes('rent') || nameLower.includes('agreement') || nameLower.includes('tenancy') || nameLower.includes('deed')) {
                          return (
                            <div className="space-y-6 text-slate-850">
                              {/* Bangladesh Non-Judicial stamp header */}
                              <div className="border-4 border-double border-teal-800 p-4 bg-teal-50/20 text-center relative rounded-xl">
                                <div className="absolute top-2 left-2 text-[8px] font-mono text-teal-700">No. BD-718293</div>
                                <span className="text-[9px] uppercase tracking-widest text-teal-800 block font-bold">Government Non-Judicial Stamp</span>
                                <h2 className="text-lg font-bold text-teal-900 font-serif my-1">তিনশত টাকা (৳৩০০)</h2>
                                <div className="w-14 h-14 mx-auto rounded-full border-2 border-dashed border-teal-850 flex items-center justify-center text-teal-800 font-bold text-[8px]">
                                  GOVT SEAL
                                </div>
                              </div>

                              {/* Agreement content */}
                              <div className="font-serif text-[9px] leading-relaxed space-y-3.5">
                                <h3 className="text-center font-bold text-xs uppercase underline tracking-wider">DEED OF COMMERCIAL LEASE AGREEMENT</h3>
                                
                                <p>
                                  This DEED OF LEASE AGREEMENT is made on this 1st day of January, 2026, by and between the Landlord (hereinafter called the LESSOR) and <strong>Aura Tech Ventures BD</strong> represented by its Director, Mahmudur Rahman (hereinafter called the LESSEE).
                                </p>
                                
                                <p>
                                  WHEREAS the Lessor is the absolute owner of the commercial property situated at <strong>House 45, Road 12, Banani, Dhaka-1213</strong>, and has agreed to lease out the 3rd Floor, measuring approximately 1,800 sq ft, for office operations.
                                </p>

                                <p>
                                  <strong>NOW THIS DEED WITNESSETH AS FOLLOWS:</strong>
                                  <br />
                                  1. The lease duration shall be for 3 (three) years commencing from Jan 1st, 2026.
                                  <br />
                                  2. The monthly rent is fixed at BDT 80,000/- (Eighty Thousand Taka) payable before the 5th of each month.
                                  <br />
                                  3. The Lessee has deposited BDT 2,400,000/- as an interest-free advance security deposit.
                                </p>
                              </div>

                              {/* Signatures */}
                              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4">
                                <div>
                                  <div className="h-8 border-b border-slate-300 font-serif italic text-xs text-slate-600 text-center flex items-end justify-center">
                                    Abdul Karim
                                  </div>
                                  <span className="text-[8px] text-slate-500 block text-center uppercase font-bold mt-1">Lessor (Landlord)</span>
                                </div>
                                <div>
                                  <div className="h-8 border-b border-slate-300 font-mono italic text-xs text-slate-600 text-center flex items-end justify-center">
                                    Mahmudur
                                  </div>
                                  <span className="text-[8px] text-slate-500 block text-center uppercase font-bold mt-1">Lessee (Mahmudur Rahman)</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // --- 3. CERTIFICATE OF INCORPORATION ---
                        if (nameLower.includes('incorporation') || nameLower.includes('cert') || nameLower.includes('rjsc')) {
                          return (
                            <div className="space-y-6 text-center text-slate-900 border-4 border-amber-600/20 p-6 rounded-2xl relative">
                              <div className="absolute inset-2 border border-amber-600/10 rounded-lg pointer-events-none" />
                              
                              {/* Govt emblem */}
                              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold border-2 border-amber-500">
                                GOVT
                              </div>

                              <div className="space-y-1">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700">Office of the Registrar of Joint Stock Companies & Firms</h3>
                                <p className="text-[9px] font-semibold text-emerald-855">Dhaka, Bangladesh</p>
                                <h2 className="text-md font-bold font-serif text-amber-900 border-b border-amber-500/30 pb-2 uppercase tracking-wide">Certificate of Incorporation</h2>
                              </div>

                              <p className="text-[10px] font-serif leading-relaxed text-slate-700 italic px-2">
                                I hereby certify that <span className="font-bold text-slate-900 not-italic">AURA TECH VENTURES BD PRIVATE LIMITED</span> is this day incorporated under the Companies Act (Act XVIII) of 1994, and that the Company is Limited by shares.
                              </p>

                              <div className="py-2.5">
                                <span className="text-[8px] uppercase text-slate-400 block font-semibold">Given under my hand at Dhaka this</span>
                                <p className="text-[10px] font-bold text-slate-800">15th Day of November, Two Thousand and Twenty-Five.</p>
                              </div>

                              {/* Registration Details banner */}
                              <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl max-w-xs mx-auto text-left">
                                <div className="flex justify-between">
                                  <span className="text-[8px] uppercase text-slate-400 font-bold">Registration No:</span>
                                  <span className="text-[9px] font-mono font-bold text-amber-900 select-text">C-184920/2025</span>
                                </div>
                              </div>

                              {/* Seal */}
                              <div className="flex justify-between items-end pt-4">
                                <div className="text-[8px] text-left text-slate-400 font-mono">
                                  Verified digitally by RJSC portal
                                </div>
                                <div className="text-right">
                                  <div className="w-16 h-16 rounded-full border-2 border-emerald-600/30 flex items-center justify-center text-emerald-600 font-bold text-[8px] rotate-12">
                                    RJSC OFFICIAL
                                  </div>
                                  <span className="text-[8px] text-slate-500 uppercase font-bold block mt-1">Registrar</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // --- 4. MEMORANDUM & ARTICLES OF ASSOCIATION ---
                        if (nameLower.includes('moa') || nameLower.includes('aoa') || nameLower.includes('memorandum') || nameLower.includes('articles')) {
                          return (
                            <div className="space-y-6 text-center text-slate-950 p-6 border-2 border-indigo-250 rounded-2xl">
                              <div className="bg-indigo-950 text-indigo-100 p-8 rounded-xl text-center space-y-4 shadow-md">
                                <span className="text-[8px] uppercase tracking-widest text-indigo-300 font-bold">The Companies Act, 1994</span>
                                <h1 className="text-sm font-bold tracking-tight uppercase leading-snug">
                                  Memorandum <br />& Articles of Association
                                </h1>
                                <div className="w-8 h-0.5 bg-indigo-400 mx-auto" />
                                <p className="text-[10px] font-light">OF</p>
                                <h2 className="text-xs font-bold text-white uppercase select-text">AURA TECH VENTURES BD PRIVATE LIMITED</h2>
                              </div>

                              <div className="text-left text-[9px] space-y-2 text-slate-600">
                                <p className="font-semibold text-slate-800 border-b border-slate-100 pb-1">I. The name of the company is "Aura Tech Ventures BD Private Limited".</p>
                                <p className="font-semibold text-slate-800 border-b border-slate-100 pb-1">II. The registered office of the company will be situated in Bangladesh.</p>
                                <p>III. The objects for which the company is established are to carry on the business of Software Engineering, IT Enabled Services, and consultancy.</p>
                              </div>

                              <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-left border border-slate-200">
                                <div>
                                  <span className="text-[8px] uppercase text-slate-400 font-bold">Authorized Capital</span>
                                  <p className="text-[10px] font-bold text-indigo-950">৳১,০০,০০,০০০ (1 Crore BDT)</p>
                                </div>
                                <div className="h-8 w-16 border border-dashed border-slate-300 rounded flex items-center justify-center font-mono text-[8px] text-slate-400">
                                  RJSC Stamped
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // --- 5. FORM XII (DIRECTORS PARTICULARS) ---
                        if (nameLower.includes('form') || nameLower.includes('xii') || nameLower.includes('form12')) {
                          return (
                            <div className="space-y-4 text-slate-900">
                              <div className="text-center pb-2 border-b border-slate-300">
                                <h2 className="text-xs font-bold uppercase">THE COMPANIES ACT, 1994</h2>
                                <h3 className="text-[10px] font-bold text-slate-700">FORM XII (Directors Particulars)</h3>
                                <p className="text-[8px] text-slate-500">Pursuant to Section 115 of the Companies Act</p>
                              </div>

                              <div className="space-y-1 text-left text-[9px]">
                                <p><strong>Company Name:</strong> Aura Tech Ventures BD Private Limited</p>
                                <p><strong>Registration Number:</strong> C-184920/2025</p>
                              </div>

                              {/* Table */}
                              <div className="border border-slate-300 rounded-lg overflow-hidden text-[8px]">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                                      <th className="p-2 border-r border-slate-300">Name & Address</th>
                                      <th className="p-2 border-r border-slate-300">Nationality</th>
                                      <th className="p-2 border-r border-slate-300">Designation</th>
                                      <th className="p-2">Shares Held</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b border-slate-200">
                                      <td className="p-2 border-r border-slate-200">
                                        <strong>Mahmudur Rahman</strong>
                                        <br />House 45, Banani, Dhaka
                                      </td>
                                      <td className="p-2 border-r border-slate-200">Bangladeshi</td>
                                      <td className="p-2 border-r border-slate-200 font-semibold text-emerald-800">Managing Director</td>
                                      <td className="p-2 font-mono">10,000</td>
                                    </tr>
                                    <tr>
                                      <td className="p-2 border-r border-slate-200">
                                        <strong>Nusrat Jahan</strong>
                                        <br />House 12, Gulshan, Dhaka
                                      </td>
                                      <td className="p-2 border-r border-slate-200">Bangladeshi</td>
                                      <td className="p-2 border-r border-slate-200">Director</td>
                                      <td className="p-2 font-mono">5,000</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex justify-between items-center pt-4">
                                <div className="h-10 w-24 border border-dashed border-slate-300 rounded flex items-center justify-center font-mono text-[8px] text-slate-400 rotate-3">
                                  RJSC Certified Copy
                                </div>
                                <div className="text-right">
                                  <span className="text-[7px] text-slate-400 block font-bold">Filing Inspector Signature</span>
                                  <div className="h-5 w-24 border-b border-dashed border-slate-400 font-mono text-[9px] text-center italic">
                                    Kamrul Hasan
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // --- 6. UTILITY BILL (ELECTRICITY CO) ---
                        if (nameLower.includes('utility') || nameLower.includes('bill') || nameLower.includes('electricity') || nameLower.includes('desco')) {
                          return (
                            <div className="space-y-4 text-slate-900 text-left">
                              <div className="flex justify-between items-start border-b-2 border-orange-500 pb-2">
                                <div>
                                  <h2 className="text-sm font-bold text-orange-600">DESCO</h2>
                                  <p className="text-[8px] text-slate-500 font-semibold">Dhaka Electric Supply Company Limited</p>
                                </div>
                                <div className="text-right text-[8px]">
                                  <p className="font-bold">ELECTRICITY BILL</p>
                                  <p className="font-mono">Month: JUNE 2026</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-[9px] bg-orange-500/5 p-2.5 rounded-lg border border-orange-500/10">
                                <div>
                                  <span className="text-[8px] text-slate-400 font-bold block">CONSUMER ADDRESS:</span>
                                  <p className="font-semibold">Aura Tech Ventures BD</p>
                                  <p>House 45, Road 12, Banani, Zone 3</p>
                                </div>
                                <div>
                                  <p><strong>Account No:</strong> 29381048</p>
                                  <p><strong>Meter Number:</strong> DSC-9204</p>
                                  <p><strong>Due Date:</strong> 15 July 2026</p>
                                </div>
                              </div>

                              {/* Bar graph mock */}
                              <div className="space-y-1">
                                <span className="text-[8px] text-slate-400 font-bold block">6-MONTH CONSUMPTION HISTORY (kWh):</span>
                                <div className="flex items-end justify-between h-14 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <div className="w-6 bg-orange-200 h-10 rounded-sm text-center text-[7px] text-orange-850">450</div>
                                  <div className="w-6 bg-orange-200 h-11 rounded-sm text-center text-[7px] text-orange-850">520</div>
                                  <div className="w-6 bg-orange-200 h-8 rounded-sm text-center text-[7px] text-orange-850">390</div>
                                  <div className="w-6 bg-orange-200 h-12 rounded-sm text-center text-[7px] text-orange-850">600</div>
                                  <div className="w-6 bg-orange-500 h-14 rounded-sm text-center text-[7px] text-white font-bold">780</div>
                                </div>
                              </div>

                              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                                <div>
                                  <span className="text-[8px] text-slate-400 block font-bold">TOTAL AMOUNT PAYABLE:</span>
                                  <span className="text-md font-mono font-bold text-orange-600">৳১২,৪৫০/-</span>
                                </div>
                                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] uppercase font-bold tracking-wider rounded-lg border border-emerald-500/20 rotate-3">
                                  PAID IN FULL
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // --- 7. PASSPORT PHOTO ---
                        if (nameLower.includes('photo') || nameLower.includes('photograph') || nameLower.includes('picture') || nameLower.includes('image')) {
                          return (
                            <div className="space-y-4 text-center">
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">PASSPORT SIZE PORTRAIT</span>
                              <div className="w-48 h-56 mx-auto bg-gradient-to-b from-blue-100 to-blue-200 border border-slate-300 rounded-lg shadow-md flex items-center justify-center relative overflow-hidden">
                                {/* Soft Studio Lighting Backdrop */}
                                <div className="absolute inset-0 bg-blue-400/20" />
                                <User className="h-32 w-32 text-white opacity-90 drop-shadow-lg" />
                              </div>
                              <p className="text-[9px] text-slate-500 font-light italic">
                                Formatted for Ward counselor Municipal clearance submissions
                              </p>
                            </div>
                          );
                        }

                        // --- 8. DEFAULT / OTHER GENERAL LEGAL DOC ---
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest block">Official Document File</span>
                                <h3 className="text-xs font-bold text-slate-800">{previewDoc.name}</h3>
                              </div>
                              <div className="p-1 bg-blue-50 text-blue-600 rounded-lg">
                                <FileText className="h-5 w-5" />
                              </div>
                            </div>

                            <div className="py-6 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              <div className="h-10 w-10 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <ShieldCheck className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-700">Digital Copy Verified & Secured</p>
                                <p className="text-[9px] text-slate-500 max-w-xs mx-auto">This document was uploaded to E-Lawyers servers and passed compliance screening.</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-[9px] pt-2 text-slate-600">
                              <div className="text-left">
                                <p><strong>Owner:</strong> Mahmudur Rahman</p>
                                <p><strong>Service Ref:</strong> EL-782914</p>
                              </div>
                              <div className="text-right">
                                <p><strong>Verified on:</strong> {selectedRequest.submittedAt}</p>
                                <p className="text-emerald-600 font-semibold">● SECURE SSL</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Status bar */}
              <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 text-left font-light">
                  Use the zoom controls to inspect document details closely.
                </span>
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-mono font-bold self-start sm:self-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-450 animate-pulse" />
                  Secure Compliance Verification Active
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Alert Notification for toggled reminders */}
      <AnimatePresence>
        {reminderToast && reminderToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 border border-amber-500/30 text-white rounded-xl p-4 shadow-2xl flex items-start gap-3"
          >
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 text-amber-400">
              <Bell className="h-4 w-4" />
            </div>
            <div className="space-y-1 text-left">
              <p className="text-xs font-semibold text-amber-400 font-display uppercase tracking-wider">Reminder Set</p>
              <p className="text-[11px] text-slate-300 leading-snug">{reminderToast.message}</p>
            </div>
            <button 
              onClick={() => setReminderToast(prev => prev ? { ...prev, visible: false } : null)}
              className="text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
