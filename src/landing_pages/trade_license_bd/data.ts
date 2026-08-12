/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FAQItem, BusinessTypeCategory, ServiceItem, AuthorityCovered, BenefitItem, PricingPlan, ServiceCatalogItem } from './types';

export const FAQ_DATA: FAQItem[] = [
  {
    question: "What is a Trade License in Bangladesh?",
    answer: "A Trade License is an official legal authorization issued by the local government authority (City Corporation, Municipality, or Union Parishad) allowing an individual or business entity to legally conduct business activities within its jurisdiction. Operating without a valid license is illegal and subject to fines and penalties."
  },
  {
    question: "Who needs to obtain a Trade License?",
    answer: "Any individual or entity commencing commercial, trading, industrial, or professional activities in Bangladesh must obtain a Trade License. This includes sole proprietorships, partnership firms, private limited companies, e-commerce stores, Facebook-based businesses, IT consultants, restaurants, and freelancers operating under a business name."
  },
  {
    question: "How long does it take to register a Trade License?",
    answer: "Normal processing takes between 7 to 14 business days, depending on the City Corporation or Municipality jurisdiction. Urgent processing is available in certain jurisdictions for urgent situations, subject to authority-specific timelines."
  },
  {
    question: "What documents are required for an individual (Sole Proprietorship)?",
    answer: "You will need: (1) Photocopy of National ID Card (NID) or Passport, (2) Three copies of recent passport-size photographs, (3) Rental agreement of the commercial office space or land ownership documents/tax receipts, (4) A holding tax/utility bill copy of the commercial location, and (5) A cleared name for your business."
  },
  {
    question: "What extra documents does a Limited Company need?",
    answer: "A Private Limited Company must submit: (1) Certificate of Incorporation, (2) Memorandum & Articles of Association (MoA/AoA), (3) Form XII (Particulars of Directors), (4) Board Resolution authorizing the license application, (5) NID/Passport of all directors, and (6) Rent agreement and commercial space tax/utility proof."
  },
  {
    question: "Can I register my Trade License online?",
    answer: "Yes, many major City Corporations (such as DNCC and DSCC) have launched online systems. E-Lawyers leverages these digital portals alongside physical filings to provide an end-to-end online service. You can submit all your documents securely through our portal, and we will deliver your digital and physical Trade License without you needing to visit any government office."
  },
  {
    question: "What are the government fees for Trade License?",
    answer: "Government fees are determined by the local authority based on: (1) The nature/category of the business, (2) The location (e.g., commercial zones pay more than non-commercial), and (3) The capital size of the business. The official government fee can range from ৳2,000 to ৳25,000+, excluding VAT and source taxes. E-Lawyers will calculate the exact government fee during your initial consultation."
  },
  {
    question: "Can I amend my Trade License details later?",
    answer: "Yes. If your business moves to a new address, changes its name, or adds new business activities (nature of business), you can apply for an amendment. E-Lawyers handles all types of Trade License amendments and updates."
  },
  {
    question: "Do you provide annual renewal services?",
    answer: "Absolutely. In Bangladesh, all Trade Licenses expire on June 30th of each year and must be renewed between July and September to avoid late fees. E-Lawyers offers a proactive renewal management service, sending automated alerts and processing your annual renewals efficiently."
  }
];

export const BUSINESS_TYPES: BusinessTypeCategory[] = [
  {
    title: "New Entrepreneurs",
    description: "Launch your dream venture securely. We help you pick the right legal categories and secure your initial operational license.",
    icon: "Rocket",
    examples: ["Startups", "Retail Shops", "Local Services"]
  },
  {
    title: "Sole Proprietorships",
    description: "The most common business structure in Bangladesh. Simple setup requiring personal credentials and commercial address proof.",
    icon: "User",
    examples: ["Facebook Shops", "Online Stores", "Consultants", "Agencies"]
  },
  {
    title: "Partnership Firms",
    description: "Joint ventures requiring shared liabilities. Requires partnership deed verification alongside standard office details.",
    icon: "Users",
    examples: ["Co-founded Agencies", "Trading Partners", "Joint Services"]
  },
  {
    title: "Private Limited Companies",
    description: "Corporate entities requiring complete legal alignment between RJSC registrations and City Corporation requirements.",
    icon: "Building2",
    examples: ["Company Offices", "Branch Offices", "IT Exports"]
  },
  {
    title: "E-Commerce & Digital",
    description: "Whether you operate a Facebook shop (f-commerce) or a custom online platform, a valid license is now mandatory to open merchant gateways and secure courier contracts.",
    icon: "Globe",
    examples: ["Online Brands", "Digital Agencies", "Courier Businesses"]
  },
  {
    title: "Specialized Industries",
    description: "Businesses requiring secondary clearances or custom categories before license submission.",
    icon: "ShieldAlert",
    examples: ["Import-Export", "Restaurants", "Manufacturing", "Healthcare Providers"]
  }
];

