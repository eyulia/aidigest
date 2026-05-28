/* ─────────────────────────────────────────────────────────────
   app.js  —  AI Fluency Daily Digest
───────────────────────────────────────────────────────────── */

let SITE_DATA = null;

/* ── NAV ── */
function show(id, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.getElementById('sec-' + id).classList.add('on');
  btn.classList.add('on');
}


/* ── TOGGLE DAY CARD ── */
function tog(n) {
  document.getElementById('dc-' + n).classList.toggle('open');
}

/* ── AI DEEP DIVE ── */
async function callAI(areaId, prompt, btnEl) {
  const area = document.getElementById(areaId);
  if (!area) return;

  if (area.classList.contains('on')) {
    area.classList.remove('on');
    if (btnEl) btnEl.textContent = btnEl.dataset.openLabel || 'Deep dive ↗';
    return;
  }

  area.innerHTML = `
    <div class="ai-tag">AI · live</div>
    <div class="dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>`;
  area.classList.add('on');

  if (btnEl) {
    if (!btnEl.dataset.openLabel) btnEl.dataset.openLabel = btnEl.textContent;
    btnEl.classList.add('loading');
    btnEl.textContent = 'Loading…';
  }

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content:
            'You are briefing an enterprise AI executive. ' + prompt +
            ' Be direct, current, and practically useful. End with one sentence on the executive implication. ' +
            'No headers, no bullet points — flowing paragraphs only.'
        }]
      })
    });

    if (res.status === 429) {
      const err = await res.json();
      area.innerHTML = `<div class="ai-tag">Daily limit reached</div><p style="color:var(--ink3)">${err.error}</p>`;
      if (btnEl) { btnEl.classList.remove('loading'); btnEl.textContent = btnEl.dataset.openLabel || 'Deep dive ↗'; }
      return;
    }

    const data = await res.json();
    const txt = data.content?.map(b => b.text || '').join('') || 'Could not load response.';

    const paras = txt
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`)
      .join('');

    area.innerHTML = `<div class="ai-tag">AI · live</div>${paras}`;

  } catch (e) {
    area.innerHTML = `<div class="ai-tag">Error</div><p style="color:var(--ink3)">Could not load. Please try again.</p>`;
  }

  if (btnEl) {
    btnEl.classList.remove('loading');
    btnEl.textContent = 'Close ↑';
  }
}

/* ── BUILD A SINGLE DAY CARD ── */
function buildDayCard(d) {
  const el = document.createElement('div');
  el.className = 'dc';
  el.id = 'dc-' + d.d;

  const glossary = SITE_DATA.glossary || {};
  const cTags = d.c.map(x => `<span class="tag tag-c">${x}</span>`).join('');
  const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const cPrompt = esc(`Give a current, practical briefing on ${d.c[0]} and ${d.c[1]} and their enterprise implications in 2025.`);

  const conceptsHtml = d.c.map((name, i) => `
    <div class="concept-item">
      <div class="concept-name">${name}</div>
      ${glossary[name] ? `<div class="concept-def">${glossary[name]}</div>` : ''}
    </div>
    ${i < d.c.length - 1 ? '<div class="concept-divider"></div>' : ''}
  `).join('');

  const practicalParts = [d.a, d.u].filter(Boolean);
  const pPrompt = practicalParts.length > 0
    ? esc(`Give an enterprise executive briefing on: ${practicalParts.join(' and ')}. Include current relevance and strategic implications in 2025.`)
    : esc(`Give a practical enterprise briefing on how ${d.c[0]} and ${d.c[1]} are being applied in real business contexts in 2025.`);

  const hasPractical = !!(d.a || d.u);
  let practicalHtml = '';
  if (d.a && d.u) {
    practicalHtml = `<div class="practical-block">${d.a}</div>
      <div class="practical-divider"></div>
      <div class="practical-block">${d.u}</div>`;
  } else if (hasPractical) {
    practicalHtml = `<div class="practical-block">${d.a || d.u}</div>`;
  }

  el.innerHTML = `
