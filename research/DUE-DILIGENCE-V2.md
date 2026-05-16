# Due Diligence Findings & Updated Plan v2

**Date:** May 16, 2026
**Trigger:** 5 deep-dive agents on legal/IP, customer validation, technical architecture, GTM playbook, and hostile competitive risk returned May 16.
**Conclusion:** The v1 thesis ("zero AI-native incumbents") is empirically false. The plan survives only with re-positioning.

---

## What changed — five material findings

### 1. The Status Certificate Analyzer market is already crowded
**Verified AI-native competitors shipping in Ontario as of May 2026:**
- **Ownright (formerly Doormat)** — launched "Canada's first fully digital status certificate review" July 2025; $4.5M seed; 19 FTE; **second project ever approved by LSO's Access to Innovation (A2I) sandbox**. They have a regulatory moat we will not get in 12 months.
- **Eli Report** (OctoAI Technologies, Vancouver) — explicit Ontario product page; eStrataHub distribution; CEO Jamie Hankinson.
- **CondoDoc AI** (Brookstone Inspection) — "anywhere in Ontario," 6-minute reports.
- **StrataReports** — AB + ON + BC.

**Implication:** Status Cert is no longer a clean greenfield wedge. Either pivot to B2B-only (paralegals/lawyers as buyers, not consumers) or drop it from v1 and revisit later.

### 2. The LTB Hearing Prep market has incumbents we missed
- **LTB Ready** — workflow bundles $59–$69, Bill 60-current.
- **Mi Property Portal** — 17 auto-populated LTB forms, calculated arrears, service tracking.
- **LandlordEzy "Ask Ezy"** — AI chat for N4/N5/N12 guidance.
- **RentZen** — 60,000+ LTB decisions + adjudicator statistics + case precedents (the killer data feature for hearing prep).
- **Openroom** — 1.7M searches/yr, 120k users (tenant-screening adjacent, owns rental ecosystem distribution).

**Implication:** "Generic LTB hearing prep" is contested. The defensible wedge is **adjudicator-specific outcome prediction + evidence-package optimization sold B2B to paralegals**, not consumer wizards. RentZen has the decision corpus but hasn't productized into workflow — that gap is real.

### 3. The TRESA Co-Pilot has the most formidable single competitor
- **Mave AI (Toronto, founder Raz Zohar, ex-Ada engineering)** — $2M pre-seed + $5M seed (closed January 2026), already in beta with **1,000 GTA agents across 90 brokerages**. Their pitch: "run their entire business — including operations, marketing, and brand execution — through a single, compliant system." This is exactly the TRESA Co-Pilot pitch.
- **Iluminai (Vancouver)** — owns FINTRAC compliance for Sutton (6,000 agents), Right at Home, Engel & Völkers; mandatory at Sutton Quantum Jan 2026.
- **Fintracker** — FCT acquired majority Jan 2025; Interac Verified integration May 2026; FCT's title-insurance distribution channel is huge.
- **Lone Wolf Foundation** broker dashboard (Nov 2025) + new CEO Matt Fischer (Jan 2026) focused on AI.
- **Dye & Durham + Robin AI** in Unity (early 2025) + May 2026 Legal Workflow Platform.
- **Harvey AI** — Toronto office Oct 2025; $11B valuation Mar 2026; targeting BigLaw but the talent vacuum is real.
- **SkySlope SmartAudit** (Inside Real Estate stack) — already ships in Canada.

**Implication:** The TRESA Co-Pilot enters a market where Mave has 12+ months head start, $7M cash, and 90 brokerages. We can't win generically. The wedge is **(a) clauses-and-disclosure only, not OREA form distribution, plus (b) paralegal-and-lawyer channel exclusivity**.

### 4. The OREA forms license is a binary gate
OREA's Standard Forms Terms of Use require a **separately negotiated written license** for any software that "applies functionality" beyond the member downloading or printing. The license is discretionary, no published schedule, no SLA on response. Only one published licensed third party for the legal profession (LDD/LawyerDoneDeal). RunSensible operates in a grey zone with no OREA copyright notice on its pages — they are either quietly licensed or quietly infringing.

**Probability of OREA granting a license to a pre-revenue solo non-developer founder: <40%.**

**The clean workaround:** never ship OREA form bytes. Generate the **fill-in language** (TRESA s. 12.1 disclosure text, SRP acknowledgement scripts, conditional clauses, holdback recommendations) and the user pastes into their own logged-in WEBForms session. Zero forms reproduced; same legal posture as DocuSign integrating with WEBForms.

### 5. The LSO A2I sandbox is the regulatory moat that matters
The Law Society of Ontario's Access to Innovation program is a 5-year pilot (launched November 2021). Two approved real-estate legal-tech entrants: **Willful** (wills) and **Deeded/Ownright** (digital closings). The program's June 2025 Convocation Report signals continued LSO appetite.

**Implication:** Any consumer-facing product that touches "legal advice" needs A2I status to be safe from LSO unauthorized-practice-of-law (UPL) enforcement. This is the regulatory moat Ownright already has and we do not. **Apply in the first 7 days.** Without it, the consumer Status Cert and consumer LTB products are exposed.

