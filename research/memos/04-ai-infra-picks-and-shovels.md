# Memo 4: AI Infra Picks-and-Shovels — THE WINNER

**Date:** May 16, 2026
**Verdict:** Confidence 80/100 — highest of any candidate researched.
**Pick:** **Browser/computer-use reliability middleware**, with agent-payments control plane as SKU 2.

## Why this category at all

Sam Altman publicly speculated that the first one-person $1B company emerges in AI infra. 36.3% of new ventures are now solo-founded (Q1 2026). Pieter Levels at ~$3.1–3.5M ARR is the highest verified solo benchmark. Dario Amodei privately puts 70–80% odds on a single-person unicorn by 2026. The pattern that wins solo is narrow: B2D, self-serve, outcome-priced, AI-handles-support, dev-SEO distribution.

## Four candidates evaluated

### 1. Agent eval / observability — DEAD

- **Braintrust**: $80M Series B Iconiq, $800M valuation
- **Langfuse**: acquired by **ClickHouse** January 2026 — observability becoming a data-warehouse feature
- **Helicone**: 3-person YC company, still $500k seed
- **LangSmith**: locked into LangChain distribution + NVIDIA partnership
- Anthropic/OpenAI ship native traces in their consoles — labs eating the developer surface

**Confidence: 4/10. Done.**

### 2. Specialized voice agent infra — partial play

- **Vapi**: $500M valuation, won Amazon Ring deal, 1–5M calls/day
- **Retell**: ~$5.1M total raised, deep compliance moats (HIPAA, SOC2, GDPR, 31+ languages)
- **Bland**: high-volume outbound (1M concurrent calls)
- Gartner forecasts $80B contact-center labor savings by year-end 2026, $22B voice-AI market
- Pricing converges to $0.30–0.80/min + $200–1,500/mo platform fee

**Hyper-niches under-them**:
- FDCPA-compliant debt collection voice (Kompato 3.6% escalation; ClearGrid $10M raise)
- HIPAA + BAA-grade healthcare voice
- Bilingual EN/ES trades

**Confidence: 6.5/10.** Real, but per-vertical revenue ceilings cap nearer $30–80M than $1B unless you stack 3+ verticals.

### 3. Browser / computer-use reliability middleware — **WINNER**

- **Browserbase**: $40M Series B (April 2025), ~$300M valuation, $67.5M total — but **only ~$4.4M revenue at 30–40 headcount**
- **Steel**: OSS Apache-2.0 alternative
- **Anchor**: "deterministic reliability for internal systems"
- **Stagehand**: now folded into Browserbase as SDK layer

**The actual gap (verified):**

Anthropic's **April 2026 postmortem** admitted a harness regression that lowered default effort on Claude computer-use, plus a bug dropping older reasoning history. *Harness-level reliability matters as much as model intelligence* — and neither Browserbase nor Steel provides:
- Selector-drift healing across DOM changes
- Action verification (DOM diff before/after each action; rollback on unexpected state)
- Cross-run memory of what selectors worked per domain
- TLS/fingerprint consistency at the API layer (Feb 2026 ScrapeOps benchmark: most providers fail 3 of 15 fingerprint tests)

UC Berkeley's MAST study (NeurIPS '25 Spotlight) analyzed 1,642 multi-agent traces across 7 frameworks and found **41–87% failure rates, all returning HTTP 200** — silent failures invisible to today's tooling.

**Solo-feasibility: HIGH.**
- Pure-software middleware between two APIs (model + browser provider)
- One person can ship a Stagehand-compatible reliability layer
- Distribution: dev SEO ("Claude computer-use timeout," "browser agent retry")
- Pricing: $0.005–0.02 per verified action; ~90% gross margin (heavy lifting upstream)

**Defensibility:**
- Microsoft's April 2026 Agent Governance Toolkit launch validates the category
- Multi-model neutrality is the moat (like Twilio across carriers)
- Frontier labs each only fix their own harness; none want to depend on another's

**Confidence: 8/10.**

### 4. AI-native vertical data layers — solid runner-up

- 70% of generative models trained on scraped web data; 82% of enterprises demand real-time data
- Bright Data has spent ~$200M+ litigating scraping rights
- Underserved wedges: subcontractor compliance graph (construction), DOT/FMCSA carrier compliance, government contracting (SAM.gov + state portals), veterinary billing codes

**Solo-feasibility: MEDIUM.** Selectors break weekly; once stable, the API is pure software. ~70–85% margin after proxy/compute. Legal exposure real but smaller for vertical-specific data.

**Defensibility: STRONG vs. labs.** Frontier labs will not scrape SAM.gov nightly with entity resolution.

**Confidence: 7/10.** Slower-growing than middleware.

## DARK HORSE — Agent Payments Control Plane

Stripe's May 2026 Sessions launched 288 AI products including **Issuing for Agents** (single-use virtual cards, fund storage, spending controls) and **Link wallet for agents**. >75% of Forbes AI 50 monetize on Stripe.

But Stripe ships *infrastructure*; the app-layer pain is unsolved:
- Budget caps by goal-type
- Vendor allow-lists
- Evidence-of-purchase verification
- Tax/expense categorization
- Refund chasing
- 1,000 micropayments triggering fraud rules

This is a **wrap-Stripe-Issuing-with-an-opinionated-control-plane play**. Take 1–3% of agent spend or $0.05/decision. If Stripe's $1T/yr by 2028 agent commerce projection holds, even 5bps capture = $500M revenue.

**Confidence: 7.5/10.** New category, no entrenched leader, Stripe-blessed.

## Final ranking

| Rank | Candidate | Confidence |
|---|---|---|
| **1** | **Browser/computer-use reliability middleware** | **8/10** |
| 2 | Agent payments control plane | 7.5/10 |
| 3 | Vertical data layers (trucking/construction compliance) | 7/10 |
| 4 | Voice compliance wedges (FDCPA / HIPAA) | 6.5/10 |
| 5 | Eval / observability | 4/10 |

## Top 3 Failure Modes for #1

1. **Labs fix the harness themselves.** Anthropic's postmortem shows active work. Mitigation: stay multi-model, optimize for long-tail (banking portals, ERPs) labs won't go deep on.
2. **Browserbase/Anchor add the layer themselves.** 5 PMs away from selector healing. Mitigation: be the *neutral* layer that works across Browserbase + Steel + Anchor + local Playwright — Twilio-across-carriers positioning.
3. **Compliance/legal exposure.** Anti-bot detection escalation + ToS enforcement may target agentic patterns. Mitigation: sell *into* enterprise's own systems (internal tool automation, Anchor positioning), not third-party public web.

## Bottom Line

Browserbase has $4.4M revenue and 40 people in the leader spot. Anthropic openly admits its own harness is the bottleneck. YC W26 standardized 10% on E2B sandboxes — picks-and-shovels pattern locked in. A solo founder shipping a model-agnostic reliability SDK ("Stagehand for fault-tolerance") rides this exact wave with $0 sales team.

Agent-payments control-plane is the natural SKU 2 — same auth/policy substrate.

**What I would not fund as a solo bet:** agent eval/observability. It's done.
