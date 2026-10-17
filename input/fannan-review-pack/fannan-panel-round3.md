# Fannan plan: Asad round-3 panel review
Thu Oct 15, 2026, about 7:30–7:45 AM (Gaza). Review only: nothing in Fannan or the pack was changed. Pack sha256 is `56bdc7bd82af…077b0` (matches), 41 files, and `PACK-MANIFEST.sha256` still verifies after the review. All test work ran on copies under `r3/cv/`.

**Grok CLI:** it is now signed in (`grok -p "say ok"` → `ok`, 1.0.46), so the note in fixes-round3 that it's "not signed in" is out of date. A full read-only review prompt (`r3/grok-prompt.txt`) **timed out after 600 s with no findings** (`r3/grok-out.md` has only 2 progress lines). The Grok seat is **not counted**. All the seats below are Asad's, and each was checked by running the tools or with grep.

Note: `fannan-full-plan.md` is **not in the pack**. The pack's spec is `fannan-complete-for-review.md`, and that's the one reviewed here. `docs/fleet-audit/fannan-full-plan.md` (14.6 KB) was not cross-checked.

## Verdict: **PASS WITH CONDITIONS** (design and tools). The live bot is **not ready to install**.
The round-2 P0 is fixed, and so are all four round-2 P1 tool bugs, each confirmed by a test. The remaining blockers are process and live-state items: Amin hasn't reviewed the round 1–3 code (rule 5), D1–D5 aren't applied (the live spend cap breaks J1), and the read-only token and branch protection aren't in place (rule 7). One new P1 is a code issue: the Harden gate calls impeccable directly and skips the launcher.

**Counts (new or remaining): P0 0 · P1 5 · P2 7 · P3 8**

