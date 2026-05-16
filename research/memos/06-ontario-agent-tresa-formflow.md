# Memo 6: Ontario Agent Workflow Pain — TRESA / FINTRAC / WEBForms

**Date:** May 16, 2026
**Verdict:** Composite 36/45 — **highest score of any wedge across all research**.
**Pick:** OREA Forms + TRESA Disclosure AI Co-Pilot ("FormFlow")

## The forced-consumption regulatory wedge

- **TRESA Phase 2 (Dec 1, 2023)** introduced mandatory delivery of RECO Information Guide before any service; new Information & Disclosure to Self-Represented Party (SRP) form; designated representation model replacing customer/multiple-rep
- **FINTRAC October 2025 update** added mandatory ID verification of unrepresented parties
- **FY24-25 FINTRAC fines**: $25M+, largest year ever. Century 21 Heritage Group hit $150K Dec 2025
- **63% of FINTRAC cases** involved recordkeeping failures; 29% failed STR filing
- **RECO #1 consumer complaint**: BRA confusion. One court already ruled a BRA unenforceable in 2024 because the buyer didn't understand it.
- **Competition Bureau** investigating CREA commission rules; expects explicit commission disclosure on every buyer file

## Market size

- 110,000+ RECO registrants in Ontario
- 89,773 REALTOR-association members (57% of Canadian total)
- 30,000–40,000 "real" agents (4+ deals/year)
- 1.5M NAR members + 160K CREA members continental
- WTP envelope: agents already pay $30-50/mo WEBForms + $20-30 DocuSign + $69-499 Follow Up Boss

## Zero AI-native competition

- WEBForms (OREA) — pre-AI form layout + e-sign
- DocuSign — pure e-sign overlay, not AI
- RunSensible — e-sign + workflow, not AI
- Authentisign, dotloop, Skyslope — e-sign + transaction management, not AI form-fill
- Iluminai (Vancouver, REACH-backed) — brokerage-level FINTRAC compliance, enterprise sales motion, not agent-PLG

**No AI-native player ships voice-memo → auto-filled compliant Ontario form package as of May 2026.**

## Vibes-codeable v1 architecture

- Templated PDFs of TRESA forms (Form 300 BRA, RECO Guide ack, SRP form, Form 100 APS)
- LLM extraction from voice memo (Claude Opus 4.7 + Whisper)
- MLS data pull (HouseSigma MCP precedent shows founder can do this)
- E-sign integration (BoldSign or SignWell API — both have free tiers + REST)
- Stripe billing
- Audit log (Postgres + Supabase)

4-6 week MVP timeline for a vibes-coder with Claude Code.

## Pricing & ARR ceiling

- $79/mo entry tier (autofill + e-sign)
- $149/mo standard (+ FINTRAC audit log + compliance alerts)
- $299/mo full transaction (+ BRA-to-APS + commission disclosure tracker)

| Year | Ontario seats | Continental seats | Blended ACV | ARR |
|---|---|---|---|---|
| 1 | 800 | 0 | $99 | $0.95M |
| 2 | 3,500 | 1,000 | $109 | $5.9M |
| 3 | 8,000 | 5,000 | $119 | $18.6M |
| 4 | 15,000 | 15,000 | $129 | $46M |
| 5 | 25,000 | 40,000 | $139 | $108M |

Ceiling with full buyer-side transaction OS: $150-200M ARR / $1.5-2B valuation.

## Why this wins for THIS founder

1. **Regulatory forced consumption** — mandatory before service can begin
2. **Real enforcement teeth** — $25M+ in fines, $150K Century 21 case, court-unenforceable BRAs
3. **Zero AI-native incumbents** — clean field
4. **Vibes-codeable** — no geometry engine, no enterprise integration hostility, no SDK trust requirement
5. **WTP envelope exists** — agents already pay $120-580/mo on related tools
6. **Founder fit** — Ontario base, real-estate passion, HouseSigma MCP shipped (knows TRREB/OREA tech stack)
7. **Distribution doable solo** — TRREB has 70k members; need 5k paying seats for $5M ARR

## Top 3 failure modes

1. **WEBForms or Lone Wolf bolts on AI** (~25% probability). Mitigation: ship faster, lock in r/TorontoRealEstate ICP loyalty, build brokerage relationships.
2. **OREA endorses a competitor** (~15%). Mitigation: court OREA early via paid sponsorship of educational webinars.
3. **TRESA reverses or simplifies in 2026-2027** (~10%). Mitigation: FINTRAC has independent enforcement; TRESA reversal alone doesn't kill the thesis.

## 60-word elevator pitch

**FormFlow** is the AI co-pilot for Ontario real estate agents drowning in TRESA paperwork. Speak a 2-minute voice memo about your new buyer; FormFlow auto-fills the RECO Information Guide, SRP disclosure, Form 300 BRA, and FINTRAC ID record, e-signs them, and stores the audit trail. $79/agent/month. Forms today, the entire buyer-side transaction tomorrow.
