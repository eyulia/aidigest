# Deploying AI Fluency to Railway

## What's in this folder

```
ai-fluency-railway/
├── index.html       ← site shell
├── styles.css       ← all styles
├── data.js          ← session data (edit to add new days)
├── app.js           ← UI logic (calls /api/chat proxy)
├── server.js        ← Express server + Anthropic proxy
├── package.json     ← Node.js config
├── .env.example     ← template for your API key
├── .gitignore       ← keeps .env and node_modules out of git
└── DEPLOY.md        ← this file
```

---

## Step 1 — Push to GitHub

1. Create a new GitHub repo (e.g. `ai-fluency`)
2. Upload all files in this folder to the repo root
   - **Do not upload** `.env` or `node_modules/` (the `.gitignore` handles this)
3. Commit and push

---

## Step 2 — Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub login works)
2. Click **New Project → Deploy from GitHub repo**
3. Select your `ai-fluency` repo
4. Railway will detect it as a Node.js app automatically

---

## Step 3 — Add your Anthropic API key

1. In your Railway project, click the service tile
2. Go to **Variables** tab
3. Click **New Variable** and add:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** your API key from [console.anthropic.com](https://console.anthropic.com)
4. Click **Add** — Railway will redeploy automatically

---

## Step 4 — Get your live URL

1. Go to the **Settings** tab of your service
2. Under **Networking → Public Networking**, click **Generate Domain**
3. Railway gives you a URL like `https://ai-fluency-production.up.railway.app`
4. Your site is live — deep dive buttons will work immediately

---

## Adding new daily sessions

Open `data.js` and append a new object to the `DAYS` array:

```javascript
{
  d:  32,            // session number
  dt: "May 1",       // display date
  c:  ["Concept One", "Concept Two"],
  a:  "Article theme for this session",
  u:  "Use case for this session",
  s:  "One-line summary shown in the collapsed card."
}
```

Commit and push — Railway redeploys in about 30 seconds.

---

## Testing locally (optional)

If you want to test before deploying:

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file with your API key
cp .env.example .env
# then edit .env and paste your real key

# 3. Start the server
npm start

# 4. Open http://localhost:3000
```

---

## Costs

- **Railway:** Free Hobby plan includes $5/month of usage credit —
  more than enough for a personal site with occasional deep-dive requests.
- **Anthropic API:** Pay-per-use. Each deep dive call costs roughly
  $0.001–$0.003 depending on response length. Very low for personal use.
