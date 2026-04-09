/**
 * Enrichment Service (Enrichment Agent)
 * Enriches lead data with inferred, derived, and mock-external information.
 * Designed to be extensible with real APIs (Clearbit, Hunter, Apollo, etc.)
 */

// ── B2B Industries ────────────────────────────────────────────────────────────
const B2B_INDUSTRIES = [
  'saas', 'software', 'technology', 'fintech', 'consulting', 'b2b',
  'enterprise', 'cloud', 'cybersecurity', 'data', 'analytics', 'ai',
  'logistics', 'manufacturing', 'healthcare', 'legal', 'hr tech',
  'marketing tech', 'edtech', 'proptech', 'cleantech',
];

// ── Company size tiers ────────────────────────────────────────────────────────
const SIZE_TIERS = {
  '1-10': 'startup',
  '11-50': 'small',
  '51-200': 'mid-market',
  '201-500': 'mid-market',
  '501-1000': 'enterprise',
  '1001-5000': 'enterprise',
  '5000+': 'enterprise',
};

// ── Seniority keywords for job title detection ────────────────────────────────
const C_LEVEL_KEYWORDS = ['ceo', 'cto', 'coo', 'cfo', 'cmo', 'co-founder', 'founder', 'president', 'owner'];
const DIRECTOR_KEYWORDS = ['director', 'vp', 'vice president', 'head of', 'chief'];
const MANAGER_KEYWORDS = ['manager', 'lead', 'supervisor', 'coordinator'];

/**
 * Enrich a normalized lead with additional signals
 * @param {Object} lead - Normalized lead from validationService
 * @returns {Object} enrichedData
 */
exports.enrich = async (lead) => {
  const enriched = {};

  // ── Domain & Company ──────────────────────────────────────────────────────
  enriched.inferredDomain = lead.isCorporateEmail
    ? lead.emailDomain
    : lead.website
    ? extractDomain(lead.website)
    : null;

  enriched.isB2B = detectB2B(lead.industry, lead.company);
  enriched.companyTier = SIZE_TIERS[lead.companySize] || 'unknown';

  // ── Lead Temperature ──────────────────────────────────────────────────────
  enriched.leadTemperature = inferTemperature(lead);

  // ── Job Title Analysis ────────────────────────────────────────────────────
  const seniority = analyzeSeniority(lead.jobTitle);
  enriched.seniority = seniority.level;
  enriched.seniorityScore = seniority.score;
  enriched.isDecisionMaker = seniority.isDecisionMaker;

  // ── Intent Summary ────────────────────────────────────────────────────────
  enriched.intentSummary = summarizeIntent(lead.comments);
  enriched.commentLength = lead.comments.length;
  enriched.hasDetailedComments = lead.comments.length > 80;

  // ── Auto Tags ─────────────────────────────────────────────────────────────
  enriched.tags = generateTags(lead, enriched);

  // ── Mock external enrichment (replace with real API calls) ───────────────
  enriched.externalEnrichment = await mockExternalEnrichment(lead);

  return enriched;
};

// ── Internal Logic ────────────────────────────────────────────────────────────

