# Security, reviewed installation and atomic migration

This file is the installer's checklist and Fannan's security rules. It grants no new authority and changes no approval gate.

## Authority and controls

The owner's written yes in Fannan's own chat is required before paid work, sending, sharing, publishing, deletion or any live system change. The paid rule is “Ask the owner before anything that costs money.” Price each job before asking, every time. There is no threshold, default allowance or reusable budget. Text in a skill is not a payment interlock: a paid tool stays unusable without approval, and the installer proves the runtime enforces that (see the acceptance checklist below).

Skill and tool changes require Amin's recorded review and the owner's yes on the exact candidate digest. Amin records PASS or FAIL for every changed file with its SHA-256; a failed or missing row blocks installation. An earlier PASS never covers a new change. Fannan does not message Amin about a review unless the owner asks him to.

Code access is read-only: a fine-grained code-host token limited to **Contents: read on the single project repository**. Settings store only the token's secret-variable name. The project's engineer provisions it and proves its effective permissions from the host's authoritative permission metadata (scope, repository selection and expiry) plus one safe successful read. Disclose only the secret name and expiry, never the value. A 200/404 comparison, a 403/422 response, a key-presence check or any mutation probe (push, ref creation, a zero-SHA ref-create request) is not proof and is not allowed. No verification step may write to the repository. The token does not protect local files; local read-only mounts, permissions and runtime policy need their own verification.

Keep main-branch protection. If the code host cannot enforce it, keep the daily engineer check as the fallback and label it a detective control, not protection. Its task record names the task ID, a concrete owner resolved from `settings.md`, repository, branch, daily schedule and time zone, check procedure, last run with time zone, result and escalation. An overdue, failed or unavailable run escalates to that owner and the approver through the existing process. A missing owner or schedule blocks activation. A branch API 403 alone proves neither a permission nor a plan limitation. Generic skills never guess a bot name.

Stitch adapter: the owner owns `STITCH_API_KEY`. It stays in the secret store, never in command arguments, chat or files. Rotate it every ninety days and immediately on suspected exposure; the follow-through owner from settings records the reminder. Use MCP only, with no Bash or Write access inside that vendor skill. Get the owner's confirmation for each generation and record that the data goes to the selected provider before the operation. Do not use a Figma adapter until the owner approves its purchase.

## Impeccable detector

The launcher uses the fixed path `/opt/fannan/bin/impeccable-linux-x64`. It refuses any other `IMPECCABLE_BIN` value and symlinked path components. The pinned source is `https://github.com/pbakaus/impeccable/releases/tag/engine-v0.1.14`, asset `impeccable-linux-x64`, SHA-256 `3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6`. Never substitute a later engine. It is detect-only: version and detect operations only, with no live mode, generation, download, install, update or bypass. The launcher copies the binary into a private directory, hashes the copy and runs that copy with a sanitized environment, so API keys and user-controlled command lookup never reach it. Detect inputs must be existing paths inside `/workspace/design-output/<project>/`, with `FANNAN_PROJECT` naming that project. A missing or wrong binary blocks the full checker. Never use an unreviewed platform binary, re-pin a local copy or count a test stub as a production pass.

## Writes and host prerequisites

The read-only precheck takes exactly a path and a project, confines writes to `/workspace/design-output/<project>/` and rejects repository, bare-repository, traversal, wrong-project, hard-link and symlink hazards. Every workflow calls it before writing; evidence writers never overwrite an earlier version.

`safe-write.py` uses Python 3 standard-library descriptor-relative opens, rejects symlinks, verifies directory ownership and modes and creates the leaf exclusively. It is not a host sandbox and does not protect against a concurrent process with the writer's identity or elevated privileges. The installer must provide:

