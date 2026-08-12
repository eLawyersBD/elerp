import { defaultVatRates, defaultAccountMap } from '../database/seedData';

const BACKEND_URL = '/api';

const getLocal = (key, fallback = []) => {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
};

const saveLocal = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const vatService = {

  getVatRates: () => {
    // Background sync
    fetch(`${BACKEND_URL}/erp/vat-rates`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) saveLocal('erp_vat_rates', data);
      })
      .catch(err => console.warn('[vatService] MySQL fetch VAT rates background failed', err.message));

    return getLocal('erp_vat_rates', defaultVatRates);
  },

  getVatRatesSync: () => {
    return getLocal('erp_vat_rates', defaultVatRates);
  },

  saveVatRates: (rates) => {
    saveLocal('erp_vat_rates', rates);

    // Background sync
    rates.forEach(r => {
      fetch(`${BACKEND_URL}/erp/vat-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
      }).catch(err => console.warn(err));
    });
  },

  getVatRate: (vatRateId) => {
    const rates = vatService.getVatRatesSync();
    return rates.find(r => r.id === vatRateId)
      || rates.find(r => r.isDefault)
      || { id: 'vat-std', name: 'Standard VAT', rate: 15 };
  },

  calculateInvoiceVAT: (items = []) => {
    const rates = vatService.getVatRatesSync();

    const lines = items.map(item => {
      const unitPrice  = Number(item.unitPrice || 0);
      const qty        = Number(item.qty       || 1);
      const discount   = Number(item.discount  || 0);
      const vatRateObj = rates.find(r => r.id === item.vatRateId) || rates.find(r => r.isDefault);
      const vatRate    = vatRateObj?.rate || 0;

      const lineGross    = unitPrice * qty;
      const discountAmt  = lineGross * (discount / 100);
      const taxableAmt   = lineGross - discountAmt;
      const vatAmount    = taxableAmt * (vatRate / 100);
      const lineTotal    = taxableAmt + vatAmount;

      return {
        ...item,
        unitPrice,
        qty,
        lineGross:    +lineGross.toFixed(2),
        discountAmt:  +discountAmt.toFixed(2),
        taxableAmt:   +taxableAmt.toFixed(2),
        vatRate,
        vatAmount:    +vatAmount.toFixed(2),
        lineTotal:    +lineTotal.toFixed(2),
      };
    });

    const subtotal   = lines.reduce((s, l) => s + l.taxableAmt,  0);
    const totalVat   = lines.reduce((s, l) => s + l.vatAmount,   0);
    const grandTotal = lines.reduce((s, l) => s + l.lineTotal,   0);

    return {
      lines,
      subtotal:   +subtotal.toFixed(2),
      totalVat:   +totalVat.toFixed(2),
      grandTotal: +grandTotal.toFixed(2),
    };
  },

  calculateLine: (unitPrice, qty, vatRateId, discountPct = 0) => {
    const rate     = vatService.getVatRate(vatRateId);
    const gross    = Number(unitPrice) * Number(qty);
    const disc     = gross * (Number(discountPct) / 100);
    const taxable  = gross - disc;
    const vat      = taxable * (rate.rate / 100);
    const total    = taxable + vat;

    return {
      taxableAmt: +taxable.toFixed(2),
      vatAmount:  +vat.toFixed(2),
      lineTotal:  +total.toFixed(2),
      vatRate:    rate.rate,
      vatRateName:rate.name,
    };
  },

  getVATSummary: (fromDate, toDate) => {
    // 1. Fetch from background to refresh local journals cache
    fetch(`${BACKEND_URL}/erp/journals`)
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(journals => {
        if (journals) saveLocal('erp_journals', journals);
      })
      .catch(err => console.warn('[vatService] getVATSummary background sync failed', err.message));

    // 2. Perform synchronous calculations on current local cache
    const journals = getLocal('erp_journals', []);
    const filtered = journals.filter(j => {
      const d = j.date?.substring(0, 10);
      return d >= fromDate && d <= toDate;
    });

    let inputVat  = 0;
    let outputVat = 0;

    filtered.forEach(journal => {
      (journal.lines || []).forEach(line => {
        if (line.accountId === defaultAccountMap.vatInput) {
          inputVat  += Number(line.amount || 0);
        }
        if (line.accountId === defaultAccountMap.vatOutput) {
          outputVat += Number(line.amount || 0);
        }
      });
    });

    const netVatPayable = outputVat - inputVat;

    return {
      fromDate,
      toDate,
      inputVat:      +inputVat.toFixed(2),
      outputVat:     +outputVat.toFixed(2),
      netVatPayable: +netVatPayable.toFixed(2),
      vatBalance:    netVatPayable >= 0 ? 'payable' : 'refundable',
      journalCount:  filtered.length,
    };
  },

  generateVATReturn: (yearMonth) => {
    const [year, month] = yearMonth.split('-');
    const fromDate = `${year}-${month}-01`;
    const lastDay  = new Date(Number(year), Number(month), 0).getDate();
    const toDate   = `${year}-${month}-${lastDay}`;

    const summary  = vatService.getVATSummary(fromDate, toDate);

    return {
      period:        yearMonth,
      fromDate,
      toDate,
      ...summary,
      filing: {
        box1_outputVat:   summary.outputVat,
        box2_inputVat:    summary.inputVat,
        box3_netPayable:  Math.max(0, summary.netVatPayable),
        box4_refundClaim: Math.max(0, -summary.netVatPayable),
      },
    };
  },
};
