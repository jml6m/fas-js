#!/usr/bin/env bash
# Enforces .github/docs-policy.yml: every tracked *.md file must be explicitly
# allowlisted, or covered by an exempt_globs prefix. New/renamed .md files
# that aren't listed fail CI with the offending paths, instead of silently
# merging — the manifest itself is CODEOWNERS-gated so widening it always
# requires @jml6m's review.
set -euo pipefail

POLICY_FILE=".github/docs-policy.yml"

if [ ! -f "$POLICY_FILE" ]; then
  echo "ERROR: $POLICY_FILE not found." >&2
  exit 1
fi

extract_list() {
  # $1 = top-level YAML key (e.g. "allowed" or "exempt_globs"). Only supports
  # this file's own flat "key:\n  - item # comment" shape, not general YAML.
  awk -v key="$1:" '
    $0 == key { inlist=1; next }
    /^[a-zA-Z_]+:/ { inlist=0 }
    inlist && /^[ \t]*-/ {
      sub(/^[ \t]*-[ \t]*/, "");
      sub(/[ \t]*#.*$/, "");
      gsub(/[ \t]+$/, "");
      gsub(/^"|"$/, "");
      gsub(/^'"'"'|'"'"'$/, "");
      if (length($0) > 0) print
    }
  ' "$POLICY_FILE"
}

mapfile -t ALLOWED < <(extract_list "allowed")
mapfile -t EXEMPT < <(extract_list "exempt_globs")

is_exempt() {
  local f="$1" g prefix
  for g in "${EXEMPT[@]:-}"; do
    [ -z "$g" ] && continue
    prefix="${g%/**}"
    case "$f" in
    "$prefix"/*) return 0 ;;
    esac
  done
  return 1
}

is_allowed() {
  local f="$1" a
  for a in "${ALLOWED[@]}"; do
    [ "$f" = "$a" ] && return 0
  done
  return 1
}

offenders=()
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if ! is_allowed "$f" && ! is_exempt "$f"; then
    offenders+=("$f")
  fi
done < <(git ls-files '*.md')

if [ "${#offenders[@]}" -gt 0 ]; then
  echo "ERROR: the following .md file(s) are not in the docs allowlist ($POLICY_FILE):" >&2
  printf '  - %s\n' "${offenders[@]}" >&2
  echo >&2
  echo "This is a public repo — markdown files are locked to an exact allowlist to keep" >&2
  echo "internal notes/patterns out and stop unreviewed doc sprawl. Either:" >&2
  echo "  1. Remove the file, or" >&2
  echo "  2. Open a PR adding it (with its purpose) to $POLICY_FILE's 'allowed' list" >&2
  echo "     — that file is CODEOWNERS-gated, so it requires @jml6m's review." >&2
  exit 1
fi

echo "docs-policy: all $(git ls-files '*.md' | wc -l | tr -d ' ') tracked markdown files are allowlisted."
