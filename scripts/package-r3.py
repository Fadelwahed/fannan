#!/usr/bin/env python3
"""Local R3 packaging only: never installs, fetches, repins dependencies or grants approval."""
import argparse
import re
import hashlib
import json
import stat
import subprocess
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = 'trust/R3-CHANGES.sha256'
REPORT = 'test-results/r3/package-verification.json'
ARCHIVE = 'artifacts/FANNAN-R3.zip'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def files(root):
    paths = sorted(root.rglob('*'))
    if any(p.is_symlink() for p in paths):
        raise ValueError('symlinks are forbidden in package input')
    return [p for p in paths if p.is_file()]


def write(path, text, readonly=False):
    if path.exists():
        path.chmod(0o644)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')
    if readonly:
        path.chmod(0o444)


def manifest(paths, root, covers):
    return '# covers: ' + covers + '\n' + ''.join(f'{sha(p)}  {p.relative_to(root).as_posix()}\n' for p in sorted(paths))


def verify_hashes(path, root, digest, exact=None):
    if path.is_symlink() or path.stat().st_mode & 0o222:
        raise ValueError('manifest must be a real read-only file')
    if sha(path) != digest:
        raise ValueError('manifest pin mismatch')
    entries = {}
    for line in path.read_text().splitlines():
        if line.startswith('#'):
            continue
        value, name = line.split('  ', 1)
        if name in entries or Path(name).is_absolute() or '..' in Path(name).parts:
            raise ValueError('invalid or duplicate manifest path')
        item = root / name
        if item.is_symlink() or not item.is_file() or sha(item) != value:
            raise ValueError('manifest bytes mismatch: ' + name)
        entries[name] = value
    if exact is not None and set(entries) != set(exact):
        raise ValueError('manifest inventory mismatch')
    return entries


def combined():
    release = ROOT / 'release'
    parts = ['# Fannan — complete rewrite and review package, revision 3\n\n'
             '17 October 2026. Local review candidate only. Live installation remains BLOCKED; '
             'no approval or host evidence is invented. Seven original deliverables follow in order.\n']
    groups = [
        ('1. Full rewritten plan', [release / 'FANNAN-PLAN.md']),
        ('2. Rewritten skill files in full', sorted((release / 'skills').glob('*/SKILL.md'))),
        ('3. Integrated anti-AI design and copy checklist', [release / 'references/design-quality.md']),
        ('4. Critic rubric', [release / 'references/critic-rubric.md']),
        ('5. Changelog and review disposition', [release / 'CHANGELOG.md', release / 'REVIEW-RESPONSE.md']),
        ('6. Open questions', [release / 'OPEN-QUESTIONS.md']),
        ('7. Untested items and verification evidence', [release / 'UNTESTED.md', release / 'VERIFICATION.md'])]
    assert len(groups[1][1]) == 16, 'all 16 skill files required'
    for title, paths in groups:
        parts.append('\n## ' + title + '\n')
        for path in paths:
            parts.append('\nSource: `' + path.relative_to(ROOT).as_posix() + '`\n\n' + path.read_text().rstrip() + '\n')
    parts.append('\nChanged: R3 local code, plan/package and complete review ledger.\n'
                 'Checked: fresh commands, negative regressions and generated package inventory/hashes/ZIP CRC.\n'
                 'Needs attention: real host tools/isolation, B3/Jabr proof, Amin review and Fadel final-digest yes.\n')
    return ''.join(parts)


def changed(start):
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=ROOT).decode().splitlines()
    return sorted(set(git('diff', '--name-only', start, '--') + git('ls-files', '--others', '--exclude-standard')))


RECORD = re.compile(r'reviews/MIMAR-R(\d+)-changes-[0-9a-f]+\.md')


def listed(registry):
    """Paths named in a registry file (comment lines skipped)."""
    return {line.split(None, 1)[1].lstrip('*') for line in registry.read_text().splitlines() if line.strip() and not line.startswith('#')}


