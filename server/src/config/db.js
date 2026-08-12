import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'atcl_erp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

console.log(`[Database Pool] Configuring connection pool to ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}`);

const pool = mysql.createPool(dbConfig);

// Helper function to test the pool connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database Connection] Pool successfully connected to database: ${dbConfig.database}`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`[Database Connection] Database connection pool failed: ${error.message}`);
    throw error;
  }
}

export default pool;
export { dbConfig };