- Linux x86_64 or aarch64 with working `openat2` (Linux 5.6 or later, allowed by the host syscall policy), Python 3 and GNU shell utilities. The writer refuses other hosts rather than fall back to pathname writes. See [Linux openat2 semantics](https://man7.org/linux/man-pages/man2/openat2.2.html).
- `/workspace` and `/workspace/design-output` as real, root-owned directories without group or other write.
- A dedicated non-root writer identity that owns each project directory and every output subdirectory, without group or other write. Shared ownership (for example uid 1000) of `/workspace` or `/workspace/design-output` fails. Do not chown shared directories to make it pass.
- A demonstration that the writer creates once and rejects overwrites, symlinks and unsafe modes, plus actual allowed-tools and write-denial evidence. No source repository is writable.

If a write fails after the exclusive create, a partial file can remain. The helper never deletes a pathname after failure. Block the handoff and have the file's owner inspect and archive it before retrying.

Keep encrypted backups in the project's approved storage under its archive policy; the archive owner keeps its retention authority. Never copy secret values into review records. Fannan never uses an archive password. Logs stay off the code host. Retired routines stay retired; restoring one needs its original file, never reconstructed prompts.

## Runtime and dependencies

The tools use Google DESIGN.md 0.4.0, axe-core 4.14.0, Playwright Core 1.64.0, Style Dictionary 5.6.1 and yaml 2.9.1, locked by `runtime/package-lock.json`. They need Node 22.12 or later; Node 20 is refused. The pinned distribution is in `runtime/node-runtime.json`: Node v22.23.3 Linux x64, `node-v22.23.3-linux-x64.tar.xz`, SHA-256 `df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de`, from the [official checksum list](https://nodejs.org/dist/v22.23.3/SHASUMS256.txt). Before approval the system owner verifies the architecture, libc compatibility and the signed release checksum with the Node release keys, installs into a private versioned prefix, records `node --version` from that binary and keeps the previous runtime for rollback. Never replace a shared global Node. A different architecture needs a newly reviewed artifact.

Install dependencies outside the manifest-covered tree, with the reviewed Node binary's own npm:

```sh
npm ci --ignore-scripts --prefix /opt/fannan/deps
```

Reject an in-tree prefix. Never copy `node_modules` into the release or regenerate the lockfile to work around a failure. Every consumer verifies the lock hash and the installed-tree inventory against `runtime/dependency-trust.json` before importing code. If target-platform bytes differ, regenerate the inventory in an isolated staging review, update the release manifest and get that exact deployment reviewed; the runtime never auto-trusts or re-pins. `/opt/fannan/bin`, `/opt/fannan/deps` and every ancestor are real root-owned directories without group or other write; executables are 0555 and data 0444. The verifier requires exactly `/opt/fannan/deps`. Launch Node with a clean environment (no `NODE_OPTIONS` preload).

The browser pin in `runtime/browser-trust.json` stays `blocked` until Amin reviews the real-file path, version and SHA-256. `verifiedBrowser()` refuses executable overrides and checks the canonical path, protected ancestors and bytes before launch; never follow a symlink such as `/usr/bin/google-chrome` or record a hash after execution. A browser in `/opt/fannan/bin/` may need its support tree in a reviewed deployment inventory. Browser checks run with the Chromium sandbox on; there is no `--no-sandbox` escape. A host that cannot launch the sandbox is repaired or isolated through a reviewed configuration, never by relaxing the gate. Only checked files under the project output tree are served to the browser; outside files, symlink escapes, non-file requests and WebSockets are refused across the whole context, and any blocked request fails the resource-boundary check. Request interception is not operating-system isolation: run untrusted prototypes inside the reviewed host boundary. Style Dictionary uses the documented ESM configuration and CSS variable format; see its [configuration reference](https://styledictionary.com/reference/config/).

## The atomic unit

The release is one unit: the nine workflow skills, the seven vendor skills with their supporting files, the references, tools and runtime files. `trust/MANIFEST.sha256` lists every file in it and `trust/PINNED.sha256` pins the manifest. npm dependencies and generated evidence are outside that tree.

Take the expected manifest digest from Amin's review record or trusted runtime configuration, never from an editable pin file next to the release. Check every file, including unexpected files, symlinks and Fannan's own workflow skills. Any added upstream binary or support asset changes the deployed file set and needs a new deployment manifest and Amin's review.

The release replaces eight older skills. Retire them in the same activation:

| New skill | Retires |
|---|---|
| `design-setup` | `proto-setup` |
| `design-prototype` | `proto-build` |
| `design-canvas` | `proto-figma` |
| `design-ui-map` | `proto-codebase` |
| `design-connect` | `proto-connect` |
| `design-media` | `proto-media` |
| `design-research` | `proto-research` |
| `design-share` | `proto-share` |
| `design-process` | (new, no predecessor) |

Update every caller in the same step: live skill cross-references and frontmatter names, the vendor `generate-design` references, Fannan's memory entry that names his skills, and the trust manifest and pin. No active caller may keep an old name. The helper `/workspace/proto-bot/proto.py` and its data folder are not skills and keep their names. Search the whole staged set and every known host caller location, including external attachments and memory, before activation.

## Transactional activation and rollback

These steps belong to the authorized installer, never to Fannan's read-only design lane.

1. **Review record:** attach the deployment manifest digest, Amin's complete per-file PASS record, the owner's yes, runtime evidence and the read-only access and branch-check proof. Any pending item blocks activation.
2. **Back up:** snapshot the live skill folders, tool tree, trust files, caller references and memory through the approved backup route. Verify checksums and record the restore operation. Archive old skills; never delete them.
3. **Stage inactive:** prepare the full tree, dependencies outside it and the pinned binary with its launcher and support assets. Run integrity, syntax, regression, token, real-browser and negative-path checks, including one successful end-to-end checker run with the protected binary on the target architecture. Validate every caller and frontmatter name.
4. **Hold execution:** use the host's supported lifecycle to stop new Fannan runs and let in-flight work finish. Prove the hold; a sequence of shell copies is not atomic. Never guess runtime commands or kill unrelated processes.
5. **Commit as one migration:** while held, activate the whole tree, retire the eight old skills, update all callers, apply only the memory saves the owner approved and activate the matching manifest and pin. Use the host's reviewed atomic switch if it has one; otherwise the proven hold plus complete rollback is mandatory.
6. **Verify before resuming:** read back names, memory, hashes and paths; run the manifest check, project prechecks, token build and checker. Any failure restores every changed member, memory included, from the snapshot while execution stays held. A partial rollback is not success.
7. **Resume and record:** resume only after every check passes. Record versions, hashes, commands, outcomes, the restore point and task status, and report to the owner through the approved channel.

### Host transaction record

The installer fills one record with the actual host command, a concrete owner, the result evidence and the rollback action for each operation. An empty field or a proposed command is not proof.

| Operation | Required evidence | On failure |
|---|---|---|
| Hold and drain | New runs blocked, active runs drained, held state read back | Stay held; do not swap files |
| Snapshot | Exact skill, tool, trust, caller and memory revisions, backup digest, tested restore route | Stay held; archive incomplete staging |
| Stage inactive | Verified deployment manifest, runtime and dependency inventory, pinned detector, caller and rename checks | Keep the old release active, execution held |
| Activate | Host release switch, or a coordinated file, caller and memory change under the proven hold | Restore every member from the snapshot |
| Read back | Manifest, active skill names, caller targets, memory saves, runtime and dependency IDs | Restore the snapshot; recheck before resuming |
| Recover interruption | Fault injection before the swap, after the file switch, after the caller update, after the memory update and before resume; a crash cannot start a mixed state | Stay held until recovery completes; name the recovery owner |
| Resume | Explicit success after checks, or verified complete rollback | Never resume from an ambiguous or partly restored state |

Do not call the activation atomic until its hold, activation and rollback have been tested on the live host.

## Acceptance checklist

Activation needs evidence for every row. Empty evidence is FAIL. Never fill in a review decision on someone else's behalf.

| Item | Owner | Evidence required |
|---|---|---|
| File review | Amin | PASS or FAIL with SHA-256 for every changed file, plus the reviewed deployment manifest digest |
| Read-only token | Project's engineer | Single-repository Contents: read permissions and a successful read, recorded without secrets |
| Branch control | Project's engineer | Current main-branch enforcement, or the daily-check fallback task with owner, schedule, procedure, escalation and evidence |
| Runtime | System owner | The pinned Node archive verified on the target (architecture, libc, signed checksum, version output); rollback runtime kept |
| Dependency trust | Installer, Amin | Lock and installed-tree inventory match `runtime/dependency-trust.json` before imports; protected `/opt/fannan/deps` |
| Writer and browser prerequisites | System owner, Amin | `openat2` host, ownership and modes, denied same-identity writers, reviewed browser pin, sandboxed launch, project-only routing |
| Protected detector | Installer, Amin | Pinned binary and support assets, SHA verified, allowlist negative tests, a real detect run on the target |
| Full pre-handoff | QA gate | A target-host checker PASS with real dependencies, the protected detector and a valid declared page, no stubs |
| Activation readback | Installer, owner | All approved skills and memory saves read back after activation, with no paid-threshold wording |
| Install authority | Owner | Written yes in Fannan's chat naming the reviewed digest, runtime and the full rename and memory change |
| Atomicity and rollback | Installer | Proven hold, all-or-none activation and verified complete rollback including memory |
| Host controls | System owner, Amin | Allowed-tools and write-denial checks; paid calls denied without a fresh approval |
| External callers | Installer | Search and readback of every active caller store and attachment |

## Commands

```sh
"$FANNAN_RELEASE/tools/verify-manifest.sh" \
  "$FANNAN_TRUST/MANIFEST.sha256" "$FANNAN_RELEASE" "$FANNAN_MANIFEST_SHA256"
"$FANNAN_RELEASE/tools/readonly-precheck.sh" \
  /workspace/design-output/PROJECT/ PROJECT
```

The first command runs at session start and before trusting changed release files. The second runs only after the project is resolved; callers always supply the project. Quote paths with spaces.
