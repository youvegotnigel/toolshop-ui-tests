#!/usr/bin/env bash
# Restores Allure and dashboard history from the gh-pages branch so trends continue across CI runs.
# Safe on the first run (no branch yet) and on PRs (read-only).
set -euo pipefail

if git fetch --depth=1 origin +refs/heads/gh-pages:refs/remotes/origin/gh-pages 2>/dev/null; then
  mkdir -p allure-history coverage-history
  git show origin/gh-pages:history/allure-history.jsonl > allure-history/history.jsonl 2>/dev/null || rm -f allure-history/history.jsonl
  git show origin/gh-pages:history/coverage-history.json > coverage-history/history.json 2>/dev/null || rm -f coverage-history/history.json
  echo "Restored report history from gh-pages"
else
  echo "No gh-pages branch yet: starting a new history"
fi
