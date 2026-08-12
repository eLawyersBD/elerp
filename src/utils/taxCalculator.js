/**
 * Bangladesh Income Tax Act 2023 - Tax Calculator Engine
 * Supports FY 2024-2025 and FY 2025-2026.
 */

export const TAX_YEARS = {
  '2024-2025': '2024-2025',
  '2025-2026': '2025-2026'
};

export const REGIONS = {
  DHAKA_CHITTAGONG: 'Dhaka & Chittagong City Corporation',
  OTHER_CITY_CORP: 'Other City Corporation',
  OUTSIDE_CITY_CORP: 'Outside City Corporation'
};

export const REGION_MINIMUM_TAX = {
  DHAKA_CHITTAGONG: 5000,
  OTHER_CITY_CORP: 4000,
  OUTSIDE_CITY_CORP: 3000
};

/**
 * Calculates taxable income and progressive tax liability
 * 
 * @param {Object} params
 * @param {number} params.basicSalary - Annual Basic Salary
 * @param {number} params.allowances - Total Annual Allowances (House Rent, Medical, Conveyance, Mobile, etc.)
 * @param {number} params.bonuses - Total Annual Bonuses (Eid, Ramadan, Performance, etc.)
 * @param {string} params.gender - 'male' | 'female' | 'third_gender'
 * @param {number} params.age - Employee age
 * @param {boolean} params.isDisabled - Has disability
 * @param {boolean} params.isFreedomFighter - Is war-wounded freedom fighter
 * @param {number} params.investment - Total actual investments (DPS, Sanchaypatra, Stocks, etc.)
 * @param {string} params.region - REGIONS value
 * @param {string} params.taxYear - TAX_YEARS value
 * @returns {Object} detailed calculation breakdown
 */
