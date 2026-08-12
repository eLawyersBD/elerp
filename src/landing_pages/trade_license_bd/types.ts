/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ConsultationRequest {
  id: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  businessLocation: string; // City Corporation or Municipality
  businessAddress?: string;
  natureOfBusiness?: string;
  requestedService?: string;
  preferredContactMethod: 'Mobile' | 'WhatsApp' | 'Email';
  additionalInformation?: string;
  documents?: { name: string; size: string; status: 'Uploaded' | 'Pending' | 'In Review' | 'Verified' | 'Rejected'; previewUrl?: string }[];
  status: 'Received' | 'Consulting' | 'Documents Collected' | 'Verification' | 'Application Prepared' | 'Government Submitted' | 'Processing' | 'Issued' | 'Delivered';
  step: number; // 1 to 8 matching the visual flowchart
  submittedAt: string;
  notes?: string;
  manuallyVerifiedDocs?: string[];
  reminders?: {
    [docId: string]: {
      enabled: boolean;
      channel: 'Email' | 'SMS' | 'Both';
      frequency: 'Daily' | 'Weekly' | 'Before Due Date';
    };
  };
}

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

export interface BusinessTypeCategory {
  title: string;
  description: string;
  icon: string;
  examples: string[];
}

export interface ServiceItem {
  title: string;
  description: string;
  icon: string;
}

export interface AuthorityCovered {
  name: string;
  district: string;
  type: 'City Corporation' | 'Municipality';
}

export interface BenefitItem {
  title: string;
  description: string;
  icon: string;
}

export interface PricingPlan {
  name: string;
  fee: string;
  govFee: string;
  vat: string;
  timeline: string;
  features: string[];
}

export interface ServiceCatalogItem {
  id: string;
  title: string;
  imageUrl: string;
  landingPageTitle: string;
  tagline: string;
  description: string;
  timeline: string;
  iconName: string;
  details: {
    overview: string;
    whoNeedsIt: string[];
    requiredDocs: string[];
    processSteps: string[];
  };
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
    META_PIXEL_ID?: string;
  }
}

