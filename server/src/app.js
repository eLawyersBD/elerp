import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRouter from './routes/api.js';
import { initializeDatabase } from './database/initializeDb.js';
import { testConnection } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set up Router
app.use('/api', apiRouter);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Bootstrap logic
async function bootstrap() {
  try {
    // 1. Initialize database (create database and tables)
    await initializeDatabase();
    
    // 2. Validate DB connection
    await testConnection();
    
    // 3. Start server
    app.listen(PORT, () => {
      console.log(`🚀 ACCOUNTICA ERP Backend running successfully on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to bootstrap ERP backend server:', error.message);
    process.exit(1);
  }
}

bootstrap();
