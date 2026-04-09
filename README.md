# 🤖 AI Lead Qualification Agent

> A full-stack AI agent that validates, enriches, scores, and generates personalized follow-up messages for sales leads — then fires webhooks to trigger downstream automations.

Built as a **proof of work** for AI Agent Engineer roles. Clean architecture, configurable scoring rules, optional LLM integration, and a professional dark-mode UI.

---

## ✨ Features

| Feature | Description |
|---|---|
| **5-Stage Agent Pipeline** | Intake → Enrichment → Scoring → Follow-up → Webhook |
| **Configurable Scoring** | 10+ signals via external rules file (`scoringRules.js`) |
| **Lead Enrichment** | Infers B2B signal, seniority, temperature, tags, estimated revenue |
| **Follow-up Generation** | Personalized subject, short/formal messages, CTA — with optional LLM upgrade |
| **Webhook System** | Internal test receiver + configurable external endpoint |
| **History** | Last N leads stored in memory + JSON file |
| **Export** | Download full result as JSON |
| **Professional UI** | Dark-mode, responsive, animated pipeline visualization |
| **Fully Offline** | Works with zero external APIs — all fallbacks included |

---

## 🧱 Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS (zero dependencies)
- **HTTP:** axios
- **Logging:** morgan
- **Storage:** In-memory + JSON file
- **Optional:** OpenAI API for LLM follow-up generation
- **Optional:** Clearbit / Hunter / Apollo (adapter layer ready)

---

## 📁 Project Structure

```
ai-lead-qualification-agent/
├── server.js                  # Express app entry point
├── package.json
├── .env.example               # All environment variables documented
├── Dockerfile
│
├── routes/
│   ├── leads.js               # Lead endpoints
│   └── webhooks.js            # Webhook endpoints
│
├── controllers/
│   ├── leadsController.js     # Pipeline orchestration
│   └── webhooksController.js  # Webhook receiver & dispatcher
│
├── services/
│   ├── validationService.js   # Intake Agent — validate & normalize
│   ├── enrichmentService.js   # Enrichment Agent — infer signals
│   ├── scoringService.js      # Scoring Agent — rule-based scoring
│   ├── followupService.js     # Follow-up Agent — message generation
│   └── webhookService.js      # Action Agent — webhook dispatch
│
├── utils/
│   ├── scoringRules.js        # ← Edit this to tune scoring behavior
│   └── storage.js             # In-memory + JSON persistence
│
├── data/
│   └── leads.json             # Auto-created at runtime
│
├── public/
│   ├── index.html             # Single-page UI
│   ├── css/style.css          # Dark-mode design system
│   └── js/app.js              # Frontend logic
│
└── tests/
    └── validation.test.js     # Unit tests (no test runner required)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/ai-lead-qualification-agent.git
cd ai-lead-qualification-agent

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development (with auto-reload)

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `WEBHOOK_INTERNAL_ENABLED` | `true` | Enable internal test webhook |
| `WEBHOOK_EXTERNAL_URL` | _(empty)_ | External webhook URL (optional) |
| `WEBHOOK_SECRET` | _(empty)_ | Signature header value |
| `OPENAI_API_KEY` | _(empty)_ | Enables LLM follow-up generation |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI model to use |
| `MAX_HISTORY_SIZE` | `50` | Max leads to keep in storage |

---

## 📡 API Endpoints

### `GET /health`
Health check.

```json
{
  "status": "ok",
  "service": "AI Lead Qualification Agent",
  "uptime": 42.3
}
```

---

### `POST /api/leads/process`
Run the full agent pipeline on a lead.

**Request Body:**

```json
{
  "fullName": "Sarah Chen",
  "email": "sarah.chen@techcorp.io",
  "company": "TechCorp Solutions",
  "jobTitle": "VP of Engineering",
  "website": "https://techcorp.io",
  "industry": "SaaS",
  "companySize": "201-500",
  "country": "United States",
  "leadSource": "LinkedIn",
  "comments": "We need automation tooling for our engineering team. Budget approved, looking for a demo this week."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "processedAt": "2025-01-15T10:23:00.000Z",
    "processingTimeMs": 312,
    "lead": { "fullName": "Sarah Chen", "email": "sarah.chen@techcorp.io", ... },
    "enrichment": {
      "isB2B": true,
      "companyTier": "mid-market",
      "seniority": "Director/VP",
      "isDecisionMaker": true,
      "leadTemperature": "hot",
      "intentSummary": "Has specific pain point to solve",
      "tags": ["b2b", "decision-maker", "corporate-email", "hot-lead", "priority-market"]
    },
    "scoring": {
      "score": 84,
      "category": "High",
      "reasons": ["Mid-market company", "Director or VP", "Corporate email", "Hot lead signal", "B2B industry"],
      "breakdown": { ... }
    },
    "followup": {
      "source": "local-template",
      "subject": "Let's connect — TechCorp Solutions + [Your Company]",
      "shortMessage": "Hi Sarah, thanks for reaching out! ...",
      "formalMessage": "Dear Sarah Chen, ...",
      "cta": "Book a 30-min discovery call → [calendly-link]"
    },
    "webhook": {
      "status": "success",
      "firedAt": "2025-01-15T10:23:00.312Z",
      "targets": [{ "type": "internal", "success": true, "statusCode": 200, "responseMs": 8 }]
    }
  }
}
```

---

### `GET /api/leads/history`
Returns last N processed leads.

```
GET /api/leads/history?limit=10
```

---

### `GET /api/leads/:id`
Returns a single lead by ID.

---

### `POST /api/webhooks/test`
Internal test webhook receiver. Also the default dispatch target.

---

### `POST /api/webhooks/fire/:leadId`
Re-fires the webhook for a stored lead.

---

## 🐳 Docker

```bash
# Build image
docker build -t ai-lead-agent .

