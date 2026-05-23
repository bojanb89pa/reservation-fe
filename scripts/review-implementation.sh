#!/usr/bin/env bash
# review-implementation.sh — Inspect FE feature implementation before committing
#
# Usage:
#   ./scripts/review-implementation.sh
#
# Shows git diff organised by layer, checks import boundaries, runs linter
# and formatter in check-mode, then prints commit / rollback commands.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Helpers ───────────────────────────────────────────────────────────────────
section() { printf "\n━━━ %s ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" "$*"; }
ok()      { printf "  \033[32m[OK]\033[0m   %s\n" "$*"; }
warn()    { printf "  \033[33m[WARN]\033[0m %s\n" "$*"; }
fail()    { printf "  \033[31m[FAIL]\033[0m %s\n" "$*"; }
info()    { printf "  %s\n" "$*"; }

VIOLATIONS=0
TEST_STATUS="skipped"
LINT_STATUS="skipped"
FORMAT_STATUS="skipped"

# ── Changed files ─────────────────────────────────────────────────────────────
section "Changed files by layer"

CHANGED="$(git diff --name-only HEAD 2>/dev/null || git status --short 2>/dev/null | awk '{print $2}')"

if [[ -z "$CHANGED" ]]; then
  warn "No changes detected (working tree is clean)."
else
  for LAYER in domain application infrastructure ui; do
    FILES=$(printf '%s\n' "$CHANGED" | grep "^modules/$LAYER/" || true)
    if [[ -n "$FILES" ]]; then
      COUNT=$(printf '%s\n' "$FILES" | wc -l | tr -d ' ')
      printf "\n  [modules/%s]  (%s file(s))\n" "$LAYER" "$COUNT"
      printf '%s\n' "$FILES" | sed 's/^/    /'
    fi
  done

  OTHER=$(printf '%s\n' "$CHANGED" | grep -v "^modules/" || true)
  if [[ -n "$OTHER" ]]; then
    COUNT=$(printf '%s\n' "$OTHER" | wc -l | tr -d ' ')
    printf "\n  [other]  (%s file(s))\n" "$COUNT"
    printf '%s\n' "$OTHER" | sed 's/^/    /'
  fi
fi

# ── Diff stat ─────────────────────────────────────────────────────────────────
section "Diff stat"

git diff --stat HEAD 2>/dev/null || info "(no diff available)"

# ── Architecture boundary check ───────────────────────────────────────────────
section "Architecture boundary check (forbidden imports)"

