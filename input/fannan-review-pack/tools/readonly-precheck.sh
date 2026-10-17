#!/bin/sh
# readonly-precheck.sh <path> <project>: run before ANY write by Fannan. Exit 0 = allowed. (round 5)
# Allowed only inside /workspace/design-output/<project>/ and never inside a git working tree or bare repo.
set -eu
PATH=/usr/bin:/bin; export PATH
[ $# -eq 2 ] && [ -n "$2" ] || { echo "usage: readonly-precheck.sh <path> <project> (project is required)" >&2; exit 2; }
case "$2" in */*|.|..) echo "DENY: bad project name '$2'" >&2; exit 11 ;; esac
root=/workspace/design-output
target=$(realpath -m -- "$1")
case "$target" in
  "$root"/*) : ;;
  *) echo "DENY: $target is outside $root (Fannan writes only to the design-output folder)" >&2; exit 10 ;;
esac
case "$target" in "$root/$2"/*|"$root/$2") : ;; *) echo "DENY: $target is not in project folder $root/$2" >&2; exit 11 ;; esac
if [ -f "$target" ] && [ "$(stat -c %h -- "$target")" -gt 1 ]; then echo "DENY: $target has more than one hard link" >&2; exit 13; fi
d=$target; while [ "$d" != "/" ]; do
  if [ -e "$d/.git" ]; then echo "DENY: $target is inside a git working tree ($d); repos are read-only" >&2; exit 12; fi
  if [ -f "$d/HEAD" ] && [ -d "$d/objects" ]; then echo "DENY: $target is inside a bare git repo ($d)" >&2; exit 12; fi
  d=$(dirname "$d"); done
echo "ALLOW: $target"
