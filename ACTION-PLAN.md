# Resume chat widget — status & next-session action plan

_Last updated: 2026-09-16_

## Where things stand

Live and working end-to-end. Two live endpoints on the same Vercel project:
- **Chat API**: `https://resume-chat-widget.vercel.app/api/chat`
- **Conversation dashboard**: `https://resume-chat-widget.vercel.app/dashboard.html` (password in
  Vercel env var `DASHBOARD_PASSWORD`, currently `h3eAYKfl1vLDLV68kUeNHA`)

The widget (`widget/chat-widget.html`) is ready to paste into an Elementor HTML widget once the
one remaining placeholder below is filled in. This has been an extremely deep multi-session
build — knowledge base, response format, streaming, abuse protection, visual design, QA testing,
and conversation logging have all had substantial work and live verification.

### Knowledge base — fully built out
- `case_studies` (18): the original 14 from the résumé PDF, plus 4 added later — AI-production
  pipeline (enriched with the code-rendered radar-animation detail), video ad production (40+
  Remotion iterations), integrated LinkedIn campaign (15+ posts/10+ themes), SEO + AI-search
  audit (Perplexity citation verified, indexing fix honestly flagged as in-progress), and
  `ai-orchestrated-job-search-ops` (the Lemlist/Smartlead/HubSpot/SendSpark stack + JobbyFind —
  see the verification checklist below).
- `facts` (10): employment type, availability, remote stance, why leaving IntelliThreat,
  company-stage preference, hands-on-vs-strategic, timeline to results, cross-industry breadth
  (now includes real B2C examples — home repair, dog training, real estate — after Rob corrected
  an earlier B2C-coverage gap), **compensation handling** (never quotes a number, redirects to a
  call), **dealbreakers** (marijuana, gambling, adult novelties), **handling-what-doesnt-work**
  (the "nothing launches perfect" philosophy, tied to the real 40+ video-iteration case study),
  references ("available on request").
- `playbooks` (7, all built and live): lead-generation, website-cro, paid-advertising,
  rebrand-fast-production, team-building-leadership (includes a coaching/mentoring bullet Rob
  specifically wanted), competitive-pressure, and a structurally distinct diagnostic-not-sure
  playbook for vague "can you help" questions.
- `positioning_principles` (2): cross-industry-mechanics, technology-mastery.
- `yes_variants` (20) and `breadth_teasers` (8): rotating phrasing pools so multi-topic use
  doesn't read as templated. The breadth-teaser cadence is **deterministic by turn number**
  (every 3rd reply is a candidate), not left to the model to self-modulate — an earlier
  "use this occasionally" instruction was tested and found to essentially never fire.

### Response behavior — all verified live via real QA testing
- Short, bulleted, STAR-form case-study citations; bold `**Actual results I've produced:**`
  labels (rendered as real `<strong>`, not literal asterisks).
- Grammatical agreement (opener matches yes/no vs. open question phrasing), phrasing variety
  (no identical sentences across replies), and reflect-the-visitor's-specifics (city/industry
  terms show up in the opening line) — all confirmed working across a 25-question QA batch plus
  several follow-up multi-turn conversations.
- CTA escalates by conversation depth: qualifying question on turn 1, direct "book a call" ask
  from turn 2 on. **No résumé-download CTA anymore** — Rob removed that button; only "Book a
  15-min call," centered, single button.
- **20-turn conversation cap**: past turn 20, a scripted reply (no model call, zero cost) points
  the visitor to `#form` instead of continuing indefinitely.
