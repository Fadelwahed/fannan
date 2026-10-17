#!/usr/bin/env python3
"""Linux-only, descriptor-relative output writer. Never removes a pathname."""
import ctypes
import os
import platform
from pathlib import Path
import re
import stat
import sys

ROOT = Path('/workspace/design-output')
SLUG = re.compile(r'[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\Z')
SYS_OPENAT2 = 437  # Linux x86_64 and aarch64
RESOLVE_NO_SYMLINKS = 0x04
RESOLVE_BENEATH = 0x08


class OpenHow(ctypes.Structure):
    _fields_ = [('flags', ctypes.c_ulonglong), ('mode', ctypes.c_ulonglong), ('resolve', ctypes.c_ulonglong)]


def openat2(dirfd, path, flags, mode=0):
    how = OpenHow(flags, mode, RESOLVE_NO_SYMLINKS | RESOLVE_BENEATH)
    libc = ctypes.CDLL(None, use_errno=True)
    fd = libc.syscall(SYS_OPENAT2, dirfd, os.fsencode(path), ctypes.byref(how), ctypes.sizeof(how))
    if fd < 0:
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code), path)
    return fd


def validate_target(root, project, target):
    if len(project) > 64 or not SLUG.fullmatch(project):
        raise ValueError('invalid project slug')
    if not target.startswith('/') or any(p in ('.', '..') for p in target.split('/')):
        raise ValueError('absolute target without dot segments required')
    parts = Path(target).parts
    prefix = root.parts + (project,)
    if parts[:len(prefix)] != prefix or len(parts) <= len(prefix):
        raise ValueError('target must be a file beneath the named project')
    return parts[len(prefix):]


def require_host(root):
    if sys.platform != 'linux' or platform.machine() not in ('x86_64', 'aarch64'):
        raise RuntimeError('secure writer requires Linux x86_64/aarch64 with openat2')
    if os.geteuid() == 0:
        raise RuntimeError('run as a dedicated unprivileged user')
    for path in (Path('/workspace'), root):
        s = os.lstat(path)
        if not stat.S_ISDIR(s.st_mode) or s.st_uid != 0 or s.st_mode & 0o022:
            raise RuntimeError(f'{path} must be root-owned without group/other write')
    fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC)
    try:
        probe = openat2(fd, '.', os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
        os.close(probe)
    finally:
        os.close(fd)


def checked_dir(project_fd, relative):
    fd = openat2(project_fd, relative, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
    s = os.fstat(fd)
    if s.st_uid != os.geteuid() or s.st_mode & 0o022:
        os.close(fd)
        raise RuntimeError('project output directory has untrusted owner or permissions')
    for marker in ('.git', 'HEAD'):
        try:
            os.stat(marker, dir_fd=fd, follow_symlinks=False)
        except FileNotFoundError:
            continue
        if marker == '.git' or (marker == 'HEAD' and os.path.isdir(f'/proc/self/fd/{fd}/objects')):
            os.close(fd)
            raise RuntimeError('repository is read-only')
    return fd


def safe_write(root, project, target, content):
    parts = validate_target(root, project, target)
    require_host(root)
    root_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC)
    try:
        project_fd = openat2(root_fd, project, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
        try:
            fd = checked_dir(project_fd, '.')
            os.close(fd)
            for i, name in enumerate(parts[:-1]):
                parent = '/'.join(parts[:i]) or '.'
                parent_fd = checked_dir(project_fd, parent)
                try:
                    try:
                        os.mkdir(name, 0o700, dir_fd=parent_fd)
                    except FileExistsError:
                        pass
                finally:
                    os.close(parent_fd)
                child_fd = checked_dir(project_fd, '/'.join(parts[:i + 1]))
                os.close(child_fd)
            parent_fd = checked_dir(project_fd, '/'.join(parts[:-1]) or '.')
            try:
                # One kernel resolution creates the file beneath the pinned project FD.
                # O_EXCL denies overwrites and symlinks. No pathname cleanup follows errors.
                fd = openat2(project_fd, '/'.join(parts), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW, 0o600)
                try:
                    view = memoryview(content)
                    while view:
                        written = os.write(fd, view)
                        if written == 0:
                            raise OSError('write made no progress')
                        view = view[written:]
                    os.fsync(fd)
                finally:
                    os.close(fd)
            finally:
                os.close(parent_fd)
        finally:
            os.close(project_fd)
    finally:
        os.close(root_fd)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('usage: safe-write.py <project> <absolute-path> < data', file=sys.stderr)
        sys.exit(2)
    try:
        safe_write(ROOT, sys.argv[1], sys.argv[2], sys.stdin.buffer.read())
    except (OSError, ValueError, RuntimeError) as exc:
        print(f'DENY: {exc}', file=sys.stderr)
        sys.exit(15)
    print(f'WROTE: {sys.argv[2]}')
