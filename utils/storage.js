/**
 * Storage Utility
 * In-memory store with optional JSON file persistence.
 * Simple and fast for demos; replace with a real DB for production.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/leads.json');
const MAX_SIZE = parseInt(process.env.MAX_HISTORY_SIZE) || 50;

// In-memory store
let leads = [];

/**
 * Initialize storage — load from file if it exists
 */
exports.initStorage = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      leads = JSON.parse(raw);
      console.log(`[STORAGE] Loaded ${leads.length} leads from disk`);
    } else {
      // Create data directory if needed
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      console.log('[STORAGE] Starting with empty lead store');
    }
  } catch (err) {
    console.warn('[STORAGE] Could not load leads file:', err.message);
    leads = [];
  }
};

/**
 * Save a new lead to memory and disk
 */
exports.saveLead = (lead) => {
  leads.unshift(lead); // newest first

  if (leads.length > MAX_SIZE) {
    leads = leads.slice(0, MAX_SIZE);
  }

  persistToDisk();
};

/**
 * Get recent leads
 * @param {number} limit
 */
exports.getLeads = (limit = 20) => {
  return leads.slice(0, limit).map(summaryView);
};

/**
 * Get a single lead by ID
 * @param {string} id
 */
exports.getLeadById = (id) => {
  return leads.find((l) => l.id === id) || null;
};

/**
 * Update the webhook status on a stored lead
 */
exports.updateLeadWebhook = (id, webhookResult) => {
  const lead = leads.find((l) => l.id === id);
  if (lead) {
    lead.webhook = webhookResult;
    persistToDisk();
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function summaryView(lead) {
  return {
    id: lead.id,
    processedAt: lead.processedAt,
    fullName: lead.lead?.fullName || '—',
    email: lead.lead?.email || '—',
    company: lead.lead?.company || '—',
    jobTitle: lead.lead?.jobTitle || '—',
    country: lead.lead?.country || '—',
    score: lead.scoring?.score ?? null,
    category: lead.scoring?.category || '—',
    temperature: lead.enrichment?.leadTemperature || '—',
    webhookStatus: lead.webhook?.status || '—',
  };
}

function persistToDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
  } catch (err) {
    console.warn('[STORAGE] Could not persist leads:', err.message);
  }
}
