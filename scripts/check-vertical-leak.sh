#!/usr/bin/env bash
# Fails if pilot-vertical vocabulary leaks into core code.
# The whole product thesis is that the core is industry-agnostic; this is
# the cheapest possible guard against that quietly stopping being true.
# See docs/verticals.md and ADR 0004.
set -euo pipefail

FORBIDDEN='furniture|teakwood|teak|polish|carpent|sofa|plywood'
ALLOWED_PATH='packages/verticals/|docs/|plan/|Documents/|scripts/check-vertical-leak.sh'

echo "Checking for vertical-specific vocabulary in core code..."

if hits=$(grep -rInE "$FORBIDDEN" \
      --include='*.ts' --include='*.tsx' --include='*.sql' --include='*.json' \
      apps packages 2>/dev/null | grep -vE "$ALLOWED_PATH"); then
  echo ""
  echo "FAIL: vertical-specific vocabulary found in core code."
  echo "Move it into packages/verticals/ as seed data, or rename it generically."
  echo ""
  echo "$hits"
  exit 1
fi

echo "OK: no vertical vocabulary in core code."
