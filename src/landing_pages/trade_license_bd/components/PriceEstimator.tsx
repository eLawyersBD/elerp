/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from '../motion';
import { 
  Calculator, 
  MapPin, 
  Briefcase, 
  Building, 
  CheckCircle, 
  Info, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  HelpCircle,
  TrendingUp,
  Receipt,
  Sparkles
} from 'lucide-react';

interface PriceEstimatorProps {
  onEstimateApply: (serviceTitle: string, businessType: string, location: string) => void;
}

// Data models for calculation
const BUSINESS_STRUCTURES = [
  { id: 'proprietorship', name: 'Sole Proprietorship', baseGovFee: 3500, baseServiceFee: 3000 },
  { id: 'partnership', name: 'Partnership Firm', baseGovFee: 5000, baseServiceFee: 4500 },
  { id: 'company', name: 'Private Limited Company', baseGovFee: 7500, baseServiceFee: 6000 },
  { id: 'specialized', name: 'Specialized Industry (Factory/Restaurant)', baseGovFee: 11000, baseServiceFee: 8000 },
];

const LOCATIONS = [
  { id: 'dhaka-north', name: 'Dhaka North City Corp (DNCC)', multiplier: 1.20, type: 'city' },
  { id: 'dhaka-south', name: 'Dhaka South City Corp (DSCC)', multiplier: 1.20, type: 'city' },
  { id: 'chattogram', name: 'Chattogram City Corp (CCC)', multiplier: 1.15, type: 'city' },
  { id: 'other-city', name: 'Other City Corp (Sylhet, Gazipur, etc.)', multiplier: 1.00, type: 'city' },
  { id: 'municipality', name: 'Pourashava (Municipality)', multiplier: 0.70, type: 'muni' },
  { id: 'rural', name: 'Union Parishad (Rural Area)', multiplier: 0.40, type: 'rural' },
];

const BUSINESS_ACTIVITIES = [
  { id: 'it-services', name: 'IT/Software, Freelancing, Consulting', multiplier: 0.90, desc: 'Low hazard, digital service categories' },
  { id: 'retail-trading', name: 'Retail, E-commerce, General Trading', multiplier: 1.10, desc: 'Standard consumer-facing commerce' },
  { id: 'import-export', name: 'Import, Export, Indenting, Wholesaling', multiplier: 1.50, desc: 'Higher tax brackets with customs liaison' },
  { id: 'manufacturing-food', name: 'Manufacturing, Chemicals, Food, Hotel', multiplier: 2.00, desc: 'Requires inspection & environmental clearing support' },
];

