import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import shutil
from unittest.mock import patch


TOOLS = Path(__file__).resolve().parents[1] / 'tools'
spec = importlib.util.spec_from_file_location('safe_write', TOOLS / 'safe-write.py')
writer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(writer)


class GuardTests(unittest.TestCase):
    def test_project_and_traversal_validation(self):
        root = Path('/workspace/design-output')
        good = '/workspace/design-output/a-1/evidence/result.json'
        self.assertEqual(writer.validate_target(root, 'a-1', good), ('evidence', 'result.json'))
        for project, target in [
            ('*', good), ('bad name', good), ('-bad', good), ('bad-', good),
            ('a' * 65, good), ('a-1', '/workspace/design-output/a-1/../other'),
            ('a-1', '/workspace/design-output/other/result.json'),
            ('a-1', '/workspace/design-output/a-1'),
        ]:
            with self.subTest(project=project, target=target), self.assertRaises(ValueError):
                writer.validate_target(root, project, target)

    def test_launcher_denies_outside_and_missing_project_before_hash(self):
        with tempfile.TemporaryDirectory() as temp:
            dummy = Path(temp) / 'dummy-binary'
            dummy.write_bytes(b'not the pinned binary')
            env = {'PATH': '/usr/bin:/bin', 'IMPECCABLE_BIN': str(dummy), 'FANNAN_PROJECT': 'a-1'}
            launcher = str(TOOLS / 'launcher-impeccable.sh')
            p = subprocess.run([launcher, 'detect', '--json', '/etc/hosts'], env=env, capture_output=True)
            self.assertEqual(p.returncode, 4, p.stderr)
            if sys.platform == 'linux':
                self.assertIn(b'outside project', p.stderr)
            env.pop('FANNAN_PROJECT')
            p = subprocess.run([launcher, 'detect', '--json', '/etc/hosts'], env=env, capture_output=True)
            self.assertEqual(p.returncode, 4, p.stderr)

    def test_launcher_drops_ambient_secrets_before_helpers(self):
        with tempfile.TemporaryDirectory() as temp:
            launcher = Path(temp) / 'launcher-impeccable.sh'
            shutil.copyfile(TOOLS / launcher.name, launcher)
            launcher.chmod(0o700)
            # Test-only probe replaces the internal helper, never the pinned binary.
            Path(str(launcher) + '.internal').write_text('#!/bin/sh\n/usr/bin/env\n')
            env = {'PATH': '/untrusted', 'TEST_SECRET': 'do-not-forward',
                   'NODE_OPTIONS': '--trace-warnings', 'IMPECCABLE_BIN': '/candidate',
                   'FANNAN_PROJECT': 'a-1'}
            p = subprocess.run([str(launcher), '--version'], env=env, capture_output=True, check=True)
            self.assertNotIn(b'TEST_SECRET', p.stdout)
            self.assertNotIn(b'NODE_OPTIONS', p.stdout)
            self.assertNotIn(b'/untrusted', p.stdout)
            self.assertIn(b'FANNAN_PROJECT=a-1', p.stdout)

    @unittest.skipUnless(sys.platform == 'linux', 'Linux openat2 behavior requires Linux host')
    def test_exclusive_write_and_swapped_ancestor(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'design-output'
            project = root / 'a-1'
            other = Path(temp) / 'other'
            project.mkdir(parents=True)
            other.mkdir()
            target = project / 'evidence' / 'result.json'
            with patch.object(writer, 'require_host', return_value=None):
                writer.safe_write(root, 'a-1', str(target), b'first')
                self.assertEqual(target.read_bytes(), b'first')
                with self.assertRaises(FileExistsError):
                    writer.safe_write(root, 'a-1', str(target), b'second')
                self.assertEqual(target.read_bytes(), b'first')
                (project / 'swapped').symlink_to(other, target_is_directory=True)
                with self.assertRaises(OSError):
                    writer.safe_write(root, 'a-1', str(project / 'swapped' / 'pwned'), b'bad')
                self.assertFalse((other / 'pwned').exists())
                original_open = writer.openat2

                def swap_before_create(dirfd, name, flags, mode=0):
                    if flags & os.O_CREAT:
                        (project / 'evidence').rename(project / 'saved-evidence')
                        (project / 'evidence').symlink_to(other, target_is_directory=True)
                    return original_open(dirfd, name, flags, mode)

                with patch.object(writer, 'openat2', side_effect=swap_before_create):
                    with self.assertRaises(OSError):
                        writer.safe_write(root, 'a-1', str(project / 'evidence' / 'race.json'), b'bad')
                self.assertFalse((other / 'race.json').exists())
                self.assertEqual((project / 'saved-evidence' / 'result.json').read_bytes(), b'first')


if __name__ == '__main__':
    unittest.main()
