#!/bin/sh
# verify-manifest.sh <manifest> <root> <expected-manifest-sha256>   (round 5: absolute paths, fixed PATH)
# The manifest lives OUTSIDE the folders it checks, read-only; its own sha256 is pinned in the spec
# and passed in, so a tamper-and-rewrite of the manifest is caught. Fails closed (exit 1) on:
# a manifest hash mismatch, any symlink, any missing or changed file, or any extra file in a covered folder.
set -eu
PATH=/usr/bin:/bin; export PATH
m=${1:?usage: verify-manifest.sh <manifest> <root> <expected-sha256>}; root=${2:?root}; want=${3:?expected sha256}
[ -f "$m" ] && [ ! -L "$m" ] || { echo "MANIFEST: missing or a symlink" >&2; exit 1; }
m=$(realpath -e -- "$m") || { echo "MANIFEST: missing" >&2; exit 1; }; root=$(realpath -e -- "$root") || { echo "MANIFEST: root missing" >&2; exit 1; }
case "$(realpath "$m")" in "$(realpath "$root")"/*) echo "MANIFEST: must live outside the checked root" >&2; exit 1 ;; esac
mode=$(stat -c %a -- "$m")
[ $((0$mode & 0222)) -eq 0 ] || { echo "MANIFEST: must be read-only" >&2; exit 1; }
have=$(sha256sum "$m" | cut -d' ' -f1)
[ "$have" = "$want" ] || { echo "MANIFEST: its own sha256 does not match the pinned value" >&2; exit 1; }
cd -P -- "$root"
dirs=$(sed -n 's/^# covers: //p' "$m")
[ -n "$dirs" ] || { echo "MANIFEST: no '# covers:' line" >&2; exit 1; }
links=$(for d in $dirs; do find "$d" -type l; done)
[ -z "$links" ] || { echo "MANIFEST: symlinks are not allowed: $links" >&2; exit 1; }
grep -v '^#' "$m" | sha256sum --quiet --strict -c - || { echo "MANIFEST: changed or missing files" >&2; exit 1; }
now=$(mktemp); list=$(mktemp)
for d in $dirs; do find "$d" ! -type d; done | sort > "$now"
grep -v '^#' "$m" | sed 's/^[0-9a-f]*  //' | sort > "$list"
extra=$(comm -23 "$now" "$list"); rm -f "$now" "$list"
[ -z "$extra" ] || { echo "MANIFEST: unexpected files: $extra" >&2; exit 1; }
echo "MANIFEST OK ($(grep -vc '^#' "$m") files)"
