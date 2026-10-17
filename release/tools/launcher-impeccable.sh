#!/bin/sh
# First operation: enter a minimal environment before any launcher helper runs.
exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C.UTF-8 \
  IMPECCABLE_BIN="${IMPECCABLE_BIN:-}" FANNAN_PROJECT="${FANNAN_PROJECT:-}" \
  /bin/sh -ec '
    [ ! -L "$1" ] || { echo "impeccable (Fannan launcher): launcher symlink" >&2; exit 3; }
    launcher=$(realpath -e -- "$1")
    shift 2
    exec /bin/sh "$launcher.internal" "$@"
  ' sh "$0" "$@"
