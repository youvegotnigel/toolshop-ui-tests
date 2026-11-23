#!/usr/bin/env bash
# Publishes ./site to the gh-pages branch (GitHub Pages: Settings > Pages > Deploy from branch > gh-pages).
# The branch always holds ONE commit: trend history lives in site/history/*, not in git history,
# so the repository does not grow by a full report on every run.
set -euo pipefail

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git worktree remove --force .gh-pages 2>/dev/null || true
rm -rf .gh-pages
git worktree prune
git branch -D gh-pages-publish 2>/dev/null || true

git worktree add --orphan -b gh-pages-publish .gh-pages
cp -R site/. .gh-pages/
(
  cd .gh-pages
  git add --all
  git commit --quiet -m "reports: run ${GITHUB_RUN_NUMBER:-${BUILD_NUMBER:-local}}"
  git push --force origin HEAD:gh-pages
)
git worktree remove --force .gh-pages
git branch -D gh-pages-publish
