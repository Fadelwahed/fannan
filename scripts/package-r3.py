#!/usr/bin/env python3
"""Local R3 packaging only: never installs, fetches, repins dependencies or grants approval."""
import argparse
import os
import re
import hashlib
import io
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


NON_PACKAGE = {'__pycache__', 'node_modules', '.git'}  # R8 PORT-04, ported from codex/fannan-r3-review 2733317
# R11 (Asad panel C4): secret-bearing and junk names are never packaged or hashed (environment files, OS junk, private
# keys and certificates, credential dotfiles, editor swap and backup files).
JUNK_OR_SECRET = re.compile(r'(?:\.env(?:\..*)?|\.DS_Store|Thumbs\.db|desktop\.ini|\.npmrc|\.netrc|\.pypirc|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|.*\.(?:pem|key|p12|pfx|swp|swo)|.*~)')


# R11 panel D1 (decision D): packaging is an explicit allowlist. A packaged or hashed file must have one of these
# suffixes (the ZIP itself only at ARCHIVE) and no path part may be VCS or editor debris; JUNK_OR_SECRET is still
# refused on top, so `.env.md` or `id_rsa.txt` fail too. Adding a new file type is a deliberate edit here.
ALLOWED_SUFFIXES = {'.md', '.mjs', '.json', '.sh', '.sha256', '.txt', '.py', '.diff', '.internal', '.log'}
DENIED_PARTS = {'.git', '.gitignore', '.gitattributes', '.gitmodules', '.hg', '.svn', '.idea', '.vscode', '.history', '.ssh', '.gnupg', '.aws'}  # R12 M12: credential folders
JUNK_OR_SECRET_STEM = re.compile(r'(?:\.env(?:\..*)?|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?)\.[A-Za-z0-9]+')
# R12 M12: allowlisted suffixes do not launder secret names. Any path part that is an environment file (.env, .envrc,
# .env-prod ...), an editor lock (.#name), a credential file name with any suffixes (credentials.json, secrets.yaml.md,
# service-account.json, token.json, .npmrc.json, .git-credentials.txt) or a key or certificate followed by more
# suffixes (private.key.json) is refused. R13 N10 replaces the R12 plural allowance: see CREDENTIAL_WORD below.
SECRET_ANY_SUFFIX = re.compile(r'(?:\.env[^/]*|\.#.*|(?:credentials?|secrets?|service[-_]account(?:[-_][^.]*)?|token|\.npmrc|\.netrc|\.pypirc|\.git-credentials)(?:\..*)?|.*\.(?:pem|key|p12|pfx)(?:\..*)?)', re.I)


# R13 N10 / panel q2: a credential word anywhere in a path part (prefix, infix or suffix; singular or plural) refuses
# it, except three reviewed tool, test and evidence names and a design-token `tokens.json` that is (a) declared by the
# `handoff.json` beside it (`tokens.json.path` ends with this path and its sha256 matches) and (b) valid design-token
# content: every leaf is a node with `$value`, and no credential keys (access_token, refresh_token, client_secret ...).
CREDENTIAL_WORD = re.compile(r'credential|secret|service[-_.]?account|token|password|passwd|api[-_.]?key|private[-_.]?key|access[-_.]?key', re.I)
CREDENTIAL_NAME_REVIEWED = {'token-references.mjs', 'token-validation.test.mjs', 'secret-scan.json'}
CREDENTIAL_KEYS = {'access_token', 'refresh_token', 'client_secret', 'id_token', 'password', 'api_key', 'apikey', 'private_key', 'secret'}


