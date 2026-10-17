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


if __name__ == '__main__':
    unittest.main()