export default function PriceEstimator({ onEstimateApply }: PriceEstimatorProps) {
  // Input states
  const [selectedStructure, setSelectedStructure] = useState('proprietorship');
  const [selectedLocation, setSelectedLocation] = useState('dhaka-north');
  const [selectedActivity, setSelectedActivity] = useState('it-services');
  const [includeSignboard, setIncludeSignboard] = useState(true);
  const [isUrgent, setIsUrgent] = useState(false);

  // Calculated values state
  const [govFee, setGovFee] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [signboardFee, setSignboardFee] = useState(0);
  const [govVat, setGovVat] = useState(0);
  const [serviceVat, setServiceVat] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  // Dynamic values recalculation
  useEffect(() => {
    const structure = BUSINESS_STRUCTURES.find(s => s.id === selectedStructure) || BUSINESS_STRUCTURES[0];
    const location = LOCATIONS.find(l => l.id === selectedLocation) || LOCATIONS[0];
    const activity = BUSINESS_ACTIVITIES.find(a => a.id === selectedActivity) || BUSINESS_ACTIVITIES[0];

    // Government Fee = Base Government * Location Multiplier * Activity Multiplier
    const calculatedGov = Math.round(structure.baseGovFee * location.multiplier * activity.multiplier);
    
    // Service Fee = Base Service + (Urgent premium if selected)
    const calculatedService = structure.baseServiceFee + (isUrgent ? 2000 : 0);

    // Signboard tax is typical for City Corporations (BDT 1,500) or BDT 800 for Municipalities/Rural
    const calculatedSignboard = includeSignboard 
      ? (location.type === 'city' ? 1500 : 800) 
      : 0;

    // Bangladesh standard 15% VAT on professional services & municipal licensing fees
    const calculatedGovVat = Math.round((calculatedGov + calculatedSignboard) * 0.15);
    const calculatedServiceVat = Math.round(calculatedService * 0.15);

    const total = calculatedGov + calculatedService + calculatedSignboard + calculatedGovVat + calculatedServiceVat;

    setGovFee(calculatedGov);
    setServiceFee(calculatedService);
    setSignboardFee(calculatedSignboard);
    setGovVat(calculatedGovVat);
    setServiceVat(calculatedServiceVat);
    setTotalCost(total);
  }, [selectedStructure, selectedLocation, selectedActivity, includeSignboard, isUrgent]);

  // Determine dynamic documents needed for display
  const getDynamicDocs = () => {
    const docs = ['National ID Card (NID) or Passport copy of owner(s)', 'Recent passport-size photographs (3 copies)', 'Rental agreement or holding tax receipt of office space'];
    
    if (selectedStructure === 'partnership') {
      docs.push('Registered or non-registered Partnership Deed copy');
    } else if (selectedStructure === 'company') {
      docs.push('RJSC Certificate of Incorporation', 'Memorandum & Articles of Association (MoA & AoA)', 'Form XII listing company directors');
    } else if (selectedStructure === 'specialized') {
      docs.push('Fire service safety clearance report', 'Environmental clearance certificate (if factory)', 'Food safety inspection certificate (if restaurant)');
    }

    if (selectedActivity === 'import-export') {
      docs.push('IRC or ERC certificate (if already incorporated)');
    }

    return docs;
  };

  // Convert string formatting with commas for beautiful BDT currency
  const formatCurrency = (val: number) => {
    return '৳' + val.toLocaleString('en-IN');
  };

  // Find structure and location name for the submission prefill
  const handleProceed = () => {
    const structObj = BUSINESS_STRUCTURES.find(s => s.id === selectedStructure);
    const locObj = LOCATIONS.find(l => l.id === selectedLocation);
    
    let targetService = 'Trade License Registration';
    if (structObj?.id === 'proprietorship') {
      targetService = 'Trade License for Proprietorship';
    } else if (structObj?.id === 'partnership') {
      targetService = 'Trade License for Partnership';
    } else if (structObj?.id === 'company') {
      targetService = 'Trade License for Private Limited Company';
    }

    onEstimateApply(
      targetService,
      structObj?.name || 'Sole Proprietorship',
      locObj?.name || 'Dhaka North City Corporation'
    );
  };

  // Government share percentage for visual progress gauge
  const totalGovPortion = govFee + signboardFee + govVat;
  const govPercentage = Math.round((totalGovPortion / totalCost) * 100) || 50;
  const servicePercentage = 100 - govPercentage;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl text-left space-y-8 scroll-mt-20" id="price-estimator-widget">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider font-mono">
            <Calculator className="h-4.5 w-4.5" />
            Interactive Calculator
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
            Live Fee & Cost Estimator
          </h3>
          <p className="text-xs text-slate-500 font-light max-w-2xl">
            Get instant, accurate cost estimations based on current municipal regulations in Bangladesh. All numbers are dynamic and direct.
          </p>
        </div>
        
        <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center gap-2.5 max-w-xs shrink-0 self-start md:self-center">
          <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-[10px] text-amber-900 font-medium leading-relaxed">
            Estimates include <strong>100% official municipal tax calculations</strong> with zero added markups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Input Controls (col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Input 1: Business Structure */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 font-mono">
              <Building className="h-3.5 w-3.5 text-blue-600" />
              1. Business Legal Structure
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUSINESS_STRUCTURES.map((struct) => (
                <button
                  key={struct.id}
                  onClick={() => setSelectedStructure(struct.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    selectedStructure === struct.id 
                      ? 'border-blue-600 bg-blue-50/40 text-blue-900 ring-2 ring-blue-50' 
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <p className="text-xs font-bold leading-none">{struct.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-mono">Base Fee: {formatCurrency(struct.baseServiceFee)}</p>
                  
                  {selectedStructure === struct.id && (
                    <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Input 2: Location */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 font-mono">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              2. Commercial Jurisdiction / Area
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm bg-white text-slate-900 font-medium"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.multiplier !== 1 ? `(Zone rate: x${loc.multiplier.toFixed(2)})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Input 3: Nature of Business / Risk Category */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 font-mono">
              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
              3. Principal Business Activity
            </label>
            <div className="space-y-2">
              {BUSINESS_ACTIVITIES.map((act) => (
                <div 
                  key={act.id}
                  onClick={() => setSelectedActivity(act.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                    selectedActivity === act.id 
                      ? 'border-blue-600 bg-blue-50/20 text-blue-900' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-700 bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold leading-none">{act.name}</p>
                    <p className="text-[10px] text-slate-400 font-light">{act.desc}</p>
                  </div>
                  <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center bg-white shrink-0">
                    {selectedActivity === act.id && (
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Extras */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">Optional Service Enhancements</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Checkbox 1: Signboard Tax */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 hover:bg-slate-100/50 rounded-xl cursor-pointer transition-colors">
                <input 
                  type="checkbox"
                  checked={includeSignboard}
                  onChange={(e) => setIncludeSignboard(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 leading-none block">Include Signboard Tax</span>
                  <span className="text-[9px] text-slate-400 leading-normal block">Required by municipal law for on-site naming displays.</span>
                </div>
              </label>

              {/* Checkbox 2: Urgent Processing */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 hover:bg-slate-100/50 rounded-xl cursor-pointer transition-colors">
                <input 
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 leading-none block">Urgent Support</span>
                  <span className="text-[9px] text-slate-400 leading-normal block">Accelerates processing timeline from 10 to 3-5 business days.</span>
                </div>
              </label>

            </div>
          </div>

        </div>

        {/* Right Column - Live Pricing Receipt (col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Dynamic Billing Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-xl border border-slate-800">
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-600/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl" />

            {/* Receipt Title */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-blue-400" />
                Cost Breakdown
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                Active estimate
              </span>
            </div>

            {/* Receipt Rows */}
            <div className="space-y-3.5 text-xs">
              
              {/* Row 1: Government Fee */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-light">Official Government Fee:</span>
                <span className="font-semibold font-mono text-slate-100">{formatCurrency(govFee)}</span>
              </div>

              {/* Row 2: Signboard Fee */}
              {includeSignboard && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-light">Municipal Signboard Tax:</span>
                  <span className="font-semibold font-mono text-slate-100">{formatCurrency(signboardFee)}</span>
                </div>
              )}

              {/* Row 3: Service Fee */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-light">E-Lawyers Professional Fee:</span>
                <span className="font-semibold font-mono text-slate-100">{formatCurrency(serviceFee)}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-slate-800 my-1" />

              {/* Row 4: Government VAT */}
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-light">Govt VAT (15% on official challan):</span>
                <span className="font-mono text-slate-300">{formatCurrency(govVat)}</span>
              </div>

              {/* Row 5: Service VAT */}
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-light">Service VAT (15% on professional fee):</span>
                <span className="font-mono text-slate-300">{formatCurrency(serviceVat)}</span>
              </div>

            </div>

            {/* Total Section */}
            <div className="pt-5 border-t border-slate-800 flex justify-between items-baseline">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Estimated Total</span>
                <span className="text-[9px] text-slate-500 font-light">including all taxes and levies</span>
              </div>
              <span className="text-3xl font-extrabold text-blue-400 font-display tracking-tight">
                {formatCurrency(totalCost)}
              </span>
            </div>

            {/* Proportion Progress bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Govt Dues: {govPercentage}%</span>
                <span>Our Fee: {servicePercentage}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-blue-500 transition-all duration-500" 
                  style={{ width: `${govPercentage}%` }} 
                  title="Government Portion"
                />
                <div 
                  className="bg-amber-400 transition-all duration-500" 
                  style={{ width: `${servicePercentage}%` }} 
                  title="E-Lawyers Professional Fee"
                />
              </div>
            </div>

            {/* Expected Processing duration */}
            <div className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-800 rounded-2xl text-[11px]">
              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="text-left text-slate-300 font-light">
                Estimated Delivery: <strong className="font-semibold text-white">{isUrgent ? '3 - 5 Business Days' : '7 - 10 Business Days'}</strong>
              </div>
            </div>

            {/* Instant Apply CTA */}
            <button
              onClick={handleProceed}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs transition-colors duration-300 cursor-pointer flex items-center justify-center gap-2 group shadow-lg shadow-blue-600/10"
            >
              Apply With This Estimate
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>

          </div>

          {/* Dynamic Checklist Card */}
          <div className="p-5 border border-slate-200 rounded-2xl space-y-4 text-xs">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Tailored Dossier Requirements
            </h4>
            
            <p className="text-slate-500 font-light leading-relaxed">
              Based on your selected <strong className="font-medium text-slate-700">{(BUSINESS_STRUCTURES.find(s => s.id === selectedStructure))?.name}</strong>, you must prepare the following legal files:
            </p>

            <div className="space-y-2 text-left">
              {getDynamicDocs().map((doc, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-600 font-light leading-relaxed">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
            
            <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[10px] text-slate-400 italic font-light">
              <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              Our case officer will double-verify these documents with you prior to filing.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
