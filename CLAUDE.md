# AI Fluency Daily Digest — Claude Code Handoff

## Project overview
A personal AI learning journal deployed as a dynamic website on Railway.
- **Live site:** https://eyulia-ai.up.railway.app
- **GitHub repo:** https://github.com/eyulia/aidigest
- **Stack:** Node.js + Express, vanilla JS/HTML/CSS, no framework

## File structure
```
ai-fluency-railway/
├── server.js       — Express server; proxies Anthropic API; /api/data, /api/chat, /api/generate endpoints
├── data.json       — All digest content (days, glossary, topics); the only file updated for new sessions
├── app.js          — Frontend rendering; fetches /api/data on load; builds day cards and topic cards
├── index.html      — Single-page app shell; 3 tabs: Overview, Daily Sessions, Deep Dives
├── styles.css      — All styles
└── CLAUDE.md       — This file
```

## How to add a new daily session
Only `data.json` needs to be updated. Two places:

### 1. Add entry to the `days` array (append at the end)
```json
{
  "d": 50,
  "dt": "May 17",
  "cat": "Enterprise AI",
  "c": ["Concept One", "Concept Two"],
  "a": "Combined Latest in AI blurb — article, use case, or strategic insight in one passage",
  "u": "",
  "s": ""
}
```
- `d` — day number (check last entry and increment by 1)
- `dt` — session date (e.g. "May 17")
- `cat` — category: one of `Foundations`, `Architecture`, `Enterprise AI`, `Safety & Risk`, `Society & Law`
- `c` — exactly 2 concept names; must match glossary keys exactly
- `a` — full Latest in AI content (article + use case/insight combined into one passage); can be empty string
- `u` — always set to `""` for new entries (deprecated; kept for legacy days)
- `s` — one-line summary shown on card header (leave empty if not provided)

### 2. Add definitions to the `glossary` object
```json
"Concept One": "Plain-English definition, 1–2 sentences, enterprise-relevant.",
"Concept Two": "Plain-English definition, 1–2 sentences, enterprise-relevant."
```
- Key must match exactly what's in the `c` array
- If a concept already exists in the glossary, skip it

## Day card layout (for reference)
Each expanded day card shows 2 panels:
- **AI CONCEPTS** — concept names + glossary definitions + Deep dive button (calls /api/chat)
- **LATEST IN AI** — shows `a` and `u` stacked with a divider + Explore button. Panel is hidden entirely if both `a` and `u` are empty.

## Current state
- Sessions: Days 1–49 (with gaps at 34, 37, 39, 41 — no session those days)
- Concepts covered: 90 (check glossary object for full list — never repeat)
- Next session: Day 50
- Daily Sessions tab groups cards by category: Foundations / Architecture / Enterprise AI / Safety & Risk / Society & Law

## Deployment
- Railway auto-deploys on every push to `main`
- No build step — just `git add data.json && git commit && git push`
- Environment variables on Railway (do not put in code):
  - `ANTHROPIC_API_KEY` — real Anthropic key (sk-ant-...)
  - `ADMIN_KEY` — protects /api/generate endpoint
  - `PORT` — set automatically by Railway

## Git identity (this machine)
```
user.email = gayunk@gmail.com
user.name  = eyulia
```

## Typical session prompt
> "Read CLAUDE.md. Here's Day 50 content: [paste content]. Add it to data.json and push to GitHub."
