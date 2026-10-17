#!/usr/bin/env python3
"""R4-5 regression tests for scripts/package-r3.py (standard library only; no network, no install)."""
import hashlib
import importlib.util
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
            self.assertIn('unanchored', package.check_registry_pin(registry, None))

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
    """CODEX-R2-04: allowed final records, one-file limits and ZIP exclusion are implemented and documented."""
    def coverage_for(self, names):
        saved = package.changed
        package.changed = lambda start: sorted(names)
        try:
            return package.coverage('start')
        finally:
            package.changed = saved

    def test_one_record_per_round_is_excluded_and_duplicates_fail(self):
        covered, excluded = self.coverage_for(['release/x', 'trust/R3-CHANGES.sha256', 'reviews/CODEX-R3-response-aaa.md', 'reviews/MIMAR-R4-changes-bbb.md', 'reviews/MIMAR-R5-changes-ccc.md'])
        self.assertEqual(covered, ['release/x'])
        self.assertEqual(set(excluded), {'trust/R3-CHANGES.sha256', 'reviews/CODEX-R3-response-aaa.md', 'reviews/MIMAR-R4-changes-bbb.md', 'reviews/MIMAR-R5-changes-ccc.md'})
        with self.assertRaisesRegex(ValueError, 'one final record per round'):
            self.coverage_for(['reviews/MIMAR-R5-changes-ccc.md', 'reviews/MIMAR-R5-changes-ddd.md'])
        with self.assertRaisesRegex(ValueError, 'only one final response'):
            self.coverage_for(['reviews/CODEX-R3-response-a.md', 'reviews/CODEX-R3-response-b.md'])
        covered, _ = self.coverage_for(['reviews/MIMAR-notes.md', 'reviews/MIMAR-R5-changes.md'])
        self.assertEqual(sorted(covered), sorted(['reviews/MIMAR-notes.md', 'reviews/MIMAR-R5-changes.md']), 'only exact record names are excluded')

    def test_records_are_not_in_the_zip(self):
        self.assertFalse(any(p.relative_to(ROOT).as_posix().startswith(('reviews/CODEX-', 'reviews/MIMAR-')) for p in package.archive_paths()))

    def test_doc_lists_every_allowed_final_record(self):
        text = (ROOT / 'release/PACKAGING.md').read_text()
        for needle in ['trust/R3-CHANGES.sha256', 'reviews/CODEX-R3-response-<sha>.md', 'reviews/MIMAR-R<n>-changes-<sha>.md', 'one file per round', 'not in the ZIP']:
            self.assertIn(needle, text)


if __name__ == '__main__':
    unittest.main()