export const AUTHORITIES_COVERED: AuthorityCovered[] = [
  { name: "Dhaka North City Corporation (DNCC)", district: "Dhaka", type: "City Corporation" },
  { name: "Dhaka South City Corporation (DSCC)", district: "Dhaka", type: "City Corporation" },
  { name: "Chattogram City Corporation", district: "Chattogram", type: "City Corporation" },
  { name: "Rajshahi City Corporation", district: "Rajshahi", type: "City Corporation" },
  { name: "Khulna City Corporation", district: "Khulna", type: "City Corporation" },
  { name: "Sylhet City Corporation", district: "Sylhet", type: "City Corporation" },
  { name: "Gazipur City Corporation", district: "Gazipur", type: "City Corporation" },
  { name: "Narayanganj City Corporation", district: "Narayanganj", type: "City Corporation" },
  { name: "Rangpur City Corporation", district: "Rangpur", type: "City Corporation" },
  { name: "Barishal City Corporation", district: "Barishal", type: "City Corporation" },
  { name: "All Municipalities (Pourashava) & Union Parishads", district: "Nationwide", type: "Municipality" }
];

export const SERVICES_INCLUDED: ServiceItem[] = [
  {
    title: "Eligibility Assessment",
    description: "We review your commercial activity, office location, and structure to advise you on the exact business categories, estimated government fees, and potential supplementary permissions.",
    icon: "FileSearch"
  },
  {
    title: "Document Preparation & Verification",
    description: "Our legal experts review and organize your lease agreement, utility bills, RJSC incorporation certificates, and photos to ensure they comply with government specifications.",
    icon: "CheckSquare"
  },
  {
    title: "Official Application Drafting",
    description: "We prepare and fill out the official Trade License application forms (Form K/I) accurately to prevent typical government filing rejection or delay.",
    icon: "FileText"
  },
  {
    title: "Government Submission & Payment",
    description: "E-Lawyers physically or electronically submits your dossier to the relevant City Corporation or Pourashava office and handles all government payment receipts.",
    icon: "UploadCloud"
  },
  {
    title: "Processing Follow-Up",
    description: "We actively monitor progress with the licensing inspector and department authorities to resolve any clarification requests immediately.",
    icon: "RefreshCw"
  },
  {
    title: "Secure Delivery",
    description: "Once issued, we collect your physical smart card/paper Trade License, generate a high-resolution digital copy for your secure portal, and dispatch the original via premium courier.",
    icon: "Truck"
  }
];

