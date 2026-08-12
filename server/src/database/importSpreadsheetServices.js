import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'atcl_erp';

// Path to the downloaded CSV step content
const CSV_FILE_PATH = 'C:/Users/DELL/.gemini/antigravity-ide/brain/5c9fafbf-ce29-42db-b3c7-5d833587240a/.system_generated/steps/318/content.md';

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentToken += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentToken += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentToken.trim());
        currentToken = '';
      } else if (char === '\r' || char === '\n') {
        if (currentToken || row.length > 0) {
          row.push(currentToken.trim());
          lines.push(row);
          currentToken = '';
          row = [];
        }
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip CRLF
        }
      } else {
        currentToken += char;
      }
    }
  }
  if (currentToken || row.length > 0) {
    row.push(currentToken.trim());
    lines.push(row);
  }
  return lines;
}

function convertSlaToHours(slaStr) {
  if (!slaStr) return 24;
  const match = slaStr.match(/(\d+)\s*Day/i);
  if (match) {
    return parseInt(match[1], 10) * 24;
  }
  const hourMatch = slaStr.match(/(\d+)\s*Hour/i);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10);
  }
  return 24;
}

async function run() {
  console.log('[Import] Commencing FSM Service Catalog Spreadsheet import...');
  
  let connection;
  try {
    // 1. Connect to MySQL database
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    console.log(`[Import] Connected to database: ${DB_NAME}`);

    // Alter table to include category, slaHours, vatRate if they don't exist
    try {
      const [cols] = await connection.query("SHOW COLUMNS FROM services");
      const colNames = cols.map(c => c.Field);
      if (!colNames.includes('category')) {
        await connection.query("ALTER TABLE services ADD COLUMN category VARCHAR(100) DEFAULT 'Service Income'");
        console.log("[Import] Migration: Added 'category' column to 'services' table.");
      }
      if (!colNames.includes('slaHours')) {
        await connection.query("ALTER TABLE services ADD COLUMN slaHours INT DEFAULT 24");
        console.log("[Import] Migration: Added 'slaHours' column to 'services' table.");
      }
      if (!colNames.includes('vatRate')) {
        await connection.query("ALTER TABLE services ADD COLUMN vatRate DECIMAL(5,2) DEFAULT 15.00");
        console.log("[Import] Migration: Added 'vatRate' column to 'services' table.");
      }
    } catch (migError) {
      console.error("[Import] Migration failed for services table columns:", migError.message);
    }

    // 2. Read and parse CSV
    const fileContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    const parts = fileContent.split('---');
    if (parts.length < 2) {
      throw new Error('CSV contents separator (---) not found in input file.');
    }
    
    const csvPart = parts.slice(1).join('---').trim();
    const rows = parseCSV(csvPart);
    if (rows.length < 2) {
      throw new Error('No rows found in parsed CSV.');
    }

    const headers = rows[0];
    const serviceRows = rows.slice(1);

    console.log(`[Import] Parsed ${serviceRows.length} services from spreadsheet.`);

    // 3. Collect unique categories & register in Chart of Accounts if needed
    const uniqueCategories = [...new Set(serviceRows.map(r => r[2]).filter(Boolean))];
    console.log(`[Import] Found unique categories:`, uniqueCategories);

    // Get current sub-accounts under 4030 Service Income
    const [existingCoaRows] = await connection.query(`
      SELECT code, name FROM chart_of_accounts 
      WHERE parentCode = '4030' OR (code LIKE '4030%' AND code != '4030')
    `);
    
    const coaMap = new Map();
    existingCoaRows.forEach(row => {
      coaMap.set(row.name.toLowerCase().trim(), row.code);
    });

    // Find the next available account code under 4030
    let nextNum = 1;
    existingCoaRows.forEach(row => {
      const match = row.code.match(/^4030(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= nextNum) {
          nextNum = val + 1;
        }
      }
    });

    for (const category of uniqueCategories) {
      const key = category.toLowerCase().trim();
      if (!coaMap.has(key)) {
        const codeString = `4030${String(nextNum).padStart(2, '0')}`;
        const accountId = `acc-${codeString}`;
        console.log(`[Import] Creating Chart of Account for category "${category}" -> Code ${codeString}`);
        
        await connection.query(`
          INSERT INTO chart_of_accounts (id, code, name, type, classification, parentCode, isSystem, balance)
          VALUES (?, ?, ?, 'revenue', 'revenue', '4030', 0, 0.00)
        `, [accountId, codeString, category]);

        coaMap.set(key, codeString);
        nextNum++;
      }
    }

    // 4. Import services into 'services' table
    let insertedCount = 0;
    let updatedCount = 0;
    const allServices = [];

    for (let i = 0; i < serviceRows.length; i++) {
      const row = serviceRows[i];
      if (row.length < 2 || !row[0] || !row[1]) continue;

      const code = row[0];
      const name = row[1];
      const category = row[2] || 'Service Income';
      const slaTarget = row[3];
      const vatRate = parseFloat(row[4]) || 15.00;
      const description = row[5] || '';
      const baseFee = parseFloat(row[6]) || 0.00;

      const slaHours = convertSlaToHours(slaTarget);

      // Check if service code already exists
      const [existingSrv] = await connection.query('SELECT id FROM services WHERE code = ?', [code]);
      let srvId;

      if (existingSrv.length > 0) {
        srvId = existingSrv[0].id;
        // Update existing record
        await connection.query(`
          UPDATE services 
          SET name = ?, baseFee = ?, description = ?, category = ?, slaHours = ?, vatRate = ? 
          WHERE code = ?
        `, [name, baseFee, description, category, slaHours, vatRate, code]);
        updatedCount++;
      } else {
        // Insert new record
        srvId = `cat-srv-${Date.now()}-${i}`;
        await connection.query(`
          INSERT INTO services (id, code, name, baseFee, description, category, slaHours, vatRate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [srvId, code, name, baseFee, description, category, slaHours, vatRate]);
        insertedCount++;
      }

      allServices.push({
        id: srvId,
        code,
        name,
        baseFee,
        description,
        category,
        slaHours,
        vatRate
      });
    }

    // Save all services to seed JSON file
    const seedFilePath = path.resolve(__dirname, 'servicesSeed.json');
    await fs.writeFile(seedFilePath, JSON.stringify(allServices, null, 2), 'utf-8');
    console.log(`[Import] Wrote ${allServices.length} seed records to: ${seedFilePath}`);

    console.log(`[Import] Done! Imported services summary:`);
    console.log(` - Services Inserted: ${insertedCount}`);
    console.log(` - Services Updated: ${updatedCount}`);
    console.log(` - Total Database Records: ${insertedCount + updatedCount}`);

  } catch (error) {
    console.error('[Import] Execution failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

run();
