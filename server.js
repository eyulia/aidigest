// ─────────────────────────────────────────────────────────────
// server.js  —  AI Fluency Daily Digest
// Serves static files + proxies Anthropic API calls securely.
// Your ANTHROPIC_API_KEY never reaches the browser.
// Global daily request cap protects against abuse/overcharging.
// ─────────────────────────────────────────────────────────────

import express from 'express';
import fetch   from 'node-fetch';
import path    from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app       = express();
const DATA_PATH = path.join(__dirname, 'data.json');

app.use(express.json());

// Serve all static files (index.html, styles.css, app.js)
app.use(express.static(__dirname));

// ── Data helpers ────────────────────────────────────────────
function loadData() {
  return JSON.parse(readFileSync(DATA_PATH, 'utf8'));
}

function saveData(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// ── Global daily rate limit ─────────────────────────────────
const DAILY_LIMIT = 30;

let dailyCount    = 0;
let lastResetDate = new Date().toISOString().slice(0, 10);

function checkDailyLimit() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastResetDate) {
    dailyCount    = 0;
    lastResetDate = today;
    console.log(`Daily counter reset for ${today}`);
  }
  if (dailyCount >= DAILY_LIMIT) return false;
  dailyCount++;
  console.log(`API call ${dailyCount}/${DAILY_LIMIT} today (${today})`);
  return true;
}

// ── GET /api/debug ──────────────────────────────────────────
app.get('/api/debug', (req, res) => {
  const apiKey   = process.env.ANTHROPIC_API_KEY;
  const adminKey = process.env.ADMIN_KEY;
  res.json({
    version:      'v4',
    hasApiKey:    !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.slice(0, 8) + '…' : null,
    hasAdminKey:  !!adminKey,
  });
});

// ── GET /api/data ───────────────────────────────────────────
// Returns the full digest data (days + topics).
app.get('/api/data', (req, res) => {
  try {
    res.json(loadData());
  } catch (err) {
    res.status(500).json({ error: 'Could not read data file.' });
  }
});

// ── POST /api/chat ──────────────────────────────────────────
// Proxies a single Claude API call for the deep-dive feature.
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server.' });
  }

  if (!checkDailyLimit()) {
    return res.status(429).json({
      error: 'Daily request limit reached. The deep dive feature resets at midnight UTC. Please try again tomorrow.'
    });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await upstream.json();
    res.json(data);

  } catch (err) {
    console.error('Upstream error:', err);
    res.status(502).json({ error: 'Failed to reach Anthropic API.' });
  }
});

// ── POST /api/generate ──────────────────────────────────────
// Generates a new digest entry via Claude, deduplicates against
// all existing concepts, and appends it to data.json.
// Protected by ADMIN_KEY env var (if set).
app.post('/api/generate', async (req, res) => {
  const apiKey   = process.env.ANTHROPIC_API_KEY;
  const adminKey = process.env.ADMIN_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on server.' });
  }

  if (adminKey && req.headers['x-admin-key'] !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  let data;
  try {
    data = loadData();
  } catch (err) {
    return res.status(500).json({ error: 'Could not read data file.' });
  }

  const coveredConcepts = data.days.flatMap(d => d.c);
  const nextDay         = Math.max(...data.days.map(d => d.d)) + 1;
  const today           = new Date();
  const monthDay        = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const prompt = `You are generating the next entry for an AI daily digest aimed at enterprise executives learning AI concepts.

ALREADY COVERED CONCEPTS — do NOT repeat any of these:
${coveredConcepts.join(', ')}

Generate Day ${nextDay} of the digest. Return ONLY a valid JSON object (no markdown fences, no explanation):

{
  "d": ${nextDay},
  "dt": "${monthDay}",
  "cat": "Enterprise AI",
  "c": ["ConceptOne", "ConceptTwo"],
  "a": "Specific article theme or current industry development",
  "u": "Specific enterprise use case naming an industry",
  "s": "One sentence connecting both concepts and the insight."
}

Rules:
- c: exactly 2 concepts, neither can appear in the covered list above
- Pick concepts relevant to enterprise AI in 2025 that build naturally on prior sessions
- a: a concrete, real topic (not generic like "AI trends") — name the technology or event
- u: industry-specific (e.g. "AI-assisted contract review in insurance underwriting")
- s: one plain-English sentence, informative and specific
- cat: assign exactly one of these categories based on the concepts chosen:
  "Foundations" — how AI works at a basic level (training, data, tokens, model types, core algorithms)
  "Architecture" — technical systems and infrastructure (agents, RAG, transformers, inference, pipelines, protocols)
  "Enterprise AI" — business deployment, strategy, ROI, vendor decisions, operational patterns
  "Safety & Risk" — alignment, hallucination, red-teaming, guardrails, liability, benchmarking limitations
  "Society & Law" — regulation, workforce, sovereignty, sustainability, policy`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 600,
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    const result = await upstream.json();

    if (result.error) {
      return res.status(500).json({ error: `Anthropic API error: ${result.error.message || result.error.type}`, detail: result.error });
    }

    if (!result.content) {
      return res.status(500).json({ error: 'Unexpected API response', detail: result });
    }

    const text = result.content?.[0]?.text || '';

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Claude response:', text);
      return res.status(500).json({ error: 'Claude returned an unexpected format. Try again.', raw: text.slice(0, 200) });
    }

    let entry;
    try {
      entry = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      return res.status(500).json({ error: 'Failed to parse Claude response as JSON.' });
    }

    // Validate structure
    if (!Array.isArray(entry.c) || entry.c.length !== 2) {
      return res.status(500).json({ error: 'Generated entry has invalid concepts array.' });
    }

    // Deduplicate check
    const dupes = entry.c.filter(c =>
      coveredConcepts.some(existing => existing.toLowerCase() === c.toLowerCase())
    );
    if (dupes.length > 0) {
      return res.status(409).json({
        error: `Claude suggested already-covered concepts: ${dupes.join(', ')}. Try generating again.`
      });
    }

    // Normalise day number and fallback category
    entry.d = nextDay;
    if (!entry.cat) entry.cat = 'Foundations';

    // Append and persist
    data.days.push(entry);
    saveData(data);

    console.log(`New digest generated: Day ${nextDay} — ${entry.c.join(', ')}`);
    res.json({ success: true, entry });

  } catch (err) {
    console.error('Generate error:', err);
    res.status(502).json({ error: 'Failed to generate digest. ' + err.message });
  }
});

// ── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Fluency server running on port ${PORT}`);
  console.log(`Daily API call limit: ${DAILY_LIMIT} requests`);
});
