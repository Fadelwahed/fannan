#!/usr/bin/env python3
"""R4-5 regression tests for scripts/package-r3.py (standard library only; no network, no install)."""
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/package-r3.py'
spec = importlib.util.spec_from_file_location('package_r3', SCRIPT)
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class RegistryPinTests(unittest.TestCase):
    def test_registry_pin_must_match_an_external_value(self):
        with tempfile.TemporaryDirectory() as temp:
            registry = Path(temp) / 'R3-CHANGES.sha256'
            registry.write_text('# covers: x\n')
            digest = hashlib.sha256(registry.read_bytes()).hexdigest()
            self.assertEqual(package.check_registry_pin(registry, digest), 'external')
            with self.assertRaisesRegex(ValueError, 'registry pin mismatch'):
                package.check_registry_pin(registry, '0' * 64)
            with self.assertRaisesRegex(ValueError, '64 lowercase hex'):
                package.check_registry_pin(registry, 'ABC')
            with self.assertRaisesRegex(ValueError, 'unanchored registry'):
                package.check_registry_pin(registry, None)  # ARGON-R2-02: verify refuses without an external pin
            self.assertIn('unanchored', package.check_registry_pin(registry, None, allow_unanchored=True))

    @unittest.skipUnless((ROOT / '.git').exists(), 'needs a git checkout of the repository')
    def test_cli_verify_refuses_without_registry_pin_unless_explicitly_allowed(self):
        p = subprocess.run([sys.executable, '-B', str(SCRIPT), 'verify', '--start', 'HEAD'], capture_output=True, text=True, cwd=ROOT)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn('unanchored registry', p.stderr)
        p = subprocess.run([sys.executable, '-B', str(SCRIPT), 'build', '--start', 'HEAD', '--allow-unanchored-registry'], capture_output=True, text=True, cwd=ROOT)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn('verify only', p.stderr)
        self.assertIn('--allow-unanchored-registry', (ROOT / 'release/PACKAGING.md').read_text())

    @unittest.skipUnless((ROOT / '.git').exists(), 'needs a git checkout of the repository')
    def test_cli_accepts_registry_option_and_refuses_a_wrong_pin_first(self):
        p = subprocess.run([sys.executable, '-B', str(SCRIPT), 'verify', '--start', 'HEAD', '--registry-sha256', 'not-hex'], capture_output=True, text=True, cwd=ROOT)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn('64 lowercase hex', p.stderr)
        with tempfile.TemporaryDirectory() as temp:
            clone = Path(temp) / 'clone'
            subprocess.run(['git', 'clone', '-q', str(ROOT), str(clone)], check=True)
            shutil.copy2(SCRIPT, clone / 'scripts/package-r3.py')  # test the working-tree script, not the committed one
            for name in ['trust/MANIFEST.sha256', 'trust/R3-CHANGES.sha256']:
                os.chmod(clone / name, 0o444)
            p = subprocess.run([sys.executable, '-B', 'scripts/package-r3.py', 'verify', '--start', 'HEAD', '--registry-sha256', '0' * 64], capture_output=True, text=True, cwd=clone)
            self.assertNotEqual(p.returncode, 0)
            self.assertIn('registry pin mismatch', p.stderr)

    def test_packaging_doc_names_both_read_only_files_and_the_pin_option(self):
        text = (ROOT / 'release/PACKAGING.md').read_text()
        self.assertIn('chmod 0444 trust/MANIFEST.sha256 trust/R3-CHANGES.sha256', text)
        self.assertIn('--registry-sha256', text)


class WhitespacePolicyTests(unittest.TestCase):
    """CODEX-R2-03: raw test logs keep their bytes; the whitespace check is range-qualified and source-only."""
    def test_policy_is_documented(self):
        text = (ROOT / 'release/PACKAGING.md').read_text()
        self.assertIn("git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'", text)
        self.assertIn('raw logs are kept byte-for-byte', text)

    @unittest.skipUnless((ROOT / '.git').exists(), 'needs a git checkout of the repository')
    def test_source_only_range_check_passes(self):
        p = subprocess.run(['git', 'diff', '--check', 'eb2d540..HEAD', '--', '.', ':(exclude)test-results/**/*.log'], capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)


