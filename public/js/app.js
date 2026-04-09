/**
 * AI Lead Qualification Agent — Frontend Logic
 * Handles form submission, pipeline animation, result rendering, history
 */

// ── State ─────────────────────────────────────────────────────────────────────
let currentResult = null;
let currentTab = 'short';

// ── DOM Refs ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const form = $('lead-form');
const btnSubmit = $('btn-submit');
const btnReset = $('btn-reset');
const btnBack = $('btn-back');
const btnLoadSample = $('btn-load-sample');
const btnExportJson = $('btn-export-json');
const btnCopyFollowup = $('btn-copy-followup');
const formErrors = $('form-errors');
const toast = $('toast');

// ── Navigation ────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    switchNav(btn, section);
    if (section === 'history') loadHistory();
  });
});

function switchNav(activeBtn, sectionName) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
  activeBtn.classList.add('active');
  document.querySelectorAll('.section').forEach((s) => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = document.getElementById(`section-${sectionName}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
}

function showSection(name) {
  document.querySelectorAll('.section').forEach((s) => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = document.getElementById(`section-${name}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
  // sync nav
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.section === name);
  });
}

// ── Back Button ───────────────────────────────────────────────────────────────
btnBack.addEventListener('click', () => {
  showSection('form');
  resetPipeline();
});

// ── Reset Form ────────────────────────────────────────────────────────────────
btnReset.addEventListener('click', () => {
  form.reset();
  formErrors.classList.add('hidden');
  document.querySelectorAll('input, select, textarea').forEach((el) => el.classList.remove('error'));
});

// ── Load Sample Lead ──────────────────────────────────────────────────────────
const SAMPLE_LEADS = [
  {
    fullName: 'Sarah Chen',
    email: 'sarah.chen@techcorp.io',
    company: 'TechCorp Solutions',
    jobTitle: 'VP of Engineering',
    website: 'https://techcorp.io',
    industry: 'SaaS',
    companySize: '201-500',
    country: 'United States',
    leadSource: 'LinkedIn',
    comments: "We're evaluating automation tools for our engineering team. We have a budget approved for Q1 and need something that integrates with our existing Jira and Slack setup. Urgently looking for a demo this week.",
  },
  {
    fullName: 'Miguel Ángel Torres',
    email: 'miguel@finanzas.mx',
    company: 'Finanzas MX',
    jobTitle: 'CEO',
    website: 'https://finanzas.mx',
    industry: 'Fintech',
    companySize: '51-200',
    country: 'Mexico',
    leadSource: 'Referral',
    comments: 'Interested in exploring your platform for our lending operations. Looking for a solution that scales.',
  },
  {
    fullName: 'James Williams',
    email: 'james.w@gmail.com',
    company: 'Freelance',
    jobTitle: 'Consultant',
    website: '',
    industry: 'Consulting',
    companySize: '1-10',
    country: 'Canada',
    leadSource: 'Website',
    comments: 'Just browsing, want to know more.',
  },
];

let sampleIndex = 0;
btnLoadSample.addEventListener('click', () => {
  const sample = SAMPLE_LEADS[sampleIndex % SAMPLE_LEADS.length];
  sampleIndex++;
  fillForm(sample);
  showToast(`Sample lead loaded (${sampleIndex}/${SAMPLE_LEADS.length})`, 'success');
});

function fillForm(data) {
  Object.entries(data).forEach(([key, value]) => {
    const el = document.getElementById(key) || form.querySelector(`[name="${key}"]`);
    if (el) el.value = value;
  });
}

// ── Form Submission ───────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formErrors.classList.add('hidden');
  document.querySelectorAll('input, select, textarea').forEach((el) => el.classList.remove('error'));

  const payload = getFormData();

  // Client-side pre-check
  const clientErrors = clientValidate(payload);
  if (clientErrors.length > 0) {
    showFormErrors(clientErrors);
    return;
  }

  // Start loading
  setLoading(true);
  animatePipeline();

  try {
    const res = await fetch('/api/leads/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      const errs = json.details ? (Array.isArray(json.details) ? json.details : [json.details]) : [json.error];
      showFormErrors(errs);
      setLoading(false);
      resetPipeline();
      return;
    }

    currentResult = json.data;
    renderResults(json.data);
    showSection('results');
    showToast('Agent pipeline complete!', 'success');

  } catch (err) {
    showFormErrors(['Network error: ' + err.message]);
  } finally {
    setLoading(false);
  }
});

function getFormData() {
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  return data;
}

function clientValidate(data) {
  const errors = [];
  if (!data.fullName?.trim()) errors.push('Full name is required');
  if (!data.email?.trim()) errors.push('Email is required');
  if (!data.company?.trim()) errors.push('Company is required');
  return errors;
}

