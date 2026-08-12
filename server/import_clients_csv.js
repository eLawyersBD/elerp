import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, './.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'atcl_erp'
};

function parseCSV(csvText) {
  const result = [];
  let row = [''];
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      result.push(row);
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    result.push(row);
  }
  return result;
}

async function run() {
  const csvPath = 'g:\\clients.csv';
  console.log(`Reading CSV from: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  const parsedRows = parseCSV(csvContent);
  if (parsedRows.length < 2) {
    console.error("CSV is empty or header only.");
    return;
  }
  
  const headers = parsedRows[0].map(h => h.trim());
  const clientRows = parsedRows.slice(1);
  
  console.log(`Parsed ${clientRows.length} client rows.`);
  
  const db = await mysql.createConnection(dbConfig);
  console.log(`Connected to database: ${dbConfig.database}`);
  
  // Clear any existing customers first (safeguard)
  await db.query('DELETE FROM customers');
  console.log("Cleared existing customers from atcl_erp.customers");

  let count = 0;
  for (const row of clientRows) {
    // Map headers to row values
    const data = {};
    headers.forEach((h, idx) => {
      data[h] = row[idx];
    });
    
    const id = data.id || data.docId;
    if (!id || !data.name) {
      continue; // Skip invalid rows
    }
    
    const code = id;
    const name = data.name.trim();
    const contact = (data.company || data.position || name).trim();
    const phone = (data.mobile || '').trim();
    const email = (data.email || '').trim();
    const address = (data.address || '').trim();
    const vatNo = (data.bin || '').trim();
    const tin = (data.tin || '').trim();
    const accountId = 'acc-1100'; // Default AR Account
    const currentBalance = 0.00;
    const creditLimit = 500000.00;
    const paymentTermDays = 30;
    const isActive = 1;
    
    // Map all remaining fields into customFields JSON
    const customFields = [];
    if (data.company && data.company.trim()) customFields.push({ label: 'Company Name', value: data.company.trim() });
    if (data.position && data.position.trim()) customFields.push({ label: 'Position / Designation', value: data.position.trim() });
    if (data.mobile && data.mobile.trim()) customFields.push({ label: 'Mobile Number', value: data.mobile.trim() });
    if (data.email && data.email.trim()) customFields.push({ label: 'Email Address', value: data.email.trim() });
    if (data.address && data.address.trim()) customFields.push({ label: 'Mailing Address', value: data.address.trim() });
    if (data.nid && data.nid.trim()) customFields.push({ label: 'National ID (NID)', value: data.nid.trim() });
    if (data.tradeLicense && data.tradeLicense.trim()) customFields.push({ label: 'Trade License', value: data.tradeLicense.trim() });
    if (data.bin && data.bin.trim()) customFields.push({ label: 'BIN (VAT No)', value: data.bin.trim() });
    if (data.binPassword && data.binPassword.trim()) customFields.push({ label: 'BIN Password', value: data.binPassword.trim() });
    if (data.tin && data.tin.trim()) customFields.push({ label: 'TIN', value: data.tin.trim() });
    if (data.tinPassword && data.tinPassword.trim()) customFields.push({ label: 'TIN Password', value: data.tinPassword.trim() });
    if (data.rjscId && data.rjscId.trim()) customFields.push({ label: 'RJSC ID', value: data.rjscId.trim() });
    if (data.rjscPassword && data.rjscPassword.trim()) customFields.push({ label: 'RJSC Password', value: data.rjscPassword.trim() });
    if (data.rjscCoi && data.rjscCoi.trim()) customFields.push({ label: 'RJSC COI (Cert of Incorporation)', value: data.rjscCoi.trim() });
    if (data.incorporationDate && data.incorporationDate.trim()) customFields.push({ label: 'Incorporation Date', value: data.incorporationDate.trim() });
    if (data.driveFolderUrl && data.driveFolderUrl.trim()) customFields.push({ label: 'Google Drive Link', value: data.driveFolderUrl.trim() });
    if (data.driveFolderName && data.driveFolderName.trim()) customFields.push({ label: 'Google Drive Folder Name', value: data.driveFolderName.trim() });
    if (data.clientBy && data.clientBy.trim()) customFields.push({ label: 'Client Registered By', value: data.clientBy.trim() });
    if (data.joinedDate && data.joinedDate.trim()) customFields.push({ label: 'Joined Date', value: data.joinedDate.trim() });
    if (data.notes && data.notes.trim()) customFields.push({ label: 'Internal Notes', value: data.notes.trim() });
    
    try {
      await db.query(
        `INSERT INTO customers (id, code, name, contact, phone, email, address, vatNo, tin, accountId, currentBalance, creditLimit, paymentTermDays, isActive, customFields)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), contact=VALUES(contact), phone=VALUES(phone), email=VALUES(email), address=VALUES(address), vatNo=VALUES(vatNo), tin=VALUES(tin), customFields=VALUES(customFields)`,
        [id, code, name, contact, phone, email, address, vatNo, tin, accountId, currentBalance, creditLimit, paymentTermDays, isActive, JSON.stringify(customFields)]
      );
      count++;
    } catch (err) {
      console.error(`Error inserting client ${name} (${id}):`, err.message);
    }
  }
  
  console.log(`Import completed. Successfully imported ${count} customers.`);
  await db.end();
}

run().catch(console.error);