<div class="dc-head" onclick="tog(${d.d})">
  <div class="dc-num">D${String(d.d).padStart(2, '0')}</div>
  <div class="dc-mid">
    <div class="dc-tags">${cTags}</div>
    <div class="dc-sub">${d.s || ''}</div>
  </div>
  <div class="dc-chev">▾</div>
</div>
<div class="dc-body">
  <div class="dc-panels">
    <div class="dc-panel">
      <div class="panel-label">AI CONCEPTS</div>
      ${conceptsHtml}
      <button class="dive-btn" onclick="callAI('ai-c-${d.d}', '${cPrompt}', this)">Deep dive ↗</button>
      <div id="ai-c-${d.d}" class="ai-box"></div>
    </div>
    ${hasPractical ? `
    <div class="dc-panel">
      <div class="panel-label">LATEST IN AI</div>
      <div class="panel-content">${practicalHtml}</div>
      <button class="dive-btn" onclick="callAI('ai-p-${d.d}', '${pPrompt}', this)">Explore ↗</button>
      <div id="ai-p-${d.d}" class="ai-box"></div>
    </div>` : ''}
  </div>
</div>`;

  return el;
}

/* ── CATEGORY ORDER & LABELS ── */
const CAT_ORDER = ['Foundations', 'Architecture', 'Enterprise AI', 'Safety & Risk', 'AI Philosophy & Values'];

/* ── BUILD DAY CARDS grouped by category ── */
function buildDays(days) {
  const list = document.getElementById('day-list');
  list.innerHTML = '';

  // Group days by category
  const groups = {};
  CAT_ORDER.forEach(cat => { groups[cat] = []; });
  days.forEach(d => {
    const cat = d.cat || 'Foundations';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(d);
  });

  // Render each category section
  CAT_ORDER.forEach(cat => {
    const catDays = groups[cat];
    if (!catDays || catDays.length === 0) return;

    const section = document.createElement('div');
    section.className = 'cat-section';
    section.dataset.cat = cat;

    const header = document.createElement('div');
    header.className = 'cat-header';
    header.innerHTML = `<span class="cat-label">${cat}</span><span class="cat-count">${catDays.length} sessions</span>`;
    section.appendChild(header);

    // Sort newest first within category
    [...catDays].sort((a, b) => b.d - a.d).forEach(d => {
      section.appendChild(buildDayCard(d));
    });

    list.appendChild(section);
  });
}

/* ── FILTER by category ── */
function filtCat(cat, btn) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.cat-section').forEach(s => {
    s.style.display = (cat === 'all' || s.dataset.cat === cat) ? '' : 'none';
  });
}

/* ── BUILD TOPIC CARDS ── */
function buildTopics(topics) {
  const grid = document.getElementById('topics-grid');
  grid.innerHTML = '';

  topics.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'topic-card';
    const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    el.innerHTML = `
<div class="topic-head">
  <div class="topic-title">${t.t}</div>
  <div class="topic-from">${t.f}</div>
