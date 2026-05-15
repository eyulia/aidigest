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
const CAT_ORDER = ['Foundations', 'Architecture', 'Enterprise AI', 'Safety & Risk', 'Society & Law'];

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
});
