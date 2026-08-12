import mysql from 'mysql2/promise';

// Initial data copied from source files
const INITIAL_CLIENTS = [
  {
    id: 'C-1001',
    date: '2022-01-01',
    folderName: '1 Zohir Uddin',
    name: 'Zohir Uddin',
    company: 'E-Lawyers ERP',
    position: 'Partner',
    email: 'zohirsohelatc29@gmail.com',
    mobile: '1819556755',
    address: 'Talukdar Bari, Chhayani Tabga, Chhayani Tabga, Chatkhil, Noakhali.',
    status: 'Active',
    joinedDate: '2022-01-01',
    clientBy: 'Ekramul Islam Khandaker',
    nid: '19937521009000017',
    tradeLicense: 'TL0012',
    bin: 'BIN EL 0012',
    binPassword: 'BIN Pass012',
    tin: 'TIN0012',
    tinPassword: 'TIN Pass 0012',
    rjscCoi: 'RJSC0012',
    incorporationDate: 'RJSC inc 0012',
    rjscId: 'RJSC ID 0012',
    rjscPassword: 'RJSC pass0012'
  },
  {
    id: 'C-1002',
    date: '2022-01-04',
    folderName: '2 Ekramul Islam Khandaker',
    name: 'Ekramul Islam Khandaker',
    company: 'E-Lawyers ERP',
    position: 'Managing Partner',
    email: 'ekrram@gmail.com',
    mobile: '1744883636',
    address: 'Vill: Raghunathpur, PS: Homna PO:Kashipur Dis: Comilla',
    status: 'Active',
    joinedDate: '2022-01-04',
    clientBy: 'Ekramul Islam Khandaker',
    nid: '1906760796',
    tradeLicense: 'TL0013',
    bin: 'BIN EL 0013',
    binPassword: 'BIN Pass013',
    tin: 'TIN0013',
    tinPassword: 'TIN Pass 0013',
    rjscCoi: 'RJSC0013',
    incorporationDate: 'RJSC inc 0013',
    rjscId: 'RJSC ID 0013',
    rjscPassword: 'RJSC pass0013'
  },
  {
    id: 'C-1003',
    date: '2022-01-07',
    folderName: '3 Md. Anamul Haque',
    name: 'Md. Anamul Haque',
    company: 'E-Lawyers ERP',
    position: 'Partner',
    email: 'anamu.ronis@gmail.com',
    mobile: '1721742017',
    address: 'Surzddi Bazar, PO- Rampur Bazar, Sherpur Sadar, Sherpur-2100',
    status: 'Active',
    joinedDate: '2022-01-07',
    clientBy: 'Ekramul Islam Khandaker',
    nid: '8695492598',
    tradeLicense: 'TL0014',
    bin: 'BIN EL 0014',
    binPassword: 'BIN Pass014',
    tin: 'TIN0014',
    tinPassword: 'TIN Pass 0014',
    rjscCoi: 'RJSC0014',
    incorporationDate: 'RJSC inc 0014',
    rjscId: 'RJSC ID 0014',
    rjscPassword: 'RJSC pass0014'
  },
  {
    id: 'C-1004',
    date: '2022-01-10',
    folderName: '4 Muzammel Haque',
    name: 'Muzammel Haque',
    company: 'E-Lawyers ERP',
    position: 'Partner',
    email: 'advmuzammelhaque@gmail.com',
    mobile: '1711285502',
    address: 'Vill- Chaktatardi, P.O.- Shakhergaon, P.S.- Monohardi, Dist.- Narsingdi-1650.',
    status: 'Active',
    joinedDate: '2022-01-10',
    clientBy: 'Ekramul Islam Khandaker',
    nid: '19846815281266893',
    tradeLicense: 'TL0015',
    bin: 'BIN EL 0015',
    binPassword: 'BIN Pass015',
    tin: 'TIN0015',
    tinPassword: 'TIN Pass 0015',
    rjscCoi: 'RJSC0015',
    incorporationDate: 'RJSC inc 0015',
    rjscId: 'RJSC ID 0015',
    rjscPassword: 'RJSC pass0015'
  },
  {
    id: 'C-1005',
    date: '2022-01-13',
    folderName: '5 Kamrul Hasan',
    name: 'Kamrul Hasan',
    company: 'E-Lawyers ERP',
    position: 'Partner',
    email: 'client@elawyersbd.com',
    mobile: '1313583838',
    address: 'Vill: Raghunathpur, PS: Homna PO:Kashipur Dis: Comilla',
    status: 'Active',
    joinedDate: '2022-01-13',
    clientBy: 'Ekramul Islam Khandaker',
    nid: '3296360591',
    tradeLicense: 'TL0018',
    bin: 'BIN EL 0018',
    binPassword: 'BIN Pass018',
    tin: 'TIN0018',
    tinPassword: 'TIN Pass 0018',
    rjscCoi: 'RJSC0018',
    incorporationDate: 'RJSC inc 0018',
    rjscId: 'RJSC ID 0018',
    rjscPassword: 'RJSC pass0018'
  },
  {
    id: 'C-1006',
    date: '2022-01-16',
    folderName: '6 Minhazul Islam',
    name: 'Minhazul Islam',
    company: 'E-Lawyers ERP',
    position: 'Senior Consaltant',
    email: 'minhaz.islam3423@gmail.com',
    mobile: '1855628384',
    address: 'Sherpur,Sadar,Sherpur',
    status: 'Active',
    joinedDate: '2022-01-16',
    clientBy: 'Ekramul Islam Khandaker',
    nid: '5106944878',
    tradeLicense: 'TL0019',
    bin: 'BIN EL 0019',
    binPassword: 'BIN Pass019',
    tin: 'TIN0019',
    tinPassword: 'TIN Pass 0019',
    rjscCoi: 'RJSC0019',
    incorporationDate: 'RJSC inc 0019',
    rjscId: 'RJSC ID 0019',
    rjscPassword: 'RJSC pass0019'
  }
];

