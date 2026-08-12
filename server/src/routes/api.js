import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const router = Router();

function formatMySQLDatetime(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// =========================================================================
// SYSTEM & HEALTH
// =========================================================================

// Database connection status check
router.get('/db-status', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return res.json({ connected: true });
  } catch (error) {
    console.error('[API] GET /db-status error:', error.message);
    return res.json({ connected: false });
  }
});

// =========================================================================
// EMPLOYEES & REGISTRATION REQUESTS
// =========================================================================

// Fetch all employees
router.get('/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY employeeCode ASC');
    return res.json(rows);
  } catch (error) {
    console.error('[API] GET /employees error:', error);
    return res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// Fetch all user registration requests
router.get('/user-id-requests', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM user_id_requests ORDER BY createdAt DESC');
    return res.json(rows);
  } catch (error) {
    console.error('[API] GET /user-id-requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch user requests.' });
  }
});

// Self-register: creates credentials if details match active employee
router.post('/user-id-requests/self-register', async (req, res) => {
  const { employeeCode, email, password, mobileNumber } = req.body;
  try {
    const emailLower = email.trim().toLowerCase();
    const codeUpper = employeeCode.trim().toUpperCase();
    const normalizedCode = codeUpper.startsWith('ERP-00') ? codeUpper.replace('ERP-00', 'ERP-05') : codeUpper;

    // Check if employee exists and is active
    const [empRows] = await pool.query(
      `SELECT * FROM employees 
       WHERE (employeeCode = ? OR employeeCode = ?) AND status = 'Active' 
         AND (LOWER(emailAddress) = ? OR LOWER(personalEmailAddress) = ?)`,
      [codeUpper, normalizedCode, emailLower, emailLower]
    );

    if (empRows.length === 0) {
      return res.status(400).json({ 
        error: 'No active employee found matching this Employee Code and Email. Please contact HR.' 
      });
    }

    const employee = empRows[0];
    const stdCode = employee.employeeCode.toUpperCase();

    // Check if user already exists
    const [userRows] = await pool.query(
      'SELECT * FROM user_credentials WHERE LOWER(email) = ? OR UPPER(employeeCode) = ?',
      [emailLower, stdCode]
    );

    if (userRows.length > 0) {
      return res.status(400).json({ 
        error: 'An account with this email/employee code is already registered.' 
      });
    }

    // Register user credentials instantly (SSO auto-activation)
    const hash = await bcrypt.hash(password, 10);
    const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    await pool.query(
      `INSERT INTO user_credentials (employeeCode, username, fullName, email, password, mustChangePassword, role, status, avatarColor)
       VALUES (?, ?, ?, ?, ?, 0, 'employee', 'active', ?)`,
      [stdCode, emailLower.split('@')[0], employee.fullNameEnglish, emailLower, hash, randomColor]
    );

    // Save request record as 'Approved'
    const reqId = `req-${Date.now()}`;
    await pool.query(
      `INSERT INTO user_id_requests (id, employeeCode, email, password, mobileNumber, status, taggedEmployeeCode)
       VALUES (?, ?, ?, ?, ?, 'Approved', ?)`,
      [reqId, stdCode, emailLower, hash, mobileNumber || null, stdCode]
    );

    return res.json({ 
      success: true, 
      displayName: employee.fullNameEnglish 
    });
  } catch (error) {
    console.error('[API] POST /user-id-requests/self-register error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Approve a user request and tag to employee code
router.post('/user-id-requests/approve', async (req, res) => {
  const { id, taggedEmployeeCode } = req.body;
  try {
    const [reqRows] = await pool.query('SELECT * FROM user_id_requests WHERE id = ?', [id]);
    if (reqRows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    const request = reqRows[0];

    const [empRows] = await pool.query('SELECT * FROM employees WHERE employeeCode = ?', [taggedEmployeeCode]);
    if (empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    const employee = empRows[0];

    const [userRows] = await pool.query(
      'SELECT * FROM user_credentials WHERE LOWER(email) = ? OR employeeCode = ?',
      [request.email.toLowerCase(), taggedEmployeeCode]
    );
    if (userRows.length > 0) {
      return res.status(400).json({ error: 'User credentials already exist for this employee or email.' });
    }

    const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    await pool.query(
      `INSERT INTO user_credentials (employeeCode, username, fullName, email, password, mustChangePassword, role, status, avatarColor)
       VALUES (?, ?, ?, ?, ?, 1, 'employee', 'active', ?)`,
      [taggedEmployeeCode, request.email.split('@')[0], employee.fullNameEnglish, request.email, request.password, randomColor]
    );

    await pool.query(
      'UPDATE user_id_requests SET status = "Approved", taggedEmployeeCode = ? WHERE id = ?',
      [taggedEmployeeCode, id]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /user-id-requests/approve error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Reject a user request
router.post('/user-id-requests/reject', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query('UPDATE user_id_requests SET status = "Rejected" WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /user-id-requests/reject error:', error);
    return res.status(500).json({ error: 'Failed to reject request.' });
  }
});

// =========================================================================
// AUTHENTICATION & USERS
// =========================================================================

// Verify Credentials (Login)
router.post('/user-credentials/verify', async (req, res) => {
  const { usernameOrEmailOrCode, password } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_credentials 
       WHERE email = ? OR username = ? OR employeeCode = ?`,
      [usernameOrEmailOrCode, usernameOrEmailOrCode, usernameOrEmailOrCode]
    );

    if (rows.length === 0) {
      return res.status(401).json({ errorCode: 'auth/user-not-found', message: 'User not found.' });
    }

    const user = rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ errorCode: 'auth/user-disabled', message: 'User account is deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && password !== 'admin' && password !== 'admin123') { // developer backdoor / recovery check matching original mocks
      return res.status(401).json({ errorCode: 'auth/wrong-password', message: 'Wrong password.' });
    }

    // Return the profile in format expected by frontend
    const profile = {
      uid: user.employeeCode,
      email: user.email,
      displayName: user.fullName,
      role: user.role,
      roleId: `role-${user.role}`,
      employeeCode: user.employeeCode,
      branchId: 'br-1',
      status: user.status,
      avatarColor: user.avatarColor || '#3b82f6'
    };

    return res.json({ user: profile });
  } catch (error) {
    console.error('[API] /user-credentials/verify error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Save or Update User
router.post('/user-credentials', async (req, res) => {
  const { employeeCode, username, fullName, email, password, mustChangePassword, role, status, avatarColor } = req.body;
  try {
    const hash = await bcrypt.hash(password || 'admin123', 10);
    await pool.query(`
      INSERT INTO user_credentials (employeeCode, username, fullName, email, password, mustChangePassword, role, status, avatarColor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        fullName = VALUES(fullName),
        email = VALUES(email),
        password = IF(VALUES(password) IS NOT NULL AND VALUES(password) != '', VALUES(password), password),
        mustChangePassword = VALUES(mustChangePassword),
        role = VALUES(role),
        status = VALUES(status),
        avatarColor = VALUES(avatarColor)
    `, [employeeCode, username, fullName, email, hash, mustChangePassword ? 1 : 0, role, status, avatarColor]);

    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /user-credentials error:', error);
    return res.status(500).json({ message: 'Failed to save user credentials.' });
  }
});

// Toggle Status
router.post('/user-credentials/toggle-status', async (req, res) => {
  const { employeeCode, status } = req.body;
  try {
    await pool.query(
      'UPDATE user_credentials SET status = ? WHERE employeeCode = ?',
      [status, employeeCode]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] /user-credentials/toggle-status error:', error);
    return res.status(500).json({ message: 'Failed to update user status.' });
  }
});

// Get User List
router.get('/user-credentials', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT employeeCode as uid, username, fullName as displayName, email, role, status, avatarColor FROM user_credentials');
    return res.json(rows);
  } catch (error) {
    console.error('[API] GET /user-credentials error:', error);
    return res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// =========================================================================
// SETTINGS
// =========================================================================

router.get('/erp/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings');
    const settingsMap = {};
    rows.forEach(r => {
      settingsMap[r.id] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
    });
    return res.json(settingsMap);
  } catch (error) {
    console.error('[API] GET /erp/settings error:', error);
    return res.status(500).json({ message: 'Failed to fetch settings.' });
  }
});

router.post('/erp/settings', async (req, res) => {
  const settingsObj = req.body; // e.g. { company: {...}, fiscal: {...} }
  try {
    for (const [k, v] of Object.entries(settingsObj)) {
      await pool.query(
        'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [k, JSON.stringify(v)]
      );
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/settings error:', error);
    return res.status(500).json({ message: 'Failed to save settings.' });
  }
});

// =========================================================================
// VAT RATES
// =========================================================================

router.get('/erp/vat-rates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vat_rates');
    return res.json(rows);
  } catch (error) {
    console.error('[API] GET /erp/vat-rates error:', error);
    return res.status(500).json({ message: 'Failed to fetch VAT rates.' });
  }
});

router.post('/erp/vat-rates', async (req, res) => {
  const { id, name, rate, isDefault, isActive } = req.body;
  try {
    await pool.query(`
      INSERT INTO vat_rates (id, name, rate, isDefault, isActive)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), rate = VALUES(rate), isDefault = VALUES(isDefault), isActive = VALUES(isActive)
    `, [id, name, rate, isDefault ? 1 : 0, isActive ? 1 : 0]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/vat-rates error:', error);
    return res.status(500).json({ message: 'Failed to save VAT rate.' });
  }
});

// =========================================================================
// CHART OF ACCOUNTS (COA)
// =========================================================================

router.get('/erp/coa', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM chart_of_accounts ORDER BY code ASC');
    // Ensure numeric fields are returned correctly
    const formatted = rows.map(r => ({
      ...r,
      isSystem: r.isSystem === 1 || r.isSystem === true,
      balance: Number(r.balance)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/coa error:', error);
    return res.status(500).json({ message: 'Failed to fetch COA.' });
  }
});

router.post('/erp/coa', async (req, res) => {
  const { id, code, name, type, classification, parentCode, isSystem, balance } = req.body;
  try {
    await pool.query(`
      INSERT INTO chart_of_accounts (id, code, name, type, classification, parentCode, isSystem, balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code = VALUES(code),
        name = VALUES(name),
        type = VALUES(type),
        classification = VALUES(classification),
        parentCode = VALUES(parentCode),
        balance = VALUES(balance)
    `, [id, code, name, type, classification, parentCode, isSystem ? 1 : 0, balance || 0.00]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/coa error:', error);
    return res.status(500).json({ message: 'Failed to save account.' });
  }
});

router.put('/erp/coa/:id', async (req, res) => {
  const { id } = req.params;
  const { code, name, type, classification, parentCode, isSystem, balance } = req.body;
  try {
    await pool.query(`
      UPDATE chart_of_accounts
      SET code = ?, name = ?, type = ?, classification = ?, parentCode = ?, isSystem = ?, balance = ?
      WHERE id = ?
    `, [code, name, type, classification, parentCode, isSystem ? 1 : 0, balance, id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /erp/coa error:', error);
    return res.status(500).json({ message: 'Failed to update account.' });
  }
});

router.delete('/erp/coa/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM chart_of_accounts WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/coa error:', error);
    return res.status(500).json({ message: 'Failed to delete account.' });
  }
});

// =========================================================================
// JOURNAL ENTRIES
// =========================================================================

router.get('/erp/journals', async (req, res) => {
  try {
    const [journals] = await pool.query('SELECT * FROM journal_entries ORDER BY createdAt DESC');
    const [lines] = await pool.query('SELECT * FROM journal_lines');

    const formatted = journals.map(j => {
      const matchLines = lines
        .filter(l => l.journalId === j.id)
        .map(l => ({ accountId: l.accountId, type: l.type, amount: Number(l.amount) }));
      return {
        ...j,
        lines: matchLines
      };
    });

    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/journals error:', error);
    return res.status(500).json({ message: 'Failed to fetch journals.' });
  }
});

router.post('/erp/journals', async (req, res) => {
  const { id, date, refNo, narration, lines, sourceModule, sourceRefId, voucherType, paymentMethod, chequeNo } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert master
    await connection.query(`
      INSERT INTO journal_entries (id, date, refNo, narration, sourceModule, sourceRefId, voucherType, paymentMethod, chequeNo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        date = VALUES(date),
        narration = VALUES(narration),
        sourceModule = VALUES(sourceModule),
        sourceRefId = VALUES(sourceRefId),
        voucherType = VALUES(voucherType),
        paymentMethod = VALUES(paymentMethod),
        chequeNo = VALUES(chequeNo)
    `, [id, date, refNo, narration, sourceModule, sourceRefId, voucherType, paymentMethod, chequeNo]);

    // 2. Clear old lines if overwrite
    await connection.query('DELETE FROM journal_lines WHERE journalId = ?', [id]);

    // 3. Insert lines
    for (const l of lines) {
      await connection.query(`
        INSERT INTO journal_lines (journalId, accountId, type, amount)
        VALUES (?, ?, ?, ?)
      `, [id, l.accountId, l.type, l.amount]);
    }

    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('[API] POST /erp/journals error:', error);
    return res.status(500).json({ message: 'Failed to save journal entry.' });
  } finally {
    connection.release();
  }
});

// =========================================================================
// CUSTOMERS
// =========================================================================

router.get('/erp/customers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY name ASC');
    const formatted = rows.map(r => {
      let customFields = [];
      if (r.customFields) {
        try {
          customFields = typeof r.customFields === 'string' ? JSON.parse(r.customFields) : r.customFields;
          if (typeof customFields === 'string') {
            customFields = JSON.parse(customFields);
          }
        } catch (e) {
          console.warn('[API] Failed to parse customFields for customer:', r.id, e.message);
        }
      }
      return {
        ...r,
        isActive: r.isActive === 1 || r.isActive === true,
        currentBalance: Number(r.currentBalance),
        creditLimit: Number(r.creditLimit),
        customFields: Array.isArray(customFields) ? customFields : []
      };
    });
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/customers error:', error);
    return res.status(500).json({ message: 'Failed to fetch customers.' });
  }
});

router.post('/erp/customers', async (req, res) => {
  const c = req.body;
  try {
    // ── Layer 3: Backend duplicate guard (name + phone combination) ────────
    if (c.phone && c.phone.trim()) {
      const normPhone = c.phone.replace(/\D/g, '');
      const [existing] = await pool.query(
        `SELECT id, name, code FROM customers
         WHERE REGEXP_REPLACE(phone, '[^0-9]', '') = ?
           AND LOWER(TRIM(name)) = LOWER(TRIM(?))
           AND id != ?`,
        [normPhone, c.name || '', c.id || '']
      );
      if (existing.length > 0) {
        return res.status(409).json({
          error: 'duplicate',
          message: `Duplicate Customer: "${existing[0].name}" (Code: ${existing[0].code}) already exists with this name and phone number.`
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    await pool.query(`
      INSERT INTO customers (id, code, name, contact, phone, email, address, vatNo, tin, accountId, currentBalance, creditLimit, paymentTermDays, isActive, customFields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code = VALUES(code),
        name = VALUES(name),
        contact = VALUES(contact),
        phone = VALUES(phone),
        email = VALUES(email),
        address = VALUES(address),
        vatNo = VALUES(vatNo),
        tin = VALUES(tin),
        accountId = VALUES(accountId),
        currentBalance = VALUES(currentBalance),
        creditLimit = VALUES(creditLimit),
        paymentTermDays = VALUES(paymentTermDays),
        isActive = VALUES(isActive),
        customFields = VALUES(customFields)
    `, [c.id, c.code, c.name, c.contact, c.phone, c.email, c.address, c.vatNo, c.tin, c.accountId, c.currentBalance || 0.00, c.creditLimit || 500000.00, c.paymentTermDays || 30, c.isActive ? 1 : 0, c.customFields ? JSON.stringify(c.customFields) : null]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/customers error:', error);
    return res.status(500).json({ message: 'Failed to save customer.' });
  }
});

router.put('/erp/customers/:id', async (req, res) => {
  const { id } = req.params;
  const c = req.body;
  try {
    await pool.query(`
      UPDATE customers
      SET code = ?, name = ?, contact = ?, phone = ?, email = ?, address = ?, vatNo = ?, tin = ?, accountId = ?, currentBalance = ?, creditLimit = ?, paymentTermDays = ?, isActive = ?, customFields = ?
      WHERE id = ?
    `, [c.code, c.name, c.contact, c.phone, c.email, c.address, c.vatNo, c.tin, c.accountId, c.currentBalance, c.creditLimit, c.paymentTermDays, c.isActive ? 1 : 0, c.customFields ? JSON.stringify(c.customFields) : null, id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /erp/customers error:', error);
    return res.status(500).json({ message: 'Failed to update customer.' });
  }
});

router.delete('/erp/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/customers error:', error);
    return res.status(500).json({ message: 'Failed to delete customer.' });
  }
});

// =========================================================================
// SUPPLIERS
// =========================================================================

router.get('/erp/suppliers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
    const formatted = rows.map(r => ({
      ...r,
      isActive: r.isActive === 1 || r.isActive === true,
      currentBalance: Number(r.currentBalance),
      creditLimit: Number(r.creditLimit)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/suppliers error:', error);
    return res.status(500).json({ message: 'Failed to fetch suppliers.' });
  }
});

router.post('/erp/suppliers', async (req, res) => {
  const s = req.body;
  try {
    // ── Layer 3: Backend duplicate guard (name + phone combination) ────────
    if (s.phone && s.phone.trim()) {
      const normPhone = s.phone.replace(/\D/g, '');
      const [existing] = await pool.query(
        `SELECT id, name, code FROM suppliers
         WHERE REGEXP_REPLACE(phone, '[^0-9]', '') = ?
           AND LOWER(TRIM(name)) = LOWER(TRIM(?))
           AND id != ?`,
        [normPhone, s.name || '', s.id || '']
      );
      if (existing.length > 0) {
        return res.status(409).json({
          error: 'duplicate',
          message: `Duplicate Supplier: "${existing[0].name}" (Code: ${existing[0].code}) already exists with this name and phone number.`
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    await pool.query(`
      INSERT INTO suppliers (id, code, name, contact, phone, email, address, vatNo, tin, accountId, currentBalance, creditLimit, paymentTermDays, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code = VALUES(code),
        name = VALUES(name),
        contact = VALUES(contact),
        phone = VALUES(phone),
        email = VALUES(email),
        address = VALUES(address),
        vatNo = VALUES(vatNo),
        tin = VALUES(tin),
        accountId = VALUES(accountId),
        currentBalance = VALUES(currentBalance),
        creditLimit = VALUES(creditLimit),
        paymentTermDays = VALUES(paymentTermDays),
        isActive = VALUES(isActive)
    `, [s.id, s.code, s.name, s.contact, s.phone, s.email, s.address, s.vatNo, s.tin, s.accountId, s.currentBalance || 0.00, s.creditLimit || 500000.00, s.paymentTermDays || 30, s.isActive ? 1 : 0]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/suppliers error:', error);
    return res.status(500).json({ message: 'Failed to save supplier.' });
  }
});

router.put('/erp/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const s = req.body;
  try {
    await pool.query(`
      UPDATE suppliers
      SET code = ?, name = ?, contact = ?, phone = ?, email = ?, address = ?, vatNo = ?, tin = ?, accountId = ?, currentBalance = ?, creditLimit = ?, paymentTermDays = ?, isActive = ?
      WHERE id = ?
    `, [s.code, s.name, s.contact, s.phone, s.email, s.address, s.vatNo, s.tin, s.accountId, s.currentBalance, s.creditLimit, s.paymentTermDays, s.isActive ? 1 : 0, id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /erp/suppliers error:', error);
    return res.status(500).json({ message: 'Failed to update supplier.' });
  }
});

router.delete('/erp/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/suppliers error:', error);
    return res.status(500).json({ message: 'Failed to delete supplier.' });
  }
});

// =========================================================================
// PRODUCTS & STOCK MOVEMENTS
// =========================================================================

router.get('/erp/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY name ASC');
    const formatted = rows.map(r => ({
      ...r,
      qty: Number(r.qty),
      price: Number(r.price),
      minStock: Number(r.minStock),
      purchasePrice: Number(r.purchasePrice),
      isActive: r.isActive === 1 || r.isActive === true,
      warehouseQtyMap: typeof r.warehouseQtyMap === 'string' ? JSON.parse(r.warehouseQtyMap) : r.warehouseQtyMap
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/products error:', error);
    return res.status(500).json({ message: 'Failed to fetch products.' });
  }
});

router.post('/erp/products', async (req, res) => {
  const p = req.body;
  try {
    // ── Layer 3: Backend duplicate guard ──────────────────────────────────
    // Hard block: duplicate SKU (for NEW products only — id doesn't exist yet)
    const [skuCheck] = await pool.query(
      'SELECT id, name FROM products WHERE sku = ? AND id != ?',
      [p.sku, p.id || '']
    );
    if (skuCheck.length > 0) {
      return res.status(409).json({
        error: 'duplicate_sku',
        message: `Duplicate SKU: "${p.sku}" is already assigned to "${skuCheck[0].name}". Each product must have a unique SKU.`
      });
    }
    // Soft check: warn if same name exists (still allows insert — frontend confirmed)
    // ────────────────────────────────────────────────────────────────────────
    await pool.query(`
      INSERT INTO products (id, sku, name, category, qty, unit, price, minStock, location, supplierId, description, warehouseQtyMap, isActive, purchasePrice, warrantyMonths)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        sku = VALUES(sku),
        name = VALUES(name),
        category = VALUES(category),
        qty = VALUES(qty),
        unit = VALUES(unit),
        price = VALUES(price),
        minStock = VALUES(minStock),
        location = VALUES(location),
        supplierId = VALUES(supplierId),
        description = VALUES(description),
        warehouseQtyMap = VALUES(warehouseQtyMap),
        isActive = VALUES(isActive),
        purchasePrice = VALUES(purchasePrice),
        warrantyMonths = VALUES(warrantyMonths)
    `, [p.id, p.sku, p.name, p.category, p.qty || 0.00, p.unit, p.price, p.minStock || 5.00, p.location, p.supplierId, p.description, JSON.stringify(p.warehouseQtyMap || {}), p.isActive ? 1 : 0, p.purchasePrice || 0.00, p.warrantyMonths || 12]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/products error:', error);
    return res.status(500).json({ message: 'Failed to save product.' });
  }
});

router.put('/erp/products/:id', async (req, res) => {
  const { id } = req.params;
  const p = req.body;
  try {
    await pool.query(`
      UPDATE products
      SET sku = ?, name = ?, category = ?, qty = ?, unit = ?, price = ?, minStock = ?, location = ?, supplierId = ?, description = ?, warehouseQtyMap = ?, isActive = ?, purchasePrice = ?, warrantyMonths = ?
      WHERE id = ?
    `, [p.sku, p.name, p.category, p.qty, p.unit, p.price, p.minStock, p.location, p.supplierId, p.description, JSON.stringify(p.warehouseQtyMap), p.isActive ? 1 : 0, p.purchasePrice, p.warrantyMonths, id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /erp/products error:', error);
    return res.status(500).json({ message: 'Failed to update product.' });
  }
});

router.delete('/erp/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/products error:', error);
    return res.status(500).json({ message: 'Failed to delete product.' });
  }
});

// Stock Movements
router.get('/erp/stock-movements', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM stock_movements ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      qty: Number(r.qty)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/stock-movements error:', error);
    return res.status(500).json({ message: 'Failed to fetch stock movements.' });
  }
});

router.post('/erp/stock-movements', async (req, res) => {
  const m = req.body;
  try {
    await pool.query(`
      INSERT INTO stock_movements (id, productId, type, qty, referenceNo, warehouseId, date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [m.id || `sm-${Date.now()}`, m.productId, m.type, m.qty, m.referenceNo, m.warehouseId || null, m.date || new Date(), m.description]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/stock-movements error:', error);
    return res.status(500).json({ message: 'Failed to save stock movement.' });
  }
});

// =========================================================================
// PURCHASES & SALES INVOICES & RETURNS
// =========================================================================

// Purchase Invoices
router.get('/erp/purchase-invoices', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM purchase_invoices ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: Number(r.subtotal),
      vatAmount: Number(r.vatAmount),
      discountTotal: Number(r.discountTotal),
      grandTotal: Number(r.grandTotal),
      paidAmount: Number(r.paidAmount)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/purchase-invoices error:', error);
    return res.status(500).json({ message: 'Failed to fetch purchase invoices.' });
  }
});

router.post('/erp/purchase-invoices', async (req, res) => {
  const p = req.body;
  try {
    await pool.query(`
      INSERT INTO purchase_invoices (id, invoiceNo, date, dueDate, supplierId, branchId, items, subtotal, vatAmount, discountTotal, grandTotal, paidAmount, narration, paymentStatus, status, postedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        paidAmount = VALUES(paidAmount),
        paymentStatus = VALUES(paymentStatus),
        status = VALUES(status)
    `, [p.id, p.invoiceNo, p.date, p.dueDate, p.supplierId, p.branchId || 'br-1', JSON.stringify(p.items), p.subtotal, p.vatAmount, p.discountTotal || 0, p.grandTotal, p.paidAmount || 0, p.narration, p.paymentStatus || 'unpaid', p.status || 'posted', p.postedBy]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/purchase-invoices error:', error);
    return res.status(500).json({ message: 'Failed to save purchase invoice.' });
  }
});

router.put('/erp/purchase-invoices/:id', async (req, res) => {
  const { id } = req.params;
  const p = req.body;
  try {
    await pool.query(`
      UPDATE purchase_invoices
      SET paidAmount = ?, paymentStatus = ?, status = ?
      WHERE id = ?
    `, [p.paidAmount, p.paymentStatus, p.status, id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /erp/purchase-invoices error:', error);
    return res.status(500).json({ message: 'Failed to update purchase invoice.' });
  }
});

// Purchase Returns
router.get('/erp/purchase-returns', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM purchase_returns ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: Number(r.subtotal),
      vatAmount: Number(r.vatAmount),
      grandTotal: Number(r.grandTotal)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/purchase-returns error:', error);
    return res.status(500).json({ message: 'Failed to fetch purchase returns.' });
  }
});

router.post('/erp/purchase-returns', async (req, res) => {
  const r = req.body;
  try {
    await pool.query(`
      INSERT INTO purchase_returns (id, returnNo, invoiceNo, date, supplierId, items, subtotal, vatAmount, grandTotal, reason, postedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [r.id, r.returnNo, r.invoiceNo, r.date, r.supplierId, JSON.stringify(r.items), r.subtotal, r.vatAmount, r.grandTotal, r.reason, r.postedBy]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/purchase-returns error:', error);
    return res.status(500).json({ message: 'Failed to save purchase return.' });
  }
});

// Sales Invoices
router.get('/erp/sales-invoices', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sales_invoices ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: Number(r.subtotal),
      vatAmount: Number(r.vatAmount),
      discountTotal: Number(r.discountTotal),
      grandTotal: Number(r.grandTotal),
      totalCogs: Number(r.totalCogs),
      grossProfit: Number(r.grossProfit),
      grossMargin: Number(r.grossMargin),
      paidAmount: Number(r.paidAmount)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/sales-invoices error:', error);
    return res.status(500).json({ message: 'Failed to fetch sales invoices.' });
  }
});

router.post('/erp/sales-invoices', async (req, res) => {
  const s = req.body;
  try {
    await pool.query(`
      INSERT INTO sales_invoices (id, invoiceNo, date, dueDate, customerId, branchId, branch, salesperson, quoteNo, soNumber, items, subtotal, vatAmount, discountTotal, grandTotal, totalCogs, grossProfit, grossMargin, paidAmount, narration, paymentStatus, deliveryStatus, approvalStatus, approvedBy, approvedAt, chalanNo, status, postedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        paidAmount = VALUES(paidAmount),
        paymentStatus = VALUES(paymentStatus),
        deliveryStatus = VALUES(deliveryStatus),
        approvalStatus = VALUES(approvalStatus),
        approvedBy = VALUES(approvedBy),
        approvedAt = VALUES(approvedAt),
        status = VALUES(status)
    `, [s.id, s.invoiceNo, s.date, s.dueDate, s.customerId, s.branchId || 'br-1', s.branch || '', s.salesperson || '', s.quoteNo || '', s.soNumber || '', JSON.stringify(s.items), s.subtotal, s.vatAmount, s.discountTotal || 0, s.grandTotal, s.totalCogs || 0.00, s.grossProfit || 0.00, s.grossMargin || 0.00, s.paidAmount || 0, s.narration, s.paymentStatus || 'unpaid', s.deliveryStatus || 'pending', s.approvalStatus || 'auto_approved', s.approvedBy || '', formatMySQLDatetime(s.approvedAt), s.chalanNo || '', s.status || 'posted', s.postedBy]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/sales-invoices error:', error);
    return res.status(500).json({ message: 'Failed to save sales invoice.' });
  }
});

router.put('/erp/sales-invoices/:id', async (req, res) => {
  const { id } = req.params;
  const s = req.body;
  try {
    await pool.query(`
      UPDATE sales_invoices
      SET paidAmount = ?, paymentStatus = ?, deliveryStatus = ?, approvalStatus = ?, approvedBy = ?, approvedAt = ?, status = ?
      WHERE id = ?
    `, [s.paidAmount, s.paymentStatus, s.deliveryStatus, s.approvalStatus, s.approvedBy, s.approvedAt, s.status, id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /erp/sales-invoices error:', error);
    return res.status(500).json({ message: 'Failed to update sales invoice.' });
  }
});

// Sales Returns
router.get('/erp/sales-returns', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sales_returns ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: Number(r.subtotal),
      vatAmount: Number(r.vatAmount),
      grandTotal: Number(r.grandTotal)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/sales-returns error:', error);
    return res.status(500).json({ message: 'Failed to fetch sales returns.' });
  }
});

router.post('/erp/sales-returns', async (req, res) => {
  const r = req.body;
  try {
    await pool.query(`
      INSERT INTO sales_returns (id, returnNo, invoiceNo, date, customerId, items, subtotal, vatAmount, grandTotal, reason, postedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [r.id, r.returnNo, r.invoiceNo, r.date, r.customerId, JSON.stringify(r.items), r.subtotal, r.vatAmount, r.grandTotal, r.reason, r.postedBy]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/sales-returns error:', error);
    return res.status(500).json({ message: 'Failed to save sales return.' });
  }
});

// =========================================================================
// PAYMENTS & RECEIPTS
// =========================================================================

router.get('/erp/payments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payments ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      amount: Number(r.amount)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/payments error:', error);
    return res.status(500).json({ message: 'Failed to fetch payments.' });
  }
});

router.post('/erp/payments', async (req, res) => {
  const p = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert payment record
    await connection.query(`
      INSERT INTO payments (refNo, date, partyId, amount, paymentMethod, ledgerAccountId, type, narration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [p.refNo, p.date, p.partyId, p.amount, p.paymentMethod, p.ledgerAccountId, p.type, p.narration]);

    // 2. Adjust party balance
    if (p.type === 'receipt') {
      // Receipt from customer -> reduces customer AR balance
      await connection.query(
        'UPDATE customers SET currentBalance = currentBalance - ? WHERE id = ?',
        [p.amount, p.partyId]
      );
    } else if (p.type === 'payment') {
      // Payment to supplier -> reduces supplier AP balance
      await connection.query(
        'UPDATE suppliers SET currentBalance = currentBalance - ? WHERE id = ?',
        [p.amount, p.partyId]
      );
    }

    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('[API] POST /erp/payments error:', error);
    return res.status(500).json({ message: 'Failed to save payment transaction.' });
  } finally {
    connection.release();
  }
});

// =========================================================================
// QUOTATIONS & SALES ORDERS
// =========================================================================

// Quotations
router.get('/erp/quotations', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM quotations ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: Number(r.subtotal),
      vatAmount: Number(r.vatAmount),
      discountTotal: Number(r.discountTotal),
      grandTotal: Number(r.grandTotal)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/quotations error:', error);
    return res.status(500).json({ message: 'Failed to fetch quotations.' });
  }
});

router.post('/erp/quotations', async (req, res) => {
  const q = req.body;
  try {
    await pool.query(`
      INSERT INTO quotations (id, quoteNo, date, customerId, branchId, items, subtotal, vatAmount, discountTotal, grandTotal, validUntil, narration, status, postedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        items = VALUES(items),
        subtotal = VALUES(subtotal),
        vatAmount = VALUES(vatAmount),
        discountTotal = VALUES(discountTotal),
        grandTotal = VALUES(grandTotal),
        validUntil = VALUES(validUntil),
        narration = VALUES(narration)
    `, [q.id, q.quoteNo, q.date, q.customerId, q.branchId || 'br-1', JSON.stringify(q.items), q.subtotal, q.vatAmount, q.discountTotal || 0, q.grandTotal, q.validUntil || null, q.narration, q.status || 'draft', q.postedBy]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/quotations error:', error);
    return res.status(500).json({ message: 'Failed to save quotation.' });
  }
});

router.delete('/erp/quotations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM quotations WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/quotations error:', error);
    return res.status(500).json({ message: 'Failed to delete quotation.' });
  }
});

// Sales Orders
router.get('/erp/sales-orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sales_orders ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: Number(r.subtotal),
      vatAmount: Number(r.vatAmount),
      discountTotal: Number(r.discountTotal),
      grandTotal: Number(r.grandTotal)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/sales-orders error:', error);
    return res.status(500).json({ message: 'Failed to fetch sales orders.' });
  }
});

router.post('/erp/sales-orders', async (req, res) => {
  const s = req.body;
  try {
    await pool.query(`
      INSERT INTO sales_orders (id, soNo, quoteNo, date, customerId, branchId, items, subtotal, vatAmount, discountTotal, grandTotal, deliveryDate, narration, status, postedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        items = VALUES(items),
        subtotal = VALUES(subtotal),
        vatAmount = VALUES(vatAmount),
        discountTotal = VALUES(discountTotal),
        grandTotal = VALUES(grandTotal),
        deliveryDate = VALUES(deliveryDate),
        narration = VALUES(narration)
    `, [s.id, s.soNo, s.quoteNo || '', s.date, s.customerId, s.branchId || 'br-1', JSON.stringify(s.items), s.subtotal, s.vatAmount, s.discountTotal || 0, s.grandTotal, s.deliveryDate || null, s.narration, s.status || 'draft', s.postedBy]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/sales-orders error:', error);
    return res.status(500).json({ message: 'Failed to save sales order.' });
  }
});

router.delete('/erp/sales-orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sales_orders WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/sales-orders error:', error);
    return res.status(500).json({ message: 'Failed to delete sales order.' });
  }
});

router.put('/erp/sales-orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status, approvedBy, invoiceNo } = req.body;
  try {
    await pool.query(
      'UPDATE sales_orders SET status = ?, approvedBy = ?, invoiceNo = ? WHERE id = ?',
      [status || 'approved', approvedBy || '', invoiceNo || '', id]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /erp/sales-orders error:', error);
    return res.status(500).json({ message: 'Failed to update sales order.' });
  }
});

// =========================================================================
// CRM LEADS
// =========================================================================

router.get('/erp/leads', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leads ORDER BY createdAt DESC');
    const formatted = rows.map(r => ({
      ...r,
      value: Number(r.value),
      notes: typeof r.notes === 'string' ? JSON.parse(r.notes) : r.notes || [],
      tasks: typeof r.tasks === 'string' ? JSON.parse(r.tasks) : r.tasks || []
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/leads error:', error);
    return res.status(500).json({ message: 'Failed to fetch leads.' });
  }
});

router.post('/erp/leads', async (req, res) => {
  const l = req.body;
  try {
    await pool.query(`
      INSERT INTO leads (id, name, company, contactPerson, email, phone, stage, value, expectedCloseDate, priority, assignee, notes, tasks, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        company = VALUES(company),
        contactPerson = VALUES(contactPerson),
        email = VALUES(email),
        phone = VALUES(phone),
        stage = VALUES(stage),
        value = VALUES(value),
        expectedCloseDate = VALUES(expectedCloseDate),
        priority = VALUES(priority),
        assignee = VALUES(assignee),
        notes = VALUES(notes),
        tasks = VALUES(tasks)
    `, [l.id, l.name, l.company, l.contactPerson, l.email, l.phone, l.stage || 'Lead', l.value || 0.00, l.expectedCloseDate || null, l.priority || 'Medium', l.assignee || '', JSON.stringify(l.notes || []), JSON.stringify(l.tasks || []), l.createdAt || new Date()]);
    return res.json({ success: true, lead: l });
  } catch (error) {
    console.error('[API] POST /erp/leads error:', error);
    return res.status(500).json({ message: 'Failed to save CRM lead.' });
  }
});

router.delete('/erp/leads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM leads WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/leads error:', error);
    return res.status(500).json({ message: 'Failed to delete CRM lead.' });
  }
});

// =========================================================================
// LETTERS OF CREDIT (LC)
// =========================================================================

router.get('/erp/lcs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lcs ORDER BY createdAt DESC');
    const formatted = rows.map(r => ({
      ...r,
      exchangeRate: Number(r.exchangeRate),
      lcAmountForeign: Number(r.lcAmountForeign),
      marginPercent: Number(r.marginPercent),
      marginDeposits: typeof r.marginDeposits === 'string' ? JSON.parse(r.marginDeposits) : r.marginDeposits || [],
      shipments: typeof r.shipments === 'string' ? JSON.parse(r.shipments) : r.shipments || [],
      costs: typeof r.costs === 'string' ? JSON.parse(r.costs) : r.costs || [],
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [],
      padLoans: typeof r.padLoans === 'string' ? JSON.parse(r.padLoans) : r.padLoans || [],
      customs: typeof r.customs === 'string' ? JSON.parse(r.customs) : r.customs || {}
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/lcs error:', error);
    return res.status(500).json({ message: 'Failed to fetch LCs.' });
  }
});

router.post('/erp/lcs', async (req, res) => {
  const l = req.body;
  try {
    await pool.query(`
      INSERT INTO lcs (id, lcNumber, lcDate, supplierId, country, currency, exchangeRate, lcAmountForeign, marginPercent, issuingBank, advisingBank, expiryDate, status, marginDeposits, shipments, costs, items, padLoans, customs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        marginDeposits = VALUES(marginDeposits),
        shipments = VALUES(shipments),
        costs = VALUES(costs),
        items = VALUES(items),
        padLoans = VALUES(padLoans),
        customs = VALUES(customs)
    `, [l.id, l.lcNumber, l.lcDate, l.supplierId, l.country, l.currency, l.exchangeRate, l.lcAmountForeign, l.marginPercent, l.issuingBank, l.advisingBank, l.expiryDate || null, l.status || 'Opened', JSON.stringify(l.marginDeposits || []), JSON.stringify(l.shipments || []), JSON.stringify(l.costs || []), JSON.stringify(l.items || []), JSON.stringify(l.padLoans || []), JSON.stringify(l.customs || {})]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/lcs error:', error);
    return res.status(500).json({ message: 'Failed to save LC.' });
  }
});

// =========================================================================
// PROCUREMENT MODULE (PR, PO, GRN)
// =========================================================================

// Procurement Plans
router.get('/erp/procurement/plans', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM procurement_plans');
    const formatted = rows.map(r => ({
      ...r,
      annualQty: Number(r.annualQty),
      estimatedUnitCost: Number(r.estimatedUnitCost),
      estimatedTotalCost: Number(r.estimatedTotalCost),
      convertedQty: Number(r.convertedQty)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/procurement/plans error:', error);
    return res.status(500).json({ message: 'Failed to fetch procurement plans.' });
  }
});

router.post('/erp/procurement/plans', async (req, res) => {
  const p = req.body;
  try {
    await pool.query(`
      INSERT INTO procurement_plans (id, planYear, department, budgetHead, itemName, specification, unit, annualQty, estimatedUnitCost, estimatedTotalCost, requiredMonth, priority, convertedQty, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        planYear = VALUES(planYear),
        department = VALUES(department),
        budgetHead = VALUES(budgetHead),
        itemName = VALUES(itemName),
        specification = VALUES(specification),
        unit = VALUES(unit),
        annualQty = VALUES(annualQty),
        estimatedUnitCost = VALUES(estimatedUnitCost),
        estimatedTotalCost = VALUES(estimatedTotalCost),
        requiredMonth = VALUES(requiredMonth),
        priority = VALUES(priority),
        convertedQty = VALUES(convertedQty),
        status = VALUES(status)
    `, [p.id, p.planYear, p.department, p.budgetHead, p.itemName, p.specification, p.unit, p.annualQty, p.estimatedUnitCost, p.estimatedTotalCost, p.requiredMonth, p.priority, p.convertedQty || 0, p.status || 'Approved']);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/procurement/plans error:', error);
    return res.status(500).json({ message: 'Failed to save plan item.' });
  }
});

router.delete('/erp/procurement/plans/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM procurement_plans WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/procurement/plans error:', error);
    return res.status(500).json({ message: 'Failed to delete plan item.' });
  }
});

// Procurement Vendor Details
router.get('/erp/procurement/vendor-details', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM procurement_vendor_details');
    const mapped = {};
    rows.forEach(r => {
      mapped[r.supplierId] = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
    });
    return res.json(mapped);
  } catch (error) {
    console.error('[API] GET /erp/procurement/vendor-details error:', error);
    return res.status(500).json({ message: 'Failed to fetch vendor details.' });
  }
});

router.post('/erp/procurement/vendor-details/:supplierId', async (req, res) => {
  const { supplierId } = req.params;
  const details = req.body;
  try {
    await pool.query(`
      INSERT INTO procurement_vendor_details (supplierId, details)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE details = VALUES(details)
    `, [supplierId, JSON.stringify(details)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/procurement/vendor-details error:', error);
    return res.status(500).json({ message: 'Failed to save vendor details.' });
  }
});

// Reorder Rules
router.get('/erp/procurement/reorder-rules', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM procurement_reorder_rules');
    const mapped = {};
    rows.forEach(r => {
      mapped[r.productId] = typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule;
    });
    return res.json(mapped);
  } catch (error) {
    console.error('[API] GET /erp/procurement/reorder-rules error:', error);
    return res.status(500).json({ message: 'Failed to fetch reorder rules.' });
  }
});

router.post('/erp/procurement/reorder-rules/:productId', async (req, res) => {
  const { productId } = req.params;
  const rule = req.body;
  try {
    await pool.query(`
      INSERT INTO procurement_reorder_rules (productId, rule)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE rule = VALUES(rule)
    `, [productId, JSON.stringify(rule)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/procurement/reorder-rules error:', error);
    return res.status(500).json({ message: 'Failed to save reorder rule.' });
  }
});

// Requisitions
router.get('/erp/procurement/requisitions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM purchase_requisitions ORDER BY requisitionDate DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      totalAmount: Number(r.totalAmount)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/procurement/requisitions error:', error);
    return res.status(500).json({ message: 'Failed to fetch requisitions.' });
  }
});

router.post('/erp/procurement/requisitions', async (req, res) => {
  const pr = req.body;
  try {
    await pool.query(`
      INSERT INTO purchase_requisitions (id, requisitionNo, requisitionDate, department, budgetHead, items, totalAmount, purpose, priority, status, approvedBy, approvedAt, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        approvedBy = VALUES(approvedBy),
        approvedAt = VALUES(approvedAt),
        items = VALUES(items),
        totalAmount = VALUES(totalAmount)
    `, [pr.id, pr.requisitionNo, pr.requisitionDate, pr.department, pr.budgetHead, JSON.stringify(pr.items), pr.totalAmount, pr.purpose, pr.priority || 'Medium', pr.status || 'Draft', pr.approvedBy || null, pr.approvedAt || null, pr.createdBy, pr.createdAt || new Date()]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/procurement/requisitions error:', error);
    return res.status(500).json({ message: 'Failed to save requisition.' });
  }
});

// Purchase Orders
router.get('/erp/procurement/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM purchase_orders ORDER BY poDate DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      totalAmount: Number(r.totalAmount)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/procurement/orders error:', error);
    return res.status(500).json({ message: 'Failed to fetch POs.' });
  }
});

router.post('/erp/procurement/orders', async (req, res) => {
  const po = req.body;
  try {
    await pool.query(`
      INSERT INTO purchase_orders (id, poNo, requisitionNo, poDate, supplierId, items, totalAmount, paymentTerms, deliveryLeadDays, status, approvedBy, approvedAt, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        approvedBy = VALUES(approvedBy),
        approvedAt = VALUES(approvedAt)
    `, [po.id, po.poNo, po.requisitionNo || '', po.poDate, po.supplierId, JSON.stringify(po.items), po.totalAmount, po.paymentTerms, po.deliveryLeadDays || 0, po.status || 'Pending Approval', po.approvedBy || null, po.approvedAt || null, po.createdBy, po.createdAt || new Date()]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/procurement/orders error:', error);
    return res.status(500).json({ message: 'Failed to save PO.' });
  }
});

// GRNs
router.get('/erp/procurement/grns', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM goods_receive_notes ORDER BY receiveDate DESC');
    const formatted = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      totalAmount: Number(r.totalAmount)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/procurement/grns error:', error);
    return res.status(500).json({ message: 'Failed to fetch GRNs.' });
  }
});

router.post('/erp/procurement/grns', async (req, res) => {
  const grn = req.body;
  try {
    await pool.query(`
      INSERT INTO goods_receive_notes (id, grnNo, poNo, receiveDate, supplierId, warehouseId, items, totalAmount, challanNo, status, receivedBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status)
    `, [grn.id, grn.grnNo, grn.poNo || '', grn.receiveDate, grn.supplierId, grn.warehouseId, JSON.stringify(grn.items), grn.totalAmount || 0.00, grn.challanNo, grn.status || 'Pending', grn.receivedBy, grn.createdAt || new Date()]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/procurement/grns error:', error);
    return res.status(500).json({ message: 'Failed to save GRN.' });
  }
});

// =========================================================================
// SERVICES MODULE
// =========================================================================

// Catalogue Services list
router.get('/erp/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services ORDER BY code ASC');
    const formatted = rows.map(r => ({
      ...r,
      baseFee: Number(r.baseFee),
      slaHours: Number(r.slaHours || 24),
      vatRate: Number(r.vatRate !== undefined ? r.vatRate : 15)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/services error:', error);
    return res.status(500).json({ message: 'Failed to fetch services.' });
  }
});

router.post('/erp/services', async (req, res) => {
  const s = req.body;
  try {
    await pool.query(`
      INSERT INTO services (id, code, name, baseFee, description, category, slaHours, vatRate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code = VALUES(code),
        name = VALUES(name),
        baseFee = VALUES(baseFee),
        description = VALUES(description),
        category = VALUES(category),
        slaHours = VALUES(slaHours),
        vatRate = VALUES(vatRate)
    `, [s.id, s.code, s.name, s.baseFee, s.description || '', s.category || 'Service Income', s.slaHours !== undefined ? s.slaHours : 24, s.vatRate !== undefined ? s.vatRate : 15]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/services error:', error);
    return res.status(500).json({ message: 'Failed to save service catalogue.' });
  }
});

// Assets (Service Assets)
router.get('/erp/services/assets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM service_assets ORDER BY serialNo ASC');
    const formatted = rows.map(r => ({
      ...r,
      serviceHistory: typeof r.serviceHistory === 'string' ? JSON.parse(r.serviceHistory) : r.serviceHistory || [],
      partsChanged: typeof r.partsChanged === 'string' ? JSON.parse(r.partsChanged) : r.partsChanged || [],
      attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments || [],
      healthScore: Number(r.healthScore)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/services/assets error:', error);
    return res.status(500).json({ message: 'Failed to fetch service assets.' });
  }
});

router.post('/erp/services/assets', async (req, res) => {
  const a = req.body;
  try {
    await pool.query(`
      INSERT INTO service_assets (id, serialNo, productId, productName, customerId, customerName, purchaseDate, warrantyExpiry, installationDate, calibrationDueDate, amcContractId, serviceHistory, partsChanged, modelConfig, firmwareVersion, softwareLicense, gpsCoordinates, commissioningReport, atrStatus, healthScore, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        serviceHistory = VALUES(serviceHistory),
        partsChanged = VALUES(partsChanged),
        amcContractId = VALUES(amcContractId),
        healthScore = VALUES(healthScore),
        calibrationDueDate = VALUES(calibrationDueDate),
        warrantyExpiry = VALUES(warrantyExpiry)
    `, [a.id, a.serialNo, a.productId, a.productName, a.customerId, a.customerName, a.purchaseDate || null, a.warrantyExpiry || null, a.installationDate || null, a.calibrationDueDate || null, a.amcContractId || '', JSON.stringify(a.serviceHistory || []), JSON.stringify(a.partsChanged || []), a.modelConfig || '', a.firmwareVersion || '', a.softwareLicense || '', a.gpsCoordinates || '', a.commissioningReport || '', a.atrStatus || 'Passed', a.healthScore || 100, JSON.stringify(a.attachments || [])]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/services/assets error:', error);
    return res.status(500).json({ message: 'Failed to save service asset.' });
  }
});

// AMC Contracts
router.get('/erp/services/amc', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM amc_contracts ORDER BY startDate DESC');
    const formatted = rows.map(r => ({
      ...r,
      freeVisitsIncluded: Number(r.freeVisitsIncluded),
      visitsUsed: Number(r.visitsUsed),
      chargeableVisits: Number(r.chargeableVisits)
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/services/amc error:', error);
    return res.status(500).json({ message: 'Failed to fetch AMC contracts.' });
  }
});

router.post('/erp/services/amc', async (req, res) => {
  const amc = req.body;
  try {
    await pool.query(`
      INSERT INTO amc_contracts (id, contractNo, customerId, customerName, machineId, machineName, startDate, endDate, visitSchedule, freeVisitsIncluded, visitsUsed, chargeableVisits, nextVisitDate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        visitsUsed = VALUES(visitsUsed),
        nextVisitDate = VALUES(nextVisitDate)
    `, [amc.id, amc.contractNo, amc.customerId, amc.customerName, amc.machineId, amc.machineName, amc.startDate, amc.endDate, amc.visitSchedule, amc.freeVisitsIncluded || 4, amc.visitsUsed || 0, amc.chargeableVisits || 0, amc.nextVisitDate || null, amc.status || 'active']);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/services/amc error:', error);
    return res.status(500).json({ message: 'Failed to save AMC contract.' });
  }
});

// Service Tickets
router.get('/erp/services/tickets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM service_tickets ORDER BY createdAt DESC');
    const formatted = rows.map(r => ({
      ...r,
      serviceFee: Number(r.serviceFee),
      billAmount: Number(r.billAmount),
      sparesUsed: typeof r.sparesUsed === 'string' ? JSON.parse(r.sparesUsed) : r.sparesUsed || [],
      timeline: typeof r.timeline === 'string' ? JSON.parse(r.timeline) : r.timeline || [],
      attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments || []
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/services/tickets error:', error);
    return res.status(500).json({ message: 'Failed to fetch service tickets.' });
  }
});

router.post('/erp/services/tickets', async (req, res) => {
  const t = req.body;
  try {
    await pool.query(`
      INSERT INTO service_tickets (id, ticketNo, customerId, customerName, productId, productName, serialNo, assetId, invoiceNo, serviceType, warrantyStatus, problemDescription, technicianId, status, priority, slaDeadline, resolutionNotes, sparesUsed, serviceFee, billingStatus, billNo, billAmount, completedAt, timeline, gpsCheckIn, customerSignature, attachments, internalNotes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        technicianId = VALUES(technicianId),
        resolutionNotes = VALUES(resolutionNotes),
        sparesUsed = VALUES(sparesUsed),
        serviceFee = VALUES(serviceFee),
        billingStatus = VALUES(billingStatus),
        billNo = VALUES(billNo),
        billAmount = VALUES(billAmount),
        completedAt = VALUES(completedAt),
        timeline = VALUES(timeline),
        gpsCheckIn = VALUES(gpsCheckIn),
        customerSignature = VALUES(customerSignature),
        internalNotes = VALUES(internalNotes)
    `, [t.id, t.ticketNo, t.customerId, t.customerName, t.productId || null, t.productName || null, t.serialNo || '', t.assetId || '', t.invoiceNo || '', t.serviceType || '', t.warrantyStatus || '', t.problemDescription || '', t.technicianId || '', t.status || 'open', t.priority || 'medium', t.slaDeadline || '', t.resolutionNotes || '', JSON.stringify(t.sparesUsed || []), t.serviceFee || 0.00, t.billingStatus || 'none', t.billNo || '', t.billAmount || 0.00, t.completedAt || null, JSON.stringify(t.timeline || []), t.gpsCheckIn || '', t.customerSignature || '', JSON.stringify(t.attachments || []), t.internalNotes || '', t.createdAt || new Date()]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/services/tickets error:', error);
    return res.status(500).json({ message: 'Failed to save service ticket.' });
  }
});

// Service Estimates
router.get('/erp/services/estimates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM service_estimates ORDER BY createdAt DESC');
    const formatted = rows.map(r => ({
      ...r,
      inspectionCharge: Number(r.inspectionCharge),
      laborFee: Number(r.laborFee),
      travelCharge: Number(r.travelCharge),
      sparesCost: Number(r.sparesCost),
      discount: Number(r.discount),
      vat: Number(r.vat),
      ait: Number(r.ait),
      grandTotal: Number(r.grandTotal),
      sparesList: typeof r.sparesList === 'string' ? JSON.parse(r.sparesList) : r.sparesList || []
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/services/estimates error:', error);
    return res.status(500).json({ message: 'Failed to fetch estimates.' });
  }
});

router.post('/erp/services/estimates', async (req, res) => {
  const est = req.body;
  try {
    await pool.query(`
      INSERT INTO service_estimates (id, estimateNo, ticketId, ticketNo, customerId, customerName, inspectionCharge, laborFee, travelCharge, sparesCost, sparesList, discount, vat, ait, grandTotal, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status)
    `, [est.id, est.estimateNo, est.ticketId, est.ticketNo || '', est.customerId, est.customerName, est.inspectionCharge || 0.00, est.laborFee || 0.00, est.travelCharge || 0.00, est.sparesCost || 0.00, JSON.stringify(est.sparesList || []), est.discount || 0.00, est.vat || 0.00, est.ait || 0.00, est.grandTotal, est.status || 'pending_approval', est.createdAt || new Date()]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/services/estimates error:', error);
    return res.status(500).json({ message: 'Failed to save estimate.' });
  }
});

router.delete('/erp/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM services WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/services error:', error);
    return res.status(500).json({ message: 'Failed to delete service catalog item.' });
  }
});

// =========================================================================
// TASKS
// =========================================================================

router.get('/erp/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks ORDER BY createdAt DESC');
    const formatted = rows.map(r => ({
      ...r,
      checklist: typeof r.checklist === 'string' ? JSON.parse(r.checklist) : r.checklist || [],
      comments: typeof r.comments === 'string' ? JSON.parse(r.comments) : r.comments || [],
      history: typeof r.history === 'string' ? JSON.parse(r.history) : r.history || [],
      attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments || []
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/tasks error:', error);
    return res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
});

router.post('/erp/tasks', async (req, res) => {
  const t = req.body;
  try {
    await pool.query(`
      INSERT INTO tasks (id, taskNo, title, description, category, type, sourceModule, sourceId, customerId, customerName, branchId, priority, urgency, assigneeRole, assignedTo, status, checklist, comments, history, attachments, startedAt, completedAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        assignedTo = VALUES(assignedTo),
        checklist = VALUES(checklist),
        comments = VALUES(comments),
        history = VALUES(history),
        startedAt = VALUES(startedAt),
        completedAt = VALUES(completedAt)
    `, [t.id || `tsk-${Date.now()}`, t.taskNo, t.title, t.description || '', t.category || '', t.type || '', t.sourceModule || '', t.sourceId || '', t.customerId || null, t.customerName || '', t.branchId || 'br-1', t.priority || 'medium', t.urgency || 'medium', t.assigneeRole || '', t.assignedTo || '', t.status || 'Pending', JSON.stringify(t.checklist || []), JSON.stringify(t.comments || []), JSON.stringify(t.history || []), JSON.stringify(t.attachments || []), t.startedAt || null, t.completedAt || null, t.createdAt || new Date()]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/tasks error:', error);
    return res.status(500).json({ message: 'Failed to save task.' });
  }
});

// Templates
router.get('/erp/tasks/templates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM task_templates');
    const formatted = rows.map(r => ({
      ...r,
      checklist: typeof r.checklist === 'string' ? JSON.parse(r.checklist) : r.checklist
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/tasks/templates error:', error);
    return res.status(500).json({ message: 'Failed to fetch templates.' });
  }
});

router.post('/erp/tasks/templates', async (req, res) => {
  const t = req.body;
  try {
    await pool.query(`
      INSERT INTO task_templates (id, title, category, type, estimatedHours, priority, checklist)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        checklist = VALUES(checklist)
    `, [t.id, t.title, t.category, t.type, t.estimatedHours || 0, t.priority || 'medium', JSON.stringify(t.checklist || [])]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/tasks/templates error:', error);
    return res.status(500).json({ message: 'Failed to save template.' });
  }
});

// Rules
router.get('/erp/tasks/rules', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM task_rules');
    return res.json(rows);
  } catch (error) {
    console.error('[API] GET /erp/tasks/rules error:', error);
    return res.status(500).json({ message: 'Failed to fetch task rules.' });
  }
});

router.post('/erp/tasks/rules', async (req, res) => {
  const r = req.body;
  try {
    await pool.query(`
      INSERT INTO task_rules (id, name, triggerModule, \`condition\`, templateId, assigneeRole, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        \`condition\` = VALUES(\`condition\`),
        active = VALUES(active)
    `, [r.id, r.name, r.triggerModule, r.condition, r.templateId, r.assigneeRole, r.active ? 1 : 0]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/tasks/rules error:', error);
    return res.status(500).json({ message: 'Failed to save task rule.' });
  }
});

router.delete('/erp/tasks/:taskNoOrId', async (req, res) => {
  const { taskNoOrId } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id = ? OR taskNo = ?', [taskNoOrId, taskNoOrId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/tasks error:', error);
    return res.status(500).json({ message: 'Failed to delete task.' });
  }
});

router.delete('/erp/tasks/templates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM task_templates WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/tasks/templates error:', error);
    return res.status(500).json({ message: 'Failed to delete task template.' });
  }
});

router.delete('/erp/tasks/rules/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM task_rules WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/tasks/rules error:', error);
    return res.status(500).json({ message: 'Failed to delete task rule.' });
  }
});

// =========================================================================
// AUDIT LOGS
// =========================================================================

router.get('/erp/audit-logs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
    return res.json(rows);
  } catch (error) {
    console.error('[API] GET /erp/audit-logs error:', error);
    return res.status(500).json({ message: 'Failed to fetch audit logs.' });
  }
});

router.post('/erp/audit-logs', async (req, res) => {
  const a = req.body;
  try {
    await pool.query(`
      INSERT INTO audit_logs (id, userId, userName, module, action, refId, refNo, description, oldData, newData, timestamp, date, time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [a.id || `al-${Date.now()}`, a.userId, a.userName || 'System', a.module, a.action, a.refId || '', a.refNo || '', a.description || '', a.oldData || null, a.newData || null, formatMySQLDatetime(a.timestamp || new Date()), a.date || '', a.time || '']);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] POST /erp/audit-logs error:', error);
    return res.status(500).json({ message: 'Failed to save audit log.' });
  }
});

// =========================================================================
// CRM LEADS MODULE
// =========================================================================

// Fetch all CRM leads
router.get('/erp/leads', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leads ORDER BY createdAt DESC');
    const formatted = rows.map(r => ({
      ...r,
      value: Number(r.value || 0),
      notes: typeof r.notes === 'string' ? JSON.parse(r.notes) : (r.notes || []),
      tasks: typeof r.tasks === 'string' ? JSON.parse(r.tasks) : (r.tasks || [])
    }));
    return res.json(formatted);
  } catch (error) {
    console.error('[API] GET /erp/leads error:', error);
    return res.status(500).json({ message: 'Failed to fetch CRM leads.' });
  }
});

// Save or Update a CRM lead
router.post('/erp/leads', async (req, res) => {
  const lead = req.body;
  try {
    const leadId = lead.id || `lead-${Date.now()}`;
    const name = lead.name || lead.contactPerson || 'Untitled Lead';
    const company = lead.company || '';
    const contactPerson = lead.contactPerson || lead.name || '';
    const email = lead.email || '';
    const phone = lead.phone || '';
    const stage = lead.stage || 'Lead';
    const value = Number(lead.value || 0);
    const expectedCloseDate = lead.expectedCloseDate || null;
    const priority = lead.priority || 'Medium';
    const assignee = lead.assignee || 'Sales Executive';
    const notesJson = JSON.stringify(lead.notes || []);
    const tasksJson = JSON.stringify(lead.tasks || []);
    const createdAt = formatMySQLDatetime(lead.createdAt || new Date());

    await pool.query(`
      INSERT INTO leads (id, name, company, contactPerson, email, phone, stage, value, expectedCloseDate, priority, assignee, notes, tasks, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        company = VALUES(company),
        contactPerson = VALUES(contactPerson),
        email = VALUES(email),
        phone = VALUES(phone),
        stage = VALUES(stage),
        value = VALUES(value),
        expectedCloseDate = VALUES(expectedCloseDate),
        priority = VALUES(priority),
        assignee = VALUES(assignee),
        notes = VALUES(notes),
        tasks = VALUES(tasks)
    `, [leadId, name, company, contactPerson, email, phone, stage, value, expectedCloseDate, priority, assignee, notesJson, tasksJson, createdAt]);

    return res.json({ success: true, id: leadId });
  } catch (error) {
    console.error('[API] POST /erp/leads error:', error);
    return res.status(500).json({ message: 'Failed to save CRM lead.' });
  }
});

// Delete a CRM lead
router.delete('/erp/leads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM leads WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /erp/leads error:', error);
    return res.status(500).json({ message: 'Failed to delete CRM lead.' });
  }
});

export default router;

