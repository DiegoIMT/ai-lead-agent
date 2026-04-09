/**
 * Follow-up Service (Follow-up Agent)
 * Generates personalized follow-up messages.
 * Uses local template logic by default.
 * If OPENAI_API_KEY is set, upgrades to LLM-generated messages with local fallback.
 */

const axios = require('axios');

/**
 * Generate follow-up messages for a qualified lead
 */
exports.generate = async (lead, enriched, scoring) => {
  // Try LLM generation if API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithLLM(lead, enriched, scoring);
    } catch (err) {
      console.warn('[FOLLOWUP] LLM generation failed, using local fallback:', err.message);
    }
  }

  // Default: local template engine
  return generateLocal(lead, enriched, scoring);
};

// ── Local Template Engine ─────────────────────────────────────────────────────

function generateLocal(lead, enriched, scoring) {
  const { category } = scoring;
  const { firstName, company, jobTitle, comments } = lead;
  const { leadTemperature, intentSummary, isDecisionMaker } = enriched;

  const subject = buildSubject(category, company, lead);
  const shortMessage = buildShortMessage(firstName, company, category, leadTemperature);
  const formalMessage = buildFormalMessage(lead, enriched, scoring);
  const cta = buildCTA(category, isDecisionMaker, leadTemperature);

  return {
    source: 'local-template',
    subject,
    shortMessage,
    formalMessage,
    cta,
    intent: intentSummary,
  };
}

function buildSubject(category, company, lead) {
  const templates = {
    High: [
      `Let's connect — ${company} + [Your Company]`,
      `Quick call this week? — re: ${lead.firstName}'s inquiry`,
      `Following up on your interest, ${lead.firstName}`,
    ],
    Medium: [
      `Your inquiry about [Your Product] — ${company}`,
      `Thanks for reaching out, ${lead.firstName}`,
      `Next steps for ${company}`,
    ],
    Low: [
      `Thanks for your interest in [Your Product]`,
      `Resources to explore — [Your Company]`,
      `We received your message, ${lead.firstName}`,
    ],
  };
  const options = templates[category] || templates.Low;
  return options[Math.floor(Math.random() * options.length)];
}

function buildShortMessage(firstName, company, category, temperature) {
  if (category === 'High') {
    return `Hi ${firstName}, thanks for reaching out! Given your role at ${company} and what you've shared, I'd love to set up a quick call this week to explore how we can help. Are you available for 20 minutes?`;
  }
  if (category === 'Medium') {
    return `Hi ${firstName}, thanks for your interest! I've reviewed your inquiry and I think there's a strong fit here. I'd love to learn more about ${company}'s needs and see if we can add value. Can we connect this week?`;
  }
  return `Hi ${firstName}, thanks for reaching out to us! I wanted to follow up on your inquiry and share a few resources that might be helpful. Feel free to reply with any questions.`;
}

function buildFormalMessage(lead, enriched, scoring) {
  const { firstName, fullName, company, jobTitle, comments } = lead;
  const { seniority, intentSummary } = enriched;
  const { category } = scoring;

  const opener = category === 'High'
    ? `Thank you for your interest in [Your Company]. I was genuinely impressed by the detail you shared about ${company}'s needs.`
    : `Thank you for reaching out to [Your Company]. We appreciate you taking the time to share information about ${company}.`;

  const body = category === 'High'
    ? `Based on your background as ${jobTitle} at ${company}, and the context you've provided — "${comments.substring(0, 80)}${comments.length > 80 ? '...' : ''}" — I believe we have a strong foundation to explore how [Your Product] can deliver measurable value for your team.`
    : `We've reviewed your inquiry and would love to learn more about ${company}'s goals. Our team works with companies across your industry and we're confident we can address your needs.`;

  const close = category === 'High'
    ? `I'd like to schedule a focused 30-minute discovery call at your earliest convenience. Please reply to this email with your preferred time, or use the link below to book directly.`
    : `Please feel free to reply with any questions, or book a free consultation using the link below.`;

  return `Dear ${fullName},\n\n${opener}\n\n${body}\n\n${close}\n\nBest regards,\n[Your Name]\n[Your Title]\n[Your Company]`;
}

function buildCTA(category, isDecisionMaker, temperature) {
  if (category === 'High' && isDecisionMaker) {
    return 'Book a 30-min discovery call → [calendly-link]';
  }
  if (category === 'High') {
    return 'Schedule a product demo → [demo-link]';
  }
  if (category === 'Medium') {
    return 'Book a free 20-min consultation → [calendly-link]';
  }
  return 'Explore our resources → [resources-link]';
}

// ── LLM Generation (OpenAI) ───────────────────────────────────────────────────

async function generateWithLLM(lead, enriched, scoring) {
  const prompt = `You are a professional sales development representative.
Generate a follow-up message for this lead:

Lead: ${lead.fullName} (${lead.jobTitle} at ${lead.company})
Industry: ${lead.industry} | Country: ${lead.country}
Score: ${scoring.score}/100 (${scoring.category})
Temperature: ${enriched.leadTemperature}
Intent: ${enriched.intentSummary}
Comments: "${lead.comments}"

Respond ONLY with valid JSON in this exact shape:
{
  "subject": "email subject line",
  "shortMessage": "2-3 sentence casual follow-up",
  "formalMessage": "full professional email body",
  "cta": "one clear call to action"
}`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const content = response.data.choices[0].message.content;
  const parsed = JSON.parse(content);

  return {
    source: 'llm-openai',
    ...parsed,
    intent: enriched.intentSummary,
  };
}
