/**
 * Scoring Rules Configuration
 * Each rule defines a condition and the points awarded if it passes.
 * Edit this file to tune lead scoring behavior without touching core logic.
 *
 * Rule shape:
 * {
 *   name: string,           — unique identifier
 *   points: number,         — points awarded if condition is true
 *   reason: string,         — human-readable explanation
 *   evaluate: (lead, enriched) => boolean
 * }
 */

const SCORING_RULES = [
  // ── Company Size ────────────────────────────────────────────────────────────
  {
    name: 'enterprise_company',
    points: 20,
    reason: 'Enterprise company (500+ employees)',
    evaluate: (lead) => ['501-1000', '1001-5000', '5000+'].includes(lead.companySize),
  },
  {
    name: 'mid_market_company',
    points: 12,
    reason: 'Mid-market company (51–500 employees)',
    evaluate: (lead) => ['51-200', '201-500'].includes(lead.companySize),
  },
  {
    name: 'small_company',
    points: 6,
    reason: 'Small company (11–50 employees)',
    evaluate: (lead) => lead.companySize === '11-50',
  },

  // ── Job Title / Seniority ───────────────────────────────────────────────────
  {
    name: 'c_level',
    points: 25,
    reason: 'C-Level or Founder — high decision-making authority',
    evaluate: (_, enriched) => enriched.seniority === 'C-Level',
  },
  {
    name: 'director_vp',
    points: 18,
    reason: 'Director or VP — strong decision-making authority',
    evaluate: (_, enriched) => enriched.seniority === 'Director/VP',
  },
  {
    name: 'manager_level',
    points: 10,
    reason: 'Manager-level role — some buying influence',
    evaluate: (_, enriched) => enriched.seniority === 'Manager',
  },

  // ── Email Quality ───────────────────────────────────────────────────────────
  {
    name: 'corporate_email',
    points: 10,
    reason: 'Corporate email address (not Gmail/Yahoo/etc.)',
    evaluate: (lead) => lead.isCorporateEmail === true,
  },

  // ── Lead Temperature ────────────────────────────────────────────────────────
  {
    name: 'hot_lead',
    points: 15,
    reason: 'Lead signals high purchase intent (hot)',
    evaluate: (_, enriched) => enriched.leadTemperature === 'hot',
  },
  {
    name: 'warm_lead',
    points: 8,
    reason: 'Lead is actively evaluating options (warm)',
    evaluate: (_, enriched) => enriched.leadTemperature === 'warm',
  },

  // ── Website Presence ────────────────────────────────────────────────────────
  {
    name: 'has_website',
    points: 5,
    reason: 'Provided a company website — established digital presence',
    evaluate: (lead) => !!lead.website,
  },

  // ── B2B Signal ──────────────────────────────────────────────────────────────
  {
    name: 'b2b_industry',
    points: 8,
    reason: 'B2B industry — strong fit for our ICP',
    evaluate: (_, enriched) => enriched.isB2B === true,
  },

  // ── Comment Quality ─────────────────────────────────────────────────────────
  {
    name: 'detailed_comments',
    points: 8,
    reason: 'Detailed comments show high engagement and clear need',
    evaluate: (_, enriched) => enriched.hasDetailedComments === true,
  },

  // ── Country / Market ────────────────────────────────────────────────────────
  {
    name: 'priority_market',
    points: 6,
    reason: 'Lead is from a priority market (US, UK, Canada, Australia)',
    evaluate: (lead) => {
      const c = (lead.country || '').toLowerCase();
      return ['us', 'usa', 'united states', 'canada', 'uk',
              'united kingdom', 'australia'].includes(c);
    },
  },
];

module.exports = SCORING_RULES;