</div>
<div class="topic-desc">${t.d}</div>
<button class="dive-btn" onclick="callAI('ai-t-${i}', '${esc(t.p)}', this)">Explore latest ↗</button>
<div id="ai-t-${i}" class="ai-box" style="margin-top:10px"></div>`;

    grid.appendChild(el);
  });
}

/* ── UPDATE STATS ── */
function updateStats(days) {
  const sessions  = days.length;
  const concepts  = days.reduce((n, d) => n + d.c.length, 0);

  document.getElementById('kpi-sessions').textContent  = sessions;
  document.getElementById('kpi-concepts').textContent  = concepts + '+';

  // Streak: weeks spanned from first to last session
  if (days.length > 1) {
    const sorted = [...days].sort((a, b) => a.d - b.d);
    const firstDay = sorted[0].d;
    const lastDay  = sorted[sorted.length - 1].d;
    const weeks    = Math.ceil((lastDay - firstDay + 1) / 7);
    document.getElementById('kpi-streak').textContent = weeks + ' wks';
  }
}


/* ── UPDATE DOMAIN BARS ── */
function updateDomainBars(days) {
  const counts = {};
  CAT_ORDER.forEach(cat => { counts[cat] = 0; });
  days.forEach(d => {
    const cat = d.cat || 'Foundations';
    if (counts[cat] !== undefined) counts[cat] += (d.c ? d.c.length : 0);
  });

  const max = Math.max(...Object.values(counts), 1);

  CAT_ORDER.forEach(cat => {
    const n = counts[cat];
    const fill = document.getElementById('bar-' + cat);
    const label = document.getElementById('barn-' + cat);
    if (fill)  fill.style.width  = Math.round((n / max) * 100) + '%';
    if (label) label.textContent = n;
  });
}

/* ── ARCHITECTURE: layer detail data ── */
const archDetails = {
  ui: {
    name: 'User interface layer',
    desc: 'The surface the user actually touches: a chat window, a voice assistant, a REST API endpoint, or an embedded co-pilot button in an existing enterprise application. The interface layer determines how users interact with the AI system, but contains almost no AI logic itself. It passes inputs down and surfaces outputs up.',
    ex: '<strong>Key question for buyers:</strong> Does the interface connect to your existing workflows (Slack, Teams, your CRM, your ERP) or does it require users to context-switch to a separate tool? Adoption rates differ dramatically.'
  },
  app: {
    name: 'Application layer',
    desc: 'Where your business logic lives. This layer wraps the model with prompts (what the AI should do), guardrails (what it should never do), evaluation logic (how you check output quality), and output formatting (how results are structured for downstream use). This is where most enterprise differentiation is built — and where most deployment failures actually occur.',
    ex: '<strong>Key question for buyers:</strong> Who owns the prompts and guardrails? If your vendor manages them, you have limited ability to change behaviour without their involvement.'
  },
  agent: {
    name: 'Agent framework',
    desc: 'The orchestration layer that turns a single model call into a multi-step workflow. Agent frameworks give the AI the ability to plan a sequence of steps, call external tools (web search, database queries, code execution), loop until a task is complete, and handle errors. Common open-source options: LangChain, LlamaIndex, AutoGen, CrewAI.',
    ex: '<strong>Key question for buyers:</strong> Is your vendor\'s agent framework proprietary or built on open standards? Proprietary frameworks create lock-in at the orchestration layer, which is expensive to escape.'
  },
  multiagent: {
    name: 'Multi-agent coordination',
    desc: 'When multiple AI agents need to collaborate — one researching, one drafting, one checking compliance — they need a shared view of current state and a way to communicate. This is solved through protocols (A2A), stateful runtime environments, and coordination frameworks (MCP). This layer is nascent and actively being standardised as of mid-2026.',
    ex: '<strong>Key question for buyers:</strong> If you plan to run multiple agents across departments, how does the vendor handle shared state, conflict resolution, and audit trails across agent interactions?'
  },
  vectordb: {
    name: 'Vector database',
    desc: 'Stores documents as numerical vectors (embeddings) that capture semantic meaning. Enables RAG — retrieval-augmented generation — where the AI searches its knowledge base for relevant context before answering. The chunking strategy (how documents are split before storage) is a hidden quality lever that most evaluations miss.',
    ex: '<strong>Key question for buyers:</strong> Who manages the embedding pipeline and chunking strategy? Poor chunking produces a vector database that contains the right information but retrieves the wrong pieces.'
  },
  sessionmem: {
    name: 'Session memory',
    desc: 'Persistent storage of what the AI has done, decided, and observed across sessions and tasks. Without this, every interaction starts from scratch — the agent is effectively amnesiac. Stateful memory is what makes long-horizon automation possible: multi-day RFPs, ongoing client relationships, complex procurement workflows.',
    ex: '<strong>Key question for buyers:</strong> Does the AI system remember context across sessions automatically, or does your team need to manually re-brief it each time? The answer has large implications for practical usefulness.'
  },
  pipeline: {
    name: 'Data pipeline',
    desc: 'The infrastructure that moves raw data from source systems (databases, documents, APIs) through cleaning, transformation, and formatting into a form the AI can use. The transformation layer is where enterprise AI projects most commonly fail silently. Dirty, inconsistent, or poorly formatted data produces unreliable AI outputs regardless of model quality.',
    ex: '<strong>Key question for buyers:</strong> What data sources feed the AI system, who maintains the pipeline, and what happens to output quality when source data changes?'
  },
  api: {
    name: 'Model API / inference endpoint',
    desc: 'A managed service that hosts the foundation model and handles inference — you send a request, you get a response. The API layer abstracts away all compute management. Major options: Anthropic API, OpenAI API, Azure OpenAI, AWS Bedrock, Google Vertex AI. Pricing is per token (input + output), with significant variation across providers.',
    ex: '<strong>Key question for buyers:</strong> Which API does your vendor use? If they can only run on one provider, you inherit that provider\'s availability, pricing changes, and terms of service.'
  },
  selfhost: {
    name: 'Self-hosted serving',
    desc: 'Running the model on your own infrastructure rather than through a third-party API. Enables full data privacy (nothing leaves your environment), lower per-query cost at scale, and the ability to run fine-tuned or open-source models. The trade-off: significant operational complexity and the need for GPU infrastructure.',
    ex: '<strong>Key question for buyers:</strong> Does your use case require data to never leave your environment (regulated industries, sensitive IP)? If yes, self-hosting is often mandatory regardless of cost.'
  },
  model: {
    name: 'Foundation model',
    desc: 'The pre-trained neural network whose weights encode the AI\'s capabilities. Training a foundation model from scratch costs tens to hundreds of millions of dollars and is done by a tiny number of organisations (Anthropic, OpenAI, Google DeepMind, Meta, Mistral, a few others). Most enterprises access foundation models via API or download open-source weights.',
    ex: '<strong>Key question for buyers:</strong> Are you locked to one foundation model, or can your application layer swap models as better or cheaper options emerge? Model-agnostic architectures age much better.'
  },
  compute: {
    name: 'Compute infrastructure',
    desc: 'The physical hardware that runs AI workloads — primarily GPUs (NVIDIA H100/H200/B200) for training, and increasingly specialised inference chips (Google TPUs, AWS Trainium, custom silicon) for serving. Compute is the most capital-intensive layer and is dominated by a handful of chip manufacturers and cloud providers.',
    ex: '<strong>Key question for buyers:</strong> Your AI vendor\'s pricing and availability are ultimately constrained by GPU supply. Understanding compute scarcity helps you anticipate price changes and negotiate multi-year contracts appropriately.'
  }
};

let currentDetail = null;

function showDetail(key) {
  const d = archDetails[key];
  if (!d) return;
  if (currentDetail === key) { closeDetail(); return; }
  currentDetail = key;
  document.getElementById('detail-name').textContent = d.name;
  document.getElementById('detail-desc').textContent = d.desc;
  document.getElementById('detail-examples').innerHTML = d.ex;
  const panel = document.getElementById('detail-panel');
  panel.classList.add('open');
  setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

function closeDetail() {
  currentDetail = null;
  document.getElementById('detail-panel').classList.remove('open');
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/data');
    SITE_DATA  = await res.json();
  } catch (err) {
    document.body.innerHTML = '<p style="padding:2rem;color:#c00">Could not load data. Is the server running?</p>';
    return;
  }

  buildDays(SITE_DATA.days);
  buildTopics(SITE_DATA.topics);
  updateStats(SITE_DATA.days);
  updateDomainBars(SITE_DATA.days);
});
