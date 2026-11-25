@AGENTS.md

## Claude Code specifics

- Start non-trivial work with `/ai-native-workflow`. Skills in `.claude/skills/` are also slash commands:
  `/explore-site`, `/selectors`, `/test-data`, `/add-ui-test`, `/add-page-object`, `/review-ui-tests`,
  `/triage-ui-failures`, `/fix-flaky-test`, `/accessibility-testing`.
- Delegate with subagents in `.claude/agents/`: `journey-analyst` (read-only exploration), `ui-test-writer`,
  `ui-test-reviewer` (read-only), `failure-triager`.
- Commands in `.claude/commands/`: `/verify`, `/new-ui-test <journey>`, `/review`, `/triage`.
- A PostToolUse hook lints and formats every file you edit; if it reports ESLint errors, fix them before moving on.
- Plan first for anything touching more than one page, then implement one page object and one journey at a time.
