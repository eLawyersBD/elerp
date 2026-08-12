export const TEMPLATE_SCHEMAS = {
  customers: {
    headers: ['Code', 'Name', 'ContactPerson', 'Phone', 'Email', 'Address', 'VatNo', 'Tin', 'OpeningBalance', 'CreditLimit', 'PaymentTermsDays'],
    rows: [
      ['CST-003', 'Aramit Group Ltd.', 'M. J. Chowdhury', '+880 1819-112233', 'mj@aramit.com', 'Chittagong, Bangladesh', 'VAT-33333', '333-444-555', '125000', '1000000', '30'],
      ['CST-004', 'Karnaphuli Paper Mills', 'S. A. Halim', '+880 1711-889900', 'procurement@kpm.com', 'Chandraghona, Rangamati', 'VAT-44444', '444-555-666', '0', '500000', '45']
    ]
  },
  suppliers: {
    headers: ['Code', 'Name', 'ContactPerson', 'Phone', 'Email', 'Address', 'VatNo', 'Tin', 'OpeningBalance', 'CreditLimit', 'PaymentTermsDays'],
    rows: [
      ['SUP-003', 'Chittagong Steel CSRM', 'Z. H. Khan', '+880 1912-778899', 'sales@csrm.com', 'Nasirabad I/A, Chittagong', 'VAT-55555', '555-666-777', '75000', '800000', '30'],
      ['SUP-004', 'Padma Oil Company', 'T. A. Chowdhury', '+880 1515-334455', 'info@padmaoil.bd', 'Strand Road, Chittagong', 'VAT-66666', '666-777-888', '0', '2000000', '60']
    ]
  },
  products: {
    headers: ['SKU', 'Name', 'CategoryCode', 'UnitCode', 'SalesPrice', 'CostPrice', 'OpeningQty', 'MinQty', 'WarrantyMonths'],
    rows: [
      ['PROD-005', 'HP EliteBook 840 G8', 'ELEC', 'pcs', '85000', '72000', '15', '5', '36'],
      ['PROD-006', 'Logitech MX Master 3S', 'ELEC', 'pcs', '12500', '9500', '40', '10', '12']
    ]
  },
  coa: {
    headers: ['Code', 'Name', 'Type', 'Classification', 'ParentCode', 'OpeningBalance'],
    rows: [
      ['1028', 'Mutual Trust Bank A/C', 'asset', 'current_asset', '', '450000'],
      ['1540', 'Office Equipment', 'asset', 'fixed_asset', '', '120000'],
      ['2012', 'Bills Payable - Custom Duty', 'liability', 'current_liability', '', '-35000']
    ]
  },
  journals: {
    headers: ['Date', 'RefNo', 'Narration', 'AccountCode', 'Type', 'Amount'],
    rows: [
      ['2025-06-30', 'JV-2025-099', 'Closing Adjustments', '1010', 'debit', '150000'],
      ['2025-06-30', 'JV-2025-099', 'Closing Adjustments', '3020', 'credit', '150000'],
      ['2025-06-30', 'JV-2025-100', 'Prepaid Rent Allocation', '6020', 'debit', '45000'],
      ['2025-06-30', 'JV-2025-100', 'Prepaid Rent Allocation', '1410', 'credit', '45000']
    ]
  },
  services: {
    headers: ['Service Code', 'Service Name', 'Category', 'SLA Target', 'VAT Rate', 'Description', 'Base Fee'],
    rows: [
      ['SRV-NETW', 'Network Security Routing & Setup', 'IT & Networks', '24', '15', 'Full corporate firewall config, secure routing, and VPN setup.', '3500'],
      ['SRV-DBMA', 'Database Tuning & Performance Audit', 'Databases', '48', '15', 'Optimizing query execution, indexing reviews, and schema restructuring.', '5000']
    ]
  }
};

export const downloadCSVTemplate = (type) => {
  const schema = TEMPLATE_SCHEMAS[type];
  if (!schema) return;

  const csvContent = [
    schema.headers.join(','),
    ...schema.rows.map(row => row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `template_${type}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
