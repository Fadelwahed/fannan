# Digital Cloud: project rules (DRAFT, not yet approved by Fadel)

Drafted Thu Oct 15, 2026, about 3:40 AM (UTC+3) from existing records. **Not yet the source of truth**: Fadel approves it, and Wazir is proposed as its owner. Bots never keep these rules in their own instructions or memory. They read this file at the start of every Digital Cloud task (decision b, Oct 15).

Sources: `/workspace/docs/codex/digital-cloud-company-brief.md` (Oct 14, 1:16 AM), Fadel's Oct 14, 11:08 PM rule (via Website Ops shared memory, recorded in `fleet-audit/fannan-setup.md`), and the SWE and PM bot handoffs (AC-8, AC-11).

## How bots use this file
1. Find the project: Digital Cloud is `/workspace/docs/projects/digital-cloud/`.
2. Read this file, then `settings.md` (vendors) and the brief, before working on the project.
3. If two rules conflict, the newer dated decision from Fadel wins. Flag the conflict and don't guess.
4. Precedence for design work: **these project rules > accessibility > DESIGN.md > impeccable > frontend-design > tool defaults.**

## Copy and naming
- **Location: write "Palestine". Never name the city anywhere in Digital Cloud copy** (Fadel, Oct 14, 2026, 11:08 PM).
  - Brief updated to "Based in Palestine" (Fadel, Oct 15, 2026, 4:56 AM).
- **No partners anywhere** on the site. Never mention OpenSPP or any former product partner. No partner names or logos.
- **No certifications** of any kind. No "ISO" claims and no guarantees.
- Never invent numbers, certifications, offices, team members or quotes.
- Never name support-team cities. Say "teams in several countries".
- Team: "40+ people, since 2013". Use "since 2013", never a count of years.
- Markets: "We work across the Middle East and North Africa." No lead market.
- Approved home copy: hero "AI at the core. People in charge." and statement "Machines do the work. People make the call." (source: `copywriter-handoff/11-home-copy.md`).
- No prices on the site. Three engagement models: fixed-scope project, dedicated team, ongoing support and managed services.
- Generative AI apps and data & analytics are new capabilities, with no claims of past projects. Name AI only in plain text per the brief.
- Main button text: "Talk to us".

## Clients and case studies
- Use the approved client wall only (brief §5, Oct 13, 10:05 PM). Bid-only organisations (Beit Lahia Development Association) and bids we didn't win never appear.
- **UN / UNDP / UN emblem / "Al Fakhoora": nothing appears anywhere until UNDP's written authorization is on record** (AC-8; confirmed by Fadel, Oct 15, 2026, 4:56 AM, safest rule wins).
  - Brief, open-questions.md and 00-README.md now all say the same (conflict F2 closed).
- Consent check before launch: Careem, Loacker, General Sports Authority, and each case-study client. A case study is published only after its client agrees to be named.
- Hidden empty sections: a section with no approved entries (for example the Aidlane "Proof" blocks) isn't rendered at all (AC-11).

## Design and site
- Desktop first: no mobile or phone layouts until Fadel approves the desktop design.
- English, plus Arabic with right-to-left layout, for components that need it in handoff.
- Motion: reduced motion means no movement, nothing is hidden with JavaScript off, and the headline appears within 2 s if the animation script fails (Fadel chose 2 s).
- Must not look AI-generated (brief §7).
- No tracking and no cookie banner. Cloudflare Turnstile only on Contact and Demo.

## People and approvals
- Fadel approves sharing, publishing, spending and merging.
- Copy comes from Writing Bot. Mark placeholders clearly.

## Not in this file (lives elsewhere per project)
- Vendors and tools (design tool, code host, host, storage): `settings.md` in this folder (`/workspace/docs/projects/digital-cloud/settings.md`; moved from `/workspace/docs/vendor-settings.md` Oct 15, 2026, Fadel approval).
- Company facts (services, sitemap, clients list): the brief.

## Project status and decisions (added Oct 15, 2026, moved from Wazir memory per Fadel approval)
These facts used to sit in Wazir's memory. They live here now; bots read this file, not memory.
**Only verbatim source of the cuts:** `/workspace/docs/fleet-audit/pm-bot-handoff.md`. Changes to the cuts are dated amendments only; never re-paraphrase them.

### Status of the cuts
- **Motion cut (AC-1 to AC-4) and case study amendment (AC-5 to AC-12) are DRAFTS.** Fadel has never said ship on either. Full text: pm-bot-handoff.md §§1–2.
- **On hold** until the Stitch / design-tool design docs are approved (handoff Gaps 5).
- **Desktop first:** phone (390) proofs in AC-1 to AC-3 and AC-7 are deferred, not dropped, until desktop is approved. Fadel decides.

