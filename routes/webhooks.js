/**
 * Webhook routes
 * Internal test endpoint and webhook management
 */

const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooksController');

// POST /api/webhooks/test — Internal test webhook receiver
router.post('/test', webhooksController.testWebhook);

// POST /api/webhooks/fire — Manually fire webhook for a lead
router.post('/fire/:leadId', webhooksController.fireWebhook);

module.exports = router;
