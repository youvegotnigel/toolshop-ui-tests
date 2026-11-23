#!/usr/bin/env bash
# Builds the published site: dashboard at /, Allure at /allure, Playwright report at /playwright,
# smart report at /smart (written by the smart reporter during the test run or merge-reports),
# plus the history files the next run restores. Used by GitHub Actions, Jenkins and `npm run report:site`.
# Run scripts/ci/restore-history.sh first to continue the trends.
set -euo pipefail

node scripts/ci/redact-traces.mts
rm -rf site allure-report
if [ -d allure-results ]; then
  node scripts/ci/allure-environment.mts
  npx allure generate ./allure-results
fi
node scripts/coverage/index.mts --site site
mkdir -p site/history
if [ -f allure-history/history.jsonl ]; then cp allure-history/history.jsonl site/history/allure-history.jsonl; fi
if [ -f smart-history/test-history.json ]; then cp smart-history/test-history.json site/history/smart-history.json; fi
cp coverage-history/history.json site/history/coverage-history.json
touch site/.nojekyll
