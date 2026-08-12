/**
 * duplicateChecker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised duplicate-prevention helpers used by every ERP module.
 *
 * Layers of protection:
 *   1. Frontend forms  (real-time warnings as user types)
 *   2. Service layer   (hard guard before saving to storage / API)
 *   3. Backend API     (409 Conflict if anything slips through)
 *   4. MySQL schema    (UNIQUE constraints — last line of defence)
 *
 * All comparisons are case-insensitive and ignore leading/trailing whitespace.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Normalise a string for comparison (lower-case, trimmed, collapse spaces). */
export const normalize = (str = '') =>
  String(str).toLowerCase().trim().replace(/\s+/g, ' ');

/** Strip non-digit characters from a phone number for comparison. */
export const normalizePhone = (phone = '') =>
  String(phone).replace(/\D/g, '');

/**
 * Check whether a single field already exists in a list (exact match).
 *
 * @param {Array}   list       - existing records array
 * @param {string}  field      - field name to compare
 * @param {string}  value      - value being tested
 * @param {string}  [excludeId] - id to exclude (self-edit scenario)
 * @returns {Object|null}      - the conflicting record, or null
 */
export const findExactDuplicate = (list = [], field, value, excludeId = null) => {
  if (!value || !value.toString().trim()) return null;
  const normVal = normalize(value);
  return list.find(item =>
    normalize(item[field]) === normVal &&
    (excludeId ? item.id !== excludeId : true)
  ) || null;
};

/**
 * Check whether a phone number already exists in a list.
 * Ignores spaces, dashes, parentheses etc.
 *
 * @param {Array}   list
 * @param {string}  phone
 * @param {string}  [excludeId]
 * @returns {Object|null}
 */
export const findPhoneDuplicate = (list = [], phone, excludeId = null) => {
  if (!phone || !phone.trim()) return null;
  const normPhone = normalizePhone(phone);
  if (normPhone.length < 7) return null; // too short to be meaningful
  return list.find(item =>
    normalizePhone(item.phone) === normPhone &&
    (excludeId ? item.id !== excludeId : true)
  ) || null;
};

/**
 * Check whether an email already exists in a list.
 *
 * @param {Array}   list
 * @param {string}  email
 * @param {string}  [excludeId]
 * @returns {Object|null}
 */
export const findEmailDuplicate = (list = [], email, excludeId = null) => {
  if (!email || !email.trim()) return null;
  const normEmail = normalize(email);
  return list.find(item =>
    item.email && normalize(item.email) === normEmail &&
    (excludeId ? item.id !== excludeId : true)
  ) || null;
};

/**
 * Check whether a NAME + PHONE combination already exists.
 * Used for Customers and Suppliers (per business rule).
 *
 * @param {Array}   list
 * @param {string}  name
 * @param {string}  phone
 * @param {string}  [excludeId]
 * @returns {Object|null}
 */
export const findNamePhoneDuplicate = (list = [], name, phone, excludeId = null) => {
  if (!name || !phone) return null;
  const normName  = normalize(name);
  const normPhone = normalizePhone(phone);
  if (normPhone.length < 7) return null;
  return list.find(item =>
    normalize(item.name) === normName &&
    normalizePhone(item.phone) === normPhone &&
    (excludeId ? item.id !== excludeId : true)
  ) || null;
};

/**
 * Build a user-facing error message for a duplicate Customer.
 */
export const customerDuplicateMessage = (existing) =>
  `⚠️ Duplicate Customer: "${existing.name}" (Code: ${existing.code}) already exists with this name and phone number. Please verify before adding a new entry.`;

/**
 * Build a user-facing error message for a duplicate Supplier.
 */
export const supplierDuplicateMessage = (existing) =>
  `⚠️ Duplicate Supplier: "${existing.name}" (Code: ${existing.code}) already exists with this name and phone number. Please verify before adding a new entry.`;

/**
 * Build a user-facing error message for a duplicate Product SKU.
 */
export const skuDuplicateMessage = (existing) =>
  `⚠️ Duplicate SKU: The code "${existing.sku}" is already assigned to "${existing.name}". Each product must have a unique SKU.`;

/**
 * Build a user-facing warning message for a similar Product name.
 */
export const productNameWarning = (existing) =>
  `⚠️ Similar Name Found: A product named "${existing.name}" already exists in category "${existing.category}". Please verify this is not a duplicate, or correct the name before saving.`;

/**
 * Build a user-facing error message for a duplicate Service Code.
 */
export const serviceCodeDuplicateMessage = (existing) =>
  `⚠️ Duplicate Service Code: "${existing.code}" is already used by "${existing.name}". Please use a unique service code.`;

/**
 * Build a user-facing error message for a duplicate Service Name.
 */
export const serviceNameDuplicateMessage = (existing) =>
  `⚠️ Duplicate Service Name: A service named "${existing.name}" already exists. Please use a different service name.`;

/**
 * Build a user-facing error message for a duplicate CRM Lead.
 */
export const leadDuplicateMessage = (existing) =>
  `⚠️ Duplicate Lead: An opportunity named "${existing.name}" for "${existing.company}" already exists (Stage: ${existing.stage}). Please use a different lead name.`;