function showFormErrors(errors) {
  formErrors.innerHTML = `<ul>${errors.map((e) => `<li>${e}</li>`).join('')}</ul>`;
  formErrors.classList.remove('hidden');
  // Scroll to errors
  formErrors.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Loading State ─────────────────────────────────────────────────────────────
function setLoading(on) {
  btnSubmit.disabled = on;
  if (on) {
    btnSubmit.classList.add('loading');
    btnSubmit.querySelector('.btn-text').textContent = 'Processing...';
  } else {
    btnSubmit.classList.remove('loading');
    btnSubmit.querySelector('.btn-text').textContent = 'Run Agent Pipeline';
  }
}

// ── Pipeline Animation ────────────────────────────────────────────────────────
const STEPS = 5;
let pipelineInterval = null;

function animatePipeline() {
  resetPipeline();
  let step = 0;
  pipelineInterval = setInterval(() => {
    if (step > 0) {
      const prev = document.querySelector(`.pipe-step[data-step="${step - 1}"]`);
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
    }
    if (step < STEPS) {
      const curr = document.querySelector(`.pipe-step[data-step="${step}"]`);
      if (curr) curr.classList.add('active');
    }
    step++;
    if (step > STEPS) clearInterval(pipelineInterval);
  }, 400);
}

function resetPipeline() {
  if (pipelineInterval) clearInterval(pipelineInterval);
  document.querySelectorAll('.pipe-step').forEach((s) => {
    s.classList.remove('active', 'done');
  });
}

// ── Render Results ────────────────────────────────────────────────────────────
function renderResults(data) {
  const { lead, enrichment, scoring, followup, webhook, processedAt, processingTimeMs, id } = data;

  // Meta
  $('result-meta').textContent = `ID: ${id} · ${new Date(processedAt).toLocaleString()} · ${processingTimeMs}ms`;

  // Score Ring
  renderScoreRing(scoring);

  // Lead Data
  renderLeadData(lead);

  // Enrichment
  renderEnrichment(enrichment);

  // Follow-up
  renderFollowup(followup);

  // Score Breakdown
  renderBreakdown(scoring);

  // Webhook
  renderWebhook(webhook);
}

function renderScoreRing(scoring) {
  const { score, category, reasons } = scoring;

  $('score-number').textContent = score;

  const catEl = $('score-category');
  catEl.textContent = category;
  catEl.className = 'score-category ' + category.toLowerCase();

  const ring = $('ring-fill');
  ring.className = 'ring-fill ' + category.toLowerCase();
  // 314 = full circumference (2π × 50)
  const offset = 314 - (score / 100) * 314;
  setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);

  const temp = currentResult?.enrichment?.leadTemperature || '';
  $('score-temp').innerHTML = `<span class="badge ${temp}">${temp.toUpperCase()} LEAD</span>`;

  const reasonsEl = $('score-reasons');
  reasonsEl.innerHTML = reasons.slice(0, 4).map((r) => `<div class="score-reason">${r}</div>`).join('');
}

function renderLeadData(lead) {
  const fields = [
    { label: 'Full Name', value: lead.fullName },
    { label: 'Email', value: `<a href="mailto:${lead.email}">${lead.email}</a>` },
    { label: 'Company', value: lead.company },
    { label: 'Job Title', value: lead.jobTitle || '—' },
    { label: 'Domain', value: lead.emailDomain, mono: true },
    { label: 'Corporate Email', value: lead.isCorporateEmail ? '✓ Yes' : '✗ No' },
    { label: 'Industry', value: lead.industry },
    { label: 'Company Size', value: lead.companySize },
    { label: 'Country', value: lead.country },
    { label: 'Lead Source', value: lead.leadSource },
    { label: 'Website', value: lead.website ? `<a href="${lead.website}" target="_blank">${lead.website}</a>` : '—' },
  ];
  $('lead-data').innerHTML = fields.map((f) =>
    `<div class="data-item">
      <div class="data-label">${f.label}</div>
      <div class="data-value${f.mono ? ' mono' : ''}">${f.value || '—'}</div>
    </div>`
  ).join('');
}

function renderEnrichment(e) {
  const fields = [
    { label: 'Inferred Domain', value: e.inferredDomain, mono: true },
    { label: 'B2B Signal', value: e.isB2B ? '✓ B2B' : '✗ Not B2B' },
    { label: 'Company Tier', value: capitalize(e.companyTier) },
    { label: 'Seniority', value: e.seniority },
    { label: 'Decision Maker', value: e.isDecisionMaker ? '✓ Yes' : '✗ No' },
    { label: 'Lead Temperature', value: capitalize(e.leadTemperature) },
    { label: 'Intent', value: e.intentSummary },
    { label: 'Comment Length', value: `${e.commentLength} chars` },
    { label: 'Est. Revenue', value: e.externalEnrichment?.estimatedRevenue || '—' },
    { label: 'Enrichment Source', value: e.externalEnrichment?.source || 'mock', mono: true },
  ];
  $('enrichment-data').innerHTML = fields.map((f) =>
    `<div class="data-item">
      <div class="data-label">${f.label}</div>
      <div class="data-value${f.mono ? ' mono' : ''}">${f.value || '—'}</div>
    </div>`
  ).join('');

  // Tags
  const tags = e.tags || [];
  const tagColors = {
    'b2b': 'accent', 'decision-maker': 'accent', 'hot-lead': 'warn',
    'warm-lead': 'warn', 'enterprise': 'blue', 'corporate-email': 'accent',
    'priority-market': 'blue', 'has-website': '', 'high-intent-comments': 'warn',
  };
  $('enrichment-tags').innerHTML = tags.map((t) =>
    `<span class="tag ${tagColors[t] || ''}">${t}</span>`
  ).join('');
}

