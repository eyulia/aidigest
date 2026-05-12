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
        model: 'claude-sonnet-4-20250514',
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
    const aPrompt = esc(`Summarise the latest enterprise perspective on this topic: "${d.a}". What do executives need to know right now?`);
    const uPrompt = esc(`Give a detailed business case analysis for: "${d.u}". Include ROI considerations, implementation challenges, and the vendor landscape in 2025.`);

    el.innerHTML = `
<div class="dc-head" onclick="tog(${d.d})">
  <div class="dc-num">D${String(d.d).padStart(2, '0')}</div>
  <div class="dc-mid">
    <div class="dc-tags">${cTags}</div>
    <div class="dc-sub">${d.dt} · ${d.s}</div>
  </div>
  <div class="dc-chev">▾</div>
</div>
<div class="dc-body">
  <div class="dc-panels">
    <div class="dc-panel">
      <div class="panel-label">CONCEPTS</div>
      <div class="panel-content">${d.c[0]} &amp; ${d.c[1]}</div>
      <button class="dive-btn" onclick="callAI('ai-c-${d.d}', '${cPrompt}', this)">Deep dive ↗</button>
      <div id="ai-c-${d.d}" class="ai-box"></div>
    </div>
    <div class="dc-panel">
      <div class="panel-label">ARTICLE THEME</div>
      <div class="panel-content">${d.a}</div>
      <button class="dive-btn" onclick="callAI('ai-a-${d.d}', '${aPrompt}', this)">Latest take ↗</button>
      <div id="ai-a-${d.d}" class="ai-box"></div>
    </div>
    <div class="dc-panel">
      <div class="panel-label">USE CASE</div>
      <div class="panel-content">${d.u}</div>
      <button class="dive-btn" onclick="callAI('ai-u-${d.d}', '${uPrompt}', this)">Analyse ↗</button>
      <div id="ai-u-${d.d}" class="ai-box"></div>
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

/* ── GENERATE NEW DIGEST ── */
async function generateDigest() {
  const btn      = document.getElementById('generate-btn');
  const status   = document.getElementById('generate-status');
  const adminKey = localStorage.getItem('adminKey') || '';

  btn.disabled   = true;
  btn.textContent = 'Generating…';
  status.textContent = '';
  status.className   = 'gen-status';

  try {
    const res = await fetch('/api/generate', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-admin-key':   adminKey
      },
      body: JSON.stringify({})
    });

    if (res.status === 401) {
      const key = prompt('Enter admin key:');
      if (key) {
        localStorage.setItem('adminKey', key);
        btn.disabled   = false;
        btn.textContent = 'New digest +';
        status.textContent = 'Key saved — click again to generate.';
        status.className   = 'gen-status gen-info';
      }
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      status.textContent = data.error || 'Generation failed.';
      status.className   = 'gen-status gen-error';
      return;
    }

    // Reload data and re-render
    const fresh = await fetch('/api/data').then(r => r.json());
    SITE_DATA = fresh;
    buildDays(fresh.days);
    updateStats(fresh.days);

    const entry = data.entry;
    status.textContent = `Day ${entry.d} added: ${entry.c.join(' & ')}`;
    status.className   = 'gen-status gen-ok';

    // Open the new card
    setTimeout(() => {
      const card = document.getElementById('dc-' + entry.d);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('open');
      }
    }, 300);

  } catch (err) {
    status.textContent = 'Network error. Try again.';
    status.className   = 'gen-status gen-error';
  } finally {
    btn.disabled   = false;
    btn.textContent = 'New digest +';
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
