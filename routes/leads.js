/**
 * Lead routes
 * Defines API endpoints for lead processing and history
 */

const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');

// POST /api/leads/process — Full agent pipeline
router.post('/process', leadsController.processLead);

// GET /api/leads/history — Recent processed leads
router.get('/history', leadsController.getHistory);

// GET /api/leads/:id — Single lead by ID
router.get('/:id', leadsController.getLeadById);

module.exports = router;
