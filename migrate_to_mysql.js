import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import mysql from 'mysql2/promise';

const firebaseConfig = {
  apiKey: "AIzaSyDS_grS4d4dJt-eYp4JDGyC2day_QA1soU",
  authDomain: "elawyersbd.firebaseapp.com",
  projectId: "elawyersbd",
  storageBucket: "elawyersbd.firebasestorage.app",
  messagingSenderId: "826559033483",
  appId: "1:826559033483:web:c2c94a3aff0524b676648e"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// MySQL connection
const db = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '', // root with no password for our initialized insecure mode
  database: 'el_erp'
});

const collections = [
  'clients',
  'suppliers',
  'inventory',
  'attendance',
  'payroll',
  'cases',
  'vouchers',
  'coas',
  'banking_methods',
  'payment_methods',
  'settings',
  'users'
];

for (const colName of collections) {
  try {
    console.log(`Checking/Creating table for collection: ${colName}...`);
    // Create table with JSON column
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`${colName}\` (
        id VARCHAR(255) PRIMARY KEY,
        data JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log(`Fetching data from Firestore collection: ${colName}...`);
    const colRef = collection(firestore, colName);
    const querySnapshot = await getDocs(colRef);
    
    console.log(`Found ${querySnapshot.size} documents in ${colName}. Migrating...`);
    let count = 0;
    for (const doc of querySnapshot.docs) {
      const id = doc.id;
      const data = doc.data();
      
      // Convert timestamps if any are Firestore Timestamps
      for (const key in data) {
        if (data[key] && typeof data[key] === 'object' && 'seconds' in data[key]) {
          data[key] = new Date(data[key].seconds * 1000).toISOString();
        }
      }
      
      // Insert or replace into MySQL
      await db.query(
        `INSERT INTO \`${colName}\` (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?`,
        [id, JSON.stringify(data), JSON.stringify(data)]
      );
      count++;
    }
    console.log(`Successfully migrated ${count} documents for ${colName}.`);
  } catch (error) {
    console.error(`Error migrating collection ${colName}:`, error.message);
  }
}

await db.end();
console.log("Migration completed!");
process.exit(0);
