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

/* ── FILTER ── */
function filt(type, btn) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.dc').forEach((c, i) => {
    c.style.display = (type === 'all' || i < 7) ? '' : 'none';
  });
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

/* ── BUILD DAY CARDS ── */
function buildDays(days) {
  const list = document.getElementById('day-list');
  list.innerHTML = '';

  [...days].reverse().forEach(d => {
    const el = document.createElement('div');
    el.className = 'dc';
    el.id = 'dc-' + d.d;

    const cTags = d.c.map(x => `<span class="tag tag-c">${x}</span>`).join('');
    const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const cPrompt = esc(`Give a current, practical briefing on "${d.c[0]}" and "${d.c[1]}" and their enterprise implications in 2025.`);

    // Practical panel: combine article + use case if present
    const practicalParts = [d.a, d.u].filter(Boolean);
    const pPrompt = practicalParts.length > 0
      ? esc(`Give an enterprise executive briefing on: ${practicalParts.join(' and ')}. Include current relevance and strategic implications in 2025.`)
      : esc(`Give a practical enterprise briefing on how "${d.c[0]}" and "${d.c[1]}" are being applied in real business contexts in 2025.`);

    let practicalHtml;
    if (d.a && d.u) {
      practicalHtml = `<div class="practical-block">${d.a}</div>
        <div class="practical-divider"></div>
        <div class="practical-block">${d.u}</div>`;
    } else if (d.a || d.u) {
      practicalHtml = `<div class="practical-block">${d.a || d.u}</div>`;
    } else {
      practicalHtml = `<div class="practical-empty">Coming soon</div>`;
    }

    el.innerHTML = `
<div class="dc-head" onclick="tog(${d.d})">
  <div class="dc-num">D${String(d.d).padStart(2, '0')}</div>
  <div class="dc-mid">
    <div class="dc-tags">${cTags}</div>
    <div class="dc-sub">${d.dt}${d.s ? ' · ' + d.s : ''}</div>
  </div>
  <div class="dc-chev">▾</div>
</div>
<div class="dc-body">
  <div class="dc-panels">
    <div class="dc-panel">
      <div class="panel-label">AI CONCEPTS</div>
      <div class="panel-content">${d.c[0]} &amp; ${d.c[1]}</div>
      <button class="dive-btn" onclick="callAI('ai-c-${d.d}', '${cPrompt}', this)">Deep dive ↗</button>
      <div id="ai-c-${d.d}" class="ai-box"></div>
    </div>
    <div class="dc-panel">
      <div class="panel-label">PRACTICAL</div>
      <div class="panel-content">${practicalHtml}</div>
      <button class="dive-btn" onclick="callAI('ai-p-${d.d}', '${pPrompt}', this)">Explore ↗</button>
      <div id="ai-p-${d.d}" class="ai-box"></div>
    </div>
  </div>
</div>`;

    list.appendChild(el);
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
  const useCases  = days.length;

  document.getElementById('kpi-sessions').textContent  = sessions;
  document.getElementById('kpi-concepts').textContent  = concepts + '+';
  document.getElementById('kpi-usecases').textContent  = useCases;

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