## Findings
| ID | P | Seat | File | Problem | Evidence | Concrete fix |
|---|---|---|---|---|---|---|
| R3-1 | P1 | Security | tools/pre-handoff-check.mjs l.83 | The Harden gate runs `../latest/impeccable/scripts/impeccable` directly, not `launcher-impeccable.sh`. That skips the allowlist and copy-hash-run, so it runs whatever upstream script sits at that path. | `execFileSync(join(here, '../latest/impeccable/scripts/impeccable'), ['detect','--json',page])` | Call the launcher by its absolute install path with `IMPECCABLE_BIN` set, and fail if the launcher is missing. Add a test showing a tampered binary gives exit 5 → gate FAIL. |
| R3-2 | P1 | Rules (5) | spec §10 item 1; l.8 | Amin hasn't reviewed the round 1, 2 or 3 code. Rule 5 blocks install. | "Amin hasn't reviewed the round 1 or round 2 changes yet." | Send Amin this pack (launcher, tools, converter, proto-process, diff) and record his PASS/FAIL per file in the spec. |
| R3-3 | P1 | Cost / Rules (8) | proto-skills/proto-setup l.36, proto-build l.15, proto-media l.7, memory save 8 | The live spend cap conflicts with J1 (no cap). **proto-media isn't covered by D1–D5** but still says "ask above the spend cap". | grep output (quoted in O1) | Apply D1–D5, **add a D6 for proto-media**, and reword save 8 to "Ask before anything paid, every time." Needs Amin plus Fadel's yes. |
| R3-4 | P1 | Rules (7) / Security | spec §10 item 2 | The read-only token and main-branch protection are approved but not in place. The free plan can't enforce protection. | "approved, not done … Jabr's daily check is the backup" | Create a fine-grained, read-only, contents-only token for Fannan (name only in settings), or use a read-only deploy key. Record the backup check as a Bot Task. |
| R3-5 | P1 | Security | tools/readonly-precheck.sh; spec §10 item 7 | The precheck is still advisory and has a check-to-write race. The project argument is optional, so with no project it allows any path under design-output (tested: `design-output/a` → 0). | Tests: `x/a b` → 0, cross-project → 11, no project → 0 | Make the project argument mandatory, and have the write go through a wrapper that checks and then writes with `O_NOFOLLOW`. Mark host `allowed-tools` enforcement as unverified until it's tested. |
| R3-6 | P2 | Rules (1) / Privacy | fannan-memory-live.md save 6; proto-skills/proto-build l.18 | Live text still names project facts: Jabr, the QA bot, "en and ar/RTL" (this is O3). | `send Jabr the handoff package … en and ar/RTL` | Change to "the project's engineer (settings.md `engineer:`)" and "the project's locales", and move the names into DC settings.md. |
| R3-7 | P2 | Rules (3) | 7 vendor-skill overrides, l.8–16 | The desktop override says "until the project's approver approves". Rule 3 says Fadel. Fine only if O2 settles on "approver" and DC settings has `approver: Fadel`. | `skills/*/SKILL.md "Desktop only."` | Settle O2 first, then make every override and memory save use the same wording. |
| R3-8 | P2 | Accessibility | spec §10 item 4 | 2.5.7 (dragging), 3.3.8 (accessible sign-in), RTL and the full keyboard-trap check aren't written. The AA minimum isn't fully automated. | §10 l.4 | Add manual-check rows to the evidence template now, and automate them later (RTL: render with `dir=rtl` and diff the mirrored layout). |
| R3-9 | P2 | Arabic/RTL | pre-handoff-check.mjs | No RTL or `lang` pass: one LTR viewport at 1440. Arabic projects can't be gated. | No `dir`/`lang` handling in the script | Add a `--dir rtl` run: check `dir`/`lang` on `<html>`, mirrored focus order, and logical CSS properties. Turn it on only when the project's locales include an RTL language. |
| R3-10 | P2 | Upgrades | designmd-to-sd.mjs `typeFor` | A unitless `fontSize: 16` is typed `dimension` but keeps a bare number, which isn't valid DTCG, and SD may emit `16rem`. | Test: `{"fontSize":{"$value":16,"$type":"dimension"}}` | For unitless numbers on dimension keys, either error ("add px") or emit `"16px"`. Add a test. |
| R3-11 | P2 | Security / Supply chain | spec §10 item 6 | The impeccable binary was built from main, not from the pin. Upstream is +3 commits and playwright 1.64.1 is out. | §10 item 6 | Rebuild from the pinned commit, record the sha256, and have Amin review the 3-commit diff. |
| R3-12 | P2 | Install | spec §10 item 9; O5 | The install manifest doesn't cover the Node runtime, and `trust/MANIFEST.sha256` is stale against the pack. | fixes-round3 O5 | See O5: regenerate it at install time, not in the pack. |
| R3-13 | P3 | Reliability | tools/verify-manifest.sh | A **relative** manifest path breaks after `cd "$root"` (exit 2, `sed: can't read m`). It fails closed but is confusing. Folder names with spaces would break `for d in $dirs`. | Test: relative → rc 2; absolute → OK, and extra/symlink/changed/missing files and a wrong pin all → rc 1 | `m=$(realpath -- "$m")` before the `cd`, and read the covers line by line. |
| R3-14 | P3 | Security | launcher-impeccable.sh | `detect` accepts any existing path (for example `/etc/passwd`), so paths aren't limited to the project. `detect --scope type` with no path passes. | Tests: `detect /etc/passwd` reaches the hash step | Require paths under `/workspace/design-output/<project>/` or the project's read-only repo, and require at least one path. |
| R3-15 | P3 | Reliability | launcher | The copy-hash-run temp folder is in `$TMPDIR`/`/tmp`. A `noexec` /tmp would break every run. | Design | Use a private exec-allowed folder under the agent dir, falling back to `/tmp` with a clear error. |
| R3-16 | P3 | Docs | spec §10 items 3, 8; fixes-round3 header | Out-of-date text: the live DC project-rules now **matches** the pack copy (diff empty), settings.md exists, and proto-share, media and codebase **are** in the pack. The Grok "not signed in" note is also out of date. | `diff` empty; `ls docs/projects/digital-cloud` | Update §10 and fixes-round3. |
| R3-17 | P3 | Docs / Rules (1) | memory save 8 | "12-hour Gaza times" puts a place into a generic save. | save 8 | "12-hour times in the owner's time zone (settings)". |
| R3-18 | P3 | Upgrades | designmd-to-sd.mjs | References like `{colors.q}` are never resolved. A dangling reference passes with exit 0. | Test: rc 0 | Check that every reference resolves to an existing token path. |
| R3-19 | P3 | Docs | Pack | `fannan-full-plan.md`, named as the third file to read, isn't in the pack. | `find pack` | Add it or remove it from the reading order. |
| R3-20 | P3 | UI/UX | pre-handoff-check | Focus-visible is a heuristic (outline or box-shadow only). A focus style done with background or border reads as "not visible". | The script's own note | Compare computed styles before and after focus as a fallback. |