def design_tokens_ok(path, rel):
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        handoff = json.loads((path.parent / 'handoff.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return False
    declared = ((handoff.get('tokens') or {}).get('json') or {}) if isinstance(handoff, dict) else {}
    where = str(declared.get('path', '')).replace('\\', '/')
    if not (where == rel or where.endswith('/' + rel)) or declared.get('sha256') != hashlib.sha256(path.read_bytes()).hexdigest():
        return False
    values = []

    def walk(node):
        if not isinstance(node, dict):
            return False
        if any(str(k).lower() in CREDENTIAL_KEYS for k in node):
            return False
        if '$value' in node:
            values.append(1)
            return not isinstance(node['$value'], dict) or walk_value(node['$value'])
        return all(walk(v) for k, v in node.items() if not str(k).startswith('$'))

    def walk_value(value):
        return not any(str(k).lower() in CREDENTIAL_KEYS for k in value) and all(walk_value(v) for v in value.values() if isinstance(v, dict))
    return walk(data) and bool(values)


def credential_name(name, root):
    parts = Path(name).parts
    for i, part in enumerate(parts):
        if not CREDENTIAL_WORD.search(part):
            continue
        last = i == len(parts) - 1
        if last and part in CREDENTIAL_NAME_REVIEWED:
            continue
        if last and part == 'tokens.json' and design_tokens_ok(Path(root) / name, Path(name).as_posix()):
            continue
        return True
    return False


# R13 panel q2: a stdlib content screen for obvious secrets in every packaged or hashed text file (names alone miss a
# key pasted into an ordinary file). Patterns are assembled here so this file does not match itself.
SECRET_CONTENT = re.compile('|'.join([
    '-----BEGIN [A-Z ]*' + 'PRIVATE KEY-----', 'AK' + 'IA[0-9A-Z]{16}', 'gh' + 'p_[A-Za-z0-9]{36}', 'github' + '_pat_[A-Za-z0-9_]{22,}',
    'xo' + 'x[baprs]-[A-Za-z0-9-]{10,}', 's' + 'k-[A-Za-z0-9_-]{32,}', 'AI' + 'za[0-9A-Za-z_-]{35}',
    '"(?:refresh' + '_token|client' + '_secret|access' + '_token)"\\s*:\\s*"[^"]{8,}"']))


def secret_content(path):
    try:
        return bool(SECRET_CONTENT.search(path.read_bytes().decode('utf-8', 'ignore')))
    except OSError:
        return False


def junk_or_secret(name, root=None):
    parts = Path(name).parts
    if any(JUNK_OR_SECRET.fullmatch(part) or part in DENIED_PARTS for part in parts):
        return True
    if parts and JUNK_OR_SECRET_STEM.fullmatch(parts[-1]):
        return True
    if any(SECRET_ANY_SUFFIX.fullmatch(part) for part in parts):
        return True
    if credential_name(name, ROOT if root is None else root):
        return True
    return Path(name).suffix not in ALLOWED_SUFFIXES and name != ARCHIVE


def files(root):
    paths = sorted(root.rglob('*'))
    if any(p.is_symlink() for p in paths):
        raise ValueError('symlinks are forbidden in package input')
    bad = [p for p in paths if NON_PACKAGE & set(p.relative_to(root).parts) or p.suffix == '.pyc']
    if bad:
        raise ValueError('cache, dependency or git entry in package input: ' + bad[0].relative_to(root).as_posix())
    secret = [p for p in paths if (p.is_file() or set(p.relative_to(root).parts) & DENIED_PARTS) and junk_or_secret(p.relative_to(root).as_posix(), root)]
    if secret:
        raise ValueError('secret-bearing, junk or non-allowlisted file in package input: ' + secret[0].relative_to(root).as_posix())
    leaked = [p for p in paths if p.is_file() and secret_content(p)]  # R13 q2: content screen
    if leaked:
        raise ValueError('secret-looking content in package input: ' + leaked[0].relative_to(root).as_posix())
    return [p for p in paths if p.is_file()]


def write(path, text, readonly=False):
    write_bytes(path, text.encode('utf-8'), readonly)


def write_bytes(path, data, readonly=False):
    """CODEX-R4-01: write a sibling temp file, then os.replace it, so an interrupted write never truncates the old output."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix='.' + path.name + '.', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(data)
        os.chmod(temp, 0o444 if readonly else 0o644)
        os.replace(temp, path)
    except BaseException:
        Path(temp).unlink(missing_ok=True)
        raise


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
    if (ROOT / 'test-results/r8').is_dir():
        paths += files(ROOT / 'test-results/r8')  # R8 before/after evidence (Codex cloud port)
    if (ROOT / 'test-results/r9').is_dir():
        paths += files(ROOT / 'test-results/r9')  # R9 before/after evidence (Codex round 4)
    if (ROOT / 'test-results/r10').is_dir():
        paths += files(ROOT / 'test-results/r10')  # R10 before/after evidence (Argon round 5)
    if (ROOT / 'test-results/r11').is_dir():
        paths += files(ROOT / 'test-results/r11')  # R11 before/after evidence (Asad panel round 5)
    if (ROOT / 'test-results/r12').is_dir():
        paths += files(ROOT / 'test-results/r12')  # R12 before/after evidence (panel round 12)
    if (ROOT / 'test-results/r13').is_dir():
        paths += files(ROOT / 'test-results/r13')  # R13 before/after evidence (panel round 13)
    paths += [ROOT / 'scripts/package-r3.py', ROOT / 'scripts/test_package_r3.py']  # ARGON-R2-08: rerunnable self-test and package tests
    return sorted(paths)


def regular_in_root(name):
    """ARGON-R5-04: True only for a regular file inside ROOT with no symlink at any level of its path."""
    path = ROOT
    for part in Path(name).parts:
        path = path / part
        if path.is_symlink():
            return False
    return path.is_file()


GENERATED = ('FANNAN-REWRITE.md', 'trust/MANIFEST.sha256', 'trust/PINNED.sha256')


def build(start):
    """CODEX-R4-01: every input is listed and validated BEFORE any output is written. The archive path list is computed
    once and reused; generated files are packaged from memory; each output replaces the old one atomically."""
    release = ROOT / 'release'
    release_files = files(release)               # refuses symlinks, caches, dependency and git entries
    paths = archive_paths()                      # same refusals for every packaged tree; computed once
    names, _ = coverage(start)                   # a bad --start fails here, before any write; computed once (ARGON-R5-04)
    missing = [p for p in paths if p.relative_to(ROOT).as_posix() not in GENERATED and (p.is_symlink() or not p.is_file())]
    if missing:
        raise ValueError('package input missing or not a regular file: ' + missing[0].relative_to(ROOT).as_posix())
    # ARGON-R5-04: every path the registry will hash must already be a regular file reached without a symlink, except
    # the outputs this build writes; a deleted or symlinked changed path fails here, not after five outputs were replaced.
    written = set(GENERATED) | {ARCHIVE, REPORT, REGISTRY}
    junk = [name for name in names if junk_or_secret(name)]  # R11 C4: never hash an environment, key or junk file
    if junk:
        raise ValueError('secret-bearing, junk or non-allowlisted file among the changed paths: ' + junk[0])
    leaked = [name for name in names if name not in {ARCHIVE} and regular_in_root(name) and secret_content(ROOT / name)]  # R13 q2
    if leaked:
        raise ValueError('secret-looking content among the changed paths: ' + leaked[0])
    unhashable = [name for name in names if name not in written and not regular_in_root(name)]
    if unhashable:
        raise ValueError('changed path missing, symlinked or not a regular file (registry input): ' + unhashable[0])
    generated = {'FANNAN-REWRITE.md': combined().encode('utf-8')}
    covers = ' '.join(sorted(p.name for p in release.iterdir()))
    generated['trust/MANIFEST.sha256'] = manifest(release_files, release, covers).encode('utf-8')
    generated['trust/PINNED.sha256'] = (hashlib.sha256(generated['trust/MANIFEST.sha256']).hexdigest() + '  MANIFEST.sha256\n').encode('utf-8')
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            name = path.relative_to(ROOT).as_posix()
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 17, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            mode = (0o444 if name.startswith('trust/') else 0o644) if name in GENERATED else stat.S_IMODE(path.stat().st_mode)
            entry.external_attr = (stat.S_IFREG | mode) << 16
            archive.writestr(entry, generated[name] if name in GENERATED else path.read_bytes())
    # all inputs accepted; only now are outputs replaced
    write_bytes(ROOT / 'FANNAN-REWRITE.md', generated['FANNAN-REWRITE.md'])
    write_bytes(ROOT / 'trust/MANIFEST.sha256', generated['trust/MANIFEST.sha256'], True)
    write_bytes(ROOT / 'trust/PINNED.sha256', generated['trust/PINNED.sha256'], True)
    write_bytes(ROOT / ARCHIVE, buffer.getvalue())
    report = verify_release_archive(paths)
    write(ROOT / REPORT, json.dumps(report, indent=2) + '\n')
    write(ROOT / REGISTRY, manifest([ROOT / name for name in names], ROOT, 'changed paths since ' + start), True)
    return verify(start, allow_unanchored=True)  # build's own consistency check; the anchored verify follows from the record


def verify_release_archive(archive_list=None):
    release = ROOT / 'release'
    pin = (ROOT / 'trust/PINNED.sha256').read_text().split()[0]
    entries = verify_hashes(ROOT / 'trust/MANIFEST.sha256', release, pin, [p.relative_to(release).as_posix() for p in files(release)])
    if (ROOT / 'FANNAN-REWRITE.md').read_text() != combined():
        raise ValueError('combined seven-deliverable document is stale')
    paths = {p.relative_to(ROOT).as_posix(): p for p in (archive_list if archive_list is not None else archive_paths())}
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
