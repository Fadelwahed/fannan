#!/bin/sh
# Fannan fail-closed launcher for impeccable (round 2). Replaces the upstream launcher.
# ALLOWLIST: only `--version` and `detect` on LOCAL files/dirs with a few read-only flags.
# Everything else is refused: live*, generate, skills <any>, ignores, hooks, doctor, pin,
# install, update, link, check, document, context, help, URLs, unknown flags.
# Copy-hash-run: the pinned binary is copied into a private temp dir; that copy is hashed
# and that same copy is executed, so nothing can be swapped in between. No download fallback.
set -eu
PINNED_SHA256=3d31ec1a664ac35c815ea1d7c10abad1155ce364d0f461157eb837a34368efb6
die() { echo "impeccable (Fannan launcher): $1" >&2; exit "$2"; }
[ -n "${IMPECCABLE_BIN:-}" ] || die "IMPECCABLE_BIN is not set; refusing to run (no download fallback)." 3
[ -f "$IMPECCABLE_BIN" ] && [ ! -L "$IMPECCABLE_BIN" ] || die "pinned binary missing or a symlink; refusing to run." 3
[ $# -ge 1 ] || die "no command; allowed: --version | detect <local paths>" 4
case "$1" in
  --version) [ $# -eq 1 ] || die "--version takes no arguments" 4 ;;
  detect)
    shift; [ $# -ge 1 ] || die "detect needs at least one local file or folder" 4
    expect_scope=0
    for a in "$@"; do
      if [ $expect_scope = 1 ]; then case "$a" in type|layout|type,layout|layout,type) expect_scope=0; continue ;; *) die "bad --scope value" 4 ;; esac; fi
      case "$a" in
        --json|--quiet|--no-advisory|--no-config|--no-inline-ignores|--no-design-system) ;;
        --scope) expect_scope=1 ;;
        -*) die "flag '$a' is not allowed for Fannan" 4 ;;
        *://*) die "URLs are not allowed (local files only)" 4 ;;
        *) [ -e "$a" ] || die "path not found: $a" 4 ;;
      esac
    done
    [ $expect_scope = 0 ] || die "--scope needs a value" 4
    set -- detect "$@" ;;
  *) die "'$1' is not allowed for Fannan (allowlist: --version, detect)" 4 ;;
esac
umask 077
tmp=$(mktemp -d "${TMPDIR:-/tmp}/fannan-imp.XXXXXX") || die "cannot create private temp dir" 6
trap 'rm -rf "$tmp"' EXIT INT TERM
cp "$IMPECCABLE_BIN" "$tmp/impeccable" || die "cannot copy binary" 6
actual=$(sha256sum "$tmp/impeccable" | cut -d' ' -f1)
[ "$actual" = "$PINNED_SHA256" ] || die "sha256 mismatch for IMPECCABLE_BIN; refusing to run." 5
chmod 500 "$tmp/impeccable"
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
IMPECCABLE_SKILL_DIR=$(CDPATH= cd -- "$dir/.." && pwd); IMPECCABLE_SELF=$0
export IMPECCABLE_SKILL_DIR IMPECCABLE_SELF
set +e; "$tmp/impeccable" "$@"; rc=$?; set -e
exit $rc