## Earlier findings: status
| # | Finding | Status | Evidence |
|---|---|---|---|
| N1 (R2 P0) | Launcher denylist bypass | **Fixed** | Allowlist test with `IMPECCABLE_BIN=/bin/true`: `live`, `generate`, `skills list`, `help`, URL, `--fix`, `--scope` with no or bad value, and `--version x` → 4. `--version` and `detect .` reach the hash check (5). The gate bypass is R3-1. |
| N2 | Manifest self-attesting, symlinks | **Fixed** | Wrong pin → 1; extra file → 1; symlink → 1; changed → 1; empty → 1; clean → OK. Relative-path bug is R3-13. |
| N3 | Precheck advisory or racy | **Partly fixed** | Outside the root → 10, cross-project → 11, `..` → 10. Still advisory and racy, and the project is optional (R3-5). |
| N4 | Desktop wording | **Partly fixed** | All 7 overrides are the same, but they say "approver", not Fadel (R3-7 / O2). |
| N5 | pre-handoff-check false PASSes | **Fixed** | Ran on a page with two `Go` buttons → 2 tab stops; setTimeout motion → reducedMotion FAIL (1 element changed); detect missing → `ran:false`, gate FAIL. |
| N6 | Amin review | **Not fixed** | R3-2 |
| N7 | Converter 8rem, unquoted hex, regex | **Fixed** | `sm: 8` → `$type number`; unquoted hex → exit 3 with a clear error; empty group → 3; `red` rejected. New: R3-10, R3-18. |
| N8 | Live DC project-rules | **Fixed** | Pack and live files are the same apart from the header lines. |
| N9 | shadcn imperatives | **Fixed** (mostly) | Every `npx shadcn` line is tagged "reference only: Fannan never runs this". l.168 `npm install date-fns` is an example only. |
| N10 | Who writes DESIGN.md | **Partly fixed** | shadcn: "Never writes DESIGN.md". The writer and path weren't re-checked across all skills (unverified). |
| N11 | Dangling proto skills | **Fixed** | All 8 live proto skills are in `proto-skills/`. The proposed proto-build still says "(live skill, not yet in this pack)", which is now out of date (R3-16). |
| N12 | Stale live-browser text, variants | **Partly fixed** | §3 l.198 now says "3–5 variants … Step 4 default 2". Tie-break order not re-checked. |
| N13 | On hold ↔ Bot Tasks | **Fixed in text** | Spec l.58–61, 191, 446, 512. Whether reminders actually fire is unverified. |
| N14 | Chrome, sandbox, WS/SW, inline links | **Fixed** | `CHROME_PATH` env, `--no-sandbox` only with `CHROME_NO_SANDBOX=1`, `routeWebSocket` closes, `serviceWorkers:'block'`, inline-link exemption present. |
| N15 | Hash-then-exec race | **Fixed** | Copy → hash the copy → run the copy, in a 0700 temp folder. |
| N16 | impeccable +3, playwright | **Not fixed** | Waiting for Amin (R3-11). |
| N17 | generate-design trigger | **Not re-checked** | Unverified |
| N18 | BOM, no trailing newline | **Fixed** | A BOM with no closing newline converts (rc 0). |
| R1 P0-1..3, P1-2, P1-8, P1-11..14 | | **Still fixed** | Per round 2; the launcher re-test covers P0-1. |
| R1 P1-3 (key rotation) | | **Fixed by decision** | J3: Fadel's `STITCH_API_KEY`, 90-day rotation, Wazir reminds. Not yet a Bot Task (unverified). |
| R1 P1-5, P1-9 | D1–D5, spend cap | **Not fixed (live)** | R3-3 |
| R1 P1-7 | Merge chain or protection | **Partly fixed** | R3-4 |
| R1 P1-10 | Critic, WCAG | **Partly fixed** | Script bugs fixed; 2.5.7, 3.3.8 and RTL still open (R3-8, R3-9) |

