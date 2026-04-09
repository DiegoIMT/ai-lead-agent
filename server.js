/**
 * AI Lead Qualification Agent
 * Main server entry point
 */

require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

const leadsRouter = require('./routes/leads');
const webhooksRouter = require('./routes/webhooks');
const { initStorage } = require('./utils/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.LOG_LEVEL || 'dev'));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/leads', leadsRouter);
app.use('/api/webhooks', webhooksRouter);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Lead Qualification Agent',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
initStorage();
app.listen(PORT, () => {
  console.log(`\n🤖 AI Lead Qualification Agent`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅  Server running at http://localhost:${PORT}`);
  console.log(`📋  Health check: http://localhost:${PORT}/health`);
  console.log(`🔗  Webhook test: POST http://localhost:${PORT}/api/webhooks/test`);
  console.log(`📊  Lead history: GET  http://localhost:${PORT}/api/leads/history`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

module.exports = app;
