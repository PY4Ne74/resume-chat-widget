# Resume chat widget

A chat feature for Robert Lamb's résumé site, in the spirit of the base44 hero chat box: a visitor
describes their business/industry/goal, and the assistant responds with a real, grounded example
from Robert's career (never invented) and a soft call to action.

Two pieces:

- **`api/chat.js`** — a backend function that holds the Anthropic API key, grounds every answer in
  `knowledge-base.json` (built from the actual résumé), and enforces a conversion-oriented response
  shape. Deploys to Vercel.
- **`widget/chat-widget.html`** — a self-contained HTML/CSS/JS snippet with no dependencies. Paste it
  into an Elementor "HTML" widget on the WordPress site. It calls the Vercel API over `fetch`.

WordPress/GoDaddy shared hosting can't safely hold a secret API key or run a Node backend, so the
API lives on Vercel (free tier is plenty for a personal site) and the WordPress page just calls out
to it.

## 1. Deploy the API to Vercel

You don't need the Vercel CLI — the dashboard is enough.

1. Push this `resume-chat-widget` folder to a GitHub repo (can be private).
2. Go to [vercel.com](https://vercel.com), sign up/log in (GitHub login is easiest).
3. Click **Add New → Project**, select the repo.
4. Vercel will auto-detect the `api/` folder as serverless functions — you don't need to pick a
   framework. Leave build settings default and click **Deploy**.
5. Once deployed, go to **Project Settings → Environment Variables** and add:
   - `ANTHROPIC_API_KEY` — your key from [console.anthropic.com](https://console.anthropic.com)
   - `ANTHROPIC_MODEL` — `claude-sonnet-5` (or leave unset, that's the default)
   - `ALLOWED_ORIGIN` — your live WordPress domain, e.g. `https://robertlamb.com` (use `*` while
     testing, then lock it down once you know the real domain — this stops other sites from calling
     your API and burning your Anthropic credits)
6. Redeploy (Deployments tab → ... → Redeploy) so the new env vars take effect.
7. Your API endpoint is now `https://<your-project-name>.vercel.app/api/chat`. Test it:

   ```bash
   curl -X POST https://YOUR-PROJECT.vercel.app/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"I run a small B2B SaaS company and need to grow inbound leads."}'
   ```

   You should get back `{"reply": "..."}` citing a real case study (likely IntelliThreat's lead-gen
   story).

## 2. Add the widget to Elementor

1. Open `widget/chat-widget.html` and edit the three config values at the top of the `<script>` block:
   - `API_URL` → your Vercel endpoint from step 1.7
   - `CALENDLY_URL` → your booking link
   - `RESUME_DOWNLOAD_URL` → the hosted URL of your downloadable PDF résumé
2. In Elementor, drag an **HTML** widget into the hero section (or wherever you want the chat).
3. Paste the entire contents of `chat-widget.html` into it.
4. Publish/preview and test the flow end-to-end.

## 3. Keep the knowledge base current

`knowledge-base.json` has one entry per achievement from the résumé, tagged by industry and by what
kind of goal it's relevant to (lead gen, rebrand, budget efficiency, etc.). The model is instructed
to only cite facts from this file — it will not invent companies, clients, or numbers.

When the résumé changes, update this file to match (or ask Claude to re-extract it from a new PDF).
Each entry:

```json
{
  "company": "...",
  "industry_tags": ["..."],
  "challenge": "...",
  "action": "...",
  "result": "...",
  "relevant_for": ["..."]
}
```

More entries = better matches across a wider range of visitor situations, but keep results real and
quantified — that's what makes the chat's claims credible instead of generic.

## Notes on cost, abuse, and quality

- **Cost**: Sonnet 5 at ~400 output tokens/reply is cheap at personal-site traffic volumes. If this
  ever gets heavy traffic, switch `ANTHROPIC_MODEL` to a Haiku model for lower cost per reply.
- **Abuse**: the API caps message length and conversation history size, and `ALLOWED_ORIGIN` blocks
  other sites from using your key. If you see abusive traffic once live, the next step is IP rate
  limiting (e.g. Upstash Redis, free tier) — not built yet since it's unlikely to be needed at this
  scale.
- **Truthfulness**: the system prompt in `api/chat.js` explicitly forbids citing anything outside
  `knowledge-base.json` and instructs the model to say so honestly rather than force a fake match.
  If you ever see it generate a fact that isn't in that file, that's a bug worth fixing immediately
  in the prompt.
