# Resume chat widget — status & next-session action plan

_Last updated: 2026-09-14 (session 2, late)_

## Where things stand

Live and working end-to-end at `https://resume-chat-widget.vercel.app/api/chat`, embedded via
`widget/chat-widget.html` (ready to paste into an Elementor HTML widget once the two
placeholders below are filled in). This has been a genuinely deep build session — response
format, streaming, abuse protection, and knowledge-base breadth all got substantial work.

### Response quality/format
- Every reply is short and bulleted — STAR (Situation/Action/Result) for case studies, no more
  prose paragraphs.
- **Grammatical agreement rule**: opener wording adapts to how the visitor actually phrased
  their question (yes/no vs. open "how" question) instead of forcing fixed template wording
  that can read as a non-sequitur.
- **Vary phrasing rule**: same facts/structure stay locked, but sentence wording is never
  identical across replies, even for the same question asked twice — verified live, confirmed
  working.
- **Reflect-specifics rule**: at least one concrete detail the visitor actually typed (a city, a
  number, a phrase) has to show up in the opening line, not just the category — verified live
  ("Dallas," "Denver," "Ohio" all showed up correctly in test replies).
- Result-stating bullets open with a bold **"Actual results I've produced:"** label (widget now
  parses `**bold**` safely via DOM, not innerHTML).
- CTA escalates by conversation depth: qualifying leading question on turn 1, direct "book 15
  minutes" ask from turn 2 onward.

### Knowledge base structure
- `facts` array (8 entries): locked logistics/preference answers (employment type,
  availability, remote stance, why leaving IntelliThreat, company-size preference,
  hands-on-vs-strategic, timeline to results, cross-industry breadth).
- `positioning_principles` array (2 entries, restructured from a single field this session):
  `cross-industry-mechanics` (never apologize for an industry gap, cite the closest real case
  study as proof the mechanics transfer) and `technology-mastery` (business runs on a digital
  ecosystem; Robert is the expert in the tech/AI/process it takes to win in it) — both are
  "core beliefs" the model weaves in where relevant, not facts to recite verbatim.
- `playbooks` array: `lead-generation` fully built and locked (exact `opener_template` + a
  6-point factors list ending "And more"). **6 more drafted but not yet built** — website/CRO,
  paid ads, rebrand/production speed, team leadership, competitive pressure, and a diagnostic
  opener for "I don't know what's broken." Full drafted wording is in this session's transcript,
  awaiting Rob's review/edits before implementation (same pattern as lead-generation).
- `case_studies` array: 18 entries total. The original 14 from the résumé PDF, plus 4 added this
  session:
  - Enriched the existing AI-production-pipeline entry with the code-rendered (non-AI)
    radar/scanner animation detail — proof of range beyond just prompting AI tools.
  - **New**: video ad production (40+ Remotion iterations per campaign, 4K finals, in-house).
  - **New**: integrated LinkedIn campaign (15+ posts + matching custom graphics across 10+
    themes).
  - **New**: SEO + AI-search audit (diagnosed a botched domain-migration redirect problem,
    shipped fixes across 32 pages, verified Perplexity already citing IntelliThreat by name —
    core indexing fix explicitly flagged as still in progress, not overstated).
  - **New**: `ai-orchestrated-job-search-ops` — Robert's own AI-orchestrated outreach stack
    (Lemlist/Smartlead/HubSpot/SendSpark) plus the "JobbyFind" live ops dashboard he built to
    track it. Framed as "he applies his own tools to his own goals — exactly what he'd do for
    you" (Rob's own phrase, confirmed he likes this framing). **Written in completed tense per
    Rob's explicit instruction** — see the verification checklist below before this goes live.

### Technical / production-readiness
- **Streaming**: `api/chat.js` proxies Claude's response token-by-token to the widget (matches
  the base44 reference UX) instead of waiting for the full reply. Claude's stream can include a
  "thinking" content block before the "text" block — that's filtered server-side and never
  reaches the client. Verified both with a local mocked-stream test and live in the browser
  (caught a screenshot mid-stream showing text cut off mid-word, then snapping into formatted
  bullets on completion).
- **Rate limiting**: in-memory, per-IP, 15 requests / 10 minutes, 429 after that. Verified
  locally (trips correctly on the 16th request). Documented caveat: this is per-instance, not a
  hard distributed guarantee across Vercel's multiple possible instances — proportionate for
  personal-site traffic, not bulletproof against a determined attacker. Upgrade path if needed:
  Upstash Redis (new account required).
