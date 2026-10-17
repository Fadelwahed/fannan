#!/bin/sh
# First operation: enter a minimal environment before any launcher helper runs.
exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C.UTF-8 \
  IMPECCABLE_BIN="${IMPECCABLE_BIN:-}" FANNAN_PROJECT="${FANNAN_PROJECT:-}" \
  /bin/sh "$0.internal" "$@"