class FinalRecordTests(unittest.TestCase):
    """CODEX-R2-04 + OPUS-R2-03: only the registry and the one latest Mi'mar record written after the freeze stay
    unhashed; the frozen CODEX response and earlier records are hashed; no record is in the ZIP."""
    def coverage_for(self, names, listed=None):
        saved = package.changed
        package.changed = lambda start: sorted(names)
        try:
            return package.coverage('start', listed)
        finally:
            package.changed = saved

    def test_build_hashes_everything_but_the_registry(self):
        names = ['release/x', 'trust/R3-CHANGES.sha256', 'reviews/CODEX-R3-response-aaa.md', 'reviews/MIMAR-R4-changes-bbb.md', 'reviews/MIMAR-R5-changes-ccc.md']
        covered, excluded = self.coverage_for(names)
        self.assertEqual(set(excluded), {'trust/R3-CHANGES.sha256'})
        self.assertEqual(sorted(covered), sorted(n for n in names if n != 'trust/R3-CHANGES.sha256'))

    def test_verify_excludes_only_one_latest_record_written_after_the_freeze(self):
        listed = {'release/x', 'reviews/CODEX-R3-response-aaa.md', 'reviews/MIMAR-R4-changes-bbb.md', 'reviews/MIMAR-R5-changes-ccc.md'}
        names = sorted(listed | {'trust/R3-CHANGES.sha256', 'reviews/MIMAR-R5-changes-ddd.md'})
        covered, excluded = self.coverage_for(names, listed)
        self.assertEqual(set(excluded), {'trust/R3-CHANGES.sha256', 'reviews/MIMAR-R5-changes-ddd.md'})
        self.assertEqual(set(covered), listed)
        with self.assertRaisesRegex(ValueError, 'at most one record after the freeze'):
            self.coverage_for(names + ['reviews/MIMAR-R6-changes-eee.md'], listed)
        with self.assertRaisesRegex(ValueError, 'older than'):
            self.coverage_for(sorted(listed | {'reviews/MIMAR-R3-changes-fff.md'}), listed)
        covered, _ = self.coverage_for(sorted(listed | {'reviews/CODEX-R3-response-zzz.md', 'reviews/MIMAR-R5-changes.md'}), listed)
        self.assertIn('reviews/CODEX-R3-response-zzz.md', covered, 'an unhashed CODEX response is not excused')
        self.assertIn('reviews/MIMAR-R5-changes.md', covered, 'only the exact record name pattern is excused')

    def test_records_are_not_in_the_zip(self):
        self.assertFalse(any(p.relative_to(ROOT).as_posix().startswith(('reviews/CODEX-', 'reviews/MIMAR-')) for p in package.archive_paths()))

    def test_zip_carries_the_packaging_script_and_its_tests_but_no_review_records(self):
        # ARGON-R2-08: recipients of the ZIP can rerun the self-test and the non-git package tests; review records stay out.
        names = {p.relative_to(ROOT).as_posix() for p in package.archive_paths()}
        self.assertTrue({'scripts/package-r3.py', 'scripts/test_package_r3.py'} <= names)
        self.assertNotIn('reviews/CODEX-R3-response-f42bc27.md', names)
        if (ROOT / 'test-results/r6').is_dir():
            self.assertTrue(any(n.startswith('test-results/r6/') for n in names), 'R6 evidence is archived like R4/R5')
        if (ROOT / 'test-results/r7').is_dir():
            self.assertTrue(any(n.startswith('test-results/r7/') for n in names), 'R7 evidence is archived like R4-R6')
        if (ROOT / 'test-results/r8').is_dir():
            self.assertTrue(any(n.startswith('test-results/r8/') for n in names), 'R8 evidence is archived like R4-R7')
        if (ROOT / 'test-results/r9').is_dir():
            self.assertTrue(any(n.startswith('test-results/r9/') for n in names), 'R9 evidence is archived like R4-R8')
        if (ROOT / 'test-results/r10').is_dir():
            self.assertTrue(any(n.startswith('test-results/r10/') for n in names), 'R10 evidence is archived like R4-R9')
        if (ROOT / 'test-results/r11').is_dir():
            self.assertTrue(any(n.startswith('test-results/r11/') for n in names), 'R11 evidence is archived like R4-R10')
        if (ROOT / 'test-results/r12').is_dir():
            self.assertTrue(any(n.startswith('test-results/r12/') for n in names), 'R12 evidence is archived like R4-R11')
        if (ROOT / 'test-results/r13').is_dir():
            self.assertTrue(any(n.startswith('test-results/r13/') for n in names), 'R13 evidence is archived like R4-R12')
        if (ROOT / 'test-results/r14').is_dir():
            self.assertTrue(any(n.startswith('test-results/r14/') for n in names), 'R14 evidence is archived like R4-R13')
        if (ROOT / 'test-results/r15').is_dir():
            self.assertTrue(any(n.startswith('test-results/r15/') for n in names), 'R15 evidence is archived like R4-R14')
        if (ROOT / 'test-results/r16').is_dir():
            self.assertTrue(any(n.startswith('test-results/r16/') for n in names), 'R16 evidence is archived like R4-R15')
        if (ROOT / 'test-results/r17').is_dir():
            self.assertTrue(any(n.startswith('test-results/r17/') for n in names), 'R17 evidence is archived like R4-R16')
        if (ROOT / 'test-results/r18').is_dir():
            self.assertTrue(any(n.startswith('test-results/r18/') for n in names), 'R18 evidence is archived like R4-R17')
        self.assertNotIn('reviews/ARGON-R5-b24fd1f.md', names)
        self.assertIn('scripts/test_package_r3.py', (ROOT / 'release/PACKAGING.md').read_text())

    def test_doc_lists_the_exclusions(self):
        text = (ROOT / 'release/PACKAGING.md').read_text()
        for needle in ['trust/R3-CHANGES.sha256', 'reviews/MIMAR-R<n>-changes-<sha>.md', 'at most one', 'not in the ZIP', '`reviews/CODEX-R3-response-<sha>.md` is hashed']:
            self.assertIn(needle, text)
        self.assertNotIn('exactly two', text)



