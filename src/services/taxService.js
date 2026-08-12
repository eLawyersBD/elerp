export const defaultTaxRates = [
  { id: 'tax-ait-std', name: 'AIT Standard (5%)',          rate: 5,   isDefault: true,  isActive: true },
  { id: 'tax-ait-imp', name: 'AIT Import (3%)',            rate: 3,   isDefault: false, isActive: true },
  { id: 'tax-tds-srv', name: 'Tax at Source - Service (10%)', rate: 10,  isDefault: false, isActive: true },
  { id: 'tax-tds-gd',  name: 'Tax at Source - Goods (7%)',   rate: 7,   isDefault: false, isActive: true },
  { id: 'tax-exempt',  name: 'Tax Exempt',                  rate: 0,   isDefault: false, isActive: true },
];

const getTaxRates = () => {
  try {
    const stored = localStorage.getItem('erp_tax_rates');
    return stored ? JSON.parse(stored) : defaultTaxRates;
  } catch { return defaultTaxRates; }
};

export const taxService = {
  /**
   * Get all active/inactive Tax rates.
   */
  getTaxRates: () => getTaxRates(),

  /**
   * Save Tax rates.
   */
  saveTaxRates: (rates) => {
    localStorage.setItem('erp_tax_rates', JSON.stringify(rates));
  },

  /**
   * Get a specific Tax rate by ID.
   */
  getTaxRate: (taxRateId) => {
    const rates = getTaxRates();
    return rates.find(r => r.id === taxRateId)
      || rates.find(r => r.isDefault)
      || { id: 'tax-ait-std', name: 'AIT Standard', rate: 5 };
  }
};