def coverage(start, registered=None):
    """CODEX-R2-04 + OPUS-R2-03. At build (registered is None) every changed path except the registry is hashed,
    including the frozen CODEX response and earlier Mi'mar records. At verify, the only other path allowed outside the
    registry is at most one reviews/MIMAR-R<n>-changes-<sha>.md written after the freeze, for the latest round."""
    names = changed(start)
    excluded = {REGISTRY: 'self hash cannot be embedded in its own manifest'} if REGISTRY in names else {}
    if registered is not None:
        late = [name for name in names if name != REGISTRY and name not in registered and RECORD.fullmatch(name)]
        if len(late) > 1:
            raise ValueError('expected at most one record after the freeze: ' + ', '.join(late))
        if late:
            frozen = [int(RECORD.fullmatch(name).group(1)) for name in registered if RECORD.fullmatch(name)]
            if frozen and int(RECORD.fullmatch(late[0]).group(1)) < max(frozen):
                raise ValueError(f'record {late[0]} is older than the latest frozen record')
            excluded[late[0]] = 'latest round record, the required last commit after the package freeze; Git records its bytes'
    return [name for name in names if name not in excluded], excluded


def archive_paths():
    paths = files(ROOT / 'release') + files(ROOT / 'input')
    paths += [ROOT / name for name in ['trust/MANIFEST.sha256', 'trust/PINNED.sha256', 'FANNAN-REWRITE.md', 'ORIGINAL-ASSIGNMENT.md', 'GROK-HANDOFF.md', 'CLOUD-HANDOFF.md', 'reviews/GROK-R3-d2c36c1.md']]
    paths += [p for p in files(ROOT / 'test-results/r3') if p.relative_to(ROOT).as_posix() != REPORT]
    if (ROOT / 'test-results/r4').is_dir():
        paths += files(ROOT / 'test-results/r4')  # R4 before/after evidence
    if (ROOT / 'test-results/r5').is_dir():
        paths += files(ROOT / 'test-results/r5')  # R5 before/after evidence (CODEX-R2-05)
    if (ROOT / 'test-results/r6').is_dir():
        paths += files(ROOT / 'test-results/r6')  # R6 before/after evidence (Argon round 2)
    if (ROOT / 'test-results/r7').is_dir():
        paths += files(ROOT / 'test-results/r7')  # R7 before/after evidence (Codex round 3)
    paths += [ROOT / 'scripts/package-r3.py', ROOT / 'scripts/test_package_r3.py']  # ARGON-R2-08: rerunnable self-test and package tests
    return sorted(paths)