class PackageInputTests(unittest.TestCase):
    # R8 PORT-04, ported from codex/fannan-r3-review 2733317 (scripts/build-package.py files_under): caches, dependency
    # trees and Git metadata inside a packaged tree are refused instead of being hashed into the manifest and the ZIP.
    def test_files_refuses_cache_dependency_and_git_entries(self):
        for bad in ['tests/__pycache__/x.cpython-313.pyc', 'tools/stray.pyc', 'node_modules/pkg/index.js', '.git/HEAD']:
            with tempfile.TemporaryDirectory() as temp:
                tree = Path(temp) / 'release'
                (tree / 'tools').mkdir(parents=True)
                (tree / 'tools/ok.mjs').write_text('ok')
                self.assertEqual([p.name for p in package.files(tree)], ['ok.mjs'])
                (tree / bad).parent.mkdir(parents=True, exist_ok=True)
                (tree / bad).write_bytes(b'x')
                with self.assertRaisesRegex(ValueError, 'cache, dependency or git entry'):
                    package.files(tree)

    def test_release_tree_is_clean_now(self):
        package.files(ROOT / 'release')

class BuildOrderTests(unittest.TestCase):
    """CODEX-R4-01: a rejected input is found before any output is written, so the previous outputs keep their bytes."""
    OUTPUTS = ['FANNAN-REWRITE.md', 'trust/MANIFEST.sha256', 'trust/PINNED.sha256', 'artifacts/FANNAN-R3.zip', 'test-results/r3/package-verification.json', 'trust/R3-CHANGES.sha256']

    def run_build(self, damage):
        saved = package.ROOT, package.combined, package.changed, getattr(package, 'missing_sections', None)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'release/tools').mkdir(parents=True)
            (root / 'release/tools/ok.mjs').write_text('ok')
            (root / 'input').mkdir()
            (root / 'input/brief.md').write_text('brief')
            before = {}
            for name in self.OUTPUTS:
                (root / name).parent.mkdir(parents=True, exist_ok=True)
                (root / name).write_bytes(b'previous ' + name.encode())
                before[name] = (root / name).read_bytes()
            package.ROOT = root
            package.combined = lambda: 'regenerated'
            package.missing_sections = lambda root=None: []  # synthetic tree; RequiredSectionTests covers the sections
            package.changed = lambda start: ['release/tools/ok.mjs']
            try:
                damage(root)
                with self.assertRaises((ValueError, subprocess.CalledProcessError)):
                    package.build('9ee1ca6')
            finally:
                package.ROOT, package.combined, package.changed, package.missing_sections = saved
                if package.missing_sections is None:
                    del package.missing_sections
            for name in self.OUTPUTS:
                self.assertEqual((root / name).read_bytes(), before[name], name + ' was changed by a rejected build')
            self.assertEqual([p.name for p in (root / 'artifacts').iterdir()], ['FANNAN-R3.zip'], 'no temp file left behind')

    def test_symlink_in_release_preserves_outputs(self):
        self.run_build(lambda root: (root / 'release/link').symlink_to(root / 'input/brief.md'))

    def test_cache_in_input_preserves_outputs(self):
        def damage(root):
            (root / 'input/__pycache__').mkdir(); (root / 'input/__pycache__/x.pyc').write_bytes(b'x')
        self.run_build(damage)

    def test_missing_archive_input_preserves_outputs(self):
        self.run_build(lambda root: None)  # ORIGINAL-ASSIGNMENT.md and the other named inputs are absent

    def test_bad_start_preserves_outputs(self):
        def damage(root):
            def bad(start):
                raise subprocess.CalledProcessError(128, ['git', 'diff', start])
            package.changed = bad
        self.run_build(damage)

    def test_build_lists_archive_paths_once(self):
        src = SCRIPT.read_text()
        body = src[src.index('def build(start):'):src.index('def verify_release_archive')]
        self.assertEqual(body.count('archive_paths()'), 1)
        self.assertLess(body.index('archive_paths()'), body.index('write_bytes('))
        self.assertLess(body.index('coverage(start)'), body.index('write_bytes('))


