# Migration from the Claude Code Repo

Use this guide when replacing `TheCraigHewitt/seomachine` with this skill.

## What Changes

- Claude slash commands become named Copilot tasks or prompts
- Claude agents become repeatable specialist review passes
- Python modules become analysis categories and scoring rules that Copilot can apply to exports or structured data

## What Stays the Same

- context-driven content operations
- file-based workflow
- research → draft → optimize → publish lifecycle
- specialist reviews
- analytics-led prioritization
- publishing package requirements

## Migration Steps

1. create or map the `seo-machine/` workspace in the target repository
2. migrate the context files first
3. migrate topic backlog and existing briefs
4. migrate current drafts, rewrites, and audits
5. connect available analytics exports
6. replace each slash command with the matching Copilot workflow from `commands.md`
7. document any CMS-specific publication steps for the target project
