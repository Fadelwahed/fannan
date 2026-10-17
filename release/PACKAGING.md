# R3 reproducible packaging and verification

The standard-library-only `scripts/package-r3.py` generates hashes from bytes; never hand-edit digest rows. It preserves source/input and R2. From the repository root:

```sh
python3 -B scripts/package-r3.py self-test
python3 -B scripts/package-r3.py build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3
python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3
```

Build combines all seven original deliverables with all 16 skill files, enumerates the exact `release/` inventory, generates `trust/MANIFEST.sha256` and its external `PINNED.sha256`, writes deterministic `artifacts/FANNAN-R3.zip`, and checks every ZIP member byte plus CRC. It then records `test-results/r3/package-verification.json` and hashes every changed repository path in `trust/R3-CHANGES.sha256`. That registry includes the release manifest/pin, combined document, ZIP, test logs, package report, script, docs and checkpoint. The report is external to the ZIP to avoid a report/archive self-hash cycle; its bytes are covered by the changes registry. Other evidence and the immutable input/review are inside the archive.

The release manifest covers **all release files with no exclusions**. Its pin must ultimately come from Amin's reviewed approval record/trusted runtime configuration, not a nearby editable file. Candidate hashes are reproducible review evidence, not approval.

For the repository changes registry (CODEX-R2-04, OPUS-R2-03), `scripts/package-r3.py` leaves at most two changed files unhashed:

| Unhashed file | Limit | Why |
|---|---|---|
| `trust/R3-CHANGES.sha256` | the registry itself | no file can contain its own SHA-256; anchor it with `--registry-sha256` |
| `reviews/MIMAR-R<n>-changes-<sha>.md` | at most one, absent from the registry, for the latest round (not older than any record in the registry); only this exact name pattern | Mi'mar's record is the required last commit after the package freeze; Git records its bytes and it quotes the registry digest |

Everything else that changed since the start commit is hashed: implementation, tests, evidence, generated documents, the ZIP, every earlier Mi'mar record, and `reviews/CODEX-R3-response-<sha>.md` is hashed too (it is frozen before this round). At build time only the registry is excluded; verify then allows the single late record. A second late record, an older-round late record, or any other unhashed file fails verify. Review records (`reviews/CODEX-*`, `reviews/MIMAR-*`) are not in the ZIP.

After final commit, compare the actual committed paths (the verifier uses the same diff plus any untracked paths, making it stricter while editing). A clone does not keep the 0444 modes, and the verifier requires **both** generated trust files to be read-only, so set them first (no bytes change):

```sh
chmod 0444 trust/MANIFEST.sha256 trust/R3-CHANGES.sha256
git diff --name-only 9ee1ca6aaa4a257cb84fb7381056005f48554bf3..HEAD
python3 -B scripts/package-r3.py verify --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3 --registry-sha256 <digest quoted in the review/response record>
```

`--registry-sha256` (R4-5) anchors `trust/R3-CHANGES.sha256` to an externally recorded digest and is checked before anything else; a mismatch fails. Without it the registry is only checked against its own hash (`registryPin` reports `self (unanchored …)`), which proves internal consistency, not authenticity. Regression tests: `python3 -B scripts/test_package_r3.py -v`.

`coveredChangedFiles`, `uncoveredChangedFiles: []` and `deliberateExclusions` are the comparison result. `changesManifestSha256` is quoted in the latest Mi'mar record (`reviews/MIMAR-R<n>-changes-<sha>.md`). The self-test proves rejection of tampering, unexpected files, symlinks and a writable manifest. The portable verifier checks read-only mode bits, external pin, exact inventory, bytes and archive contents; it does not replace target-host GNU/Linux execution.

Also run the production verifier on a supported GNU/Linux host with the pin from the review record:

```sh
release/tools/verify-manifest.sh "$PWD/trust/MANIFEST.sha256" "$PWD/release" "$FANNAN_MANIFEST_SHA256"
```

It requires GNU `realpath -e`, `stat -c` and `sha256sum` on its fixed PATH. This R3 Mac attempt fails before verification because `realpath -e` is unsupported. Do not mark that command PASS, relax its root/write-mode rule or replace production tools to hide the platform boundary. A clone preserves executable bits, not 0444; apply the documented local 0444 mode (`chmod 0444 trust/MANIFEST.sha256 trust/R3-CHANGES.sha256`) before verification without changing bytes. No protected host installation is performed by this packaging script.

## Whitespace check (CODEX-R2-03)

Committed test logs under `test-results/` are raw tool output, and raw logs are kept byte-for-byte: Node's TAP output contains trailing spaces, and stripping them would change recorded evidence. So a plain `git diff --check <base>..HEAD` reports whitespace errors in those logs only. The whitespace gate is range-qualified and source-only:

```sh
git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'
```

It must exit 0. The full-range result, including the raw logs, is recorded separately in the round's evidence and is not claimed as clean.
