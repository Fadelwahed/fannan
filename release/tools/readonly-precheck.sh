#!/bin/sh
# Advisory path check. safe-write.py makes the final descriptor-relative decision.
set -eu
PATH=/usr/bin:/bin; export PATH
[ $# -eq 2 ] || { echo 'usage: readonly-precheck.sh <absolute-path> <project>' >&2; exit 2; }
[ "${#2}" -le 64 ] || { echo 'DENY: project name too long' >&2; exit 11; }
case "$2" in ''|*[!a-z0-9-]*|-*|*-) echo 'DENY: invalid project slug' >&2; exit 11 ;; esac
root=/workspace/design-output
case "$1" in /*) : ;; *) echo 'DENY: absolute target required' >&2; exit 10 ;; esac
case "$1" in *'/../'*|*'/./'*|*'/..'|*'/.') echo 'DENY: dot segments' >&2; exit 10 ;; esac
d=$1
while [ "$d" != / ]; do
  if [ -L "$d" ]; then echo 'DENY: symlink in target path' >&2; exit 13; fi
  d=$(dirname -- "$d")
done
target=$(realpath -m -- "$1")
case "$target" in "$root/$2"|"$root/$2"/*) : ;; *) echo 'DENY: target outside project' >&2; exit 10 ;; esac
d=$target
while [ "$d" != / ]; do
  if [ -L "$d" ]; then echo 'DENY: symlink in target path' >&2; exit 13; fi
  if [ -f "$d" ] && [ "$(stat -c %h -- "$d")" -gt 1 ]; then echo 'DENY: hard-linked file' >&2; exit 13; fi
  if [ -e "$d/.git" ] || [ -L "$d/.git" ] || { [ -f "$d/HEAD" ] && [ -d "$d/objects" ]; }; then echo 'DENY: repository is read-only' >&2; exit 12; fi
  d=$(dirname -- "$d")
done
echo "ALLOW: $target"