const INITIAL_EMPLOYEES = [
  { id: 'EMP-1001', joiningDate: '2026-04-04', shortName: 'Ekram', name: 'Ekramul Islam Khandaker', role: 'Admin', mobile: '1335230170', email: 'ekram@elawyersbd.com', status: 'Active' },
  { id: 'EMP-1002', joiningDate: '2026-04-04', shortName: 'Anamul', name: 'Md. Anamul Haque', role: 'Partner', mobile: '1335230171', email: 'anamul@elawyersbd.com', status: 'Active' },
  { id: 'EMP-1003', joiningDate: '2026-04-04', shortName: 'Rafat', name: 'Muhammad Abdul Kader ACCA', role: 'Partner', mobile: '1335230172', email: 'rafat@elawyersbd.com', status: 'Active' },
  { id: 'EMP-1004', joiningDate: '2026-04-04', shortName: 'Kamrul', name: 'Kamrul Hasan', role: 'Partner', mobile: '1335230173', email: 'kamrul@elawyersbd.com', status: 'Active' },
  { id: 'EMP-1005', joiningDate: '2026-04-04', shortName: 'Minhaz', name: 'Minhazul Islam', role: 'Senior Consultant', mobile: '1335230174', email: 'minhaz@elawyersbd.com', status: 'Active' }
];

async function seed() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'el_erp'
  });

  // Seed Clients
  console.log("Seeding clients table...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`clients\` (
      id VARCHAR(255) PRIMARY KEY,
      data JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  for (const client of INITIAL_CLIENTS) {
    await db.query(
      `INSERT INTO \`clients\` (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?`,
      [client.id, JSON.stringify(client), JSON.stringify(client)]
    );
  }
  console.log(`Seeded ${INITIAL_CLIENTS.length} clients.`);

  // Seed Employees
  console.log("Seeding employees table...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`employees\` (
      id VARCHAR(255) PRIMARY KEY,
      data JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  for (const emp of INITIAL_EMPLOYEES) {
    await db.query(
      `INSERT INTO \`employees\` (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?`,
      [emp.id, JSON.stringify(emp), JSON.stringify(emp)]
    );
  }
  console.log(`Seeded ${INITIAL_EMPLOYEES.length} employees.`);

  await db.end();
  console.log("Seeding completed successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