### Motion cut details
- **AC-1 limit:** with the GSAP/animation script blocked, the headline is back within **2 s**. With JavaScript fully off, the headline shows immediately (Fadel, Oct 14). The Oct 9 proof measured ~2–2.5 s, so it fails: Jabr fixes the fallback, Website Ops re-shoots, Wazir tracks.
- **Unlock order:** AC-1, then AC-2 and AC-3; AC-4 can run alongside.
- **AC-4 pins:** GSAP skills `aed9cfd`, Emil skills `e8a175d`, Vercel web-design-guidelines skill folder `063bee9`, Vercel rules file `434b7f9`. Refer to them as skills/settings, not vendor lock-in.
- **Aidlane rows** are part of the motion cut In list. Empty Aidlane proof sections must not render (AC-11).
- Scope-cut method: pm-bot-handoff.md §3.

### Case studies, UNDP, sitemap
- **Fadel decides, Wazir carries and chases.** Open: which 3 launch case studies (Website Ops proposed SGS, Dammam/KFIA airports, SAMF), client sign-offs and real results, whether to ask UNDP, sitemap v4.2 approval (SWE schema work waits on it).
- **UNDP / UN emblem / Al Fakhoora:** blocked until a written authorization fixture is on record (AC-8).

### Markets and location
- Gulf, Palestine and wider MENA are **equal; no lead market**. A Saudi-only line was added, then reversed. **No regional pages and no `/regions/` routes** (AC-11).
- Copy says **"Based in Palestine"**; never name the city (Fadel, Oct 14, 11:08 PM). Older "based in Gaza" notes must NOT go into site copy.

### Domain, sitemap, language
- Domain: `digitalcloud.ps` unless Fadel changes it. Sitemap v4.2 is in Drive (pending approval). Language tags: `en` now, `ar` later.

### Board (Bot Tasks)
- Motion cut and case study (AC-5 to AC-12) rows: owner **Wazir** for chasing; PM bot kept as owner on record for history. PM setup row: **Cancelled**.

### Still-open questions (pm-bot-handoff.md §5 and Gaps)
- Ship word for both cuts.
- AC-1 proof fix and new screenshot (2 s limit).
- Three launch case studies, sign-offs, UNDP ask.
- Phone (390) proofs: deferred under desktop first; Fadel decides timing.
- Privacy notice and contact form checks are not in any cut ("Until Fadel answers, I'll keep any privacy notice check out of the cut"); scope depends on regional data law now that there is no lead market.
- No living PRD path named; pm-bot-handoff.md is the record until one is.