function renderFollowup(followup) {
  if (!followup) return;

  $('followup-subject').innerHTML = `<strong>Subject:</strong> ${followup.subject}`;
  $('followup-cta').textContent = followup.cta;

  // Store both for tab switching
  form._followup = followup;

  showTab('short');

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      showTab(btn.dataset.tab);
    });
  });
}

function showTab(tab) {
  currentTab = tab;
  const followup = currentResult?.followup;
  if (!followup) return;
  $('followup-body').textContent = tab === 'short' ? followup.shortMessage : followup.formalMessage;
}

function renderBreakdown(scoring) {
  const { breakdown } = scoring;
  const rows = Object.entries(breakdown).map(([name, data]) => {
    const label = name.replace(/_/g, ' ');
    return `
      <div class="breakdown-row">
        <div class="breakdown-check ${data.passed ? 'pass' : 'fail'}">${data.passed ? '✓' : '—'}</div>
        <div class="breakdown-name ${data.passed ? 'pass' : ''}">${capitalize(label)}</div>
        <div class="breakdown-pts ${data.passed ? '' : 'zero'}">${data.passed ? '+' + data.points : '0'} pts</div>
      </div>`;
  });
  $('breakdown-list').innerHTML = rows.join('');
}

function renderWebhook(webhook) {
  if (!webhook) {
    $('webhook-status').innerHTML = '<p class="data-value" style="color:var(--text-3)">No webhook data</p>';
    return;
  }

  const targets = webhook.targets || [];
  const overall = `
    <div class="webhook-item">
      <div class="webhook-badge ${webhook.status}">
        ${webhook.status?.toUpperCase()}
      </div>
      <div class="webhook-detail">
        <strong>Overall Status</strong>
        <small>Fired at: ${webhook.firedAt ? new Date(webhook.firedAt).toLocaleString() : '—'}</small>
      </div>
    </div>`;

  const items = targets.map((t) => `
    <div class="webhook-item">
      <div class="webhook-badge ${t.success ? 'success' : 'error'}">
        ${t.success ? '200 OK' : t.statusCode || 'ERR'}
      </div>
      <div class="webhook-detail">
        <strong>${capitalize(t.type)} Webhook</strong>
        <small>${t.url} · ${t.responseMs}ms</small>
      </div>
    </div>`).join('');

  $('webhook-status').innerHTML = overall + items;
}

// ── Copy Follow-up ────────────────────────────────────────────────────────────
btnCopyFollowup.addEventListener('click', () => {
  const text = $('followup-body').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
    btnCopyFollowup.textContent = 'Copied!';
    setTimeout(() => { btnCopyFollowup.textContent = 'Copy Short Message'; }, 2000);
  });
});

// ── Export JSON ───────────────────────────────────────────────────────────────
btnExportJson.addEventListener('click', () => {
  if (!currentResult) return;
  const blob = new Blob([JSON.stringify(currentResult, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lead-${currentResult.id?.slice(0, 8) || 'export'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON exported!', 'success');
});

// ── History ───────────────────────────────────────────────────────────────────
async function loadHistory() {
  const tbody = $('history-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Loading...</td></tr>';

  try {
    const res = await fetch('/api/leads/history?limit=20');
    const json = await res.json();

    if (!json.success || json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No leads yet. Process your first lead!</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map((lead) => {
      const cat = (lead.category || '').toLowerCase();
      const temp = (lead.temperature || '').toLowerCase();
      const wh = (lead.webhookStatus || '').toLowerCase();
      const date = lead.processedAt ? new Date(lead.processedAt).toLocaleDateString() : '—';
      return `<tr>
        <td>${lead.fullName || '—'}</td>
        <td>${lead.company || '—'}</td>
        <td>${lead.email || '—'}</td>
        <td><strong>${lead.score ?? '—'}</strong></td>
        <td><span class="badge ${cat}">${lead.category || '—'}</span></td>
        <td><span class="badge ${temp}">${lead.temperature || '—'}</span></td>
        <td><span class="badge ${wh}">${lead.webhookStatus || '—'}</span></td>
        <td>${date}</td>
      </tr>`;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Error loading history: ${err.message}</td></tr>`;
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.className = 'toast hidden'; }, 3000);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