## Rules check (16 rules plus Fadel's shared rules)
- **Followed:** 2 (tool-agnostic, save 3 rewrite), 4 (design.md lint runs in the gate; example DESIGN.md lints with 0 errors, 1 warning), 6 (pending A4), 9, 10, 11, 12, 13, 14, 15 (DC rules only in project files), 16, WCAG 2.2 AA as the minimum (J4), and 8 steps plus Step 9 to Jabr (C5).
- **Broken:** 1 (live save 6 and proto-build l.18, R3-6; save 8 "Gaza"), 5 (no Amin review; binary not from the pin), 7 (no token or protection; precheck advisory; gate skips the launcher), 8 (live spend cap vs J1).
- **Partly followed:** 3 (wording depends on O2), desktop-first (yes), read-only repo (text yes, enforcement no).
- **Missing:** none.

## Open questions O1–O5
- **O1 (spend cap live, P1):** agree it's P1. **Recommendation: apply D1–D5 and add D6 for proto-media** (it also says "spend cap"), and reword save 8, all in one change that goes to Amin and then Fadel's yes. Until then, Fannan should treat every paid job as needing a yes, which is the stricter reading.
- **O2 ("Fadel" vs "the project's approver"):** **Recommendation: use "the project's approver" in the bot**, and put `approver: Fadel` in each project's settings.md. That keeps the bot generic (rule 1), and rule 3 is still met because DC's approver is Fadel. Keep "Fadel" only for system-level gates (spend, installs, routines), where the owner is fixed.
- **O3 (save 6 names Jabr, QA bot, ar/RTL):** **Recommendation: yes, move them** to settings.md (`engineer:`, `qa:`, `locales:`). Fannan's own Step 9 can keep saying "handoff to the engineer". This fixes R3-6.
- **O4 (build path):** **Recommendation: `/workspace/design-output/<project>/` wins.** It's the only path `readonly-precheck.sh` allows, so keeping `/workspace/proto-bot/builds/` would make every gated write fail. Archive the old builds folder; don't delete it.
- **O5 (stale install manifest):** **Recommendation: don't regenerate it inside the review pack.** Mark it as "illustrative, regenerated at install". At install, generate it from the exact installed tree (including Node and R3-1's launcher path), make it read-only (0444), and pin its new sha256 in the spec with Amin's sign-off. `PACK-MANIFEST.sha256` is the right integrity check for the review.

## Unverified
- Grok's second opinion (it timed out with no output).
- Hermes or the host actually enforcing `allowed-tools` and write restrictions.
- What `impeccable detect` actually outputs with the real pinned binary (only `/bin/true` was used, so the allowlist path was tested but not the binary).
- Stitch MCP, shadcn, the a11y audit run as an agent, and the critic loop (3 rounds) end to end.
- Whether On hold reminders and the 90-day key rotation exist as real Bot Tasks.
- `fannan-full-plan.md` (not in the pack) against the spec.
- N10 (who writes DESIGN.md) across all skills, N12 tie-break order, N17.
- The server-side live instructions and memories of the other bots.
