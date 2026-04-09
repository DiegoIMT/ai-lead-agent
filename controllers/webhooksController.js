/**
 * Webhooks Controller
 * Handles internal test receiver and manual webhook dispatch
 */

const storage = require('../utils/storage');
const webhookService = require('../services/webhookService');

/**
 * POST /api/webhooks/test
 * Internal webhook endpoint — acts as a test receiver.
 * This is the default destination when no external URL is set.
 */
exports.testWebhook = (req, res) => {
  const payload = req.body;
  const receivedAt = new Date().toISOString();

  console.log(`[WEBHOOK] ✅ Test receiver got payload at ${receivedAt}`);
  console.log(`[WEBHOOK] Lead ID: ${payload?.id || 'unknown'}`);

  return res.status(200).json({
    success: true,
    message: 'Webhook received successfully',
    receivedAt,
    payloadId: payload?.id || null,
    leadScore: payload?.scoring?.score || null,
    leadCategory: payload?.scoring?.category || null,
  });
};

/**
 * POST /api/webhooks/fire/:leadId
 * Manually re-fire webhook for a stored lead
 */
exports.fireWebhook = async (req, res) => {
  const lead = storage.getLeadById(req.params.leadId);

  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found' });
  }

  const webhookResult = await webhookService.dispatch(lead);

  // Update the stored lead's webhook status
  storage.updateLeadWebhook(req.params.leadId, webhookResult);

  return res.json({ success: true, webhook: webhookResult });
};