- **URL handling**: a job-posting-shaped URL (greenhouse/lever/LinkedIn jobs/etc. patterns) gets
  a real model response that discloses it can't browse the link, then answers from context and
  asks for more detail. Any other URL (presumably the visitor's own business site) gets a
  scripted "fill out the form" reply, no model call.
- Personal job-search questions (a visitor who is themselves job-hunting, not a hiring
  decision-maker) get engaged genuinely using the `ai-orchestrated-job-search-ops` case study,
  but skip the hire-Robert CTA — confirmed working in the 25-question QA batch.
- Filler openers ("Good question —") were found leaking through in QA despite an explicit ban;
  fixed by naming the exact phrase in the STYLE rule.

### Two real bugs found via QA and fixed (not content issues — infrastructure)
1. **Empty/truncated replies** (~20-25% of responses in early testing): Claude's internal
   "thinking" step occasionally consumed most or all of the output-token budget before visible
   text started. Fixed by raising `MAX_OUTPUT_TOKENS` to 2048 and adding an automatic one-time
   retry when a reply streams zero text (safe — nothing has been written to the client yet at
   that point). Verified: every previously-failing question in the QA batch now completes
   cleanly, including on retest.
2. **Conversation logs being silently dropped**: `res.end()` was being called before awaiting the
   KV log write in all three response paths; Vercel can freeze a function once the response is
   sent, killing async work still in flight. Fixed by awaiting the log write before `res.end()`
   everywhere. Verified live: a 2-turn test conversation now shows both exchanges logged
   correctly in the dashboard.

### Conversation logging + dashboard (built this session, live and verified)
- `lib/kv.js`: thin wrapper around Upstash's REST API (no npm dependency added). Degrades to a
  silent no-op if KV env vars aren't set, so chat keeps working either way.
- Storage: **Upstash Redis, free tier**, created directly at upstash.com (not through Vercel's
  marketplace listing, which only offered paid plans starting at $8/month) — database name
  "RL Site Chat Logs," region N. Virginia (us-east-1, matches Vercel's region for low latency).
  Env vars `KV_REST_API_URL` / `KV_REST_API_TOKEN` set in Vercel.
- Every conversation gets a sequential zero-padded ID (00001, 00002, ...) on its first message,
  returned via an `X-Conversation-Id` response header (exposed through CORS). Every exchange —
  across all three response paths, not just normal AI replies — gets logged with full text,
  turn number, timestamp, and type.
- `api/conversations.js`: password-protected read endpoint (`DASHBOARD_PASSWORD` env var).
- `public/dashboard.html`: dark-themed page matching the widget, lists conversations
  most-recent-first, click to expand full transcript, auto-refreshes every 20s. Verified live in
  browser: login works, list renders, transcript expansion works correctly.

### Visual design — dark theme matching Rob's mockup
Widget restyled from the original light theme to a dark/teal design matching a mockup Rob
provided, reusing the exact color tokens already established in his own JobbyFind dashboard
(`--teal:#5EEAD4`, `--bg-1:#090C13`, etc.) for visual consistency across his projects. Includes:
an "Ask Robert's AI" label with a second line ("Trained on how I think, what I've built, and how
I've delivered — not a script"), an "Example" button (fills the input with a random sample
prompt, doesn't auto-send), and an arrow-icon send button. Suggested-prompt chips are currently:
"B2B SaaS, need lead gen," "Evaluate me for a role" (replaced "Small business, tight budget,"
which Rob flagged as attracting underqualified/low-budget leads), and "Rebrand / new launch"
(kept — showcases the AI-production differentiator).

### ⚠️ Pre-launch verification checklist (do this before the widget goes live to real visitors)
The `ai-orchestrated-job-search-ops` case study was written in fully-completed tense per Rob's
explicit instruction, on the basis that the outstanding pieces would be finished within days.
Before this widget is actually embedded on the live WordPress site, confirm each of these is
genuinely true, not just planned — this checklist has not been re-verified since it was written:
- [ ] HubSpot connector reconnected and showing real CRM activity in JobbyFind
- [ ] SendSpark video campaign actually recorded and live
- [ ] GA4 conversion events created (Meetings Scheduled, Resume Downloads, Website Review
  Requests, Chats)
- [ ] Lemlist sequences actually drafted (both tracks)
- [ ] If any of these slipped, edit the `ai-orchestrated-job-search-ops` entry in
  `knowledge-base.json` to match reality before launch — don't let a missed deadline become a
  false claim on a live site.

**One placeholder still needed** in `widget/chat-widget.html` (top of the `<script>` block):
- `CALENDLY_URL` — real booking link (currently a placeholder)

---

## "Talk now" — live voice intercom (new, built 2026-09-16)

The bottom-right intercom-style widget Rob asked for: a floating mic bubble a visitor can
click to jump straight into a live conversation with Rob, no Chrome extension required —
WebRTC/mic access is native to every browser, so the only real problem to solve was
**getting the call to reach Rob**, not getting the visitor connected. Phase 1 implementation
uses a Google Meet handoff rather than a fully custom in-browser WebRTC call (see the
Architecture note below for why, and what Phase 2 would look like).

### How it works
1. Rob opens `public/control-room.html`, logs in with `DASHBOARD_PASSWORD` (same password as
   the conversation dashboard), and flips "Available" on while he's at his computer. This is
   the dynamic on/off switch Rob asked for — the widget only shows the live option when this
   is on.
2. `widget/talk-now-widget.html` — a separate floating bubble (bottom-right, independent of
   the hero chat widget) — polls `GET /api/availability` every 30s. Live → pulsing teal
   "Talk to Robert now" button. Away → "Book a call with Robert" button linking to
   `CALENDLY_URL` instead, so the bubble is never a dead end.
3. Visitor clicks while live: the Google Meet link opens in a new tab **synchronously with
   the click** (so popup blockers don't intervene), then `POST /api/talk-now` fires in the
   background to log the click and trigger Rob's alert.
4. The control room page polls `GET /api/talk-now-poll` every 3s while open and, on a new
   click, plays a two-tone chime (Web Audio API, no audio file needed), fires a desktop
   `Notification` if permission was granted, and shows an on-page banner with a "Join Meet"
   button — this is the "fastest way to reach him at the computer" Rob asked for, no phone
   push service needed since he keeps the tab open while available. A running log below shows
   every click, tagged "answered live" or "missed — you were away."

### Architecture note — why Google Meet handoff instead of a custom WebRTC widget
A visitor never needs a Chrome extension — `getUserMedia`/WebRTC mic access is built into
every modern browser. The actual hard part of a true in-widget voice bubble (like Intercom's)
is presence + signaling infrastructure so Rob's browser can receive an incoming call, which
is a much bigger build (a signaling server, TURN for NAT traversal, a persistent "listening"
client). The Meet handoff gets 90% of the experience — instant, live, zero-install for the
visitor — using Google's existing call infrastructure, buildable in one session. If usage
validates the idea, Phase 2 would replace the Meet redirect with an embedded WebRTC widget
(e.g. Daily.co/Twilio) so the call never leaves the page.

### Meet link — filled in (2026-09-16)
`https://meet.google.com/fax-fpax-onr` — Rob's persistent "Create a meeting for later" room
(meet.google.com → New → Create a meeting for later; doesn't expire, reusable indefinitely).
Set as `MEET_URL` in both `widget/talk-now-widget.html` and `public/control-room.html` — keep
these two in sync if it's ever regenerated.

There is deliberately **no "book a call" fallback** for this feature (Rob's call) — the
widget bubble is fully hidden whenever he's marked Away, rather than degrading to a Calendly
link. `CALENDLY_URL` was removed from `talk-now-widget.html` accordingly; it still lives
separately in `widget/chat-widget.html` for the hero chat's own CTA, unrelated to this.

### New KV keys (same Upstash Redis store, no new service)
`talknow:availability` (current on/off + timestamp), `talknow:ping:counter` /
`talknow:ping:<n>` / `talknow:ping:index` (click log, same recency-index pattern as
conversation logging). Degrades the same way as chat logging — if KV isn't configured, the
availability endpoint fails closed to "away" rather than erroring.

### Not yet done
- [ ] Paste `widget/talk-now-widget.html` into its own Elementor HTML widget on the site
  (bottom-right, independent of the hero chat widget's own container)
- [ ] Rob needs to actually open `control-room.html` and grant desktop notification
  permission once, from the real device he'll be working at
- [ ] Test end-to-end with a second device/incognito tab before relying on it for real traffic
- [ ] Push these new files (`api/availability.js`, `api/talk-now.js`, `api/talk-now-poll.js`,
  `public/control-room.html`, `widget/talk-now-widget.html`, plus the `lib/kv.js` additions) —
  same manual "Push origin" in GitHub Desktop as everything else in this project

---

## Next steps, roughly in priority order

1. **Run the pre-launch verification checklist above** once the outreach-stack work is actually
   finished.
2. **Fill in `CALENDLY_URL`** and set `ALLOWED_ORIGIN` to the real WordPress domain once the site
   is live (currently permissive for testing) — also consider locking `DASHBOARD_PASSWORD` down
   further or rotating it before any real traffic hits the site.
3. Lower priority / not yet built: URL-triggered email/phone contact-capture flow with a
   notification to Rob (spec'd out early on, superseded in spirit by the conversation dashboard,
   which now serves a similar "see what's happening" purpose — may not still be needed).

---

## Quick reference

- Live chat API: `https://resume-chat-widget.vercel.app/api/chat`
- Live dashboard: `https://resume-chat-widget.vercel.app/dashboard.html`
- GitHub: `PY4Ne74/resume-chat-widget` — this sandboxed session has no stored git credentials;
  every push goes through Rob manually clicking "Push origin" in GitHub Desktop. Confirm a push
  landed via `curl -s "https://api.github.com/repos/PY4Ne74/resume-chat-widget/commits/main"`
  rather than trusting the GitHub Desktop UI state (its button label has been a recurring source
  of confusion — it says "Push origin" with a count badge when there's something to push, but
  can misleadingly show "Fetch origin" right after a fetch).
- Vercel auto-deploys on every push to `main`. Deploys are not instant everywhere — a request can
  briefly hit a stale instance right after a push; wait ~15-20s and retry before concluding
  something didn't take.
- Vercel project env vars: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (`claude-sonnet-5`),
  `ALLOWED_ORIGIN` (still needs locking to the real WordPress domain), `DASHBOARD_PASSWORD`,
  `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
- Cost: ~$0.01-0.02 per message exchange (Anthropic); $20 credit funded, covers a very large
  amount of personal-site traffic. Upstash Redis free tier for conversation logging — no cost.