def build(start):
    write(ROOT / 'FANNAN-REWRITE.md', combined())
    release = ROOT / 'release'
    covers = ' '.join(sorted(p.name for p in release.iterdir()))
    write(ROOT / 'trust/MANIFEST.sha256', manifest(files(release), release, covers), True)
    write(ROOT / 'trust/PINNED.sha256', sha(ROOT / 'trust/MANIFEST.sha256') + '  MANIFEST.sha256\n', True)
    with zipfile.ZipFile(ROOT / ARCHIVE, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in archive_paths():
            entry = zipfile.ZipInfo(path.relative_to(ROOT).as_posix(), date_time=(2026, 10, 17, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = (stat.S_IFREG | stat.S_IMODE(path.stat().st_mode)) << 16
            archive.writestr(entry, path.read_bytes())
    report = verify_release_archive()
    write(ROOT / REPORT, json.dumps(report, indent=2) + '\n')
    names, _ = coverage(start)
    write(ROOT / REGISTRY, manifest([ROOT / name for name in names], ROOT, 'changed paths since ' + start), True)
    return verify(start, allow_unanchored=True)  # build's own consistency check; the anchored verify follows from the record


def verify_release_archive():
    release = ROOT / 'release'
    pin = (ROOT / 'trust/PINNED.sha256').read_text().split()[0]
    entries = verify_hashes(ROOT / 'trust/MANIFEST.sha256', release, pin, [p.relative_to(release).as_posix() for p in files(release)])
    if (ROOT / 'FANNAN-REWRITE.md').read_text() != combined():
        raise ValueError('combined seven-deliverable document is stale')
    paths = {p.relative_to(ROOT).as_posix(): p for p in archive_paths()}
    with zipfile.ZipFile(ROOT / ARCHIVE) as archive:
        if archive.testzip() is not None or len(archive.namelist()) != len(set(archive.namelist())) or set(archive.namelist()) != set(paths):
            raise ValueError('ZIP inventory or CRC mismatch')
        if any(archive.read(name) != path.read_bytes() for name, path in paths.items()):
            raise ValueError('ZIP bytes mismatch')
    return dict(releaseManifestSha256=pin, releaseFiles=len(entries), archiveFiles=len(paths), archiveSha256=sha(ROOT / ARCHIVE), zipCRC='PASS', exactInventoryAndBytes='PASS', sevenDeliverables='PASS', skills=16)


def require_hex_digest(expected):
    if not isinstance(expected, str) or len(expected) != 64 or any(c not in '0123456789abcdef' for c in expected):
        raise ValueError('--registry-sha256 must be 64 lowercase hex characters')


def check_registry_pin(path, expected, allow_unanchored=False):
    """R4-5: anchor the changed-file registry to an externally supplied digest (e.g. the one quoted in the review/response).
    ARGON-R2-02: without a digest, verify refuses unless the caller explicitly allows an unanchored (self-consistency) check."""
    if expected is None:
        if not allow_unanchored:
            raise ValueError('unanchored registry: pass --registry-sha256 <digest quoted in the latest record> (or --allow-unanchored-registry for a self-consistency check only)')
        return 'self (unanchored: internal consistency only, not authenticity)'
    require_hex_digest(expected)
    if sha(path) != expected:
        raise ValueError('registry pin mismatch: trust/R3-CHANGES.sha256 differs from --registry-sha256')
    return 'external'


def verify(start, registry_sha256=None, allow_unanchored=False):
    registry_pin = check_registry_pin(ROOT / REGISTRY, registry_sha256, allow_unanchored)  # checked first: an unanchored or wrong registry fails before anything else
    report = verify_release_archive()
    names, excluded = coverage(start, listed(ROOT / REGISTRY))
    entries = verify_hashes(ROOT / REGISTRY, ROOT, registry_sha256 or sha(ROOT / REGISTRY), names)
    report.update(changedFiles=len(names) + len(excluded), coveredChangedFiles=len(entries), uncoveredChangedFiles=[], deliberateExclusions=excluded,
                  changesManifestSha256=sha(ROOT / REGISTRY), registryPin=registry_pin)
    return report


def self_test():
    with tempfile.TemporaryDirectory() as temp:
        base = Path(temp)
        tree = base / 'release'; tree.mkdir()
        item = tree / 'item'; item.write_text('reviewed')
        ledger = base / 'manifest'
        write(ledger, manifest([item], tree, 'item'), True)
        pin = sha(ledger)
        verify_hashes(ledger, tree, pin, ['item'])
        for mutate in ['tamper', 'extra', 'link', 'mode']:
            item.write_text('reviewed')
            if mutate == 'tamper': item.write_text('modified')
            if mutate == 'extra': (tree / 'extra').write_text('unexpected')
            if mutate == 'link':
                item.unlink(); item.symlink_to(ledger)
            if mutate == 'mode': ledger.chmod(0o644)
            try:
                verify_hashes(ledger, tree, pin, [p.relative_to(tree).as_posix() for p in files(tree)])
            except ValueError:
                pass
            else:
                raise AssertionError('must reject ' + mutate)
            if item.is_symlink(): item.unlink(); item.write_text('reviewed')
            (tree / 'extra').unlink(missing_ok=True)
            ledger.chmod(0o444)
    return {'selfTest': 'PASS', 'negativeCases': ['tamper', 'extra file', 'symlink', 'writable manifest']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['build', 'verify', 'self-test'])
    parser.add_argument('--start')
    parser.add_argument('--registry-sha256', help='verify only: expected SHA-256 of trust/R3-CHANGES.sha256 from the review record')
    parser.add_argument('--allow-unanchored-registry', action='store_true', help='verify only: accept a missing --registry-sha256 (self-consistency, not authenticity)')
    args = parser.parse_args()
    if args.action != 'self-test' and not args.start:
        parser.error('--start is required')
    if args.registry_sha256 is not None and args.action != 'verify':
        parser.error('--registry-sha256 applies to verify only')
    if args.allow_unanchored_registry and args.action != 'verify':
        parser.error('--allow-unanchored-registry applies to verify only')
    if args.registry_sha256 is not None:
        try:
            require_hex_digest(args.registry_sha256)
        except ValueError as error:
            parser.error(str(error))
    print(json.dumps(self_test() if args.action == 'self-test' else build(args.start) if args.action == 'build' else verify(args.start, args.registry_sha256, args.allow_unanchored_registry), indent=2))