export function calculateBangladeshTax({
  basicSalary = 0,
  allowances = 0,
  bonuses = 0,
  gender = 'male',
  age = 30,
  isDisabled = false,
  isFreedomFighter = false,
  investment = 0,
  region = REGIONS.DHAKA_CHITTAGONG,
  taxYear = TAX_YEARS['2024-2025']
}) {
  const annualGross = basicSalary + allowances + bonuses;

  // Exemption limit on allowances under Income Tax Act 2023:
  // Lower of 4,50,000 BDT or 1/3rd of total annual gross salary
  const maxExemptionCap = 450000;
  const grossOneThird = annualGross / 3;
  const allowanceExemption = Math.min(maxExemptionCap, grossOneThird);

  // Taxable salary income
  const taxableIncome = Math.max(0, annualGross - allowanceExemption);

  // Determine tax-free threshold
  let taxFreeThreshold = 350000; // FY 2024-2025 male default
  if (taxYear === TAX_YEARS['2025-2026']) {
    taxFreeThreshold = 375000;
    if (gender === 'female' || age >= 65) {
      taxFreeThreshold = 425000;
    } else if (isDisabled) {
      taxFreeThreshold = 500000;
    } else if (gender === 'third_gender') {
      taxFreeThreshold = 500000;
    } else if (isFreedomFighter) {
      taxFreeThreshold = 525000;
    }
  } else {
    // FY 2024-2025
    if (gender === 'female' || age >= 65) {
      taxFreeThreshold = 400000;
    } else if (isDisabled) {
      taxFreeThreshold = 475000;
    } else if (gender === 'third_gender') {
      taxFreeThreshold = 475000;
    } else if (isFreedomFighter) {
      taxFreeThreshold = 500000;
    }
  }

  // Calculate gross tax liability based on progressive slabs
  let remainingTaxable = taxableIncome;
  let grossTax = 0;
  const slabsApplied = [];

  // 1. Tax-Free Slab
  const slab1Amount = Math.min(remainingTaxable, taxFreeThreshold);
  slabsApplied.push({ slabName: 'Tax-Free Limit', range: `First ${taxFreeThreshold.toLocaleString()} BDT`, incomeInSlab: slab1Amount, rate: 0, tax: 0 });
  remainingTaxable -= slab1Amount;

  if (taxYear === TAX_YEARS['2025-2026']) {
    // FY 2025-2026 progressive slabs:
    // Next 3,00,000 @ 10%
    // Next 4,00,000 @ 15%
    // Next 5,00,000 @ 20%
    // Next 20,00,000 @ 25%
    // Balance @ 30%
    const slabs = [
      { limit: 300000, rate: 0.10, label: 'Next 3,00,000 BDT' },
      { limit: 400000, rate: 0.15, label: 'Next 4,00,000 BDT' },
      { limit: 500000, rate: 0.20, label: 'Next 5,00,000 BDT' },
      { limit: 2000000, rate: 0.25, label: 'Next 20,00,000 BDT' },
      { limit: Infinity, rate: 0.30, label: 'On Balance BDT' }
    ];

    for (const slab of slabs) {
      if (remainingTaxable <= 0) break;
      const slabAmount = Math.min(remainingTaxable, slab.limit);
      const slabTax = slabAmount * slab.rate;
      grossTax += slabTax;
      slabsApplied.push({
        slabName: slab.label,
        range: slab.label,
        incomeInSlab: slabAmount,
        rate: slab.rate * 100,
        tax: slabTax
      });
      remainingTaxable -= slabAmount;
    }
  } else {
    // FY 2024-2025 progressive slabs:
    // Next 1,00,000 @ 5%
    // Next 4,00,000 @ 10%
    // Next 5,00,000 @ 15%
    // Next 5,00,000 @ 20%
    // Next 20,00,000 @ 25%
    // Balance @ 30%
    const slabs = [
      { limit: 100000, rate: 0.05, label: 'Next 1,00,000 BDT' },
      { limit: 400000, rate: 0.10, label: 'Next 4,00,000 BDT' },
      { limit: 500000, rate: 0.15, label: 'Next 5,00,000 BDT' },
      { limit: 500000, rate: 0.20, label: 'Next 5,00,000 BDT' },
      { limit: 2000000, rate: 0.25, label: 'Next 20,00,000 BDT' },
      { limit: Infinity, rate: 0.30, label: 'On Balance BDT' }
    ];

    for (const slab of slabs) {
      if (remainingTaxable <= 0) break;
      const slabAmount = Math.min(remainingTaxable, slab.limit);
      const slabTax = slabAmount * slab.rate;
      grossTax += slabTax;
      slabsApplied.push({
        slabName: slab.label,
        range: slab.label,
        incomeInSlab: slabAmount,
        rate: slab.rate * 100,
        tax: slabTax
      });
      remainingTaxable -= slabAmount;
    }
  }

  // Investment Rebate Calculation:
  // Lowest of:
  // 1. 3% of total taxable income
  // 2. 15% of actual eligible investment
  // 3. 1,000,000 BDT (10 Lakh)
  const rebateLimitIncome = taxableIncome * 0.03;
  const rebateLimitActual = investment * 0.15;
  const rebateLimitCap = 1000000;
  
  let rebate = 0;
  if (taxableIncome > taxFreeThreshold) {
    rebate = Math.min(rebateLimitIncome, rebateLimitActual, rebateLimitCap);
  }

  // Net tax before minimum tax constraint
  let netTax = Math.max(0, grossTax - rebate);

  // Apply Minimum Tax if there is any tax liability
  let isMinimumTaxApplied = false;
  let minTaxAmount = 0;

  if (taxableIncome > taxFreeThreshold) {
    if (region === REGIONS.DHAKA_CHITTAGONG) {
      minTaxAmount = REGION_MINIMUM_TAX.DHAKA_CHITTAGONG;
    } else if (region === REGIONS.OTHER_CITY_CORP) {
      minTaxAmount = REGION_MINIMUM_TAX.OTHER_CITY_CORP;
    } else {
      minTaxAmount = REGION_MINIMUM_TAX.OUTSIDE_CITY_CORP;
    }

    if (netTax < minTaxAmount) {
      netTax = minTaxAmount;
      isMinimumTaxApplied = true;
    }
  } else {
    netTax = 0; // If taxable income is below tax-free threshold, no tax is due
  }

  const monthlyTaxDeduction = netTax / 12;

  return {
    annualGross,
    allowanceExemption,
    taxableIncome,
    taxFreeThreshold,
    grossTax,
    rebate,
    netTax,
    monthlyTaxDeduction,
    minTaxAmount,
    isMinimumTaxApplied,
    slabsApplied,
    rebateBreakdown: {
      threePercentOfIncome: rebateLimitIncome,
      fifteenPercentOfInvestment: rebateLimitActual,
      cap: rebateLimitCap
    }
  };
}
