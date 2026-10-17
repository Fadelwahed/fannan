# Fannan r7: every open item and install blocker (merged list)

> **Update Oct 16, 2026, 8:00 AM:** B4 is CLOSED. Node v22.23.3 is installed side by side at `/home/box/.local/node-v22.23.3` (sha256 df450af8… verified; system Node stays v20.19.2). Fadel gave his yes, so the Node 22 decision is done.

Written Fri Oct 16, 2026, about 8:20 AM Gaza time, by Mi'mar.

**Sources:**
- `REVIEW.md` (Mi'mar, r7)
- `SECURITY-amin.md` (Amin, r7, 7:57 AM)
- for carry-forward, both r6 files in `../fannan-codex-r6/`

Each item below was checked against both r7 files. Where the two disagreed, the later or more specific evidence wins, and the disagreement is noted. Paths are relative to `pkg/fannan-review-candidate/release/`.

## Status

Revision 2 of the Fannan rewrite (manifest `204f79e4…2b06`, 57/57 files OK, pin matches) **passes for design and code with conditions, but cannot be installed yet**.

- **Amin's review:** he has now done a full per-file review of this exact digest and every file passed, so the old "Amin hasn't reviewed it" blocker (R3-2) is **closed**.
- **What still blocks install:**
  - the safe writer refuses every write on our box (because of an owner check);
  - the Impeccable detector binary is not staged;
  - there is no proof of the read-only token or the branch check (Jabr, due Oct 20);
  - Node 22 and the npm packages are not installed or re-hashed on the box;
  - there is no proven one-step install with rollback;
  - Fadel has not said yes.
- **Codex hasn't seen Amin's findings yet.** `FOR-CODEX-r7-findings.md` holds both reviews, but it hasn't been sent.

**Counts: 7 blockers (P1) · 8 P2 · 9 P3 · 8 decisions for Fadel = 32 items.** No P0.

Owners: **Codex** patches the package, **Amin** re-reviews security, **Jabr** supplies access proof, **Fadel** approves, and **Mi'mar** coordinates and re-checks.

---

## 1. Install blockers (P1)

| ID | Description | File:line | Source | Fixes | Exact fix | How to verify it's closed |
|---|---|---|---|---|---|---|
| B1 | **The safe writer refuses every write on our box.** It demands that `/workspace` and `/workspace/design-output` are owned by root. On the box both are owned by `box` (uid 1000), mode 755. So no evidence file and no checker run can ever succeed. | tools/safe-write.py:44-52 (and :83) | Mi'mar N-1; Amin P1-1 | Codex (patch), Amin (re-review) | **Recommendation A:** trust uid `{0, euid}` for `/`, `/workspace` and the output root. Refuse group or other write unless the sticky bit is set. Create the project folder with `os.mkdir(project, 0o700, dir_fd=root_fd)` before the openat2 at l.83. Change `security-and-install.md:19` from "root-owned" to "root or the writer's uid". Add a test that a 0o777 non-sticky folder is refused. **Do not chown `/workspace`.** | On the box, calling `require_host(Path('/workspace/design-output'))` returns no error. `python3 -m unittest tests/test_guard_tools.py` passes, including the new test. A real `safe-write.sh test-proj /workspace/design-output/test-proj/x.txt` writes once and refuses a second write. Amin re-checks by Oct 23. |
| B2 | **The detector binary isn't staged, and the fallback path is inside the release.** The full gate can never PASS, and a file at the fallback path would break the manifest (an extra file). The source is known: `pbakaus/impeccable` release **engine-v0.1.14**, asset `impeccable-linux-x64`, sha256 `3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6`. | tools/pre-handoff-check.mjs:215; tools/launcher-impeccable.sh.internal:7-8; references/security-and-install.md:17 | Mi'mar r6 P1-3 / r7; Amin P1-2 (r6 P1-1 + P2-3) | Codex (code); install step with Fadel's yes (Amin runs or witnesses) | Code: at l.215 use `const IMP_BIN='/home/box/agent-data/fannan-bin/impeccable-linux-x64'` and refuse any other `IMPECCABLE_BIN`. Install: `curl -fsSLo /tmp/imp https://github.com/pbakaus/impeccable/releases/download/engine-v0.1.14/impeccable-linux-x64 && echo "3d31ec1a…efb6  /tmp/imp" \| sha256sum -c - && install -m 0555 /tmp/imp /home/box/agent-data/fannan-bin/impeccable-linux-x64`. Never `npx impeccable@latest`. Do not adopt engine-v0.1.15 (`b4e2ebcb…`). | `sha256sum /home/box/agent-data/fannan-bin/impeccable-linux-x64` = `3d31ec1a…efb6`, mode 0555. `launcher-impeccable.sh --version` returns rc 0. A pre-handoff run shows `impeccable.ran: true`. `verify-manifest.sh` is still OK (57 files or the new count). |
| B3 | **No proof of the read-only token or main-branch protection (R3-4).** The package describes a one-repo Contents:read token and a daily engineer check as the fallback, but there is no evidence. Line 11 also bans the safe probe (it says "no real push"). | references/security-and-install.md:11-13 | Mi'mar r6 P1-2 / r7; Amin P1-3 | **Jabr** (evidence), Codex (text) | Jabr supplies Amin's 5 items (r6 `SECURITY-amin.md` §7): (1) the token scope via screenshot or API: 200 on the repo, 404 on a second repo, plus the expiry header; (2) a ref-create with an all-zero sha, which must return **403** (422 means the token can write); (3) `GET …/branches/main/protection`, where 403 is expected on the free plan; (4) the daily-check task's ID, owner, schedule, **last run time (Gaza) and result**, alert rule and escalation; (5) the secret's **name** only, and its expiry. Codex changes l.11 to allow "a request that cannot mutate (zero-sha ref create) expected to return 403". | Amin's **re-check on Oct 20, 2026** finds all 5 items, no secret values shown, and a 403 on the probe. The daily check is labelled "detective control". The task's last run is within 24 h. |
| B4 | **Node 22 isn't installed.** The box has v20.19.2, and the checker refuses anything below 22.12. The pin is ready: v22.23.3 linux-x64 `.tar.xz`, sha256 `df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de`. Amin found the GPG signature Good (key `5BE8A3F6C8A5C01D106C0AD820B1A390B168D356`). | runtime/node-runtime.json; tools/pre-handoff-check.mjs:19-20; security-and-install.md:25 | Mi'mar r6 P1-4 / r7; Amin r6 P2-5 (closed as text) | Install step with Fadel's yes (D2); Amin verifies | Download, check the sha256 against the pin, and extract side by side to `/home/box/agent-data/node-v22.23.3/`. **Not global**, and keep Node 20. Call it by absolute path in every Fannan tool command and in `npm ci`. | `/home/box/agent-data/node-v22.23.3/bin/node --version` prints `v22.23.3`. The tarball's sha256 matches. `node --version` on PATH is still v20.19.2. |
| B5 | **The npm packages aren't installed or re-hashed on the box (recommendation B).** The tools refuse to run without a verified dependency tree. Amin showed that an existing Linux tree from the same lockfile already gives the pinned digest `0f7891db…a031`. That disproves my worry (N-3) that a Mac-vs-Linux difference would break it, but the real install hasn't happened. | runtime/dependency-trust.json; tools/verify-deps.mjs:26-40 | Mi'mar N-3 (disproved as a mismatch, kept as an install step); Amin rec. B | Install step with Fadel's yes; Amin witnesses | A fresh `npm ci --ignore-scripts --prefix /home/box/agent-data/fannan-deps`, using **Node 22's own npm**, from `runtime/package.json` and the lock (sha `55a645b1…8710`). Then compute `inventoryDigest(node_modules)`. **It must equal `0f7891db…a031`. If it doesn't, stop and re-review, and never re-pin quietly.** Don't reuse `/workspace/fannan-asad/r3/cv/node_modules`. | The digest printout equals the pin. `sd-build.mjs` and `designmd-to-sd.mjs` run on the fixture without "dependency inventory mismatch". |
| B6 | **There is no proven one-step install with rollback.** Fannan has to be paused, then all skills, callers, the manifest and pin, and memory swapped at once, and everything restored on failure. The package gives a checklist and evidence matrix, but no real mechanism on this host. The full gate has also never run end to end, because Node 22, the deps and the binary are missing. | references/security-and-install.md:35-50 (§ "Transactional activation and rollback"); OPEN-QUESTIONS.md item 4 | Mi'mar r6 P1-5 / r7 | Mi'mar (plan the host steps), Amin (verify), Fadel (approve); Codex if text changes | Write the actual host runbook. Back up the live skills, memory and tools to Drive with a verified sha256. Stage the new tree inactive. Run manifest, precheck, token build and a full `pre-handoff-check.mjs` on the fixture with the real binary. Pause Fannan, swap everything, read it all back, then resume. Have a tested restore of each changed part. | A dry run on a copy succeeds. A failure-injection test restores the old skills and memory byte-for-byte (sha256). After install, the full gate returns PASS on the fixture, with `handoffReady` set only for a valid package. |
| B7 | **Fadel hasn't said yes on this exact version.** Install also needs his yes on digest `204f79e4…2b06`, or on the newer digest after the B1/B2 fixes. Any Codex patch changes the digest, so Amin's re-review and Fadel's yes must be on the **final** digest. | INSTALL-ACCEPTANCE.md | Amin P1-4; Mi'mar r6 P1-1 (Amin's review part now closed) | Fadel (in Mi'mar's chat), after B1-B6 | Present Fadel with the final digest, Amin's per-file PASS for that digest, Jabr's proof, and the install runbook. Record his written yes. | Fadel's written yes is recorded with the digest. The digest matches `trust/PINNED.sha256`. |

---

## 2. P2 items

| ID | Description | File:line | Source | Fixes | Exact fix | How to verify |
|---|---|---|---|---|---|---|
| P2-A | **The browser path is set by an environment variable and isn't pinned.** Anyone who controls Fannan's environment could run any program inside the gate. | tools/pre-handoff-check.mjs:6 | Amin P2-1 (new in r7; not in Mi'mar's review) | Codex | `const CHROME='/usr/bin/google-chrome'` (or a reviewed path in `runtime/`). Refuse a `CHROME_PATH` override. Record the Chrome version and sha256 in evidence.json. | `grep CHROME_PATH tools/` finds nothing. evidence.json has the Chrome version and hash. |
| P2-B | **The binary path can be anything, and the copy step follows symlinked parent folders.** It only reads the file, and the hash check still protects it. | tools/launcher-impeccable.sh.internal:8,41 | Amin P2-2 (r6 P2-4) | Codex (after B2) | After l.8 add `[ "$(realpath -e -- "$IMPECCABLE_BIN")" = /home/box/agent-data/fannan-bin/impeccable-linux-x64 ] \|\| die 'unexpected binary path' 3`. | Pointing IMPECCABLE_BIN at a symlink or another path gives rc 3. |
| P2-C | **Gap between hashing and loading the deps.** The tree is hashed, then imported later, so a process running as the same user could swap a file in between. | tools/verify-deps.mjs:26-33; sd-build.mjs:35-37; pre-handoff-check.mjs:26-29 | Mi'mar N-2; Amin P2-3 | Codex (+ install step) | Fixed root (P3-A). After install, `chmod -R a-w /home/box/agent-data/fannan-deps`. Add to UNTESTED: "same-uid swap is a residual risk". | The deps folder is read-only (`find … -perm -u+w` finds nothing). UNTESTED has the line. |
| P2-D | **Paid tools are stopped by text only.** "Ask Fadel before anything that costs money" is an instruction, and nothing in the runtime enforces it. This is disclosed. | references/security-and-install.md:7 | Amin r6 P2-6 / A4 (open in r7) | Fannan's runtime (whoever wires the tools) + Amin test | Gate paid tools per call, so each needs a fresh approval token from Fadel. Add a test where a paid job without a yes is refused. | A test call without approval is refused. Amin re-tests (target Oct 22, from r6). |
| P2-E | **Missing records:** the verbatim retired-routines archive (`fannan-retired-routines.md`), the original helper code and its 13 tests, and the external approval register / full plan. All are referenced but absent, so they can't be checked at install. | OPEN-QUESTIONS.md item 7; UNTESTED.md; memory/FANNAN-MEMORY-PROPOSED.md:3 | Mi'mar r6 P3-9 / r7 (raised to P2 here because B6 wants the helper tests) | Mi'mar (find them on the box or in Drive), Fadel (D6) | Search the box, the Drive backups and Fannan's store for the three items. Add them to the input pack, or record Fadel's decision to proceed without them. | Each item has a path and sha256, or Fadel has decided in writing to waive it. |
| P2-F | **Screen size:** the gate checks only one desktop size (1440×900). Other permitted desktop widths and zoom/reflow are manual. | tools/pre-handoff-check.mjs:55,171 | Amin R3-9 (design, open) | Codex | Loop over the project's declared desktop widths from settings, with a minimum of 1280, 1440 and 1920. Add a 400% zoom / 320 px reflow check that is evidence only and is not a mobile design. | evidence.json lists every declared width with a result. |
| P2-G | **The token converter silently gives no type** for unknown values, instead of raising an error. | tools/designmd-to-sd.mjs:31-41 (`typeFor` returns `undefined`) | Amin R3-10 / R4-2 (open) | Codex | Collect unknown types into `errors` and exit non-zero. Allow `undefined` only for `{reference}` values. | A fixture with an unknown token value makes designmd-to-sd fail with a clear message. |
| P2-H | **Things only a real project can prove:** taste and design quality, real WCAG with assistive technology, RTL with real copy, provider calls (Stitch, Figma, media), live skill loading in the bot, and a real engineer handoff. | UNTESTED.md | Mi'mar r6 / Codex disclosure | Fannan + approver + Najm (QA), after install | Run a first pilot project through Steps 1-9, with the critic and a human approver. Record a real handoff to the engineer. | The pilot ends with a signed approval, an engineer acknowledgement and a QA report on the preview SHA. |

---

## 3. P3 items

| ID | Description | File:line | Source | Fixes | Exact fix | How to verify |
|---|---|---|---|---|---|---|
| P3-A | The deps folder can be any folder with matching content, which makes it a moving target. | tools/verify-deps.mjs:27-28 | Amin P3-1 (Amin's r6 P1-2 "fixed folder" part) | Codex | `const DEPS_ROOT='/home/box/agent-data/fannan-deps'`, and throw if `realpathSync(prefix) !== DEPS_ROOT`. | Using any other prefix fails. |
| P3-B | The project output folder must already exist, and nothing creates it with private permissions. | tools/safe-write.py:83 | Amin P3-2 | Codex (part of B1) | `os.mkdir(project, 0o700, dir_fd=root_fd)` before the openat2. | A write to a new project creates the folder with mode 700. |
| P3-C | `releaseSignatureVerified:false` is out of date, because Amin verified the Node signature. | runtime/node-runtime.json:12 | Amin P3-3 | Codex | Set it to `true`, add the key fingerprint `5BE8A3F6…D356` and "verified by Amin Oct 16, 2026", then re-pin the manifest. | The JSON shows true plus the fingerprint, and the manifest is re-pinned. |
| P3-D | As root, verify-manifest skips the read-only check on the manifest. The pin still catches tampering. | tools/verify-manifest.sh:12 | Amin P3-4 (R4-3; also r6 P3-5) | Codex | Remove `\|\| [ "$(id -u)" = 0 ]`. | A writable manifest is refused even as root. |
| P3-E | The Stitch key rule (Fadel owns it, secret store, 90-day rotation) is now in **memory** save 3. It is a vendor-specific line in memory, against "memory stays generic, tools swappable". | memory/FANNAN-MEMORY-PROPOSED.md:7 | Mi'mar N-4 | Codex, or Fadel accepts it (D5) | Move it to design-connect plus project settings, and leave a generic line in memory: "follow the key-ownership and rotation rule of the selected tool's adapter". | Save 3 names no vendor, and the rule is still in design-connect. |
| P3-F | The launcher finds its `.internal` helper next to how it was called (`$0`), not next to the real file. | tools/launcher-impeccable.sh:3-5 | Mi'mar N-5 | Codex | Resolve the real folder first: `d=$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd)`, then `exec … /bin/sh "$d/launcher-impeccable.sh.internal"`. | Calling it through a relative path from another folder still works. |
| P3-G | The precheck now requires an absolute path. A relative path gets rc 10, so callers must pass absolute paths. All skill examples do. | tools/readonly-precheck.sh:9 | Mi'mar N-6 | Codex (docs) | Add "absolute path required" to the usage line and to design-setup. | The usage text says so. |
| P3-H | design-md references are passed through unchecked in the converter. The build step catches them later. | tools/designmd-to-sd.mjs:~30 | Amin R3-18 (partial) | Codex | Check that `{ref}` targets exist in the converter as well. | A fixture with a bad reference fails at the converter. |
| P3-I | Five older design findings were **not re-checked** in r6 or r7: R3-7, R3-8, R3-12, R3-16 and R3-20. | round-5 panel; Amin r6/r7 "not re-verified" | Amin (both rounds) | Mi'mar | Re-check each against the r7 files and mark it closed or open. | A row with a status for each of the five is added to the next review. |

Accepted on purpose, not open: P3-6 (the `/workspace/proto-bot/proto.py` helper path), which is kept so its callers don't break.

---

## 4. Decisions for Fadel

| ID | Decision | Recommendation |
|---|---|---|
| D1 | Final yes to install, on the **final** digest (currently `204f79e4…2b06`, which will change after the Codex fixes). | Wait until B1-B6 are closed and Amin has re-reviewed. |
| D2 | Install **Node v22.23.3** (sha `df450af8…02de`) side by side at `/home/box/agent-data/node-v22.23.3/`, not globally. | Yes, when installing. |
| D3 | Safe-writer owner rule: **Option A**, trust root or the writer's own uid (works today, no chown), or **Option B**, a dedicated `fannan` Unix user. Option B is the only way to separate Fannan from other agents, but it needs root and is untested. | A now. B later, as optional hardening. |
| D4 | Allow downloading the Impeccable **engine-v0.1.14** binary from GitHub (hash-checked) and running `npm ci --ignore-scripts` from the npm registry at install. Both are network fetches. | Yes, at install time only. |
| D5 | Keep the Stitch key rule in memory save 3, or move it out (P3-E). | Move it out, so memory stays generic. |
| D6 | Proceed without the missing archive, helper tests and approval register (P2-E) if they can't be found? | Search first, then decide. |
| D7 | Allow Mi'mar to send `FOR-CODEX-r7-findings.md` (both reviews) to Codex through you, and to ask Jabr for the R3-4 proof (due Oct 20). Each message needs your yes. | Yes. |
| D8 | Don't adopt the newer Impeccable engine-v0.1.15 (Oct 15) without Amin's review. | Confirm. |