# Helper: search for a forbidden import pattern in a directory, print violations.
# Usage: check_forbidden "<grep pattern>" "<search dir>" "<description>"
check_forbidden() {
  local PATTERN="$1"
  local DIR="$2"
  local DESC="$3"

  if [[ ! -d "$DIR" ]]; then return; fi

  local HITS
  HITS=$(grep -r --include="*.ts" --include="*.tsx" -l "$PATTERN" "$DIR" 2>/dev/null \
         | grep -v "dist\|node_modules\|\.d\.ts" || true)

  if [[ -n "$HITS" ]]; then
    fail "$DESC"
    printf '%s\n' "$HITS" | sed "s|$PROJECT_ROOT/||" | sed 's/^/    /'
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

# ── @domain: must import nothing from other layers
check_forbidden "from '@application'\|from '@infrastructure'\|from '@ui'" \
  "modules/domain/src" \
  "@domain imports from another layer (forbidden)"
check_forbidden "import React\|from 'react'" \
  "modules/domain/src" \
  "@domain contains React imports (forbidden)"
check_forbidden "import axios\|from 'axios'" \
  "modules/domain/src" \
  "@domain imports axios (forbidden)"

# ── @application: may only import from @domain
check_forbidden "from '@infrastructure'\|from '@ui'" \
  "modules/application/src" \
  "@application imports from @infrastructure or @ui (forbidden)"
check_forbidden "import React\|from 'react'" \
  "modules/application/src" \
  "@application contains React imports (forbidden)"
check_forbidden "import axios\|from 'axios'\|import fetch" \
  "modules/application/src" \
  "@application uses HTTP client (fetch/axios) directly (forbidden)"

# ── @infrastructure: may only import from @domain
check_forbidden "from '@application'\|from '@ui'" \
  "modules/infrastructure/src" \
  "@infrastructure imports from @application or @ui (forbidden)"
check_forbidden "import React\|from 'react'" \
  "modules/infrastructure/src" \
  "@infrastructure contains React imports (forbidden)"

# ── @ui: may NOT import @infrastructure directly except via container/index.ts
UI_INFRA_DIRECT=$(grep -r --include="*.ts" --include="*.tsx" \
  "from '@infrastructure'" \
  "modules/ui/src" 2>/dev/null \
  | grep -v "dist\|node_modules\|container/index" \
  | grep -v "^modules/ui/src/app/container/index.ts" || true)

if [[ -n "$UI_INFRA_DIRECT" ]]; then
  fail "@ui imports @infrastructure outside of container/index.ts (forbidden)"
  printf '%s\n' "$UI_INFRA_DIRECT" | sed "s|$PROJECT_ROOT/||" | sed 's/^/    /'
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# ── @ui: may NOT import @application directly except via container/index.ts
UI_APP_DIRECT=$(grep -r --include="*.ts" --include="*.tsx" \
  "from '@application'" \
  "modules/ui/src" 2>/dev/null \
  | grep -v "dist\|node_modules\|container/index" \
  | grep -v "^modules/ui/src/app/container/index.ts" || true)

if [[ -n "$UI_APP_DIRECT" ]]; then
  fail "@ui imports @application outside of container/index.ts (forbidden)"
  printf '%s\n' "$UI_APP_DIRECT" | sed "s|$PROJECT_ROOT/||" | sed 's/^/    /'
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# ── @ui components/pages/hooks: must not call fetch/axios directly
UI_DIRECT_HTTP=$(grep -r --include="*.ts" --include="*.tsx" \
  "import axios\|from 'axios'\|fetch(" \
  "modules/ui/src" 2>/dev/null \
  | grep -v "dist\|node_modules\|infrastructure\|container\|axiosClient" || true)

if [[ -n "$UI_DIRECT_HTTP" ]]; then
  fail "@ui uses fetch/axios directly (use infrastructure via container)"
  printf '%s\n' "$UI_DIRECT_HTTP" | sed "s|$PROJECT_ROOT/||" | sed 's/^/    /'
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [[ $VIOLATIONS -eq 0 ]]; then
  ok "No forbidden imports detected."
fi

# ── WARNING comments ──────────────────────────────────────────────────────────
section "WARNING comments left by headless sessions"

WARNING_HITS=$(grep -r --include="*.ts" --include="*.tsx" \
  "// WARNING:" \
  modules/domain/src modules/application/src modules/infrastructure/src modules/ui/src \
  2>/dev/null | grep -v "dist\|node_modules" || true)

if [[ -z "$WARNING_HITS" ]]; then
  ok "No WARNING comments found."
else
  printf '%s\n' "$WARNING_HITS" | sed "s|$PROJECT_ROOT/||" | sed 's/^/  /'
  warn "Review each WARNING above and verify the assumption before committing."
fi

# ── Linter ────────────────────────────────────────────────────────────────────
section "Linter (eslint)"

if command -v yarn &>/dev/null; then
  set +e
  yarn lint 2>&1
  LINT_EXIT=$?
  set -e
  if [[ $LINT_EXIT -eq 0 ]]; then
    ok "ESLint passed."
    LINT_STATUS="ok"
  else
    fail "ESLint reported errors (exit $LINT_EXIT)."
    LINT_STATUS="failed"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
else
  warn "yarn not found — skipping lint."
fi

# ── Formatter ─────────────────────────────────────────────────────────────────
section "Formatter (prettier --check)"

if command -v yarn &>/dev/null; then
  set +e
  # Scope to source directories only — excludes .claude/worktrees and other non-source paths.
  yarn prettier --check \
    "modules/**/*.{ts,tsx,css}" \
    "src/**/*.{ts,tsx,css}" \
    "*.{ts,tsx,js,json}" 2>&1
  FMT_EXIT=$?
  set -e
  if [[ $FMT_EXIT -eq 0 ]]; then
    ok "Prettier: all files formatted."
    FORMAT_STATUS="ok"
  else
    fail "Prettier found unformatted files (run: yarn format)."
    FORMAT_STATUS="failed"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
else
  warn "yarn not found — skipping format check."
fi

# ── Tests ─────────────────────────────────────────────────────────────────────
section "Tests (vitest run)"

if command -v yarn &>/dev/null; then
  set +e
  # Use absolute path filter so vitest matches only tests under the project's modules/ dir,
  # not .claude/worktrees/*/modules/ which also contain the string "modules/".
  yarn vitest run --reporter=verbose "$PROJECT_ROOT/modules/" 2>&1
  TEST_EXIT=$?
  set -e
  if [[ $TEST_EXIT -eq 0 ]]; then
    ok "All tests passed."
    TEST_STATUS="ok"
  else
    fail "Tests failed (exit $TEST_EXIT)."
    TEST_STATUS="failed"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
else
  warn "yarn not found — skipping tests."
fi

# ── TypeScript type-check ─────────────────────────────────────────────────────
section "TypeScript type-check (tsc --noEmit)"

if command -v yarn &>/dev/null; then
  set +e
  yarn tsc --noEmit 2>&1
  TSC_EXIT=$?
  set -e
  if [[ $TSC_EXIT -eq 0 ]]; then
    ok "TypeScript: no type errors."
  else
    fail "TypeScript reported type errors (exit $TSC_EXIT)."
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
else
  warn "yarn not found — skipping TypeScript check."
fi

# ── Suggested commit message ──────────────────────────────────────────────────
section "Suggested commit message"

LAYERS_TOUCHED=()
for LAYER in domain application infrastructure ui; do
  if [[ -n "$CHANGED" ]] && printf '%s\n' "$CHANGED" | grep -q "^modules/$LAYER/"; then
    LAYERS_TOUCHED+=("$LAYER")
  fi
done

SCOPE="fe"
if [[ ${#LAYERS_TOUCHED[@]} -eq 1 ]]; then
  SCOPE="${LAYERS_TOUCHED[0]}"
fi

ADDED_FILES=$(git diff --diff-filter=A --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')
MODIFIED_FILES=$(git diff --diff-filter=M --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')
DELETED_FILES=$(git diff --diff-filter=D --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')

CHANGE_SUMMARY=""
[[ "$ADDED_FILES" -gt 0 ]]   && CHANGE_SUMMARY="${CHANGE_SUMMARY}+${ADDED_FILES} added "
[[ "$MODIFIED_FILES" -gt 0 ]] && CHANGE_SUMMARY="${CHANGE_SUMMARY}~${MODIFIED_FILES} modified "
[[ "$DELETED_FILES" -gt 0 ]]  && CHANGE_SUMMARY="${CHANGE_SUMMARY}-${DELETED_FILES} deleted"

info "Layers touched: ${LAYERS_TOUCHED[*]:-none}"
info "Changes: ${CHANGE_SUMMARY:-none}"
info ""
info "  Suggested:"
info "  git commit -m \"feat($SCOPE): <describe what the feature does>\""

# ── Summary ───────────────────────────────────────────────────────────────────
section "Summary"

printf "\n"
printf "  %-25s %s\n" "Layer violations:"  "$VIOLATIONS violation(s)"
printf "  %-25s %s\n" "Tests:"             "$TEST_STATUS"
printf "  %-25s %s\n" "Lint:"              "$LINT_STATUS"
printf "  %-25s %s\n" "Format:"            "$FORMAT_STATUS"
printf "\n"

if [[ -n "$WARNING_HITS" ]]; then
  warn "WARNING comments exist — human review required before committing."
fi

# ── Decision ──────────────────────────────────────────────────────────────────
section "Decision"

printf "\n"
if [[ $VIOLATIONS -gt 0 ]]; then
  printf "  \033[31m✗ %d issue(s) found. Fix before committing.\033[0m\n" "$VIOLATIONS"
  printf "\n"
  printf "  Rollback (discard all local changes):\n"
  printf "    git checkout -- . && git clean -fd\n"
else
  printf "  \033[32m✓ All checks passed.\033[0m\n"
  printf "\n"
  printf "  To commit:\n"
  printf "    git add -p\n"
  printf "    git commit -m \"feat(%s): <describe what the feature does>\"\n" "$SCOPE"
  printf "\n"
  printf "  To rollback (if something still needs fixing):\n"
  printf "    git checkout -- . && git clean -fd\n"
fi
printf "\n"
