import fs from 'fs';
import https from 'https';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'atcl_erp'
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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

function parseSlaHours(slaStr) {
  if (!slaStr) return 24;
  const match = slaStr.match(/(\d+)\s*Day/i);
  if (match) {
    return parseInt(match[1], 10) * 24;
  }
  const matchHours = slaStr.match(/(\d+)\s*Hour/i);
  if (matchHours) {
    return parseInt(matchHours[1], 10);
  }
  const num = parseInt(slaStr, 10);
  return !isNaN(num) ? num : 24;
}

async function run() {
  try {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1MA_2W_dmYyk3EUbrbmySf9g-_j25EFKP34FApZR5XfU/export?format=csv';
    console.log(`Fetching CSV from Google Sheet: ${sheetUrl}`);
    const csvContent = await fetchUrl(sheetUrl);
    
    const parsedRows = parseCSV(csvContent);
    console.log(`Total CSV rows parsed: ${parsedRows.length}`);
    
    if (parsedRows.length < 2) {
      console.error('No data rows found in CSV!');
      process.exit(1);
    }

    const header = parsedRows[0].map(h => h.trim());
    console.log('Header:', header);

    const codeIdx = header.findIndex(h => /code/i.test(h));
    const nameIdx = header.findIndex(h => /name/i.test(h));
    const catIdx = header.findIndex(h => /category/i.test(h));
    const slaIdx = header.findIndex(h => /sla/i.test(h));
    const vatIdx = header.findIndex(h => /vat/i.test(h));
    const descIdx = header.findIndex(h => /description/i.test(h));
    const feeIdx = header.findIndex(h => /fee/i.test(h));

    console.log({ codeIdx, nameIdx, catIdx, slaIdx, vatIdx, descIdx, feeIdx });

    const services = [];
    for (let i = 1; i < parsedRows.length; i++) {
      const r = parsedRows[i];
      if (!r || r.length < 2 || !r[codeIdx]) continue;

      const code = r[codeIdx].trim();
      const name = r[nameIdx] ? r[nameIdx].trim() : '';
      const category = r[catIdx] ? r[catIdx].trim() : 'Service Income';
      const slaStr = r[slaIdx] ? r[slaIdx].trim() : '';
      const slaHours = parseSlaHours(slaStr);
      const vatRate = r[vatIdx] ? parseFloat(r[vatIdx].trim()) : 15;
      const description = r[descIdx] ? r[descIdx].trim() : '';
      const baseFee = r[feeIdx] ? parseFloat(r[feeIdx].trim().replace(/,/g, '')) : 0;

      if (code && name) {
        services.push({
          id: `cat-srv-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          code,
          name,
          category,
          slaHours,
          vatRate: isNaN(vatRate) ? 15 : vatRate,
          description,
          baseFee: isNaN(baseFee) ? 0 : baseFee
        });
      }
    }

    console.log(`Valid Service offerings extracted: ${services.length}`);

    // Update MySQL
    console.log('Connecting to MySQL...');
    const conn = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL successfully!');

    // Ensure services table has requisite schema
    await conn.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        baseFee DECIMAL(15,2) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'Service Income',
        slaHours INT DEFAULT 24,
        vatRate DECIMAL(5,2) DEFAULT 15.00
      ) ENGINE=InnoDB;
    `);

    let inserted = 0;
    let updated = 0;

    for (const s of services) {
      const [res] = await conn.query(`
        INSERT INTO services (id, code, name, baseFee, description, category, slaHours, vatRate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          baseFee = VALUES(baseFee),
          description = VALUES(description),
          category = VALUES(category),
          slaHours = VALUES(slaHours),
          vatRate = VALUES(vatRate)
      `, [s.id, s.code, s.name, s.baseFee, s.description, s.category, s.slaHours, s.vatRate]);
      
      if (res.affectedRows === 1) inserted++;
      else if (res.affectedRows === 2) updated++;
    }

    console.log(`MySQL Sync Complete: ${inserted} new inserted, ${updated} updated. Total in DB: ${services.length}`);

    await conn.end();

    // Export seedServices.js for frontend
    const seedServicesPath = path.resolve(__dirname, '../src/database/seedServices.js');
    const fileContent = `// Auto-generated from Google Sheet Service Offerings Catalog
export const INITIAL_SERVICE_CATALOG = ${JSON.stringify(services, null, 2)};
`;
    fs.writeFileSync(seedServicesPath, fileContent, 'utf8');
    console.log(`Saved seed file to: ${seedServicesPath}`);

  } catch (err) {
    console.error('Error importing services:', err);
    process.exit(1);
  }
}

run();
