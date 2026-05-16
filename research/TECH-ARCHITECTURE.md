# FormFlow — Technical Architecture & MVP Scope (Reference)

**Stack:** Next.js 15 (TypeScript) + Supabase Canada Central + Anthropic API + Stripe + Vercel
**Founder profile:** Solo vibes-coder using Claude Code
**Target ship:** LTB MVP in 18–25 working days; Status Cert in 10–14 more; OREA Co-Pilot in 6–10 weeks total.

---

## Stack Decisions (Verbatim from Tech Memo)

| Layer | Pick | Why |
|---|---|---|
| Framework | Next.js 15 App Router + TS 5.6 | Claude Code's strongest target; one repo for FE+API+jobs |
| Hosting (compute) | Vercel Pro | Zero-config deploys, preview branches per PR |
| Hosting (data) | Supabase Pro, Canada Central | Postgres + Storage + Auth in `ca-central-1` (Toronto), PIPEDA-clean |
| Auth | Supabase Auth | Free up to 100k MAU; RLS-integrated |
| LLM | Anthropic Claude (Opus 4.7 / Sonnet 4.6 / Haiku 4.5 by subtask) | Best PDF reasoning; prompt caching |
| OCR fallback | AWS Textract (`ca-central-1`) | $50/1000 pages for TABLES+FORMS |
| Voice | Deepgram Nova-3 | $0.0043/min streaming; custom vocabulary for "TRESA, FINTRAC, OREA" |
| PDF generation | `pdf-lib` (forms), `react-pdf` (reports), Puppeteer (LTB binders) | Fill OREA AcroForms; never redraw |
| E-signature | BoldSign ($10/user/mo) | Ontario ECA s.11 court-admissible; clean API |
| Payments | Stripe + Stripe Tax | Auto-HST 13% on Ontario sales |
| Job queue | Inngest | Long-running LLM jobs without Vercel function timeout |
| Analytics | PostHog Cloud | Free to 1M events/mo |
| Errors | Sentry Team ($26/mo) | Required for vibes-coded JS |
| Rate limit | Upstash Redis | $0 free tier |
| Email | Resend | Transactional |

---

## LLM Cost & Margin (Per Transaction)

| Product | Sale price | LLM + ancillary cost | Gross margin |
|---|---|---|---|
| LTB Hearing Prep | $499/hearing | ~$2.75 | 99% |
| Status Cert Analyzer | $49 consumer / $30–50 lawyer | ~$0.75 | 98% |
| OREA Voice → Form | ~$2–3/send (bundled) | ~$0.01 LLM + $0.007 voice | 99%+ |

**At 100 customers (~$25k MRR):** total infra + COGS ~$1,432/mo → **94% blended gross margin**.
**At 1,000 customers (~$250k MRR):** total infra + COGS ~$15,500/mo → **94% blended gross margin** still.

The economics are dominated by Stripe fees (2.9%, linear) and LLM tokens (sub-linear thanks to prompt caching). Margins compound with scale, not decay.

---

## Reliability Architecture (Critical)

For every mission-critical extraction (LTB binder, status cert findings):

1. **Self-consistency runs:** call the model 2–3 times with the same prompt; take majority vote per field.
2. **Citation grounding:** every claim must cite the source page + a verbatim quote ≤ 200 chars.
3. **Verification pass (Haiku 4.5):** independent model checks each citation exists on the cited page; drop unverified findings.
4. **Confidence score:** surface to user; low-confidence findings flagged for human review.

This is the architecture the founder's "computer-use reliability" passion gets monetized inside — not sold as middleware, but used as the moat for the vertical product's output trustworthiness.

---

## Audit Log (Compliance Moat)

Append-only Postgres table with SHA-256 hash chain:
```
each row: prev_hash || canonical_json(payload) || timestamp
daily anchor: latest hash published to public status page
```

This gives tamper-evident proof of: every disclosure sent, every acknowledgement received, every form signed, every FINTRAC ID captured. 7-year retention per RECO. Public daily anchor lets a brokerage compliance officer verify integrity without trusting FormFlow.

---

## PIPEDA / Data Residency Strategy

