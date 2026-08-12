import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
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

// Default seed definitions
const mockUsers = [
  { uid: 'u-001', email: 'admin@erpforu.com', password: 'admin', displayName: 'System Admin', role: 'admin', branchId: 'br-1', status: 'active', avatarColor: '#2563eb' },
  { uid: 'u-002', email: 'accountant@erpforu.com', password: 'admin', displayName: 'Chief Accountant', role: 'accountant', branchId: 'br-1', status: 'active', avatarColor: '#7c3aed' },
  { uid: 'u-003', email: 'warehouse@erpforu.com', password: 'admin', displayName: 'Warehouse Manager', role: 'warehouse', branchId: 'br-1', status: 'active', avatarColor: '#059669' },
  { uid: 'u-004', email: 'sales@erpforu.com', password: 'admin', displayName: 'Sales Executive', role: 'sales', branchId: 'br-1', status: 'active', avatarColor: '#d97706' },
  { uid: 'u-005', email: 'superadmin@erpforu.com', password: 'admin123', displayName: 'Super Administrator', role: 'superadmin', branchId: 'br-1', status: 'active', avatarColor: '#dc2626' }
];

const SEED_EMPLOYEES = [
  { employeeCode: "EL001", fullNameEnglish: "Shofiqul Islam", fullNameBangla: "", designation: "Partner", department: "Partner", mobileNumber: "01335230184", emailAddress: "shofiq@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL002", fullNameEnglish: "Zohir Uddin", fullNameBangla: "", designation: "Partner", department: "Partner", mobileNumber: "01335230185", emailAddress: "zohir@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL003", fullNameEnglish: "Ekramul Islam Khandaker", fullNameBangla: "", designation: "Managing Partner", department: "Managing Partner", mobileNumber: "01335230170", emailAddress: "ekram@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL004", fullNameEnglish: "Md. Anamul Haque", fullNameBangla: "", designation: "Partner", department: "Partner", mobileNumber: "01335230171", emailAddress: "anamul@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL005", fullNameEnglish: "Advocate Muzammel Haque", fullNameBangla: "", designation: "Partner", department: "Partner", mobileNumber: "01313583838", emailAddress: "info@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL006", fullNameEnglish: "Fardausi Akter", fullNameBangla: "", designation: "Partner", department: "Partner", mobileNumber: "01313583838", emailAddress: "info@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL007", fullNameEnglish: "Kamrul Hasan", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230173", emailAddress: "kamrul@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL008", fullNameEnglish: "Md. Abu Hanif", fullNameBangla: "", designation: "CEO", department: "CEO", mobileNumber: "01313583838", emailAddress: "info@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL009", fullNameEnglish: "Muhammad Abdul Kader ACCA", fullNameBangla: "", designation: "Senior Consultant", department: "Senior Consultant", mobileNumber: "01335230172", emailAddress: "rafat@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL010", fullNameEnglish: "Minhazul Islam", fullNameBangla: "", designation: "Senior Executive", department: "Senior Executive", mobileNumber: "01335230174", emailAddress: "minhaz@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL011", fullNameEnglish: "Emamul Islam Sayed", fullNameBangla: "", designation: "Senior Executive", department: "Senior Executive", mobileNumber: "01335230176", emailAddress: "sayed@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL012", fullNameEnglish: "Kamrul Hasan Sumon", fullNameBangla: "", designation: "Senior Executive", department: "Senior Executive", mobileNumber: "01335230175", emailAddress: "sumon@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL013", fullNameEnglish: "Advocate Md. Delower Hossain (Ovi)", fullNameBangla: "", designation: "Advocate & Income Tax Adviser", department: "Advocate & Income Tax Adviser", mobileNumber: "01335230183", emailAddress: "delower@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL014", fullNameEnglish: "Rafi Rahman ACCA", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230182", emailAddress: "rafi@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL015", fullNameEnglish: "Advocate Md. Delower Hossain (Ovi)", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230183", emailAddress: "delower@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL016", fullNameEnglish: "Kamal Khan", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230180", emailAddress: "kamal@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL017", fullNameEnglish: "Harunur Rashid", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230181", emailAddress: "harun@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL018", fullNameEnglish: "Nahid Zaman Siddiqui Manna", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230179", emailAddress: "nahid@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL019", fullNameEnglish: "Mahmudul Hasan Mukul", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230177", emailAddress: "mukul@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL020", fullNameEnglish: "Mobin Khan", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01313583838", emailAddress: "info@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL021", fullNameEnglish: "Al-Amin", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230178", emailAddress: "alamin@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL022", fullNameEnglish: "Md. Ridwanul Arefin Riyad", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230187", emailAddress: "riyad@elawyersbd.com", grossSalary: 0, status: "Active" },
  { employeeCode: "EL023", fullNameEnglish: "Omar Faruk", fullNameBangla: "", designation: "Business Consultant", department: "Business Consultant", mobileNumber: "01335230188", emailAddress: "faruk@elawyersbd.com", grossSalary: 0, status: "Active" }
];


