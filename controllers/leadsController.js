/**
 * Leads Controller
 * Orchestrates the full agent pipeline:
 * intake → validation → enrichment → scoring → follow-up → action
 */

const { v4: uuidv4 } = require('uuid');
const validationService = require('../services/validationService');
const enrichmentService = require('../services/enrichmentService');
const scoringService = require('../services/scoringService');
const followupService = require('../services/followupService');
const webhookService = require('../services/webhookService');
const storage = require('../utils/storage');

/**
 * POST /api/leads/process
 * Full agent pipeline for a new lead
 */
exports.processLead = async (req, res) => {
  const startTime = Date.now();
  const leadId = uuidv4();

  console.log(`\n[AGENT] Processing lead ${leadId}`);

  try {
    // ── Step 1: Intake & Validation ──────────────────────────────────────────
    console.log('[1/6] Intake & Validation...');
    const { data: normalizedLead, errors } = validationService.validateAndNormalize(req.body);

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // ── Step 2: Enrichment ───────────────────────────────────────────────────
    console.log('[2/6] Enrichment...');
    const enrichedData = await enrichmentService.enrich(normalizedLead);

    // ── Step 3: Scoring ──────────────────────────────────────────────────────
    console.log('[3/6] Lead Scoring...');
    const scoreResult = scoringService.score(normalizedLead, enrichedData);

    // ── Step 4: Follow-up Generation ────────────────────────────────────────
    console.log('[4/6] Generating Follow-up...');
    const followup = await followupService.generate(normalizedLead, enrichedData, scoreResult);

    // ── Step 5: Build Full Result ────────────────────────────────────────────
    const result = {
      id: leadId,
      processedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      lead: normalizedLead,
      enrichment: enrichedData,
      scoring: scoreResult,
      followup,
      webhook: { status: 'pending', firedAt: null },
    };

    // ── Step 6: Fire Webhook ─────────────────────────────────────────────────
    console.log('[5/6] Firing Webhook...');
    const webhookResult = await webhookService.dispatch(result);
    result.webhook = webhookResult;

    // ── Step 7: Persist to Storage ───────────────────────────────────────────
    console.log('[6/6] Saving to history...');
    storage.saveLead(result);

    console.log(`[AGENT] ✅ Done. Score: ${scoreResult.score} (${scoreResult.category}) in ${result.processingTimeMs}ms\n`);

    return res.status(200).json({ success: true, data: result });

  } catch (err) {
    console.error(`[AGENT] ❌ Pipeline error:`, err.message);
    return res.status(500).json({
      success: false,
      error: 'Agent pipeline failed',
      details: err.message,
    });
  }
};

/**
 * GET /api/leads/history
 * Returns recent processed leads
 */
exports.getHistory = (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const leads = storage.getLeads(limit);
  return res.json({ success: true, count: leads.length, data: leads });
};

/**
 * GET /api/leads/:id
 * Returns a single lead by ID
 */
exports.getLeadById = (req, res) => {
  const lead = storage.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }
  return res.json({ success: true, data: lead });
};