export const BENEFITS_LIST: BenefitItem[] = [
  {
    title: "Operate 100% Legally",
    description: "Protect your commercial operations from abrupt municipal inspections, shut-down threats, and legal penalties.",
    icon: "Scale"
  },
  {
    title: "Open Business Bank Accounts",
    description: "Commercial banks in Bangladesh require a valid Trade License to open current accounts, merchant accounts, or corporate credit cards.",
    icon: "Building"
  },
  {
    title: "VAT & BIN Registration",
    description: "A Trade License is mandatory to obtain your Business Identification Number (BIN) and register for VAT.",
    icon: "Percent"
  },
  {
    title: "Secure Supplier & Gov Tenders",
    description: "Participate in local or government procurements and secure institutional corporate contracts.",
    icon: "Briefcase"
  },
  {
    title: "Establish Consumer & Partner Trust",
    description: "Showcase your registration credentials to partners, payment gateways, and retail consumers.",
    icon: "ShieldCheck"
  },
  {
    title: "Avoid Financial Penalties",
    description: "Stay ahead of compound late fees and government crackdowns on unregistered businesses.",
    icon: "BadgeAlert"
  }
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Proprietorship License (Standard)",
    fee: "৳3,000",
    govFee: "Actual Cost (varies by activity & location)",
    vat: "15% Government VAT",
    timeline: "7 - 10 Business Days",
    features: [
      "Initial business category audit",
      "Rent agreement & utility bill review",
      "Official Form-K application preparation",
      "Filing and processing with City Corp / Municipality",
      "Digital copy uploaded to Client Portal",
      "Courier delivery of original license"
    ]
  },
  {
    name: "Proprietorship License (Urgent)",
    fee: "৳5,000",
    govFee: "Actual Cost (varies by activity & location)",
    vat: "15% Government VAT",
    timeline: "3 - 5 Business Days",
    features: [
      "Priority dossier preparation (under 12 hours)",
      "Instant submission to government portal",
      "Direct follow-up with municipal licensing inspectors",
      "Daily progress updates via Case Manager",
      "Digital copy uploaded immediately",
      "Hand-delivery or same-day courier dispatch"
    ]
  },
  {
    name: "Corporate / Company License",
    fee: "৳6,000",
    govFee: "Actual Cost (based on RJSC Paid-up Capital)",
    vat: "15% Government VAT",
    timeline: "10 - 14 Business Days",
    features: [
      "Comprehensive corporate dossier setup",
      "Verification of RJSC Incorporation certificate & Articles",
      "Drafting Board Resolution & official authorizations",
      "Commercial holding/space clearance assessment",
      "Handling multiple director details & NIDs",
      "Secure digital archive & dedicated Case Manager"
    ]
  }
];

