#!/bin/sh
# safe-write.sh <project> <path>: write stdin to <path> only if readonly-precheck allows it. (round 5, R3-5d)
# Refuses to overwrite (noclobber, so an existing file or a planted symlink fails) and re-checks the real path after the write.
# ADVISORY: this narrows the check-then-write race; it does not close it. Host write limits are untested.
set -eu
PATH=/usr/bin:/bin; export PATH
[ $# -eq 2 ] || { echo "usage: safe-write.sh <project> <path> < data" >&2; exit 2; }
here=$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd)
"$here/readonly-precheck.sh" "$2" "$1" >/dev/null
[ ! -L "$2" ] || { echo "DENY: $2 is a symlink" >&2; exit 13; }
mkdir -p -- "$(dirname -- "$2")"
set -C; cat > "$2"; set +C
"$here/readonly-precheck.sh" "$(realpath -e -- "$2")" "$1" >/dev/null || { rm -f -- "$2"; echo "DENY: real path moved after write; removed" >&2; exit 14; }
echo "WROTE: $2"