# Run container
docker run -p 3000:3000 --env-file .env ai-lead-agent
```

---

## 🎯 Tuning the Scoring Rules

Edit `utils/scoringRules.js` to customize scoring without touching core logic:

```js
{
  name: 'enterprise_company',
  points: 20,
  reason: 'Enterprise company (500+ employees)',
  evaluate: (lead, enriched) => ['501-1000', '1001-5000', '5000+'].includes(lead.companySize),
},
```

Add a rule → it's automatically picked up by the scoring engine.

---

## 🔌 Extending with Real APIs

The enrichment layer is designed to be swapped out:

| Service | Replace in |
|---|---|
| Clearbit (company data) | `services/enrichmentService.js` → `mockExternalEnrichment()` |
| Hunter.io (email verification) | same |
| OpenAI (follow-up messages) | `services/followupService.js` — just add `OPENAI_API_KEY` to `.env` |
| Zapier / Make / n8n | Set `WEBHOOK_EXTERNAL_URL` in `.env` |
| HubSpot / Salesforce CRM | Add a new service in `/services`, call from `leadsController.js` |

---

## 🎬 Demo Script (1 minute)

> Use this for live demos or screen recordings:

1. **Intro (0–10s):** "This is an AI Lead Qualification Agent — it processes a sales lead through a 5-stage pipeline automatically."

2. **Load sample (10–20s):** Click *Load Sample* → show the form filled with a high-intent lead from a VP at a SaaS company.

3. **Submit (20–30s):** Click *Run Agent Pipeline* → point to the animated pipeline steps running in real-time.

4. **Results (30–50s):** Walk through the results panel:
   - Score ring animation → "84/100, High category"
   - Enrichment tags → "Detected as B2B, decision-maker, hot lead"
   - Follow-up tab → "Generated subject line and personalized email"
   - Webhook status → "Fired and acknowledged internally"

5. **Close (50–60s):** "This is fully local, no external APIs required. The scoring rules are in a single config file. The follow-up layer is LLM-ready with OpenAI. The webhook fires to any endpoint you configure."

---

## 🔮 Future Ideas

- [ ] Connect real CRM (HubSpot, Salesforce, Pipedrive)
- [ ] Clearbit / Apollo enrichment adapters
- [ ] LLM scoring reasoning (explain *why* in natural language)
- [ ] Multi-agent setup with LangGraph or CrewAI
- [ ] Slack/email notification on High leads
- [ ] SQLite or Postgres for persistent storage
- [ ] Auth layer for multi-user access
- [ ] CSV bulk import
- [ ] A/B test follow-up messages
- [ ] Analytics dashboard (conversion by score, source, industry)

---

## 📄 License

MIT © 2025

---

*Built as a proof of work for AI Agent Engineer roles. Architecture reflects real agentic design patterns: modular agents, configurable rules, graceful degradation, and extensible integration layers.*