export const SEO_KEYWORDS: string[] = [
  "Trade License Registration Bangladesh",
  "Trade License Bangladesh",
  "New Trade License",
  "Trade License Online Bangladesh",
  "Trade License Dhaka",
  "City Corporation Trade License",
  "Municipality Trade License",
  "Trade License Registration Service",
  "Sole Proprietorship Trade License",
  "Business License Bangladesh",
  "Trade License Consultant Bangladesh",
  "Trade License Renewal",
  "DNCC Trade License",
  "DSCC Trade License",
  "Chattogram Trade License"
];

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    id: "trade-license-registration",
    title: "Trade License Registration",
    imageUrl: "https://i.ibb.co/gbdYxDw9/e6f34923-0212-489c-88d3-6b337b2195a6.png",
    landingPageTitle: "Trade License Registration in Bangladesh | Fast & Professional Service",
    tagline: "Start your business on the right legal footing with our hassle-free registration service.",
    description: "Complete, end-to-end assistance in obtaining your initial Trade License from any City Corporation or Municipality in Bangladesh.",
    timeline: "7 - 10 Business Days",
    iconName: "FileCheck",
    details: {
      overview: "Every commercial entity operating in Bangladesh must obtain a valid Trade License from the local government authority. E-Lawyers provides a fully managed registration service that handles file prep, inspection management, ward communications, and courier delivery of your official document.",
      whoNeedsIt: [
        "Any new retail, trading, or service business starting operations",
        "E-Commerce & F-Commerce sellers requiring merchant bank setups",
        "Consultants, freelancers, and professional service providers"
      ],
      requiredDocs: [
        "National ID (NID) card or Passport copy",
        "Recent passport-sized photographs (3 copies)",
        "Rental Agreement of the commercial space or commercial holding tax receipt",
        "Utility bill copy of the commercial address"
      ],
      processSteps: [
        "Pre-verification of proposed business name & location categories",
        "Preparation and compilation of all dossier forms",
        "Filing with local City Corporation / Pourashava department",
        "Municipal licensing inspector liaison and verification",
        "Official tax/challan payments and smart-card generation",
        "Express delivery of the original physical license"
      ]
    }
  },
  {
    id: "trade-license-renewal",
    title: "Trade License Renewal",
    imageUrl: "https://i.ibb.co/q3kKGtHL/80cc1441-42f0-45f0-8e43-cd054064ea2d.png",
    landingPageTitle: "Trade License Renewal Service in Bangladesh",
    tagline: "Avoid compounding municipal penalties and keep your business operating legally.",
    description: "All Trade Licenses in Bangladesh expire on June 30th annually. We manage the entire renewal process, ensuring your business stays compliant without any downtime.",
    timeline: "3 - 5 Business Days",
    iconName: "RefreshCw",
    details: {
      overview: "Under municipal laws, every Trade License must be renewed between July 1st and September 30th of each financial year. Delaying renewal incurs compound monthly late fees, potential closure orders, and invalidates your commercial bank accounts and VAT certifications. E-Lawyers automates your annual renewal smoothly.",
      whoNeedsIt: [
        "Any active business operating with an existing Trade License",
        "Companies preparing for annual auditing or tax filing",
        "Businesses requiring active credit or banking operations"
      ],
      requiredDocs: [
        "Original Trade License of the previous year (booklet or copy)",
        "NID/Passport of the business owner",
        "Recent rent receipt copy of the commercial location",
        "Up-to-date holding tax receipt or utility bill copy"
      ],
      processSteps: [
        "Audit of previous license categories and pending government fees",
        "Drafting and filling out the renewal declaration paperwork",
        "Challan generation and official fee payments at partner banks",
        "Obtaining the official renewal stamp and verification signature",
        "Uploading digital copy and dispatching physical booklet to you"
      ]
    }
  },
  {
    id: "trade-license-category-update",
    title: "Trade License Category Update / Changes",
    imageUrl: "https://i.ibb.co/ZR1sy7tJ/6521615d-d4cc-45d2-8061-c50d86201799.png",
    landingPageTitle: "Trade License Category Change Service",
    tagline: "Expanding your horizons? Seamlessly update or add business categories to your license.",
    description: "If your business nature changes or expands, your trade license must reflect those exact commercial activities. We file the necessary amendments legally and swiftly.",
    timeline: "5 - 7 Business Days",
    iconName: "Settings",
    details: {
      overview: "Operating a business activity not officially mentioned on your Trade License is a violation of municipal rules and can lead to unexpected inspection penalties. Whether you are adding a new product line, transitioning from trading to manufacturing, or expanding services, we make the process smooth.",
      whoNeedsIt: [
        "Businesses pivoting to a new nature of trade or adding subsidiary services",
        "Retail stores moving into online import/export segments",
        "Service providers expanding into physical trading activities"
      ],
      requiredDocs: [
        "Copy of the current active Trade License",
        "Written board resolution or proprietor request letter detailing new categories",
        "Supplementary commercial documents (e.g. fire/chemical clearance if applicable)"
      ],
      processSteps: [
        "Assessing and mapping your new activities to the official municipal code list",
        "Calculating supplementary government fees for the upgraded category",
        "Filing the amendment petition with the Zonal licensing officer",
        "Securing Inspector approval for category updates",
        "Reprinting the corrected license and delivery"
      ]
    }
  },
  {
    id: "trade-license-name-update",
    title: "Trade License Name Update / Renaming",
    imageUrl: "https://i.ibb.co/tMTknjWr/25c8cd08-1996-4078-8ac4-5199a2075d1e-1.png",
    landingPageTitle: "Trade License Name Change Service",
    tagline: "Rebranding your business? Update your registered trade name officially.",
    description: "Changing your business name requires official approval and updating municipal records. We handle the complete legal procedure to make your new trade name official.",
    timeline: "5 - 7 Business Days",
    iconName: "Edit3",
    details: {
      overview: "Your trade name is the foundation of your corporate identity. When you rebrand or change your business name, you must update your Trade License first, as it dictates your bank account names, VAT certificates, and trade contracts. E-Lawyers coordinates with City Corporations to update the government database seamlessly.",
      whoNeedsIt: [
        "Businesses undergoing corporate rebranding",
        "Proprietors transferring ownership requiring a title change",
        "Companies adapting their name to match international parent branding"
      ],
      requiredDocs: [
        "Original active Trade License booklet",
        "For companies: Board resolution and RJSC Name Clearance Certificate",
        "Affidavit of Name Change (if individual proprietorship)",
        "New logo and trade layout description"
      ],
      processSteps: [
        "Confirming name availability and checking name duplications",
        "Filing the name change petition along with legal declarations",
        "Municipal database record updates and database sync",
        "Generating the corrected physical Trade License booklet",
        "Delivering your newly named legal business license"
      ]
    }
  },
  {
    id: "trade-license-cancellation",
    title: "Trade License Cancellation",
    imageUrl: "https://i.ibb.co/kVdg9y0X/4c0a0b62-1d46-454f-9595-5c89100b6fa4-1.png",
    landingPageTitle: "Trade License Cancellation Service",
    tagline: "Winding down operations? Officially cancel your license to prevent tax liability.",
    description: "Failing to cancel an unused trade license leads to compounding annual government holding taxes, VAT, and penalty accumulation. We legally wind down your municipal files.",
    timeline: "7 - 10 Business Days",
    iconName: "XCircle",
    details: {
      overview: "Many founders believe that simply stopping business activities terminates their legal obligations. In Bangladesh, municipal databases continue to charge annual holding taxes and late fees indefinitely until an official Cancellation/Surrender Certificate is issued. We protect you from future legal and financial liabilities.",
      whoNeedsIt: [
        "Companies or shops winding down operations permanently",
        "Entities restructuring into partnership or private limited structures",
        "Individuals moving abroad closing local commercial ventures"
      ],
      requiredDocs: [
        "All original Trade License booklets/materials",
        "Letter of Surrender detailing reasons (closure of shop, bankruptcy, etc.)",
        "No-objection letter from landlord of the commercial address",
        "Clearing certificate of any due municipal dues/taxes"
      ],
      processSteps: [
        "Calculating and clearing outstanding taxes and pending late fines",
        "Submitting the formal application for termination and surrender",
        "Coordinating with the ward counselor and licensing inspector for file closure",
        "Securing the official Government License Cancellation Certificate",
        "Handing over the final legal cancellation clearance documents"
      ]
    }
  },
  {
    id: "trade-license-proprietorship",
    title: "Trade License for Proprietorship",
    imageUrl: "https://i.ibb.co/JWGN95nf/03e4444a-4559-4341-834e-23ec79289b38-2.png",
    landingPageTitle: "Trade License for Sole Proprietorship Business",
    tagline: "The fastest way for individual founders to start doing business in Bangladesh.",
    description: "Perfect for single owners, f-commerce entrepreneurs, freelancers, and independent service providers. We secure your license using standard personal and address credentials.",
    timeline: "5 - 7 Business Days",
    iconName: "User",
    details: {
      overview: "Sole Proprietorship is the easiest, most agile business structure in Bangladesh. It has lower compliance overheads compared to companies. E-Lawyers helps individual founders draft their documents and obtain a valid trade license quickly to commence operations, set up delivery services, or accept digital payments.",
      whoNeedsIt: [
        "Solo founders, consultants, and freelance agency operators",
        "Online boutiques, f-commerce shops, and local retail outlets",
        "Independent craftsmen, writers, designers, and software engineers"
      ],
      requiredDocs: [
        "NID or Passport copy of the Proprietor",
        "3 copies of passport-sized photographs",
        "Rental contract of commercial office or home address (for digital businesses)",
        "Recent utility bill of the designated office space"
      ],
      processSteps: [
        "Selecting compliant business categories from the municipal registry",
        "Validating the office address and rent deeds",
        "Drafting the Sole Proprietor municipal file and application",
        "Expedited processing through local city corporation wards",
        "Hand-delivery or secure courier of the issued license booklet"
      ]
    }
  },
  {
    id: "trade-license-partnership",
    title: "Trade License for Partnership",
    imageUrl: "https://i.ibb.co/JWGN95nf/03e4444a-4559-4341-834e-23ec79289b38-2.png",
    landingPageTitle: "Trade License for Partnership Firm",
    tagline: "Secure a shared business license with clear partner liabilities and deeds.",
    description: "Operating with a co-founder? We help verify your partnership deed, draft the official municipal file, and secure a shared commercial license.",
    timeline: "7 - 10 Business Days",
    iconName: "Users",
    details: {
      overview: "When starting a business with multiple founders under a partnership structure, a custom Trade License must be issued under the firm name, listing the partnership deed details. We help you align your partnership agreements with local government filing rules to prevent future operational disputes.",
      whoNeedsIt: [
        "Co-founders establishing joint manufacturing, retail, or agency models",
        "Family-owned businesses organizing shared ownership contracts",
        "Trading partnerships requiring custom municipal category allotments"
      ],
      requiredDocs: [
        "Registered or Non-Registered Partnership Deed copy (drafted on stamp paper)",
        "NID copies and passport-sized photographs of all active partners",
        "Commercial space lease agreement and recent utility bills"
      ],
      processSteps: [
        "Legal review of the Partnership Deed for municipal compatibility",
        "Filing the combined partnership trade application with local authorities",
        "Inspector liaison to verify co-partner identities and workspace validity",
        "Processing government tax payments and generating the shared license",
        "Delivery of the physical license and digitized records to the client portal"
      ]
    }
  },
  {
    id: "trade-license-private-limited",
    title: "Trade License for Private Limited Company",
    imageUrl: "https://i.ibb.co/5gt4vhPZ/a1cfdd38-8bc0-4816-983a-910d311fa238.png",
    landingPageTitle: "Trade License for Private Limited Company in Bangladesh",
    tagline: "Corporate license alignments with RJSC incorporation documents.",
    description: "For companies registered with the RJSC. We align your Memorandum of Association, Form XII, and corporate structures to secure a valid commercial license under the company name.",
    timeline: "10 - 14 Business Days",
    iconName: "Building",
    details: {
      overview: "A private limited company registered under the Registrar of Joint Stock Companies & Firms (RJSC) cannot initiate actual business operations or open corporate bank accounts without obtaining a corresponding municipal Trade License. The company's trade license must exactly match its corporate capital and objectives in the MoA. E-Lawyers specializes in managing complex corporate licenses.",
      whoNeedsIt: [
        "Newly incorporated RJSC Private Limited Companies",
        "Joint ventures and foreign-owned entities operating in Bangladesh",
        "Large-scale industries, software tech firms, and import-export corporations"
      ],
      requiredDocs: [
        "RJSC Certificate of Incorporation copy",
        "Memorandum & Articles of Association (MoA & AoA)",
        "Form XII (Particulars of Directors) copy",
        "Board Resolution authorizing the Trade License procurement",
        "NID/Passport copy of the Managing Director",
        "Commercial landlord rent receipt and office utility bill"
      ],
      processSteps: [
        "Auditing the RJSC objectives against City Corporation trade codes",
        "Drafting and compiling corporate-level application dossiers",
        "Coordinating with Zonal licensing officers for corporate holding evaluation",
        "Securing municipal inspectors' field clearance for corporate premises",
        "Direct processing of corporate holding tax assessments",
        "Uploading original documents to the corporate portal and premium delivery"
      ]
    }
  },
  {
    id: "trade-license-correction",
    title: "Trade License Correction",
    imageUrl: "https://i.ibb.co/5gt4vhPZ/a1cfdd38-8bc0-4816-983a-910d311fa238.png",
    landingPageTitle: "Trade License Information Correction Service",
    tagline: "Fix spelling errors, address inaccuracies, or clerical mistakes instantly.",
    description: "Inaccurate details on your trade license can block bank account operations, VAT applications, and legal contracts. We submit official corrections to the local ward counselor/inspector.",
    timeline: "4 - 6 Business Days",
    iconName: "CheckCircle",
    details: {
      overview: "A simple spelling typo in your company name, an incorrect holding number, or a mismatched proprietor NID number can lead to severe issues. Banks and tax authorities (NBR) match Trade License details exactly. If you find a mistake on your newly issued or old trade license, E-Lawyers helps you file an official rectification petition.",
      whoNeedsIt: [
        "Businesses with typographical errors on their current license",
        "Entities facing rejection from banks or VAT offices due to data mismatches",
        "Licenses needing address rectifications due to changes in holding plots"
      ],
      requiredDocs: [
        "Original physical Trade License showing the error",
        "Correct supporting documents (NID copy, registered deed, RJSC papers)",
        "Formal rectifying petition letter detailing the correction requested"
      ],
      processSteps: [
        "Auditing the mismatched records to isolate the typo source",
        "Preparing the legal correction application and supporting dossier",
        "Submitting the rectification request to the Chief Revenue Officer",
        "Database correction of the municipal record system",
        "Reprinting the official corrected Trade License and delivery"
      ]
    }
  }
];
