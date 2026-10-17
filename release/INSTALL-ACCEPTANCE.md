# Installation acceptance — currently BLOCKED

This is an unsigned review ledger. Empty evidence is FAIL. Do not fill a human review decision on someone else's behalf.

| ID | Owner | Required closure evidence | Current state |
|---|---|---|---|
| R3-2 | Amin | PASS/FAIL for every changed file and its SHA256, plus reviewed candidate/deployment manifest digest | OPEN — no actual Amin review of this rewrite |
| R3-4 token | Project's engineer | Actual single-repository Contents:read token permissions and successful read-only access, secret-safe record | OPEN — target credentials/host not accessed |
| R3-4 branch | Project's engineer | Current main-branch enforcement or documented existing fallback; daily-check task with owner, schedule, procedure, failure escalation and evidence | OPEN — no current branch/task evidence |
| Runtime | System owner from settings | Proposed Node v22.23.3 Linux x64 archive/checksum from runtime/node-runtime.json reviewed; target architecture/libc and signed checksum verified, exact installed version output; rollback runtime retained | OPEN — local Mac Node22 is not target-host upgrade proof |
| Dependency trust | Installer / Amin | Lock and installed-tree inventory match reviewed runtime/dependency-trust.json before imports; target-specific changes reviewed with a new release digest; dependency storage immutable to the bot | OPEN target host; local staged inventory only |
| Guard / browser prerequisites | System owner / Amin | Python3 and Linux x86_64/aarch64 openat2, trusted ownership/modes and denied hostile same-identity writers; Chromium sandbox launch and project-only asset routing | OPEN target-host controls; local tests recorded separately |
| Protected detector | Installer / Amin | Original binary and required support assets, SHA verification, allowlist negative tests and real detect result on target architecture | OPEN — binary omitted from input |
| Full pre-handoff | QA gate | Actual target-host checker PASS using real dependencies, protected detector and a valid declared fixture, with no test stubs | OPEN — local tests cannot satisfy missing binary |
| R3-3 activation | Installer / Fadel | Readback of all approved skills and memory save 8 after atomic activation; no obsolete paid-threshold wording | OPEN live; candidate text corrected |
| Migration authority | Fadel | Written yes in Fannan's own chat referencing reviewed digest, runtime and complete rename/memory change | OPEN — rewrite request is not live-install approval |
| Atomicity / rollback | Installer | Supported hold, staged all-or-none activation and verified complete rollback including memory; old skills archived | UNTESTED on live host |
| Host controls | System owner / Amin | Actual allowed-tools and local write-denial checks; paid-call gate behavior; no reliance on text-only enforcement | UNTESTED |
| External callers | Installer | Search/readback of all active caller stores and attachments unavailable in the supplied pack | UNTESTED |

The review bundle is complete enough to inspect. Activation and real project handoff remain blocked by these actual prerequisites. Historical approvals of the policy do not prove that its implementation exists.
