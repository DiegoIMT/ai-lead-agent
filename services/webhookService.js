/**
 * Webhook Service (Action Agent)
 * Dispatches the processed lead payload to internal and/or external webhooks.
 */

const axios = require('axios');

const INTERNAL_WEBHOOK_URL = `http://localhost:${process.env.PORT || 3000}/api/webhooks/test`;

/**
 * Dispatch lead payload to configured webhook(s)
 * @param {Object} leadResult - Full processed lead result
 * @returns {Object} webhook dispatch result
 */
exports.dispatch = async (leadResult) => {
  const firedAt = new Date().toISOString();
  const results = [];

  // ── Internal test webhook ─────────────────────────────────────────────────
  if (process.env.WEBHOOK_INTERNAL_ENABLED !== 'false') {
    const internalResult = await fireWebhook('internal', INTERNAL_WEBHOOK_URL, leadResult);
    results.push(internalResult);
  }

  // ── External webhook (from env) ───────────────────────────────────────────
  if (process.env.WEBHOOK_EXTERNAL_URL) {
    const externalResult = await fireWebhook('external', process.env.WEBHOOK_EXTERNAL_URL, leadResult);
    results.push(externalResult);
  }

  const allSuccess = results.every((r) => r.success);

  return {
    status: allSuccess ? 'success' : results.length === 0 ? 'skipped' : 'partial',
    firedAt,
    targets: results,
  };
};

/**
 * Send payload to a single webhook URL
 */
async function fireWebhook(type, url, payload) {
  const startTime = Date.now();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-Agent-Source': 'ai-lead-qualification-agent',
      'X-Lead-Id': payload.id || 'unknown',
    };

    // Optional HMAC-style signature header
    if (process.env.WEBHOOK_SECRET) {
      headers['X-Webhook-Secret'] = process.env.WEBHOOK_SECRET;
    }

    const response = await axios.post(url, payload, {
      headers,
      timeout: 5000, // 5s timeout
    });

    console.log(`[WEBHOOK] ✅ ${type} → ${url} (${response.status}) in ${Date.now() - startTime}ms`);

    return {
      type,
      url,
      success: true,
      statusCode: response.status,
      responseMs: Date.now() - startTime,
      response: response.data,
    };
  } catch (err) {
    const statusCode = err.response?.status || null;
    const errorMsg = err.response?.data?.error || err.message || 'Unknown error';

    console.error(`[WEBHOOK] ❌ ${type} → ${url} failed: ${errorMsg}`);

    return {
      type,
      url,
      success: false,
      statusCode,
      responseMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}