- **AI disclosure badge**: small pill in the widget intro. Copy iterated live with Rob, current
  text: "Powered by Robert's real insights & track record" (Rob explicitly chose to drop the
  word "AI" from the visible text, keeping only the 🤖 emoji — flagged to him that this slightly
  weakens the disclosure/showcase angle the badge was designed for; he kept it as-is).
- **Real bug found and fixed** (not flaky API behavior): Claude's response can include a
  `thinking` block before `text`; code was reading `content[0].text` directly, which was
  `undefined` whenever a thinking block appeared, causing empty replies. Fixed to find the block
  by `type === "text"`. Also raised `MAX_OUTPUT_TOKENS` from 400 to 1024 so longer playbook
  responses (which include real "thinking" token overhead, seen up to 331 tokens in testing)
  never risk truncation.

### ⚠️ Pre-launch verification checklist (do this before the widget goes live to real visitors)
The `ai-orchestrated-job-search-ops` case study was written in fully-completed tense per Rob's
explicit instruction, on the basis that the outstanding pieces will be finished within days.
Before this widget is actually embedded on the live WordPress site, confirm each of these is
genuinely true, not just planned:
- [ ] HubSpot connector reconnected and showing real CRM activity in JobbyFind (was
  disconnected as of this session)
- [ ] SendSpark video campaign actually recorded and live (was "not yet tracked," blocked on
  recording the thank-you video, as of this session)
- [ ] GA4 conversion events created (Meetings Scheduled, Resume Downloads, Website Review
  Requests, Chats) — all showed blank/pending as of this session
- [ ] Lemlist sequences actually drafted (both tracks were empty as of this session)
- [ ] If any of these slipped, edit the `ai-orchestrated-job-search-ops` entry in
  `knowledge-base.json` to match reality before launch — don't let a missed deadline become a
  false claim on a live site.

**Two placeholders still needed** in `widget/chat-widget.html` (top of the `<script>` block)
before this can go into Elementor:
- `CALENDLY_URL` — real booking link
- `RESUME_DOWNLOAD_URL` — hosted URL of the downloadable PDF résumé (once it's live on the
  WordPress site)

---

## Next steps, roughly in priority order

1. **Review the 6 drafted playbooks** (website/CRO, paid ads, rebrand, team leadership,
   competitive pressure, diagnostic opener) — approve/edit, then implement the same way
   lead-generation was built.
2. **Run the pre-launch verification checklist above** once the outreach-stack work is actually
   finished.
3. **Fill in the two widget placeholders** (Calendly, résumé URL) and set `ALLOWED_ORIGIN` to
   the real WordPress domain (currently permissive for testing).
4. Optional/lower priority: URL/contact-info capture flow (regex-detect a pasted URL → scripted
   reply asking for contact info; regex-detect email/phone → notify Rob, proposed via Resend) —
   spec'd out earlier this session but not built. #8 (differentiator) and #9 (compensation
   handling) from the original 10-question intake round are also still open.

---

## Quick reference

- Live API: `https://resume-chat-widget.vercel.app/api/chat`
- GitHub: `PY4Ne74/resume-chat-widget` — this sandboxed session has no stored git credentials;
  every push this session went through Rob manually clicking "Push origin" in GitHub Desktop
  (usually labeled "Push origin" with a count badge, sometimes shows as "Fetch origin" right
  after a fetch — same button either way). Confirm a push landed via
  `curl -s "https://api.github.com/repos/PY4Ne74/resume-chat-widget/commits/main"` rather than
  trusting the GitHub Desktop UI state.
- Vercel auto-deploys on every push to `main` — no manual redeploy click needed anymore (only
  needed the first time, before the GitHub integration's auto-deploy was confirmed working).
  Deploys are not instant everywhere — a request can briefly hit a stale instance right after a
  push; wait ~15-20s and retry before concluding something didn't take.
- Vercel project env vars: `ANTHROPIC_API_KEY` (real key, billing funded with $20 credit),
  `ANTHROPIC_MODEL` (`claude-sonnet-5`), `ALLOWED_ORIGIN` (still needs to be locked to the real
  WordPress domain once it's live)
- Cost: ~$0.01-0.02 per message exchange at current knowledge-base size; $20 credit covers a
  very large amount of personal-site traffic