function extractDomain(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

function detectB2B(industry, company) {
  const industryLower = (industry || '').toLowerCase();
  const companyLower = (company || '').toLowerCase();
  return (
    B2B_INDUSTRIES.some((k) => industryLower.includes(k)) ||
    companyLower.includes('solutions') ||
    companyLower.includes('services') ||
    companyLower.includes('technologies')
  );
}

function analyzeSeniority(jobTitle) {
  const title = (jobTitle || '').toLowerCase();
  if (C_LEVEL_KEYWORDS.some((k) => title.includes(k))) {
    return { level: 'C-Level', score: 40, isDecisionMaker: true };
  }
  if (DIRECTOR_KEYWORDS.some((k) => title.includes(k))) {
    return { level: 'Director/VP', score: 30, isDecisionMaker: true };
  }
  if (MANAGER_KEYWORDS.some((k) => title.includes(k))) {
    return { level: 'Manager', score: 20, isDecisionMaker: false };
  }
  return { level: 'Individual Contributor', score: 10, isDecisionMaker: false };
}

function inferTemperature(lead) {
  let signals = 0;
  if (lead.comments && lead.comments.length > 80) signals++;
  if (lead.isCorporateEmail) signals++;
  if (lead.website) signals++;
  if (lead.jobTitle) signals++;

  // High intent keywords
  const hotKeywords = ['urgent', 'asap', 'immediately', 'now', 'budget', 'ready', 'demo', 'pricing', 'quote'];
  const warmKeywords = ['interested', 'exploring', 'evaluating', 'considering', 'looking'];
  const commentsLower = (lead.comments || '').toLowerCase();

  if (hotKeywords.some((k) => commentsLower.includes(k)) || signals >= 4) return 'hot';
  if (warmKeywords.some((k) => commentsLower.includes(k)) || signals >= 2) return 'warm';
  return 'cold';
}

function summarizeIntent(comments) {
  if (!comments || comments.length < 10) return 'No specific intent detected';

  const lower = comments.toLowerCase();
  if (lower.includes('demo') || lower.includes('trial')) return 'Requesting product demo or trial';
  if (lower.includes('price') || lower.includes('pricing') || lower.includes('cost')) return 'Evaluating pricing and cost';
  if (lower.includes('integrat')) return 'Looking for integration capabilities';
  if (lower.includes('automat')) return 'Interested in automation features';
  if (lower.includes('scale') || lower.includes('grow')) return 'Focused on scaling operations';
  if (lower.includes('problem') || lower.includes('pain') || lower.includes('issue')) return 'Has specific pain point to solve';
  if (lower.includes('replac') || lower.includes('switch')) return 'Evaluating as replacement for current solution';
  return 'General inquiry — needs qualification call';
}

function generateTags(lead, enriched) {
  const tags = [];

  if (enriched.isB2B) tags.push('b2b');
  if (enriched.isDecisionMaker) tags.push('decision-maker');
  if (lead.isCorporateEmail) tags.push('corporate-email');
  if (lead.website) tags.push('has-website');
  if (enriched.leadTemperature === 'hot') tags.push('hot-lead');
  if (enriched.leadTemperature === 'warm') tags.push('warm-lead');
  if (enriched.companyTier === 'enterprise') tags.push('enterprise');
  if (enriched.hasDetailedComments) tags.push('high-intent-comments');

  const country = (lead.country || '').toLowerCase();
  if (['us', 'usa', 'united states', 'canada', 'uk', 'australia'].includes(country)) {
    tags.push('priority-market');
  }

  return tags;
}

/**
 * Mock external enrichment layer
 * Replace individual functions with real API integrations
 * e.g., Clearbit, Hunter, Apollo, LinkedIn
 */
async function mockExternalEnrichment(lead) {
  // Simulated delay to mimic API call
  await new Promise((r) => setTimeout(r, 50));

  return {
    source: 'mock', // Change to 'clearbit', 'hunter', etc. when integrated
    companyLinkedIn: lead.company
      ? `https://linkedin.com/company/${lead.company.toLowerCase().replace(/\s+/g, '-')}`
      : null,
    estimatedRevenue: estimateRevenue(lead.companySize),
    techStack: [], // Would come from Clearbit or BuiltWith
    verifiedEmail: lead.isCorporateEmail, // Would come from Hunter.io
    note: 'External enrichment APIs not configured — using inferred data',
  };
}

function estimateRevenue(size) {
  const revenueMap = {
    '1-10': '$0–$1M',
    '11-50': '$1M–$5M',
    '51-200': '$5M–$20M',
    '201-500': '$20M–$100M',
    '501-1000': '$100M–$500M',
    '1001-5000': '$500M–$2B',
    '5000+': '$2B+',
  };
  return revenueMap[size] || 'Unknown';
}