class RegistryInputTests(unittest.TestCase):
    """ARGON-R5-04: every changed path that the registry will hash is validated BEFORE the first output is written."""
    OUTPUTS = BuildOrderTests.OUTPUTS
    NAMED = ['ORIGINAL-ASSIGNMENT.md', 'GROK-HANDOFF.md', 'CLOUD-HANDOFF.md', 'reviews/GROK-R3-d2c36c1.md', 'scripts/package-r3.py', 'scripts/test_package_r3.py']

    def run_build(self, extra, damage):
        saved = package.ROOT, package.combined, package.changed, getattr(package, 'missing_sections', None)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'release/tools').mkdir(parents=True)
            (root / 'release/tools/ok.mjs').write_text('ok')
            (root / 'input').mkdir()
            (root / 'input/brief.md').write_text('brief')
            for name in self.NAMED:
                (root / name).parent.mkdir(parents=True, exist_ok=True)
                (root / name).write_text(name)
            before = {}
            for name in self.OUTPUTS:
                (root / name).parent.mkdir(parents=True, exist_ok=True)
                (root / name).write_bytes(b'previous ' + name.encode())
                before[name] = (root / name).read_bytes()
            damage(root)
            package.ROOT = root
            package.combined = lambda: 'regenerated'
            package.missing_sections = lambda root=None: []  # synthetic tree; RequiredSectionTests covers the sections
            package.changed = lambda start: sorted(['release/tools/ok.mjs', package.REGISTRY, *extra])
            try:
                with self.assertRaises(ValueError) as caught:
                    package.build('9ee1ca6')
            finally:
                package.ROOT, package.combined, package.changed, package.missing_sections = saved
                if package.missing_sections is None:
                    del package.missing_sections
            for name in self.OUTPUTS:
                self.assertEqual((root / name).read_bytes(), before[name], name + ' was changed by a rejected build')
            return str(caught.exception)

    def test_missing_changed_path_fails_before_any_write(self):
        message = self.run_build(['docs/deleted.md'], lambda root: None)
        self.assertIn('docs/deleted.md', message)

    def test_symlinked_changed_path_fails_before_any_write(self):
        def damage(root):
            (root / 'docs').mkdir(); (root / 'docs/link.md').symlink_to(root / 'input/brief.md')
        message = self.run_build(['docs/link.md'], damage)
        self.assertIn('docs/link.md', message)

    def test_changed_path_under_a_symlinked_folder_fails_before_any_write(self):
        def damage(root):
            (root / 'real').mkdir(); (root / 'real/x.md').write_text('x'); (root / 'docs').symlink_to(root / 'real')
        message = self.run_build(['docs/x.md'], damage)
        self.assertIn('docs/x.md', message)

    def test_build_computes_registry_names_once_before_writing(self):
        src = SCRIPT.read_text()
        body = src[src.index('def build(start):'):src.index('def verify_release_archive')]
        self.assertEqual(body.count('coverage(start)'), 1, 'one coverage list, reused for the registry')
        self.assertLess(body.index('coverage(start)'), body.index('write_bytes('))