- **Tenant data (Product 1) + condo records (Product 2):** Process via Anthropic on AWS Bedrock `ca-central-1` for data-at-rest in Canada. Disclose in privacy policy that compute may transit US.
- **Agent voice memos (Product 3):** Lower sensitivity; direct Anthropic API is fine. Disclose US processing.
- **Database & file storage:** Always Supabase Canada Central or AWS S3 `ca-central-1`.
- **Anthropic zero-data-retention:** request via API contract; required.
- **PIPEDA Privacy Impact Assessment:** write 4-page PIA per product using OPC template (priv.gc.ca).

---

## OREA Forms IP — Critical

OREA owns copyright on every numbered form. The legal-compliant integration path:

1. Agent uploads their own current-version OREA form PDFs to their FormFlow account (one-time setup; requires OREA membership).
2. FormFlow uses `pdf-lib` to fill the existing AcroForm fields on those licensed PDFs.
3. FormFlow never redraws or redistributes OREA forms.

This is identical legal posture to how DocuSign and Authentisign operate on OREA forms. **Workaround paths if challenged:** integrate with WEBForms via clipboard handoff or Playwright automation.

---

## MVP Scope Day-by-Day

### Product 1: LTB Hearing Prep (3–4 weeks)
- **Days 1–14:** Auth + upload + payment + Inngest pipeline + Resend email of binder.
- **Days 15–30:** Email/SMS thread upload, L2/L9 support, in-app editable binder, $99/mo tier.
- **Days 31–60:** Multi-case dashboard, batch upload, paralegal white-label tier.

### Product 2: Status Cert Analyzer (2–3 weeks)
- **Days 1–10:** Single-cert upload, parallel-chunk Sonnet extraction (2x self-consistency), citation verification, react-pdf branded report.
- **Days 11–21:** Lawyer dashboard, Word redline export, follow-up chat on the cert, $399/mo unlimited.
- **Days 22+:** Reserve-fund 30-yr visualization, comp-condo aggregation moat, Realtor white-label.

### Product 3: OREA/TRESA Co-Pilot (6–10 weeks)
- **Weeks 1–3:** Form template upload, voice memo → transcript → Haiku field extraction → `pdf-lib` fill → BoldSign envelope.
- **Weeks 4–6:** RECO Info Guide auto-deliver + ack flow, SRP flow, FINTRAC ID capture (Persona ID check at ~$1/verification), hash-chain audit.
- **Weeks 7–10:** Forms 100, 101, 300, 320, 810; brokerage admin view; RECO inspection exports; $79/$149/$299 tiers.

---

## Monday-Morning Starter (Reference)

```bash
npx create-next-app@latest formflow-ltb --typescript --tailwind --app --src-dir
cd formflow-ltb
npm i @anthropic-ai/sdk @supabase/supabase-js @supabase/ssr stripe \
  drizzle-orm postgres drizzle-zod zod \
  pdf-lib @react-pdf/renderer puppeteer-core @sparticuz/chromium \
  @aws-sdk/client-textract @aws-sdk/client-s3 \
  @deepgram/sdk resend \
  @upstash/redis @upstash/ratelimit \
  posthog-js posthog-node @sentry/nextjs \
  inngest
npm i -D drizzle-kit @playwright/test tsx
```

### Accounts needed (90 min on Monday):
GitHub → Vercel Pro → Supabase Canada Central Pro → Anthropic Console (zero-retention) → Stripe Canada + Stripe Tax + CRA HST → Resend (with DNS) → Sentry → Deepgram → AWS IAM `ca-central-1` → BoldSign → PostHog → Upstash → Domain registrar.

### First Claude Code prompt:
> "Build the LTB Hearing Prep MVP. Drizzle schema for users/orgs/ltb_cases/ltb_documents/ltb_outputs/audit_events with hash-chain trigger. Supabase Auth magic-link. `/upload` page for N4 + L1 + ledger PDFs to Supabase Storage Canada. Stripe Checkout $499 one-time. Inngest job on `checkout.session.completed` running the extraction → drafting → PDF pipeline with self-consistency=2. Resend email of the binder PDF. Wire Sentry, PostHog, audit log. Playwright e2e on signup → pay → upload → email. Stop and ask before writing the cross-exam prompt — I'll provide the legal-strategy prompt."

---

## When to Hire

- **$1k–25k MRR:** solo
- **$25k–50k MRR:** fractional CTO 10 hrs/wk ($4–6k/mo) for security review, audit log integrity, compliance bug triage
- **$50k–150k MRR:** first FT senior engineer
- **$150k+ MRR:** support engineer, then product designer, then GTM hire