---

## Tailwinds that strengthen the thesis

### Bill 60 (Fighting Delays Building Faster Act, Royal Assent Nov 24, 2025)
- N4 cure period cut from 14 → 7 days
- Tenants now must pay half the arrears claimed to raise maintenance defences at non-payment hearings
- 7-business-day evidence disclosure rule before hearing strictly enforced

**Effect:** Landlords need to file and prep faster; tenants will counter-claim more aggressively. The LTB product's value proposition strengthens.

### Bruce v. WNCC #26 (2023 ONSC 2995)
A $34K special-assessment shock case where the status certificate stated "no knowledge of any circumstance that may result in an increase in the common expenses" but the buried auditor's report said "It was unknown at the time of the audit the cost of this project, but it is estimated to be significant." Justice Michael R. Gibson ruled the status certificate "should flag in clear language any financial concerns." **Perfect Status Cert marketing case study.**

### Century 21 Heritage Group FINTRAC AMP
$148,912.50 fine, December 2025, currently being appealed. Eryn Richardson (managing partner) on record: "any compliance system is only as strong as the information entered into it." Todd Shyiak (EVP Century 21 Canada): "Current FINTRAC obligations require real estate brokerages to do more than they can realistically do within the law." **These are the fear quotes for every TRESA Co-Pilot cold email.**

### FY24–25 totals
$25M+ in FINTRAC AMPs across Canadian REs. 63% recordkeeping failures. 29% failed STR filing. Real estate explicitly designated "high risk" in 2025 national assessment.

### Competition Bureau commission investigation
Expanded to Greater Vancouver REALTORS Jan/Feb 2026. CREA defence fund depleted ($4M 2024, $1.8M 2025, $2M forecast 2026). Likely creates new commission-disclosure burden = tailwind for compliance products.

---

## The Re-positioned Plan

### Stage 0 (Days 1–7) — Regulatory de-risking
1. Email `standardforms@orea.com` requesting a Standard Forms license for FormFlow (concept memo attached). Expect 4–12 week response. The "no" or silence becomes evidence we needed the clauses-only workaround anyway.
2. Submit LSO A2I sandbox application for the Status Cert + LTB consumer products. Use Willful and Ownright as precedent.
3. Incorporate Ontario business; bind $2M combined Tech E&O + cyber from Founder Shield or Zensurance with explicit "AI output not warranted as legal advice" carve-in.
4. Stand up Supabase `ca-central-1` + AWS Bedrock `ca-central-1` for Canadian data residency.
5. Domain check: `complian.ca`, `formflow.ca`, `hearingprep.ca`, `ltbpro.ca`. Pick parent brand + product sub-brands.

### Stage 1 (Days 1–60) — LTB Hearing Prep, paralegal-channel-first
- **Buyer:** LTB-specialized paralegals (not consumer landlords first). ~250–500 in Ontario.
- **Pricing:** $99/mo per paralegal seat OR $79/L1 prep package they bill through.
- **Product scope (LSO-safe):** evidence package assembly, ledger reconciliation, chronology, RTA section lookup, adjudicator-statistics lookup (RentZen-style data but workflow-first). **NO** legal advice, **NO** drafted submissions, **NO** case-law citation.
- **Distribution:** cold email 30 paralegal firms (Cohen Highley, Azimi, Landlord Paralegal Hamilton, OLH Group, Cordaie, Chubz Legal, D&D Associates, Hummingbird, De Krupe, Justice For Landlords/Kayla Cheong, Green Economy Law/Anna Lippman, LTB Assistance, etc.); SOLO Facebook (3,800 verified members, 20,410 units) for landlord-side awareness only.
- **Kill criterion at Day 14:** ≥10 paralegals booked demo calls + ≥3 paying pilots. Below this, pivot to status cert lawyer-only.

### Stage 2 (Days 30–120) — Status Cert, B2B-only
- **Buyer:** Real estate boutique law firms (Aaron & Aaron, Real Estate Lawyers.ca/Mark Weisleder, Nanda & Associates, GLG LLP, Diamond Law, Insight Law) and condo specialist Realtors who pass it to clients.
- **Pricing:** $30–50/file or $399/mo unlimited for lawyers; $0 to Realtors with co-branded report (RECO-clean — software is paid for by the agent, not a referral fee).
- **Product scope (A2I-safe pending approval):** red-flag detection vs 200-item checklist, page-cited findings, executive summary, **mandatory lawyer countersign for liability transfer**. Position as "decision-support draft" not "review."
- **Differentiator vs Ownright/Eli/CondoDoc:** lawyer-workflow native (Word redline export, prior-report lookup, comp-condo aggregation across our growing corpus). The data moat compounds.