class RequiredSectionTests(unittest.TestCase):
    def test_r14_release_carries_every_designer_process_section(self):
        # R14 Part B: the plan, contract and skills carry the required sections; a tree without one is refused.
        self.assertTrue(hasattr(package, 'missing_sections'), 'the package checks the required sections')
        self.assertEqual(package.missing_sections(), [])
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name in package.REQUIRED_SECTIONS:
                (root / name).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(ROOT / name, root / name)
            self.assertEqual(package.missing_sections(root), [])
            plan = root / 'release/FANNAN-PLAN.md'
            plan.write_text(plan.read_text().replace("## Folding in the approver's feedback", '## Feedback'))
            self.assertEqual(package.missing_sections(root), ["release/FANNAN-PLAN.md: ## Folding in the approver's feedback"])
            (root / 'release/skills/design-canvas/SKILL.md').unlink()
            self.assertIn('release/skills/design-canvas/SKILL.md: missing file', package.missing_sections(root))

    def test_r15_sections_and_retired_wording(self):
        # R15 B1-B4: the Step 5 gate timing, the unitless column count, the feedback-log and critic-row text are
        # required; the old Step 4 timing and the "each value is a spacing-scale token" grid clause are refused.
        required = getattr(package, 'REQUIRED_SECTIONS', {})
        self.assertIn('Column counts are positive unitless integers recorded beside the grid spec, not spacing tokens.', required.get('release/FANNAN-PLAN.md', []))
        for name in ['release/skills/design-prototype/SKILL.md', 'release/references/design-quality.md', 'release/references/critic-rubric.md']:
            self.assertIn(name, required)
        self.assertEqual(package.missing_sections(), [])
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name in required:
                (root / name).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / name, root / name)
            plan = root / 'release/FANNAN-PLAN.md'
            plan.write_text(plan.read_text() + '\nFor each width, list the column count; each value is a spacing-scale token.\n')
            self.assertTrue(any('retired wording' in m and 'spacing-scale token' in m for m in package.missing_sections(root)), 'the unit-breaking grid clause is refused')

    def test_r16_sections(self):
        # R16-GPT-03/04: the wireframe coverage rule and the shared component specification are required in the plan
        # and the contract guide, and the critic rubric carries the cross-screen comparison step.
        required = getattr(package, 'REQUIRED_SECTIONS', {})
        self.assertIn('A wireframe PASS covers every declared desktop screen and locale.', required.get('release/FANNAN-PLAN.md', []))
        self.assertIn('Maintain one canonical specification for each reused component', required.get('release/FANNAN-PLAN.md', []))
        self.assertIn('## Cross-screen component comparison', required.get('release/references/critic-rubric.md', []))
        self.assertTrue(any('component-consistency' in m for m in required.get('release/references/handoff-contract.md', [])))
        self.assertEqual(package.missing_sections(), [])

    def test_r17_sections(self):
        # R17: the fail-closed compositing sentence, the ENH backlog entry and the rendered-visibility backstop are
        # required in design-quality.md.
        required = getattr(package, 'REQUIRED_SECTIONS', {}).get('release/references/design-quality.md', [])
        self.assertIn('Unresolved compositing on displayed text in either rendering blocks handoff as INCOMPLETE.', required)
        self.assertTrue(any(m.startswith('ENH backlog:') for m in required))
        self.assertIn('Rendered-visibility backstop:', required)
        self.assertEqual(package.missing_sections(), [])

    def test_r18_sections(self):
        # R18: the backstop's role (pixels decide visibility; AA stays with the CSS pass) and text that is not displayed
        # (textHidden) are required in design-quality.md.
        required = getattr(package, 'REQUIRED_SECTIONS', {}).get('release/references/design-quality.md', [])
        self.assertIn('Pixels decide visibility, not AA:', required)
        self.assertIn('is not displayed: it is counted (`textHidden`)', required)
        self.assertEqual(package.missing_sections(), [])

    def test_r14_build_checks_sections_before_any_output(self):
        import inspect
        self.assertTrue(hasattr(package, 'missing_sections'), 'the package checks the required sections')
        source = inspect.getsource(package.build)
        self.assertLess(source.index('absent = missing_sections()'), source.index('write_bytes('), 'refused before any output is replaced')


