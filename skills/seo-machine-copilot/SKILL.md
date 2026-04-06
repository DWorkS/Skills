---
name: seo-machine-copilot
description: Run SEO Machine-style content research, writing, optimization, and refresh workflows in GitHub Copilot instead of Claude Code. Use when you need reusable SEO content operations inside any existing project.
metadata:
  version: "1.0.0"
---

# SEO Machine for GitHub Copilot

Use GitHub Copilot to reproduce the core SEO Machine workflow from `TheCraigHewitt/seomachine` without depending on Claude Code slash commands or Claude-specific agents.

## When to Use This Skill

Use this skill when you need to:
- Run SEO research, article drafting, optimization, and refresh workflows inside GitHub Copilot
- Recreate the SEO Machine operating model in an existing product, docs, or marketing repo
- Standardize content inputs such as brand voice, keyword targets, and internal linking guidance
- Replace Claude slash commands like `/research`, `/write`, `/rewrite`, and `/optimize` with Copilot-friendly prompts

Trigger phrases:
- "SEO Machine"
- "content workflow"
- "SEO research brief"
- "write SEO article"
- "refresh existing article"
- "content optimization"

## Inputs to Gather

Before starting, collect:
- Business, product, or site name
- Target audience and core offerings
- Primary topic or keyword
- Preferred output location inside the current repository
- Brand voice and style expectations
- Existing internal pages worth linking
- Optional analytics or ranking data sources

## Recommended Project Workspace

Create a dedicated workspace in the target repository and keep all SEO Machine artifacts there:

```text
<repo>/
└── seo-machine/
    ├── context/
    │   ├── brand-voice.md
    │   ├── style-guide.md
    │   ├── seo-guidelines.md
    │   ├── features.md
    │   ├── internal-links-map.md
    │   ├── target-keywords.md
    │   ├── competitor-analysis.md
    │   └── writing-examples.md
    ├── topics/
    ├── research/
    ├── drafts/
    ├── rewrites/
    ├── published/
    └── audits/
```

If the host repository already has established content folders, map these artifacts into that existing structure instead of duplicating directories.

## Copilot Replacement for Claude Commands

| Original SEO Machine command | Copilot workflow |
|---|---|
| `/research [topic]` | Ask Copilot to generate a research brief using repository context, keyword targets, competitors, and internal links |
| `/write [topic]` | Ask Copilot to draft a long-form article from a topic or research brief and save it under `drafts/` |
| `/rewrite [topic]` | Ask Copilot to update an existing article using an audit or prior draft and save it under `rewrites/` |
| `/analyze-existing [url/file]` | Ask Copilot to audit a page or article for SEO, freshness, structure, and conversion gaps |
| `/optimize [file]` | Ask Copilot for a final optimization pass covering metadata, headings, links, readability, and keyword coverage |
| `/performance-review` / `/priorities` | Ask Copilot to rank opportunities using analytics, rankings, traffic, and business value inputs |
| `/publish-draft [file]` | Ask Copilot to prepare publication-ready output and any CMS metadata or checklist items |

See `references/copilot-workflows.md` for reusable prompt patterns.

## Standard Workflow

1. Create or update the context files in `seo-machine/context/`.
2. Add the target topic to `topics/` or start from an existing content request.
3. Generate a research brief in `research/` covering keyword intent, competitors, content gaps, and outline direction.
4. Draft the article in `drafts/` using the research brief plus context files.
5. Run a Copilot optimization pass for metadata, links, keyword placement, readability, and CTA quality.
6. If improving existing content, create an audit in `audits/` first, then save the updated version to `rewrites/`.
7. Move approved content to `published/` or hand it off to your publishing workflow.

## What to Preserve from the Original Repo

Keep these concepts from the upstream SEO Machine design:
- Context-driven writing based on brand, style, SEO, and internal link guidance
- Separate stages for research, drafting, optimization, auditing, and rewrites
- File-based outputs so work stays reviewable in Git
- Optional analytics enrichment from GA4, Search Console, DataForSEO, or CMS exports
- Reusable specialist passes for SEO, metadata, internal linking, keyword mapping, editing, and CRO

Do not depend on:
- Claude-only slash commands
- Claude-specific agent directories
- Claude Code runtime assumptions

## Analytics and Tooling Guidance

- If analytics exports exist in the repository, point Copilot at those files during audits and prioritization.
- If external APIs are unavailable, provide exported CSV, JSON, or Markdown summaries instead.
- Keep API credentials out of the repository; use existing secret-management practices in the host project.

## Output Checklist

- [ ] Project has a dedicated SEO Machine workspace or mapped equivalent
- [ ] Context files are filled with project-specific information
- [ ] Research briefs are saved in a consistent location
- [ ] Drafts, rewrites, audits, and published content use clear file naming
- [ ] Copilot prompt workflows are documented for the team

## Supporting References

- `references/context-setup.md`
- `references/copilot-workflows.md`