### Stage 3 (Days 90–540) — TRESA Clauses Co-Pilot (NOT forms)
- **Product:** Voice memo → AI generates the disclosure language for the agent to paste into their own WEBForms session. Generates RECO Information Guide acknowledgement script, SRP disclosure script, designated rep notice script, FINTRAC ID record (handled via Persona ~$1/check; we don't store IDs).
- **NEVER**: redraw OREA form layouts, store OREA form PDFs, distribute OREA forms.
- **Buyer:** Brokers of record (the FINTRAC liability holders), not individual agents. ~2,500 brokers of record in Ontario.
- **Pricing:** $299/mo brokerage tier (covers up to 25 agents), $79/mo solo agent tier.
- **Distribution:** Lunch-and-learns at Bosley, Property.ca, RE/MAX Hallmark, Right at Home, Century 21 Heritage (motivated by their $148K fine), Forest Hill, Chestnut Park. Andrew Fogliato (REM publisher) is the single highest-leverage relationship.

### Stage 4 (Year 2+) — Continental expansion
Form-pack equivalents for other Canadian provinces (BC LTB, AB RTDRS), then US state-by-state with state-specific paralegal/lawyer partner networks.

### Realistic Outcome Ranges
- **Bear (35% prob):** $5–10M ARR Ontario lifestyle business, no acquisition
- **Base (45% prob):** $20–50M ARR with paralegal-channel dominance + Stage 3 brokerage adoption; $50–150M acquisition by Iluminai, FCT, Lone Wolf, or Inside Real Estate
- **Bull (15% prob):** $100M+ ARR with continental expansion and US paralegal-network duplication; $500M–1B valuation
- **Killshot (5%):** OREA license denied + Mave wins the brokerage market + RentZen ships paralegal AI = pivot to lawyer-only Status Cert sub-product

---

## The five killshot scenarios, ranked

| # | Killshot | 24-mo prob | Impact | Mitigation |
|---|---|---|---|---|
| 1 | RentZen + LandlordEzy ship AI hearing-brief generation | **60%** | LTB Hearing Prep undifferentiated | Paralegal-channel exclusivity; adjudicator outcome prediction not just briefs |
| 2 | OREA refuses forms license, Mave gets exclusive WEBForms AI | **50%** | TRESA Co-Pilot dies (33% of revenue gone) | Ship clauses-only; sell to brokers of record, not WEBForms-integrated agents |
| 3 | Ownright + Eli + CondoDoc race Status Cert review to free | **45%** | Status Cert revenue floor collapses | B2B-only positioning; lawyer-paid; comp-condo data moat |
| 4 | LSO denies A2I application | **30%** | Consumer products exposed to UPL action | Sell B2B-only (paralegal/lawyer customer takes the liability) |
| 5 | TRREB blocks any MLS integration | **40%** | Limits agent-side data ingestion for TRESA Co-Pilot | Voice memo + manual entry; never integrate MLS in v1 |

---

## Day 1–30 De-risking Action List

- **Day 1**: Email `standardforms@orea.com`. Email `info@lso.ca` requesting A2I program intake call.
- **Day 2**: Incorporate Ontario corp. Domain registration (`complian.ca` parent + `hearingprep.ca` + `statuscert.ca` + product sub-brands).
- **Day 3**: Bind Tech E&O + cyber insurance.
- **Day 4–7**: Join SOLO Facebook, r/OntarioLandlord, r/TorontoRealEstate, r/legaladvicecanada. Observe only.
- **Day 8–14**: Send 30 cold emails to top LTB paralegals (named in customer-validation memo).
- **Day 15–21**: Customer interviews: 10 paralegals + 5 condo lawyers + 5 Sutton/Right-at-Home brokerage managers. Validate paralegal-channel repositioning.
- **Day 22–25**: Build multi-LLM fallback (Claude + GPT-5 + Gemini routing) to de-risk Anthropic transitions.
- **Day 26–30**: Decision gate: kill Status Cert Analyzer as a v1 product or proceed B2B-only based on lawyer interview signal. Sign 3 LOIs with founding paralegal firms.

---

## Five weekly monitoring metrics

1. **OREA Licensed Third-Party Providers page** — new entrants signal lockout risk
2. **LSO A2I approvals** — new entrants signal regulatory race
3. **Mave product roadmap signals** — LinkedIn job postings for "compliance," "forms," "LTB" engineers
4. **RentZen / LandlordEzy changelogs** — feature ship rate
5. **FINTRAC enforcement bulletins + Ontario AI Scribe Guidance evolution** — drives the compliance-fear-sale narrative

---

## What I am committing to with zero doubt

1. The pain is real and growing (Bill 60 acceleration, FINTRAC $25M+, Bruce v. WNCC #26, Century 21 Heritage).
2. The paralegal channel for LTB Hearing Prep is the cleanest beachhead — small (~500 LTB specialists), evangelizable, professional-society driven, and willing to pay B2B prices.
3. The legal architecture (clauses-only, A2I application, Tech E&O, B2B-only consumer-touching products) is buildable in 30 days.
4. The technical architecture (Next.js 15 + Supabase Canada + AWS Bedrock Canada + Anthropic + Deepgram + BoldSign + Stripe) is solo-shippable by a vibes-coder using Claude Code at 94% gross margin.
5. The realistic 5-year outcome is **$20–50M ARR / $50–150M acquisition by Iluminai/FCT/Lone Wolf/Inside Real Estate**. The $1B venture outcome is a 15% bull case requiring continental expansion. Either is a successful business.