class JunkAndSecretTests(unittest.TestCase):
    """R11 (Asad panel C4): secret-bearing or junk files are never packaged or hashed: .env, .env.*, .DS_Store,
    Thumbs.db, keys and editor swap files are refused in package input and among the changed (registry) paths."""
    BAD = ['.env', '.env.local', '.env.example', '.DS_Store', 'Thumbs.db', 'desktop.ini', 'id_rsa', 'id_ed25519.pub', 'server.pem', 'tls.key', 'cert.p12', 'x.pfx', '.npmrc', '.netrc', '.pypirc', 'notes.md.swp', 'draft.md~',
           # R11 panel D1: allowlist (not a denylist): VCS and editor debris and unlisted file types fail
           '.gitignore', '.gitattributes', '.vscode/settings.json', '.idea/workspace.xml', 'merge.md.orig', 'patch.rej', 'old.md.bak', 'notes.docx', 'image.png', '.env.md', 'id_rsa.txt']

    def test_files_refuses_junk_and_secret_names(self):
        for name in self.BAD:
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                (root / 'sub').mkdir()
                (root / 'ok.md').write_text('ok')
                (root / 'sub' / name).parent.mkdir(parents=True, exist_ok=True)
                (root / 'sub' / name).write_text('x')
                with self.assertRaises(ValueError, msg=name) as caught:
                    package.files(root)
                self.assertIn(Path(name).name if '/' not in name else name.split('/')[0], str(caught.exception))

    R12_BAD = ['release/.envrc.json', 'credentials.json', 'private.key.json', '.ssh/config.json', 'secrets.json', 'service-account.json', 'token.json', '.git-credentials.txt', '.npmrc.json', '.#notes.md', '.env-prod.md', '.gnupg/pubring.txt', '.aws/config.json', 'Secrets.yaml.md', 'cert.pem.txt']

    def test_r12_secret_names_with_allowed_suffixes_are_refused_as_input_and_changed_paths(self):
        # R12 M12: an allowlisted suffix never launders a credential name or folder.
        for name in self.R12_BAD:
            self.assertTrue(package.junk_or_secret(name), name)
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                (root / 'ok.md').write_text('ok')
                (root / 'sub' / name).parent.mkdir(parents=True, exist_ok=True)
                (root / 'sub' / name).write_text('x')
                with self.assertRaises(ValueError, msg=name):
                    package.files(root)
        for name in ['release/.envrc.json', 'credentials.json', '.ssh/config.json', '.#notes.md']:
            def damage(root, name=name):
                (root / name).parent.mkdir(parents=True, exist_ok=True); (root / name).write_text('x')
            message = RegistryInputTests('run_build').run_build([name], damage)
            self.assertTrue(any(part in message for part in Path(name).parts), f'{name}: {message}')
        for name in ['test-results/local-fixture/design-output/test/tokens.json', 'test-results/r3/secret-scan.json', 'release/tools/token-references.mjs', 'release/tests/token-validation.test.mjs', 'release/references/environment.md', 'keyboard.md']:
            self.assertFalse(package.junk_or_secret(name), name)

    R13_BAD = ['aws-credentials.json', 'client-secret.json', 'client_secrets.json', 'api-token.json', 'github_token.txt', 'prod.secrets.json', 'oauth-tokens.json', 'tokens.production.json', 'tokens.backup.txt', 'tokens.json', 'db-password.txt', 'my.apikey.json', 'secrets/notes.md']

    def test_r13_credential_words_anywhere_are_refused_as_input_and_changed_paths(self):
        # R13 N10: a credential word anywhere in a path part refuses it (prefix, infix, suffix, plural, folder).
        for name in self.R13_BAD:
            self.assertTrue(package.junk_or_secret(name), name)
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                (root / 'ok.md').write_text('ok')
                (root / name).parent.mkdir(parents=True, exist_ok=True)
                (root / name).write_text('{}')
                with self.assertRaises(ValueError, msg=name):
                    package.files(root)
        for name in ['oauth-tokens.json', 'tokens.json', 'client-secret.json']:
            def damage(root, name=name):
                (root / name).write_text('{}')
            message = RegistryInputTests('run_build').run_build([name], damage)
            self.assertIn(name, message)
        for name in ['release/tools/token-references.mjs', 'release/tests/token-validation.test.mjs', 'test-results/r3/secret-scan.json']:
            self.assertFalse(package.junk_or_secret(name), name)

    def test_r13_tokens_json_only_at_the_declared_path_with_design_token_content(self):
        # R13 panel q2: tokens.json passes only when the handoff.json beside it declares that path and hash, and every
        # leaf is a $value node with no credential keys.
        good = {'colors': {'primary': {'$value': '#123456', '$type': 'color'}}, 'spacing': {'md': {'$value': '16px'}}}
        cred = 'access' + '_token'
        def tree(tokens, declared=True, sha=None, rel='design/tokens.json'):
            temp = tempfile.TemporaryDirectory(); root = Path(temp.name)
            (root / 'design').mkdir(); path = root / 'design/tokens.json'; path.write_text(json.dumps(tokens))
            digest = sha or hashlib.sha256(path.read_bytes()).hexdigest()
            if declared:
                (root / 'design/handoff.json').write_text(json.dumps({'tokens': {'json': {'path': '/somewhere/else/' + rel, 'sha256': digest}}}))
            return temp, root
        temp, root = tree(good)
        with temp:
            self.assertEqual(len(package.files(root)), 2, 'declared, hash-matched design tokens pass')
        for tokens, kwargs in [(good, {'declared': False}), (good, {'sha': '0' * 64}), (good, {'rel': 'other/tokens.json'}), ({'colors': {'primary': '#123456'}}, {}), ({cred: 'abcdefgh'}, {}), ({'oauth': {'refresh' + '_token': {'$value': 'x'}}}, {}), ({'colors': {'primary': {'$value': {'client' + '_secret': 'x'}}}}, {}), ({}, {})]:
            temp, root = tree(tokens, **kwargs)
            with temp, self.assertRaises(ValueError, msg=f'{tokens} {kwargs}'):
                package.files(root)
        self.assertFalse(package.junk_or_secret('test-results/local-fixture/design-output/test/tokens.json'), 'the tracked fixture tokens are declared by their handoff and hash-matched')

    def test_r14_credential_keys_anywhere_in_tokens_json_are_refused(self):
        # R14-GPT-06: metadata siblings of $value, $extensions and composite $value arrays are searched too; valid
        # credential-free extension metadata still passes. Package input and changed paths.
        pw, cs = 'pass' + 'word', 'client' + 'Secret'
        def tree(tokens):
            temp = tempfile.TemporaryDirectory(); root = Path(temp.name)
            (root / 'design').mkdir(); path = root / 'design/tokens.json'; path.write_text(json.dumps(tokens))
            (root / 'design/handoff.json').write_text(json.dumps({'tokens': {'json': {'path': '/x/design/tokens.json', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}}}))
            return temp, root
        good = {'colors': {'primary': {'$value': '#123456', '$type': 'color', '$extensions': {'org.example.tool': {'hidden': False, 'source': 'brand sheet'}}}}, 'shadow': {'card': {'$value': [{'color': '#000', 'offsetX': '0px'}], '$type': 'shadow'}}}
        temp, root = tree(good)
        with temp:
            self.assertEqual(len(package.files(root)), 2, 'credential-free $extensions and composite values pass')
        bad = [
            {'colors': {'primary': {'$value': '#123456', '$extensions': {'auth': {pw: 'x'}}}}},
            {'colors': {'primary': {'$value': '#123456', 'api-key': 'x'}}},
            {'shadow': {'card': {'$value': [{'color': '#000', cs: 'x'}]}}},
            {'list': [{'nested': [{'Access_Token': 'x'}]}], 'colors': {'p': {'$value': '#000'}}},
        ]
        for tokens in bad:
            temp, root = tree(tokens)
            with temp, self.assertRaises(ValueError, msg=json.dumps(tokens)):
                package.files(root)
        def damage(root):
            (root / 'design').mkdir(exist_ok=True)
            path = root / 'design/tokens.json'; path.write_text(json.dumps(bad[0]))
            (root / 'design/handoff.json').write_text(json.dumps({'tokens': {'json': {'path': '/x/design/tokens.json', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}}}))
        self.assertIn('design/tokens.json', RegistryInputTests('run_build').run_build(['design/tokens.json'], damage))

    def test_r14_json_credential_values_in_ordinary_files_are_refused(self):
        # R14-GPT-06: the content screen also catches a JSON credential key with a real-looking value in any file.
        for key in ['pass' + 'word', 'Pass' + 'word', 'api' + 'Key', 'api_' + 'key', 'private' + '-key', 'sec' + 'ret']:
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                (root / 'notes.json').write_text('{"auth": {"' + key + '": "' + 'v' * 12 + '"}}')
                with self.assertRaises(ValueError, msg=key):
                    package.files(root)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'notes.json').write_text('{"' + 'pass' + 'word": ""}')
            self.assertEqual(len(package.files(root)), 1, 'an empty placeholder value passes')

    R15_KEYS = ['Access_' + 'Token', 'access' + 'Token', 'refresh' + 'Token', 'Refresh-' + 'Token', 'CLIENT_' + 'SECRET', 'Api-' + 'Key']

    def test_r15_camel_and_mixed_case_json_credential_keys_are_refused(self):
        # R15 A2 (R15-GPT-02): ordinary JSON is parsed and every key screened with credential_key(), so camelCase and
        # mixed-case spellings fail as package input and as changed paths; empty placeholders still pass.
        for key in self.R15_KEYS:
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                (root / 'notes.json').write_text('{"auth": [{"' + key + '": "' + 'v' * 12 + '"}]}')
                with self.assertRaises(ValueError, msg=key) as caught:
                    package.files(root)
                self.assertIn('secret-looking content', str(caught.exception))
            def damage(root, key=key):
                (root / 'docs').mkdir(exist_ok=True); (root / 'docs/notes.json').write_text('{"' + key + '": "' + 'v' * 12 + '"}')
            self.assertIn('docs/notes.json', RegistryInputTests('run_build').run_build(['docs/notes.json'], damage), key)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'notes.json').write_text('{"access' + 'Token": "", "tokenCount": "123456789012"}')
            self.assertEqual(len(package.files(root)), 1, 'an empty placeholder and a non-credential key pass')

    @unittest.skipUnless((ROOT / '.git').exists() and shutil.which('git'), 'needs the Git checkout')
    def test_r15_real_build_refuses_camel_case_json_credentials(self):
        # R15 A2, through a real package build: a local clone carrying this working copy's files runs
        # `package-r3.py build`; a camelCase credential in a changed path or in package input stops it before any
        # output, and the same file with an empty value builds.
        start = '9ee1ca6aaa4a257cb84fb7381056005f48554bf3'
        def build(name, value):
            with tempfile.TemporaryDirectory() as temp:
                clone = Path(temp) / 'c'
                subprocess.run(['git', 'clone', '-q', '--no-hardlinks', str(ROOT), str(clone)], check=True, capture_output=True)
                listed = subprocess.run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT, check=True, capture_output=True).stdout.decode().split('\0')
                for rel in filter(None, listed):  # the working copy on top of the clone, as `build` would see it here
                    if (ROOT / rel).is_file() and not (ROOT / rel).is_symlink():
                        (clone / rel).parent.mkdir(parents=True, exist_ok=True); shutil.copy2(ROOT / rel, clone / rel)
                for keep in ['trust/MANIFEST.sha256', 'trust/R3-CHANGES.sha256', 'trust/PINNED.sha256']:
                    if (clone / keep).exists():
                        os.chmod(clone / keep, 0o644)
                (clone / name).parent.mkdir(parents=True, exist_ok=True)
                (clone / name).write_text('{"service": {"access' + 'Token": "' + value + '"}}')
                before = (clone / 'trust/R3-CHANGES.sha256').read_bytes()
                done = subprocess.run([sys.executable, '-B', 'scripts/package-r3.py', 'build', '--start', start], cwd=clone, capture_output=True, text=True)
                return done.returncode, done.stdout + done.stderr, before == (clone / 'trust/R3-CHANGES.sha256').read_bytes()
        for name in ['docs/service-notes.json', 'release/references/service-notes.json']:
            code, output, unchanged = build(name, 'v' * 16)
            self.assertNotEqual(code, 0, f'{name}: the real build accepted a camelCase credential\n{output[-400:]}')
            self.assertIn('secret-looking content', output, name)
            self.assertIn(name.split('/', 1)[1] if name.startswith('release/') else name, output, name)
            self.assertTrue(unchanged, f'{name}: the registry was rewritten by a refused build')
        code, output, _ = build('docs/service-notes.json', '')
        self.assertEqual(code, 0, 'control: the same file with an empty value builds\n' + output[-600:])

    def test_r13_secret_content_in_ordinary_names_is_refused(self):
        # R13 panel q2: obvious secrets inside ordinarily named packaged files fail the package input and changed paths.
        samples = ['-----BEGIN RSA ' + 'PRIVATE KEY-----\nabc', 'key = "AK' + 'IA' + 'A' * 16 + '"', 'gh' + 'p_' + 'a' * 36, 'xo' + 'xb-' + '1' * 12, '{"refresh' + '_token": "' + 'r' * 20 + '"}']
        for text in samples:
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                (root / 'notes.md').write_text(text)
                with self.assertRaises(ValueError, msg=text[:20]) as caught:
                    package.files(root)
                self.assertIn('secret-looking content', str(caught.exception))
        def damage(root):
            (root / 'docs').mkdir(exist_ok=True); (root / 'docs/notes.md').write_text(samples[1])
        self.assertIn('docs/notes.md', RegistryInputTests('run_build').run_build(['docs/notes.md'], damage))
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'notes.md').write_text('The AKIA prefix and "refresh_token" are mentioned, not used.')
            self.assertEqual(len(package.files(root)), 1, 'mentions without a value pass')

    def test_ordinary_names_still_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name in ['environment.md', 'keyboard-notes.md', 'env.json', 'pem-notes.txt']:  # R13 N10: 'keys-and-tokens.md' now carries a credential word
                (root / name).write_text('x')
            self.assertEqual(len(package.files(root)), 4)

    def test_build_refuses_a_junk_changed_path_before_any_write(self):
        def damage(root):
            (root / 'docs').mkdir(); (root / 'docs/.DS_Store').write_bytes(b'x')
        message = RegistryInputTests('run_build').run_build(['docs/.DS_Store'], damage)
        self.assertIn('docs/.DS_Store', message)

    def test_live_changed_paths_are_clean(self):
        if not (ROOT / '.git').exists():
            self.skipTest('needs a git checkout')
        self.assertEqual([n for n in package.changed('9ee1ca6aaa4a257cb84fb7381056005f48554bf3') if package.junk_or_secret(n)], [])

if __name__ == '__main__':
    unittest.main()
