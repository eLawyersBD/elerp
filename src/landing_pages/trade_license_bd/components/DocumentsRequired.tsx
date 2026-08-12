/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Building, CheckSquare2, FileText, Landmark, Download } from 'lucide-react';
import { trackCustomEvent } from '../lib/metaPixel';
import jsPDF from 'jspdf';

export default function DocumentsRequired() {
  const handleDownloadChecklist = () => {
    trackCustomEvent('TradeLicense_Download_Checklist', {
      button_name: 'Download Document Checklist PDF',
      content_name: 'Trade License Required Documents Checklist Bangladesh'
    });

    trackCustomEvent('TradeLicense_Download_Guide', {
      button_name: 'Download Document Checklist PDF',
      content_name: 'Legal Registration Checklist Guide'
    });

    // Generate PDF using jsPDF
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('E-LAWYERS | TRADE LICENSE DOCUMENT CHECKLIST', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Government Compliance & Licensing Checklist for Bangladesh', 14, 27);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('1. Individual Business / Proprietorship', 14, 45);

    let y = 53;
    individualDocs.forEach((d, i) => {
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`[ ] ${i + 1}. ${d.name}: ${d.detail}`, 16, y);
      y += 8;
    });

    y += 5;
    doc.setFontSize(14);
    doc.setTextColor(180, 83, 9);
    doc.text('2. Private Limited Company / Partnership', 14, y);

    y += 8;
    corporateDocs.forEach((d, i) => {
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`[ ] ${i + 1}. ${d.name}: ${d.detail}`, 16, y);
      y += 8;
    });

    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Need help submitting? Call E-Lawyers hotline: +880 9612 345678 or WhatsApp +880 1712 345678', 14, y);

    doc.save('E-Lawyers_Trade_License_Document_Checklist.pdf');
  };
  const individualDocs = [
    { name: "National ID (NID)", detail: "Photocopy of applicant's NID or valid Passport copy." },
    { name: "Passport Size Photograph", detail: "Three copies of recent color photographs." },
    { name: "Rent Agreement or Ownership Proof", detail: "Registered tenancy deed or space ownership proof." },
    { name: "Utility Bill Copy", detail: "Recent Electricity, Gas, or Water bill copy of the space." },
    { name: "Holding Tax Receipt", detail: "Latest Municipal Holding tax bill payment proof (if applicable)." },
    { name: "Active Mobile Number & Email", detail: "Required for government verification and OTP checks." },
    { name: "Business Trade Name", detail: "Clear and final name of the sole proprietorship." }
  ];

  const corporateDocs = [
    { name: "Certificate of Incorporation", detail: "RJSC Incorporation Certification copy." },
    { name: "Memorandum & Articles of Association", detail: "Complete MoA / AoA copies of the company." },
    { name: "Form XII (Particulars of Directors)", detail: "Approved Form XII copy from RJSC." },
    { name: "NID of Directors", detail: "Photocopy of NID/Passport of all active directors." },
    { name: "Official Board Resolution", detail: "Board resolution authorizing license application submission." },
    { name: "Office Tenancy Proof", detail: "Commercial lease agreement matching company name." },
    { name: "Utility & Tax Proofs", detail: "Holding tax receipts and utility copies of corporate office." }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Dossier Checklist
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900">
            Documents Required
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-light leading-relaxed">
            Ensure your documentation is complete before applying. Select your structure below to review the specific legal certificates required.
          </p>
        </div>

        {/* Side-by-side Comparative Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Individual Proprietorship Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              
              <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl">
                  <User className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-slate-900 font-display">Individual Business</h3>
                  <p className="text-xs text-slate-500 font-light mt-0.5">Proprietorships, Freelancers & Small Retailers</p>
                </div>
              </div>

              <div className="space-y-4">
                {individualDocs.map((doc, index) => (
                  <div key={index} className="flex items-start gap-3.5 text-left">
                    <CheckSquare2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 font-display uppercase tracking-tight">{doc.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 font-light leading-relaxed">{doc.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <div className="border-t border-slate-200 pt-5 mt-6 flex items-center gap-2.5 bg-blue-500/5 p-3 rounded-xl">
              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed text-left">
                Sole Proprietor files are simpler and typically get approved faster (7-10 business days).
              </p>
            </div>
          </div>

          {/* Corporate Limited Card */}
          <div className="bg-[#0f172a] text-white border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              
              <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl">
                  <Building className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white font-display">Company / Partnership</h3>
                  <p className="text-xs text-slate-400 font-light mt-0.5">Private Limiteds, Subsidiaries & co-foundings</p>
                </div>
              </div>

              <div className="space-y-4">
                {corporateDocs.map((doc, index) => (
                  <div key={index} className="flex items-start gap-3.5 text-left">
                    <CheckSquare2 className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-white font-display uppercase tracking-tight">{doc.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">{doc.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <div className="border-t border-slate-800 pt-5 mt-6 flex items-center gap-2.5 bg-amber-500/5 p-3 rounded-xl">
              <Landmark className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed text-left">
                RJSC certified files require precise legal board alignments to ensure City Corp clearances.
              </p>
            </div>
          </div>

        </div>

        {/* Download Checklist CTA Banner */}
        <div className="mt-10 max-w-6xl mx-auto bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 border border-blue-800/50 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold font-serif">Download Official Required Documents Checklist (PDF)</h3>
            <p className="text-xs text-slate-300 font-light">Get the complete printable PDF checklist with government document specs for offline reference.</p>
          </div>
          <button
            onClick={handleDownloadChecklist}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shrink-0 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF Checklist</span>
          </button>
        </div>

      </div>
    </section>
  );
}
