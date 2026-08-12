export const initialSuppliers = [
  {
    id: 'sup-1',
    name: 'Apex Electronics Ltd.',
    contact: 'Kamrul Hasan',
    phone: '+880 1711-223344',
    email: 'info@apexelectronics.com',
    address: '12 Kawran Bazar, Dhaka 1215'
  },
  {
    id: 'sup-2',
    name: 'Bengal Tools & Hardware',
    contact: 'M. A. Rahman',
    phone: '+880 1819-556677',
    email: 'sales@bengaltools.com',
    address: '45 Nawabpur Road, Old Dhaka'
  },
  {
    id: 'sup-3',
    name: 'National Office Solutions',
    contact: 'Farhana Chowdhury',
    phone: '+880 1912-889900',
    email: 'corporate@nationalsolutions.bd',
    address: 'Progressive Tower, Panthapath, Dhaka'
  },
  {
    id: 'sup-4',
    name: 'SafeGuard BD',
    contact: 'Zahirul Islam',
    phone: '+880 1515-443322',
    email: 'zahirul@safeguard.com.bd',
    address: 'House 14, Road 5, Sector 3, Uttara, Dhaka'
  }
];

export const initialProducts = [
  { id: 'prod-1', name: 'Dell Latitude 5420 Laptop', sku: 'EL-DELL-5420', category: 'Electronics', qty: 12, unit: 'pcs', price: 85000, minStock: 5, location: 'IT Rack A-1', supplierId: 'sup-1', description: 'Intel Core i5, 16GB RAM, 512GB SSD workstation.', purchasePrice: 75000, warrantyMonths: 12 },
  { id: 'prod-2', name: 'HP LaserJet Pro M404dn Printer', sku: 'EL-HP-M404', category: 'Electronics', qty: 3, unit: 'pcs', price: 32000, minStock: 4, location: 'IT Rack B-2', supplierId: 'sup-1', description: 'Monochrome laser printer with automatic duplex printing.', purchasePrice: 28000, warrantyMonths: 12 },
  { id: 'prod-3', name: 'Heavy Duty Drilling Machine', sku: 'HW-DEW-DWD112', category: 'Spare Parts', qty: 8, unit: 'pcs', price: 7500, minStock: 10, location: 'Tool Room Shelf 1', supplierId: 'sup-2', description: '3/8-inch VSR Drill with Keyless Chuck, 8.0 Amp.', purchasePrice: 6000, warrantyMonths: 12 },
  { id: 'prod-4', name: 'Industrial Safety Helmet - Yellow', sku: 'SF-HELM-YEL', category: 'Safety Gear', qty: 45, unit: 'pcs', price: 450, minStock: 15, location: 'Safety Cabinet 2', supplierId: 'sup-4', description: 'High-density polyethylene safety helmet with suspension harness.', purchasePrice: 350, warrantyMonths: 12 },
  { id: 'prod-5', name: 'A4 Printing Paper (80gsm)', sku: 'OF-PAPR-A4', category: 'Office Supplies', qty: 120, unit: 'reams', price: 480, minStock: 25, location: 'Stationery Locker C', supplierId: 'sup-3', description: 'High brightness premium office printer and photocopier paper.', purchasePrice: 380, warrantyMonths: 12 }
];

export const initialTransactions = [];

export const categories = [
  'Tax & Income Tax Services',
  'Registration & Incorporation',
  'Tax ID / BIN / TIN Services',
  'Trade License Services',
  'Licenses & Government Approvals',
  'Legal & Documentation Services',
  'Audit & Accounting Services',
  'Corporate Changes & RJSC Compliance',
  'Membership & Association Services',
  'Certification & Special Reports',
];

