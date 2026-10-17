#!/bin/sh
# Linux-only, descriptor-relative, exclusive output writer.
set -eu
PATH=/usr/bin:/bin; export PATH
[ $# -eq 2 ] || { echo 'usage: safe-write.sh <project> <absolute-path> < data' >&2; exit 2; }
[ "$(uname -s)" = Linux ] || { echo 'DENY: secure writer requires Linux' >&2; exit 15; }
python_bin=$(command -v python3) || { echo 'DENY: Python 3 is required' >&2; exit 15; }
here=$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd)
"$here/readonly-precheck.sh" "$2" "$1" >/dev/null
exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C.UTF-8 "$python_bin" -I "$here/safe-write.py" "$1" "$2"
