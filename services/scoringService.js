/**
 * Scoring Service (Scoring Agent)
 * Scores leads based on configurable rules.
 * Each rule contributes a score and a human-readable reason.
 */

const SCORING_RULES = require('../utils/scoringRules');

/**
 * Score a lead and return a numeric score, category, and reasons
 * @param {Object} lead - Normalized lead
 * @param {Object} enriched - Enriched lead data
 * @returns {{ score: number, category: string, reasons: string[], breakdown: Object }}
 */
exports.score = (lead, enriched) => {
  let totalScore = 0;
  const reasons = [];
  const breakdown = {};

  for (const rule of SCORING_RULES) {
    const { name, evaluate, points, reason } = rule;

    try {
      const passed = evaluate(lead, enriched);
      if (passed) {
        totalScore += points;
        reasons.push(reason);
        breakdown[name] = { points, passed: true, reason };
      } else {
        breakdown[name] = { points: 0, passed: false };
      }
    } catch (err) {
      console.warn(`[SCORING] Rule '${name}' failed:`, err.message);
      breakdown[name] = { points: 0, passed: false, error: err.message };
    }
  }

  // Cap at 100
  const score = Math.min(totalScore, 100);
  const category = getCategory(score);

  return { score, category, reasons, breakdown };
};

/**
 * Map numeric score to a category label
 */
function getCategory(score) {
  if (score >= 75) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}
