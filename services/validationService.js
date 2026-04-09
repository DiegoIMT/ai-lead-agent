/**
 * Validation Service (Intake Agent)
 * Validates, cleans, and normalizes incoming lead data
 */

const REQUIRED_FIELDS = ['fullName', 'email', 'company'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

// Domains considered personal/generic (not corporate)
const GENERIC_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'live.com', 'aol.com', 'protonmail.com',
  'mail.com', 'yandex.com', 'gmx.com', 'zoho.com',
];

/**
 * Validates and normalizes a raw lead payload
 * @param {Object} raw - Raw request body
 * @returns {{ data: Object, errors: string[] }}
 */
exports.validateAndNormalize = (raw) => {
  const errors = [];

  // ── Clean all string fields ─────────────────────────────────────────────
  const clean = {};
  for (const [key, value] of Object.entries(raw)) {
    clean[key] = typeof value === 'string' ? value.trim() : value;
  }

  // ── Required fields ──────────────────────────────────────────────────────
  for (const field of REQUIRED_FIELDS) {
    if (!clean[field]) {
      errors.push(`Field '${field}' is required`);
    }
  }

  // ── Email validation ─────────────────────────────────────────────────────
  if (clean.email && !EMAIL_REGEX.test(clean.email)) {
    errors.push('Invalid email format');
  }

  // ── URL validation (optional field) ─────────────────────────────────────
  if (clean.website && clean.website !== '' && !URL_REGEX.test(clean.website)) {
    errors.push('Invalid website URL format');
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  // ── Normalize ────────────────────────────────────────────────────────────
  const email = clean.email.toLowerCase();
  const emailDomain = email.split('@')[1] || '';

  const normalized = {
    fullName: toTitleCase(clean.fullName),
    email,
    company: clean.company,
    jobTitle: clean.jobTitle || '',
    website: normalizeUrl(clean.website || ''),
    industry: clean.industry || 'Unknown',
    companySize: clean.companySize || 'Unknown',
    country: clean.country || 'Unknown',
    leadSource: clean.leadSource || 'Direct',
    comments: clean.comments || '',
    // Derived fields
    emailDomain,
    isCorporateEmail: !GENERIC_EMAIL_DOMAINS.includes(emailDomain),
    firstName: clean.fullName.split(' ')[0] || clean.fullName,
  };

  return { data: normalized, errors: [] };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
}

function normalizeUrl(url) {
  if (!url) return '';
  if (url && !url.startsWith('http')) return `https://${url}`;
  return url;
}