### Site audit settings (Fadel, Oct 15, 2026, 6:21 AM)
- audit_target_url: (empty until the site is live; preview URL may be used for the pre-launch baseline)
- planned_production_domain: digitalcloud.ps
- crawl_scope: homepage, nav-linked top pages, one example of each public template (cap about 30 pages)
- Audit routines read these values from here; nothing is hardcoded in the routine. Owner: Website Ops (took over Site Audit's job).

## From Writing Bot memory (inherited from Copy Humanizer), Oct 15, 2026
Moved from Writing Bot memory per Fadel approval (Oct 15, 2026). Source: `/workspace/docs/fleet-audit/copy-humanizer-handoff.md` §1 and §5 (Oct 14, 1:58 AM). Newer decisions are noted inline as **[Newer: ...]**; the rules above win.

### Site structure (Oct 9, 2026)
- digitalcloud.ps is a company site modeled on newlogic.com, with Aidlane products under /en/aidlane/ and /ar/aidlane/. **[Newer: English only (/en/) at launch; Arabic later. Desktop only for now.]**
- Fadel confirmed six services: social protection and registries, data collection and field registration, cash transfers and payments, digital identity and biometrics, ERP and custom software, cloud hosting and infrastructure. **[Newer: the brief's service catalog (7 groups, AI first, cybersecurity added, no marketing services) replaces this list.]**
- Design goes through Google Stitch, run by Website Ops. Centerline/local home page redesign on hold until Fadel approves the design docs (Oct 9, 6:26 AM). **[Newer: no FAQ on the home page.]**

### Aidlane products and wordmark
- Fadel confirmed Aidlane as the product family name (Oct 9, 2026, 12:49 AM). Products: Aidlane Protect, Aidlane Social Registry, Aidlane Farmer Registry, Aidlane Disability Registry, Aidlane Response.
- Wordmark: Centerline ("Aidlane" with one teal line under the whole word), picked by Fadel Oct 9, 2026, 6:26 AM.

### Trademark and domain search (Oct 9, 2026)
- No Aidlane trademark in USPTO or WIPO Global Brand Database. Nearest marks: Aidline (EUIPO pending, classes 5/18/35) and AIDLINE (Brazil, Hypera, class 5). TMview blocked the box.
- Free domains: .ps .net .org .io .ai .co .app .tech. aidlane.com is taken (GoDaddy, expires Oct 28, 2026, no live site). The watch-aidlane-com routine is PAUSED (Oct 13, Fadel via Asad).
- Recommendation on record: attorney clearance search and filing in classes 9 and 42.

### Naming rounds (Oct 9, 2026)
- Fadel chose one English family name plus a descriptor, international, suited to disaster and war zones.
- Haventry was the only candidate that passed a web search in round 1; Aidlane was later chosen (its only web hits: a 1988 truck roadside service and French company Aidlan). Keep Haventry on the used list; don't suggest it as new.
- Already taken, don't suggest again: Resila/Resilia, Sanara, Salura, Tenara, Aidora, Fidara, Alira, Kinura, Ankora, Lumaid, Nexaid, Kindrel, Relifa, Carefold, Lanternly, Wellroot, Commonroot, Civora, Kindora, Unira, Tessaly, Welfora, Kinward. Other earlier clean pick noted: Stead (handoff text cut short here).

### Copy rules (inherited)
- "Digital Cloud" is always two words in visible text.
- Never mention OpenSPP.
- Aidlane product names stay in English, with Arabic descriptors.
- Every claim links to a checked fact in the Notion facts register.
- American English. Times in 12-hour format.
- **[Newer: say "Palestine" only, never "Gaza" (Fadel, Oct 14, 11:08 PM). Region in copy only, "across the Middle East and North Africa"; no regional pages or links (Oct 9, 9:54 AM). Market: Gulf, Palestine, wider MENA, all equal, no lead market; the Oct 9, 9:51 AM "Saudi Arabia only" rule is superseded.]**

### Contact-form legal coverage (Oct 9, 2026)
- Once Fadel picks the form provider: draft the consent line, the at-form notice and the Privacy page section.
- Coverage: Saudi PDPL Articles 12 and 13 (purpose, required fields, recipients, transfer abroad) plus Implementing Regulation Article 4 (our contact details, DPO contact if any, how long data is kept, how to withdraw consent).
- Now has to span the wider region (each country's data protection law applies, per Researchy); a lawyer reviews the final text.
- Sources: Researchy's Notion entry https://app.notion.com/p/3f482a4087e5810b876df0ff3fae8bdd

### Site-approved skills (Oct 9, 2026, 2:55 AM)
- Fadel approved GSAP under Webflow's free license. Amin cleared the GSAP, Emil Kowalski and Vercel skills; only the Vercel skill's folder gets installed, with a pinned copy of its rules (pins: see AC-4 above).
- Locked home-page motion moments: hero headline builds in, fields of expertise reveal, How we work steps advance on scroll, Aidlane rows draw in.
- Jabr cleared the Astro 7.3.8 upgrade (compressHTML, Node 22.12+, Safari 14 build targets), pending Fadel's yes and the GitHub repo.

### File locations
- Copy drafts: /workspace/digitalcloud-copy/aidlane-copy-en.md, aidlane-copy-ar.md, company-home-en-ar.md (predate Oct 9+ changes).
- OpenSPP source extracts (internal reference only, never cite): /workspace/digitalcloud-copy/src/
- Company brief: /workspace/digital-cloud-brief/Digital-Cloud-Brief.md (plus .pdf, .docx, digital-cloud-profile.json); client logos in /workspace/digital-cloud-brief/logos/ (sources in SOURCES.md). **[Newer: the current brief is /workspace/docs/codex/digital-cloud-company-brief.md.]**
- Brand logos: /workspace/digital-cloud-assets/logos/
- Routines review: /workspace/docs/routines-review/copy-humanizer.md
- Notion: project https://app.notion.com/p/3f482a4087e581b8afa2cdd0174f0aa8 ; copy style sheet https://app.notion.com/p/3f482a4087e581918153ef53b55ea4fa
- Name-check screenshots: /home/box/agent-data/agents/3e2a7678-e9b7-426c-92ad-726ebd0c5c58/assets/