export async function initializeDatabase() {
  console.log('[Database Init] Commencing database checks and migration...');
  
  // 1. Connect without selecting database to verify database creation
  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    console.log(`[Database Init] Database "${DB_NAME}" checked/created successfully.`);
  } catch (error) {
    console.error(`[Database Init] Root database connection failed: ${error.message}`);
    throw error;
  } finally {
    if (connection) await connection.end();
  }

  // 2. Reconnect to the specific database
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    console.log('[Database Init] Creating table schemas if not exist...');

    // Create User Credentials
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        employeeCode VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        fullName VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        mustChangePassword TINYINT(1) DEFAULT 0,
        role VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        avatarColor VARCHAR(10) DEFAULT '#3b82f6',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create Employees Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employees (
        employeeCode VARCHAR(50) PRIMARY KEY,
        fullNameEnglish VARCHAR(100) NOT NULL,
        fullNameBangla VARCHAR(100),
        designation VARCHAR(100),
        department VARCHAR(100),
        mobileNumber VARCHAR(30),
        emailAddress VARCHAR(100),
        personalEmailAddress VARCHAR(100),
        grossSalary DECIMAL(15,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'Active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create User ID Requests Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_id_requests (
        id VARCHAR(50) PRIMARY KEY,
        employeeCode VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        mobileNumber VARCHAR(30),
        status VARCHAR(20) DEFAULT 'Pending',
        taggedEmployeeCode VARCHAR(50) DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);


    // Create Settings Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50) PRIMARY KEY,
        value JSON NOT NULL
      ) ENGINE=InnoDB;
    `);

    // Create Branches
    await connection.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        phone VARCHAR(30),
        isActive TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB;
    `);

    // Create Warehouses
    await connection.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        branchId VARCHAR(50) NOT NULL,
        isActive TINYINT(1) DEFAULT 1,
        FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create VAT Rates
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vat_rates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        rate DECIMAL(5,2) NOT NULL,
        isDefault TINYINT(1) DEFAULT 0,
        isActive TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB;
    `);

    // Create Chart of Accounts
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        classification VARCHAR(50) NOT NULL,
        parentCode VARCHAR(50) DEFAULT NULL,
        isSystem TINYINT(1) DEFAULT 0,
        balance DECIMAL(15,2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create Suppliers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        contact VARCHAR(100),
        phone VARCHAR(30),
        email VARCHAR(100),
        address TEXT,
        vatNo VARCHAR(50),
        tin VARCHAR(50),
        accountId VARCHAR(50) DEFAULT NULL,
        currentBalance DECIMAL(15,2) DEFAULT 0.00,
        creditLimit DECIMAL(15,2) DEFAULT 500000.00,
        paymentTermDays INT DEFAULT 30,
        isActive TINYINT(1) DEFAULT 1,
        FOREIGN KEY (accountId) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Create Customers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        contact VARCHAR(100),
        phone VARCHAR(30),
        email VARCHAR(100),
        address TEXT,
        vatNo VARCHAR(50),
        tin VARCHAR(50),
        accountId VARCHAR(50) DEFAULT NULL,
        currentBalance DECIMAL(15,2) DEFAULT 0.00,
        creditLimit DECIMAL(15,2) DEFAULT 500000.00,
        paymentTermDays INT DEFAULT 30,
        isActive TINYINT(1) DEFAULT 1,
        customFields JSON DEFAULT NULL,
        FOREIGN KEY (accountId) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Create Categories
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        isActive TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB;
    `);

    // Create Units
    await connection.query(`
      CREATE TABLE IF NOT EXISTS units (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        isActive TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB;
    `);

    // Create Products
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        qty DECIMAL(15,2) DEFAULT 0.00,
        unit VARCHAR(50) NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        minStock DECIMAL(15,2) DEFAULT 5.00,
        location VARCHAR(100),
        supplierId VARCHAR(50),
        description TEXT,
        warehouseQtyMap JSON,
        isActive TINYINT(1) DEFAULT 1,
        purchasePrice DECIMAL(15,2) DEFAULT 0.00,
        warrantyMonths INT DEFAULT 12,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Create Stock Movements
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id VARCHAR(50) PRIMARY KEY,
        productId VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        qty DECIMAL(15,2) NOT NULL,
        referenceNo VARCHAR(100),
        warehouseId VARCHAR(50),
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Create Journal Entries
    await connection.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id VARCHAR(50) PRIMARY KEY,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        refNo VARCHAR(100) UNIQUE NOT NULL,
        narration TEXT,
        sourceModule VARCHAR(50),
        sourceRefId VARCHAR(100),
        voucherType VARCHAR(50),
        paymentMethod VARCHAR(50),
        chequeNo VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create Journal Lines
    await connection.query(`
      CREATE TABLE IF NOT EXISTS journal_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        journalId VARCHAR(50) NOT NULL,
        accountId VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        FOREIGN KEY (journalId) REFERENCES journal_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (accountId) REFERENCES chart_of_accounts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Sales Invoices
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales_invoices (
        id VARCHAR(50) PRIMARY KEY,
        invoiceNo VARCHAR(100) UNIQUE NOT NULL,
        date DATE NOT NULL,
        dueDate DATE NOT NULL,
        customerId VARCHAR(50) NOT NULL,
        branchId VARCHAR(50) NOT NULL,
        branch VARCHAR(100),
        salesperson VARCHAR(100),
        quoteNo VARCHAR(100),
        soNumber VARCHAR(100),
        items JSON NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        vatAmount DECIMAL(15,2) NOT NULL,
        discountTotal DECIMAL(15,2) DEFAULT 0.00,
        grandTotal DECIMAL(15,2) NOT NULL,
        totalCogs DECIMAL(15,2) DEFAULT 0.00,
        grossProfit DECIMAL(15,2) DEFAULT 0.00,
        grossMargin DECIMAL(5,2) DEFAULT 0.00,
        paidAmount DECIMAL(15,2) DEFAULT 0.00,
        narration TEXT,
        paymentStatus VARCHAR(50) DEFAULT 'unpaid',
        deliveryStatus VARCHAR(50) DEFAULT 'pending',
        approvalStatus VARCHAR(50) DEFAULT 'auto_approved',
        approvedBy VARCHAR(100),
        approvedAt TIMESTAMP NULL DEFAULT NULL,
        chalanNo VARCHAR(100),
        status VARCHAR(50) DEFAULT 'posted',
        postedBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Purchase Invoices
    await connection.query(`
      CREATE TABLE IF NOT EXISTS purchase_invoices (
        id VARCHAR(50) PRIMARY KEY,
        invoiceNo VARCHAR(100) UNIQUE NOT NULL,
        date DATE NOT NULL,
        dueDate DATE NOT NULL,
        supplierId VARCHAR(50) NOT NULL,
        branchId VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        vatAmount DECIMAL(15,2) NOT NULL,
        discountTotal DECIMAL(15,2) DEFAULT 0.00,
        grandTotal DECIMAL(15,2) NOT NULL,
        paidAmount DECIMAL(15,2) DEFAULT 0.00,
        narration TEXT,
        paymentStatus VARCHAR(50) DEFAULT 'unpaid',
        status VARCHAR(50) DEFAULT 'posted',
        postedBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE,
        FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Payments Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        refNo VARCHAR(100) PRIMARY KEY,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        partyId VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        paymentMethod VARCHAR(50) NOT NULL,
        ledgerAccountId VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        narration TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create Sales Returns
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id VARCHAR(50) PRIMARY KEY,
        returnNo VARCHAR(100) UNIQUE NOT NULL,
        invoiceNo VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        customerId VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        vatAmount DECIMAL(15,2) NOT NULL,
        grandTotal DECIMAL(15,2) NOT NULL,
        reason TEXT,
        postedBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Purchase Returns
    await connection.query(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id VARCHAR(50) PRIMARY KEY,
        returnNo VARCHAR(100) UNIQUE NOT NULL,
        invoiceNo VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        supplierId VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        vatAmount DECIMAL(15,2) NOT NULL,
        grandTotal DECIMAL(15,2) NOT NULL,
        reason TEXT,
        postedBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Quotations
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id VARCHAR(50) PRIMARY KEY,
        quoteNo VARCHAR(100) UNIQUE NOT NULL,
        date DATE NOT NULL,
        customerId VARCHAR(50) NOT NULL,
        branchId VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        vatAmount DECIMAL(15,2) NOT NULL,
        discountTotal DECIMAL(15,2) DEFAULT 0.00,
        grandTotal DECIMAL(15,2) NOT NULL,
        validUntil DATE,
        narration TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        postedBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Sales Orders
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id VARCHAR(50) PRIMARY KEY,
        soNo VARCHAR(100) UNIQUE NOT NULL,
        quoteNo VARCHAR(100),
        date DATE NOT NULL,
        customerId VARCHAR(50) NOT NULL,
        branchId VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        vatAmount DECIMAL(15,2) NOT NULL,
        discountTotal DECIMAL(15,2) DEFAULT 0.00,
        grandTotal DECIMAL(15,2) NOT NULL,
        deliveryDate DATE,
        narration TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        postedBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Purchase Requisitions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS purchase_requisitions (
        id VARCHAR(50) PRIMARY KEY,
        requisitionNo VARCHAR(100) UNIQUE NOT NULL,
        requisitionDate DATE NOT NULL,
        department VARCHAR(50) NOT NULL,
        budgetHead VARCHAR(100) NOT NULL,
        items JSON NOT NULL,
        totalAmount DECIMAL(15,2) NOT NULL,
        purpose TEXT,
        priority VARCHAR(20) DEFAULT 'Medium',
        status VARCHAR(20) DEFAULT 'Draft',
        approvedBy VARCHAR(100),
        approvedAt TIMESTAMP NULL DEFAULT NULL,
        createdBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create Purchase Orders
    await connection.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(50) PRIMARY KEY,
        poNo VARCHAR(100) UNIQUE NOT NULL,
        requisitionNo VARCHAR(100),
        poDate DATE NOT NULL,
        supplierId VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        totalAmount DECIMAL(15,2) NOT NULL,
        paymentTerms VARCHAR(50),
        deliveryLeadDays INT,
        status VARCHAR(20) DEFAULT 'Pending Approval',
        approvedBy VARCHAR(100),
        approvedAt TIMESTAMP NULL DEFAULT NULL,
        createdBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Goods Receive Notes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS goods_receive_notes (
        id VARCHAR(50) PRIMARY KEY,
        grnNo VARCHAR(100) UNIQUE NOT NULL,
        poNo VARCHAR(100),
        receiveDate DATE NOT NULL,
        supplierId VARCHAR(50) NOT NULL,
        warehouseId VARCHAR(50) NOT NULL,
        items JSON NOT NULL,
        totalAmount DECIMAL(15,2) DEFAULT 0.00,
        challanNo VARCHAR(100),
        status VARCHAR(20) DEFAULT 'Pending',
        receivedBy VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouseId) REFERENCES warehouses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Leads (CRM)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(100),
        contactPerson VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(30),
        stage VARCHAR(50) DEFAULT 'Lead',
        value DECIMAL(15,2) DEFAULT 0.00,
        expectedCloseDate DATE,
        priority VARCHAR(20) DEFAULT 'Medium',
        assignee VARCHAR(100),
        notes JSON,
        tasks JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create LCs (Letters of Credit)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lcs (
        id VARCHAR(50) PRIMARY KEY,
        lcNumber VARCHAR(100) UNIQUE NOT NULL,
        lcDate DATE NOT NULL,
        supplierId VARCHAR(50) NOT NULL,
        country VARCHAR(100),
        currency VARCHAR(20),
        exchangeRate DECIMAL(10,4) NOT NULL,
        lcAmountForeign DECIMAL(15,2) NOT NULL,
        marginPercent DECIMAL(5,2) NOT NULL,
        issuingBank VARCHAR(100),
        advisingBank VARCHAR(100),
        expiryDate DATE,
        status VARCHAR(50) DEFAULT 'Opened',
        marginDeposits JSON,
        shipments JSON,
        costs JSON,
        items JSON,
        padLoans JSON,
        customs JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Service Assets
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_assets (
        id VARCHAR(50) PRIMARY KEY,
        serialNo VARCHAR(100) UNIQUE NOT NULL,
        productId VARCHAR(50) NOT NULL,
        productName VARCHAR(255),
        customerId VARCHAR(50) NOT NULL,
        customerName VARCHAR(255),
        purchaseDate DATE,
        warrantyExpiry DATE,
        installationDate DATE,
        calibrationDueDate DATE,
        amcContractId VARCHAR(50),
        serviceHistory JSON,
        partsChanged JSON,
        modelConfig TEXT,
        firmwareVersion VARCHAR(50),
        softwareLicense VARCHAR(100),
        gpsCoordinates VARCHAR(100),
        commissioningReport TEXT,
        atrStatus VARCHAR(20),
        healthScore INT,
        attachments JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create AMC Contracts
    await connection.query(`
      CREATE TABLE IF NOT EXISTS amc_contracts (
        id VARCHAR(50) PRIMARY KEY,
        contractNo VARCHAR(100) UNIQUE NOT NULL,
        customerId VARCHAR(50) NOT NULL,
        customerName VARCHAR(255),
        machineId VARCHAR(50) NOT NULL,
        machineName VARCHAR(255),
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        visitSchedule VARCHAR(50),
        freeVisitsIncluded INT DEFAULT 0,
        visitsUsed INT DEFAULT 0,
        chargeableVisits INT DEFAULT 0,
        nextVisitDate DATE,
        status VARCHAR(20) DEFAULT 'active',
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (machineId) REFERENCES service_assets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Services Catalogue
    await connection.query(`
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

    // Migrate existing table to include category, slaHours, vatRate
    try {
      const [cols] = await connection.query("SHOW COLUMNS FROM services");
      const colNames = cols.map(c => c.Field);
      if (!colNames.includes('category')) {
        await connection.query("ALTER TABLE services ADD COLUMN category VARCHAR(100) DEFAULT 'Service Income'");
        console.log("[Database Init] Migration: Added 'category' column to 'services' table.");
      }
      if (!colNames.includes('slaHours')) {
        await connection.query("ALTER TABLE services ADD COLUMN slaHours INT DEFAULT 24");
        console.log("[Database Init] Migration: Added 'slaHours' column to 'services' table.");
      }
      if (!colNames.includes('vatRate')) {
        await connection.query("ALTER TABLE services ADD COLUMN vatRate DECIMAL(5,2) DEFAULT 15.00");
        console.log("[Database Init] Migration: Added 'vatRate' column to 'services' table.");
      }
    } catch (migError) {
      console.error("[Database Init] Migration failed for services table columns:", migError.message);
    }

    // Migrate sales_orders table to include invoiceNo, approvedBy, paymentTerms
    try {
      const [soCols] = await connection.query("SHOW COLUMNS FROM sales_orders");
      const soColNames = soCols.map(c => c.Field);
      if (!soColNames.includes('invoiceNo')) {
        await connection.query("ALTER TABLE sales_orders ADD COLUMN invoiceNo VARCHAR(100) DEFAULT ''");
        console.log("[Database Init] Migration: Added 'invoiceNo' column to 'sales_orders' table.");
      }
      if (!soColNames.includes('approvedBy')) {
        await connection.query("ALTER TABLE sales_orders ADD COLUMN approvedBy VARCHAR(255) DEFAULT ''");
        console.log("[Database Init] Migration: Added 'approvedBy' column to 'sales_orders' table.");
      }
      if (!soColNames.includes('paymentTerms')) {
        await connection.query("ALTER TABLE sales_orders ADD COLUMN paymentTerms VARCHAR(100) DEFAULT 'Net 30'");
        console.log("[Database Init] Migration: Added 'paymentTerms' column to 'sales_orders' table.");
      }
    } catch (migError) {
      console.error("[Database Init] Migration failed for sales_orders table columns:", migError.message);
    }

    // Create Service Tickets
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_tickets (
        id VARCHAR(50) PRIMARY KEY,
        ticketNo VARCHAR(50) UNIQUE NOT NULL,
        customerId VARCHAR(50) NOT NULL,
        customerName VARCHAR(255),
        productId VARCHAR(50),
        productName VARCHAR(255),
        serialNo VARCHAR(100),
        assetId VARCHAR(50),
        invoiceNo VARCHAR(100),
        serviceType VARCHAR(50),
        warrantyStatus VARCHAR(50),
        problemDescription TEXT,
        technicianId VARCHAR(50),
        status VARCHAR(20) DEFAULT 'open',
        priority VARCHAR(20) DEFAULT 'medium',
        slaDeadline VARCHAR(50),
        resolutionNotes TEXT,
        sparesUsed JSON,
        serviceFee DECIMAL(15,2) DEFAULT 0.00,
        billingStatus VARCHAR(50) DEFAULT 'none',
        billNo VARCHAR(100),
        billAmount DECIMAL(15,2) DEFAULT 0.00,
        completedAt TIMESTAMP NULL DEFAULT NULL,
        timeline JSON,
        gpsCheckIn VARCHAR(100),
        customerSignature TEXT,
        attachments JSON,
        internalNotes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Service Estimates
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_estimates (
        id VARCHAR(50) PRIMARY KEY,
        estimateNo VARCHAR(50) UNIQUE NOT NULL,
        ticketId VARCHAR(50) NOT NULL,
        ticketNo VARCHAR(50),
        customerId VARCHAR(50) NOT NULL,
        customerName VARCHAR(255),
        inspectionCharge DECIMAL(15,2) DEFAULT 0.00,
        laborFee DECIMAL(15,2) DEFAULT 0.00,
        travelCharge DECIMAL(15,2) DEFAULT 0.00,
        sparesCost DECIMAL(15,2) DEFAULT 0.00,
        sparesList JSON,
        discount DECIMAL(15,2) DEFAULT 0.00,
        vat DECIMAL(15,2) DEFAULT 0.00,
        ait DECIMAL(15,2) DEFAULT 0.00,
        grandTotal DECIMAL(15,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending_approval',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (ticketId) REFERENCES service_tickets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Tasks (Project/Field Tasks)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        taskNo VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        type VARCHAR(50),
        sourceModule VARCHAR(50),
        sourceId VARCHAR(50),
        customerId VARCHAR(50),
        customerName VARCHAR(255),
        branchId VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'medium',
        urgency VARCHAR(20) DEFAULT 'medium',
        assigneeRole VARCHAR(50),
        assignedTo VARCHAR(100),
        status VARCHAR(20) DEFAULT 'Pending',
        checklist JSON,
        comments JSON,
        history JSON,
        attachments JSON,
        startedAt TIMESTAMP NULL DEFAULT NULL,
        completedAt TIMESTAMP NULL DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Create Task Templates
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_templates (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50),
        type VARCHAR(50),
        estimatedHours INT DEFAULT 0,
        priority VARCHAR(20) DEFAULT 'medium',
        checklist JSON
      ) ENGINE=InnoDB;
    `);

    // Create Task Assignment Rules
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_rules (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        triggerModule VARCHAR(50) NOT NULL,
        \`condition\` TEXT NOT NULL,
        templateId VARCHAR(50) NOT NULL,
        assigneeRole VARCHAR(50),
        active TINYINT(1) DEFAULT 1,
        FOREIGN KEY (templateId) REFERENCES task_templates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Create Audit Logs Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50),
        userName VARCHAR(100),
        module VARCHAR(50),
        action VARCHAR(50),
        refId VARCHAR(100),
        refNo VARCHAR(100),
        description TEXT,
        oldData TEXT,
        newData TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date VARCHAR(20),
        time VARCHAR(20)
      ) ENGINE=InnoDB;
    `);

    // Create Procurement Plans
    await connection.query(`
      CREATE TABLE IF NOT EXISTS procurement_plans (
        id VARCHAR(50) PRIMARY KEY,
        planYear VARCHAR(10) NOT NULL,
        department VARCHAR(50) NOT NULL,
        budgetHead VARCHAR(100) NOT NULL,
        itemName VARCHAR(255) NOT NULL,
        specification TEXT,
        unit VARCHAR(50),
        annualQty INT NOT NULL,
        estimatedUnitCost DECIMAL(15,2) NOT NULL,
        estimatedTotalCost DECIMAL(15,2) NOT NULL,
        requiredMonth VARCHAR(10),
        priority VARCHAR(20),
        convertedQty INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Approved'
      ) ENGINE=InnoDB;
    `);

    // Create Procurement Vendor Details
    await connection.query(`
      CREATE TABLE IF NOT EXISTS procurement_vendor_details (
        supplierId VARCHAR(50) PRIMARY KEY,
        details JSON NOT NULL
      ) ENGINE=InnoDB;
    `);

    // Create Procurement Reorder Rules
    await connection.query(`
      CREATE TABLE IF NOT EXISTS procurement_reorder_rules (
        productId VARCHAR(50) PRIMARY KEY,
        rule JSON NOT NULL
      ) ENGINE=InnoDB;
    `);

    console.log('[Database Init] Core table schemas loaded.');

    // ── Duplicate Prevention Migrations ──────────────────────────────────────
    // Safely add UNIQUE indexes only if they don't already exist.
    // These indexes enforce the business rules at the database level (Layer 4).
    console.log('[Database Init] Applying duplicate-prevention indexes...');

    const addIndexIfMissing = async (table, indexName, columns) => {
      const [rows] = await connection.query(
        `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]
      );
      if (rows.length === 0) {
        try {
          await connection.query(
            `ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns})`
          );
          console.log(`  ✅ Added index ${indexName} on ${table}(${columns})`);
        } catch (e) {
          // Non-fatal — log and continue (may happen if data already has duplicates)
          console.warn(`  ⚠️  Could not add index ${indexName} on ${table}: ${e.message}`);
        }
      }
    };

    // Customers: composite index on (name, phone) to detect duplicate combos
    await addIndexIfMissing('customers', 'idx_customers_name_phone', 'name(100), phone(20)');

    // Suppliers: composite index on (name, phone) to detect duplicate combos
    await addIndexIfMissing('suppliers', 'idx_suppliers_name_phone', 'name(100), phone(20)');

    // Products: sku already has UNIQUE from CREATE TABLE, but add name index for fast lookup
    await addIndexIfMissing('products', 'idx_products_name', 'name(191)');

    // Service catalog: code + name lookup indexes
    await addIndexIfMissing('services', 'idx_services_code', 'code(50)');
    await addIndexIfMissing('services', 'idx_services_name', 'name(191)');

    // CRM Leads: index on name for fast duplicate detection
    await addIndexIfMissing('leads', 'idx_leads_name', 'name(191)');

    console.log('[Database Init] Duplicate-prevention indexes applied.');
    // ─────────────────────────────────────────────────────────────────────────

    // 3. Seeding User Credentials

    const [userRows] = await connection.query('SELECT COUNT(*) as count FROM user_credentials');
    if (userRows[0].count === 0) {
      console.log('🌱 Seeding user credentials...');
      for (const u of mockUsers) {
        const hash = await bcrypt.hash(u.password, 10);
        await connection.query(`
          INSERT INTO user_credentials (employeeCode, username, fullName, email, password, mustChangePassword, role, status, avatarColor)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
        `, [u.uid, u.email.split('@')[0], u.displayName, u.email, hash, u.role, u.status, u.avatarColor]);
      }
      console.log('✅ Seeded default users.');
    }

    // 3b. Seeding Employees Directory
    const [empRows] = await connection.query('SELECT COUNT(*) as count FROM employees');
    if (empRows[0].count === 0) {
      console.log('🌱 Seeding employees directory...');
      for (const e of SEED_EMPLOYEES) {
        await connection.query(`
          INSERT INTO employees (employeeCode, fullNameEnglish, fullNameBangla, designation, department, mobileNumber, emailAddress, personalEmailAddress, grossSalary, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          e.employeeCode,
          e.fullNameEnglish,
          e.fullNameBangla || '',
          e.designation || '',
          e.department || '',
          e.mobileNumber || '',
          e.emailAddress || '',
          e.personalEmailAddress || '',
          e.grossSalary || 0,
          e.status || 'Active'
        ]);
      }
      console.log('✅ Seeded E-Lawyers employees.');
    }

    // Load external arrays from standard files (fallback objects)
    // 4. Seeding VAT Rates
    const [vatRows] = await connection.query('SELECT COUNT(*) as count FROM vat_rates');
    if (vatRows[0].count === 0) {
      console.log('🌱 Seeding VAT rates...');
      const rates = [
        { id: 'vat-std', name: 'Standard VAT (15%)', rate: 15.00, isDefault: 1, isActive: 1 },
        { id: 'vat-reduce', name: 'Reduced VAT (5%)', rate: 5.00, isDefault: 0, isActive: 1 },
        { id: 'vat-zero', name: 'Zero Rated (0%)', rate: 0.00, isDefault: 0, isActive: 1 },
        { id: 'vat-exempt', name: 'VAT Exempt', rate: 0.00, isDefault: 0, isActive: 1 }
      ];
      for (const r of rates) {
        await connection.query('INSERT INTO vat_rates (id, name, rate, isDefault, isActive) VALUES (?, ?, ?, ?, ?)', [r.id, r.name, r.rate, r.isDefault, r.isActive]);
      }
      console.log('✅ Seeded VAT rates.');
    }

    // 5. Seeding Settings
    const [settingsRows] = await connection.query('SELECT COUNT(*) as count FROM settings');
    if (settingsRows[0].count === 0) {
      console.log('🌱 Seeding default settings...');
      const defaultSettings = {
        company: { name: 'ACCOUNTICA Cloud ERP ENTERPRISE', legalName: 'ACCOUNTICA Cloud ERP ENTERPRISE Limited', address: 'House 12, Road 5, Dhanmondi, Dhaka-1205', phone: '+880 2-9876543', email: 'info@erpforu.com', website: 'www.erpforu.com', tin: '123-456-789-0001', bin: '000123456-0201', logo: '/logo.png', currency: 'BDT', currencySymbol: '৳', country: 'Bangladesh' },
        fiscal: { yearStart: '2025-07-01', yearEnd: '2026-06-30', currentPeriod: '2025-07' },
        invoice: { salesPrefix: 'ERP-S-', purchasePrefix: 'ERP-P-', receiptPrefix: 'ERP-R-', paymentPrefix: 'ERP-PV-', journalPrefix: 'JV-', nextSalesNum: 1, nextPurchaseNum: 1, nextReceiptNum: 1, nextPaymentNum: 1, nextJournalNum: 1 },
        accounting: { defaultVatRate: 'vat-std', defaultCashAccount: 'acc-1010', defaultBankAccount: 'acc-1020', allowNegativeStock: false, requireApprovalOnPO: false, autoPostGRN: true },
        display: { dateFormat: 'DD-MM-YYYY', theme: 'light', language: 'en' }
      };
      
      for (const [k, v] of Object.entries(defaultSettings)) {
        await connection.query('INSERT INTO settings (id, value) VALUES (?, ?)', [k, JSON.stringify(v)]);
      }
      console.log('✅ Seeded default settings.');
    }

    // 6. Seeding Branches and Warehouses
    const [brRows] = await connection.query('SELECT COUNT(*) as count FROM branches');
    if (brRows[0].count === 0) {
      console.log('🌱 Seeding branches & warehouses...');
      await connection.query("INSERT INTO branches (id, name, code, address, phone, isActive) VALUES ('br-1', 'Dhaka Headquarters', 'HQ-DKA', 'House 12, Dhanmondi, Dhaka', '+880 2-9876543', 1)");
      await connection.query("INSERT INTO branches (id, name, code, address, phone, isActive) VALUES ('br-2', 'Chittagong Branch', 'BR-CTG', 'Agrabad C/A, Chittagong', '+880 31-123456', 1)");
      
      await connection.query("INSERT INTO warehouses (id, name, code, branchId, isActive) VALUES ('wh-1', 'Main Store — Dhaka', 'WH-DKA-1', 'br-1', 1)");
      await connection.query("INSERT INTO warehouses (id, name, code, branchId, isActive) VALUES ('wh-2', 'Safety Godown — Dhaka', 'WH-DKA-2', 'br-1', 1)");
      await connection.query("INSERT INTO warehouses (id, name, code, branchId, isActive) VALUES ('wh-3', 'CTG Port Depot', 'WH-CTG-1', 'br-2', 1)");
      console.log('✅ Seeded branches and warehouses.');
    }

    // 7. Seeding Chart of Accounts
    const [coaRows] = await connection.query('SELECT COUNT(*) as count FROM chart_of_accounts');
    if (coaRows[0].count === 0) {
      console.log('🌱 Seeding Chart of Accounts...');
      
      // Let's create an array of main accounts to seed initially
      const coaList = [
        { id: 'acc-1010', code: '1010', name: 'Cash on Hand', type: 'asset', classification: 'current_asset', parentCode: null, isSystem: 1, balance: 2500000.00 },
        { id: 'acc-1020', code: '1020', name: 'City Bank Current A/C', type: 'asset', classification: 'current_asset', parentCode: null, isSystem: 1, balance: 15000000.00 },
        { id: 'acc-1025', code: '1025', name: 'Dutch-Bangla Bank A/C', type: 'asset', classification: 'current_asset', parentCode: null, isSystem: 0, balance: 8000000.00 },
        { id: 'acc-1100', code: '1100', name: 'Accounts Receivable (A/R)', type: 'asset', classification: 'current_asset', parentCode: null, isSystem: 1, balance: 4500000.00 },
        { id: 'acc-1200', code: '1200', name: 'Inventory — Finished Goods', type: 'asset', classification: 'current_asset', parentCode: null, isSystem: 1, balance: 1200000.00 },
        { id: 'acc-1300', code: '1300', name: 'VAT Input Receivable', type: 'asset', classification: 'current_asset', parentCode: null, isSystem: 1, balance: 150000.00 },
        { id: 'acc-1500', code: '1500', name: 'Computer & Equipment', type: 'asset', classification: 'fixed_asset', parentCode: null, isSystem: 0, balance: 650000.00 },
        { id: 'acc-2010', code: '2010', name: 'Accounts Payable (A/P)', type: 'liability', classification: 'current_liability', parentCode: null, isSystem: 1, balance: 3500000.00 },
        { id: 'acc-2100', code: '2100', name: 'VAT Output Payable', type: 'liability', classification: 'current_liability', parentCode: null, isSystem: 1, balance: 320000.00 },
        { id: 'acc-3010', code: '3010', name: 'Share Capital', type: 'equity', classification: 'equity', parentCode: null, isSystem: 1, balance: 20000000.00 },
        { id: 'acc-3020', code: '3020', name: 'Retained Earnings', type: 'equity', classification: 'equity', parentCode: null, isSystem: 1, balance: 7500000.00 },
        { id: 'acc-3030', code: '3030', name: 'Current Year Profit / Loss', type: 'equity', classification: 'equity', parentCode: null, isSystem: 1, balance: 0.00 },
        { id: 'acc-4010', code: '4010', name: 'Sales Revenue — Domestic', type: 'revenue', classification: 'revenue', parentCode: null, isSystem: 1, balance: 0.00 },
        { id: 'acc-4030', code: '4030', name: 'Service Income', type: 'revenue', classification: 'revenue', parentCode: null, isSystem: 0, balance: 0.00 },
        { id: 'acc-403001', code: '403001', name: 'Tax & VAT Services', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403002', code: '403002', name: 'Registration & Incorporation (RJSC / Business Setup)', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403003', code: '403003', name: 'Tax ID / BIN / TIN Services', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403004', code: '403004', name: 'Trade License Services', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403005', code: '403005', name: 'Licenses & Government Approvals', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403006', code: '403006', name: 'Legal & Documentation Services', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403007', code: '403007', name: 'Audit & Accounting Services', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403008', code: '403008', name: 'Corporate Changes & RJSC Compliance', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403009', code: '403009', name: 'Membership & Association Services', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-403010', code: '403010', name: 'Certification & Special Reports', type: 'revenue', classification: 'revenue', parentCode: '4030', isSystem: 0, balance: 0.00 },
        { id: 'acc-5010', code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'expense', classification: 'cost_of_sales', parentCode: null, isSystem: 1, balance: 0.00 },
        { id: 'acc-6010', code: '6010', name: 'Salary & Wages', type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: 0, balance: 0.00 },
        { id: 'acc-6020', code: '6020', name: 'Office Rent', type: 'expense', classification: 'operating_expense', parentCode: null, isSystem: 0, balance: 0.00 }
      ];

      for (const a of coaList) {
        await connection.query(`
          INSERT INTO chart_of_accounts (id, code, name, type, classification, parentCode, isSystem, balance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [a.id, a.code, a.name, a.type, a.classification, a.parentCode, a.isSystem, a.balance]);
      }
      console.log('✅ Seeded Chart of Accounts.');
    }

    // 8. Seeding Suppliers and Customers
    const [supRows] = await connection.query('SELECT COUNT(*) as count FROM suppliers');
    if (supRows[0].count === 0) {
      console.log('🌱 Seeding suppliers...');
      await connection.query(`
        INSERT INTO suppliers (id, code, name, contact, phone, email, address, vatNo, tin, accountId, currentBalance, creditLimit, paymentTermDays, isActive)
        VALUES ('sup-1', 'SUP-001', 'Apex Electronics Ltd.', 'Kamrul Hasan', '+880 1711-223344', 'info@apexelectronics.com', '12 Kawran Bazar, Dhaka 1215', 'VAT-12345', '123-456-789', 'acc-2010', 0, 500000, 30, 1)
      `);
      await connection.query(`
        INSERT INTO suppliers (id, code, name, contact, phone, email, address, vatNo, tin, accountId, currentBalance, creditLimit, paymentTermDays, isActive)
        VALUES ('sup-2', 'SUP-002', 'Bengal Tools & Hardware', 'M. A. Rahman', '+880 1819-556677', 'sales@bengaltools.com', '45 Nawabpur Road, Old Dhaka', 'VAT-67890', '987-654-321', 'acc-2010', 0, 300000, 45, 1)
      `);
      await connection.query(`
        INSERT INTO suppliers (id, code, name, contact, phone, email, address, vatNo, tin, accountId, currentBalance, creditLimit, paymentTermDays, isActive)
        VALUES ('sup-3', 'SUP-003', 'National Office Solutions', 'Farhana Chowdhury', '+880 1912-889900', 'corporate@nationalsolutions.bd', 'Progressive Tower, Panthapath, Dhaka', 'VAT-11223', '334-455-667', 'acc-2010', 0, 200000, 30, 1)
      `);
      await connection.query(`
        INSERT INTO suppliers (id, code, name, contact, phone, email, address, vatNo, tin, accountId, currentBalance, creditLimit, paymentTermDays, isActive)
        VALUES ('sup-4', 'SUP-004', 'SafeGuard BD', 'Zahirul Islam', '+880 1515-443322', 'zahirul@safeguard.com.bd', 'House 14, Road 5, Uttara, Dhaka', 'VAT-44556', '889-900-112', 'acc-2010', 0, 100000, 60, 1)
      `);
      console.log('✅ Seeded suppliers.');
    }

    const [custRows] = await connection.query('SELECT COUNT(*) as count FROM customers');
    if (custRows[0].count === 0) {
      console.log('🌱 Customer table is empty (seeding skipped to support user data clean-up).');
    }

    // 9. Seeding Categories and Units
    const [catRows] = await connection.query('SELECT COUNT(*) as count FROM categories');
    if (catRows[0].count === 0) {
      console.log('🌱 Seeding categories...');
      const cats = [
        { id: 'cat-1', name: 'Electronics', code: 'ELEC' },
        { id: 'cat-2', name: 'Spare Parts', code: 'SPAR' },
        { id: 'cat-3', name: 'Office Supplies', code: 'OFFC' },
        { id: 'cat-4', name: 'Safety Gear', code: 'SFTY' },
        { id: 'cat-5', name: 'Packaging', code: 'PACK' },
        { id: 'cat-6', name: 'Tools', code: 'TOOL' }
      ];
      for (const c of cats) {
        await connection.query('INSERT INTO categories (id, name, code) VALUES (?, ?, ?)', [c.id, c.name, c.code]);
      }
      console.log('✅ Seeded categories.');
    }

    const [unitRows] = await connection.query('SELECT COUNT(*) as count FROM units');
    if (unitRows[0].count === 0) {
      console.log('🌱 Seeding units...');
      const units = [
        { id: 'unit-1', name: 'Pieces', code: 'pcs' },
        { id: 'unit-2', name: 'Reams', code: 'reams' },
        { id: 'unit-3', name: 'Box', code: 'box' },
        { id: 'unit-4', name: 'Meters', code: 'mtr' },
        { id: 'unit-5', name: 'Pairs', code: 'pairs' },
        { id: 'unit-6', name: 'Kilograms', code: 'kg' }
      ];
      for (const u of units) {
        await connection.query('INSERT INTO units (id, name, code) VALUES (?, ?, ?)', [u.id, u.name, u.code]);
      }
      console.log('✅ Seeded units.');
    }

    // 10. Seeding Products
    const [prodRows] = await connection.query('SELECT COUNT(*) as count FROM products');
    if (prodRows[0].count === 0) {
      console.log('🌱 Seeding initial products...');
      const initialProducts = [
        { id: 'prod-1', name: 'Dell Latitude 5420 Laptop', sku: 'EL-DELL-5420', category: 'Electronics', qty: 12.00, unit: 'pcs', price: 85000.00, minStock: 5.00, location: 'IT Rack A-1', supplierId: 'sup-1', description: 'Intel Core i5, 16GB RAM, 512GB SSD workstation.', purchasePrice: 75000.00, warrantyMonths: 12 },
        { id: 'prod-2', name: 'HP LaserJet Pro M404dn Printer', sku: 'EL-HP-M404', category: 'Electronics', qty: 3.00, unit: 'pcs', price: 32000.00, minStock: 4.00, location: 'IT Rack B-2', supplierId: 'sup-1', description: 'Monochrome laser printer with automatic duplex printing.', purchasePrice: 28000.00, warrantyMonths: 12 },
        { id: 'prod-3', name: 'Heavy Duty Drilling Machine', sku: 'HW-DEW-DWD112', category: 'Spare Parts', qty: 8.00, unit: 'pcs', price: 7500.00, minStock: 10.00, location: 'Tool Room Shelf 1', supplierId: 'sup-2', description: '3/8-inch VSR Drill with Keyless Chuck, 8.0 Amp.', purchasePrice: 6000.00, warrantyMonths: 12 },
        { id: 'prod-4', name: 'Industrial Safety Helmet - Yellow', sku: 'SF-HELM-YEL', category: 'Safety Gear', qty: 45.00, unit: 'pcs', price: 450.00, minStock: 15.00, location: 'Safety Cabinet 2', supplierId: 'sup-4', description: 'High-density polyethylene safety helmet with suspension harness.', purchasePrice: 350.00, warrantyMonths: 12 },
        { id: 'prod-5', name: 'A4 Printing Paper (80gsm)', sku: 'OF-PAPR-A4', category: 'Office Supplies', qty: 120.00, unit: 'reams', price: 480.00, minStock: 25.00, location: 'Stationery Locker C', supplierId: 'sup-3', description: 'High brightness premium office printer and photocopier paper.', purchasePrice: 380.00, warrantyMonths: 12 }
      ];

      for (const p of initialProducts) {
        const whMap = { 'wh-1': p.qty, 'wh-2': 0, 'wh-3': 0 };
        await connection.query(`
          INSERT INTO products (id, sku, name, category, qty, unit, price, minStock, location, supplierId, description, warehouseQtyMap, purchasePrice, warrantyMonths)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [p.id, p.sku, p.name, p.category, p.qty, p.unit, p.price, p.minStock, p.location, p.supplierId, p.description, JSON.stringify(whMap), p.purchasePrice, p.warrantyMonths]);
        
        // Seed initial stock movement as well
        await connection.query(`
          INSERT INTO stock_movements (id, productId, type, qty, referenceNo, warehouseId, description)
          VALUES (?, ?, 'in', ?, 'OPENING-STOCK', 'wh-1', 'Initial opening stock load')
        `, [`sm-${Date.now()}-${p.id}`, p.id, p.qty]);
      }
      console.log('✅ Seeded products and stock movements.');
    }

    // 11. Seeding services catalog
    const [srvRows] = await connection.query('SELECT COUNT(*) as count FROM services');
    if (srvRows[0].count === 0) {
      console.log('🌱 Seeding service catalogue...');
      let srvList = [
        { id: 'cat-srv-1', code: 'SRV-INST', name: 'Product Standard Installation', baseFee: 1500.00, description: 'Standard unboxing, mounting, software setup, and calibration for purchased devices.', category: 'Service Income', slaHours: 24, vatRate: 15.00 },
        { id: 'cat-srv-2', code: 'SRV-DIAG', name: 'Hardware Diagnostic Check', baseFee: 800.00, description: 'Full system checkup, error log review, and hardware diagnostic analysis.', category: 'Service Income', slaHours: 24, vatRate: 15.00 },
        { id: 'cat-srv-3', code: 'SRV-REPR', name: 'Standard Repair & Troubleshooting', baseFee: 2000.00, description: 'Fixing hardware issues, repairing components, and wiring corrections.', category: 'Service Income', slaHours: 24, vatRate: 15.00 },
        { id: 'cat-srv-4', code: 'SRV-AMC', name: 'Annual Maintenance Contract (Routine Visit)', baseFee: 3000.00, description: 'Routine hardware cleaning, software updates, and preventive checkup.', category: 'Service Income', slaHours: 24, vatRate: 15.00 }
      ];

      try {
        const srvSeedPath = path.resolve(__dirname, 'servicesSeed.json');
        const fileData = await fs.readFile(srvSeedPath, 'utf-8');
        srvList = JSON.parse(fileData);
        console.log(`[Database Init] Loaded ${srvList.length} services from servicesSeed.json for seeding.`);
      } catch (err) {
        console.log('[Database Init] No servicesSeed.json found, seeding with default 4 services.');
      }

      for (const s of srvList) {
        await connection.query(`
          INSERT INTO services (id, code, name, baseFee, description, category, slaHours, vatRate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [s.id, s.code, s.name, s.baseFee, s.description || '', s.category || 'Service Income', s.slaHours !== undefined ? s.slaHours : 24, s.vatRate !== undefined ? s.vatRate : 15.00]);
      }
      console.log('✅ Seeded services catalogue.');
    }

    // 12. Seeding task templates
    const [taskTplRows] = await connection.query('SELECT COUNT(*) as count FROM task_templates');
    if (taskTplRows[0].count === 0) {
      console.log('🌱 Seeding task templates & rules...');
      const tpls = [
        {
          id: 'tpl-install',
          title: 'Standard Product Installation & Setup',
          category: 'Installation',
          type: 'Installation',
          estimatedHours: 6,
          priority: 'medium',
          checklist: [
            { id: 'c1', title: 'Prepare equipment and carry to site', mandatory: true, photoRequired: false, signatureRequired: false },
            { id: 'c2', title: 'Assemble and securely mount device', mandatory: true, photoRequired: true, signatureRequired: false },
            { id: 'c3', title: 'Power test and initialization logs check', mandatory: true, photoRequired: false, signatureRequired: false },
            { id: 'c4', title: 'Obtain client sign-off sheet', mandatory: true, photoRequired: true, signatureRequired: true }
          ]
        },
        {
          id: 'tpl-calib',
          title: 'Precision Calibration & ISO Alignment',
          category: 'Calibration',
          type: 'Calibration',
          estimatedHours: 4,
          priority: 'high',
          checklist: [
            { id: 'c1', title: 'Inspect instrument for physical damage', mandatory: true },
            { id: 'c2', title: 'Perform zero-point baseline adjustment', mandatory: true },
            { id: 'c3', title: 'Test precision against standard meters', mandatory: true }
          ]
        }
      ];

      for (const t of tpls) {
        await connection.query('INSERT INTO task_templates (id, title, category, type, estimatedHours, priority, checklist) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.title, t.category, t.type, t.estimatedHours, t.priority, JSON.stringify(t.checklist)]);
      }

      await connection.query("INSERT INTO task_rules (id, name, triggerModule, `condition`, templateId, assigneeRole, active) VALUES ('rule-invoice-total', 'Auto-Install for Major Sales', 'sales', 'invoice.grandTotal > 100000', 'tpl-install', 'Field Engineer', 1)");
      console.log('✅ Seeded task templates and rules.');
    }

    // 13. Seeding Procurement Plans, Vendor Details & Reorder Rules
    const [planRows] = await connection.query('SELECT COUNT(*) as count FROM procurement_plans');
    if (planRows[0].count === 0) {
      console.log('🌱 Seeding procurement plans, vendor details, and reorder rules...');
      const defaultPlanItems = [
        { id: 'plan-1', planYear: '2026', department: 'IT', budgetHead: 'Hardware Assets', itemName: 'Developer Laptops', specification: 'Core i7, 16GB RAM, 512GB SSD', unit: 'Pcs', annualQty: 10, estimatedUnitCost: 120000.00, estimatedTotalCost: 1200000.00, requiredMonth: '2026-03', priority: 'High', convertedQty: 0, status: 'Approved' },
        { id: 'plan-2', planYear: '2026', department: 'IT', budgetHead: 'Software Licenses', itemName: 'Cloud Hosting Subscriptions', specification: 'AWS Enterprise Support', unit: 'Month', annualQty: 12, estimatedUnitCost: 80000.00, estimatedTotalCost: 960000.00, requiredMonth: '2026-01', priority: 'Medium', convertedQty: 0, status: 'Approved' },
        { id: 'plan-3', planYear: '2026', department: 'Operations', budgetHead: 'Warehouse Equipment', itemName: 'Electric Forklift', specification: '2-ton capacity, lithium battery', unit: 'Pcs', annualQty: 2, estimatedUnitCost: 450000.00, estimatedTotalCost: 900000.00, requiredMonth: '2026-04', priority: 'High', convertedQty: 0, status: 'Approved' }
      ];
      for (const p of defaultPlanItems) {
        await connection.query(`
          INSERT INTO procurement_plans (id, planYear, department, budgetHead, itemName, specification, unit, annualQty, estimatedUnitCost, estimatedTotalCost, requiredMonth, priority, convertedQty, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [p.id, p.planYear, p.department, p.budgetHead, p.itemName, p.specification, p.unit, p.annualQty, p.estimatedUnitCost, p.estimatedTotalCost, p.requiredMonth, p.priority, p.convertedQty, p.status]);
      }

      const defaultVendorDetails = {
        'sup-1': { code: 'VND-APX-01', bin: '001122334-0101', currency: 'BDT', paymentTerms: 'Net 30', moq: 5, leadTime: 4, categories: ['Electronics'], scores: { quality: 23, delivery: 22, price: 18, support: 9, compliance: 9, flexibility: 9 }, kyc: true, bankVerified: true, contractStatus: 'Active', contractExpiry: '2027-12-31' },
        'sup-2': { code: 'VND-BGL-02', bin: '002233445-0202', currency: 'BDT', paymentTerms: 'COD', moq: 10, leadTime: 7, categories: ['Spare Parts'], scores: { quality: 20, delivery: 20, price: 17, support: 8, compliance: 8, flexibility: 7 }, kyc: true, bankVerified: true, contractStatus: 'Active', contractExpiry: '2026-10-30' },
        'sup-3': { code: 'VND-NAT-03', bin: '003344556-0303', currency: 'BDT', paymentTerms: 'Net 15', moq: 25, leadTime: 6, categories: ['Office Supplies'], scores: { quality: 18, delivery: 18, price: 15, support: 7, compliance: 8, flexibility: 6 }, kyc: true, bankVerified: true, contractStatus: 'Active', contractExpiry: '2026-12-31' },
        'sup-4': { code: 'VND-SAF-04', bin: '004455667-0404', currency: 'BDT', paymentTerms: 'Net 45', moq: 50, leadTime: 12, categories: ['Safety Gear'], scores: { quality: 12, delivery: 12, price: 12, support: 5, compliance: 6, flexibility: 5 }, kyc: false, bankVerified: true, contractStatus: 'Pending Renewal', contractExpiry: '2026-06-30' }
      };
      for (const [supId, det] of Object.entries(defaultVendorDetails)) {
        await connection.query('INSERT INTO procurement_vendor_details (supplierId, details) VALUES (?, ?)', [supId, JSON.stringify(det)]);
      }

      const defaultReorderRules = {
        'prod-1': { reorderPoint: 15, minStock: 5, maxStock: 50, safetyStock: 8, leadTime: 5, avgMonthlyConsumption: 12, preferredSupplierId: 'sup-1' },
        'prod-2': { reorderPoint: 5, minStock: 2, maxStock: 15, safetyStock: 3, leadTime: 7, avgMonthlyConsumption: 4, preferredSupplierId: 'sup-1' },
        'prod-3': { reorderPoint: 12, minStock: 5, maxStock: 40, safetyStock: 6, leadTime: 6, avgMonthlyConsumption: 10, preferredSupplierId: 'sup-2' },
        'prod-4': { reorderPoint: 30, minStock: 15, maxStock: 200, safetyStock: 20, leadTime: 10, avgMonthlyConsumption: 60, preferredSupplierId: 'sup-4' },
        'prod-5': { reorderPoint: 50, minStock: 25, maxStock: 500, safetyStock: 30, leadTime: 12, avgMonthlyConsumption: 150, preferredSupplierId: 'sup-3' }
      };
      for (const [prodId, rule] of Object.entries(defaultReorderRules)) {
        await connection.query('INSERT INTO procurement_reorder_rules (productId, rule) VALUES (?, ?)', [prodId, JSON.stringify(rule)]);
      }
      console.log('✅ Seeded procurement plans, vendor details, and reorder rules.');
    }

    console.log('[Database Init] Database fully initialized and seeded successfully.');
  } catch (error) {
    console.error(`[Database Init] Migration/Seeding script failed: ${error.message}`);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}
