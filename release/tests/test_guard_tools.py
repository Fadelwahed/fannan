import importlib.util
import hashlib
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
    def test_writer_keeps_root_owned_ancestor_and_dedicated_identity_requirements(self):
        from types import SimpleNamespace
        with patch.object(writer.sys, 'platform', 'linux'), patch.object(writer.platform, 'machine', return_value='x86_64'):
            with patch.object(writer.os, 'geteuid', return_value=0), self.assertRaisesRegex(RuntimeError, 'dedicated unprivileged'):
                writer.require_host(Path('/workspace/design-output'))
            with patch.object(writer.os, 'geteuid', return_value=1000):
                for uid, mode in [(1000, 0o40755), (0, 0o40777)]:
                    with patch.object(writer.os, 'lstat', return_value=SimpleNamespace(st_uid=uid, st_mode=mode)), self.assertRaisesRegex(RuntimeError, 'root-owned'):
                        writer.require_host(Path('/workspace/design-output'))

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

    @unittest.skipUnless(sys.platform == 'linux', 'Production launcher uses Linux realpath and sha256sum')
    def test_launcher_denies_override_outside_and_missing_project(self):
        launcher = str(TOOLS / 'launcher-impeccable.sh')
        env = {'PATH': '/usr/bin:/bin', 'IMPECCABLE_BIN': '/arbitrary/binary', 'FANNAN_PROJECT': 'a-1'}
        p = subprocess.run([launcher, '--version'], env=env, capture_output=True)
        self.assertEqual(p.returncode, 3, p.stderr)
        self.assertIn(b'pinned production path', p.stderr)
        env['IMPECCABLE_BIN'] = '/opt/fannan/bin/impeccable-linux-x64'
        p = subprocess.run([launcher, 'detect', '--json', '/etc/hosts'], env=env, capture_output=True)
        self.assertEqual(p.returncode, 4, p.stderr)
        self.assertIn(b'outside project', p.stderr)
        env.pop('FANNAN_PROJECT')
        p = subprocess.run([launcher, 'detect', '--json', '/etc/hosts'], env=env, capture_output=True)
        self.assertEqual(p.returncode, 4, p.stderr)

    def test_launcher_symlink_cannot_select_adjacent_helper(self):
        with tempfile.TemporaryDirectory() as temp:
            launcher = Path(temp) / 'launcher-impeccable.sh'
            shutil.copyfile(TOOLS / launcher.name, launcher)
            launcher.chmod(0o700)
            alias = Path(temp) / 'alias'
            alias.symlink_to(launcher)
            Path(str(alias) + '.internal').write_text('#!/bin/sh\necho UNTRUSTED_HELPER\n')
            p = subprocess.run([str(alias), '--version'], env={}, capture_output=True)
            self.assertEqual(p.returncode, 3, p.stderr)
            self.assertNotIn(b'UNTRUSTED_HELPER', p.stdout)

    def test_launcher_preserves_exact_argv_into_helper(self):
        with tempfile.TemporaryDirectory() as temp:
            launcher = Path(temp) / 'launcher-impeccable.sh'
            source = (TOOLS / launcher.name).read_text()
            if sys.platform != 'linux':
                # Test-only adapter: test exact shell argv without claiming GNU path enforcement.
                source = source.replace('launcher=$(realpath -e -- "$1")', 'launcher=$1')
            launcher.write_text(source)
            launcher.chmod(0o700)
            Path(str(launcher) + '.internal').write_text('#!/bin/bash\nprintf "<%s>\\n" "$@"\n')
            for args in [('--version',), ('detect', '--json', '/a path/with spaces')]:
                p = subprocess.run([str(launcher), *args], env={}, capture_output=True, check=True)
                self.assertEqual(p.stdout, ''.join(f'<{arg}>\n' for arg in args).encode())

    def test_detector_receives_canonical_paths_and_flags(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            project = root / 'design-output' / 'a-1'
            project.mkdir(parents=True)
            page = project / 'page with spaces.html'
            page.write_text('')
            (project / 'alias').symlink_to(page)
            internal = (TOOLS / 'launcher-impeccable.sh.internal').read_text()
            internal = internal.replace('/workspace/design-output', str(root / 'design-output'))
            if sys.platform != 'linux':
                # Test-only flag adaptation; realpath still resolves the actual fixture symlink.
                internal = internal.replace('realpath -e -- "$a"', 'realpath "$a"')
            internal = internal.split('[ -f "$IMPECCABLE_BIN" ]')[0] + 'printf "<%s>\\n" "$@"\n'
            probe = root / 'internal'
            probe.write_text(internal)
            p = subprocess.run(['/bin/bash', str(probe), 'detect', '--json', '--scope', 'type',
                                str(project / 'alias')],
                               env={'FANNAN_PROJECT': 'a-1', 'IMPECCABLE_BIN': ''}, capture_output=True, check=True)
            self.assertEqual(p.stdout, f'<detect>\n<--json>\n<--scope>\n<type>\n<{page}>\n'.encode())

    @unittest.skipUnless(sys.platform == 'linux', 'Production launcher uses Linux realpath and sha256sum')
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

    @unittest.skipUnless(sys.platform == 'linux', 'Manifest verifier uses Linux stat and sha256sum')
    def test_manifest_requires_mode_read_only_even_for_root(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'root'
            covered = root / 'covered'
            covered.mkdir(parents=True)
            item = covered / 'item'
            item.write_bytes(b'content')
            manifest = Path(temp) / 'MANIFEST.sha256'
            manifest.write_text('# covers: covered\n' + hashlib.sha256(item.read_bytes()).hexdigest() + '  covered/item\n')
            command = [str(TOOLS / 'verify-manifest.sh'), str(manifest), str(root), hashlib.sha256(manifest.read_bytes()).hexdigest()]
            manifest.chmod(0o644)
            p = subprocess.run(command, capture_output=True)
            self.assertEqual(p.returncode, 1, p.stderr)
            self.assertIn(b'must be read-only', p.stderr)
            manifest.chmod(0o444)
            p = subprocess.run(command, capture_output=True)
            self.assertEqual(p.returncode, 0, p.stderr)

    def test_precheck_usage_names_absolute_path(self):
        p = subprocess.run([str(TOOLS / 'readonly-precheck.sh')], capture_output=True)
        self.assertEqual(p.returncode, 2)
        self.assertIn(b'<absolute-path>', p.stderr)

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
