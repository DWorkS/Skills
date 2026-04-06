---
name: seo-machine
description: Replace the Claude Code version of SEO Machine with a GitHub Copilot skill that preserves the full research, writing, optimization, analytics, and publishing workflow for any project.
metadata:
  version: "1.0.0"
---

# SEO Machine

## When to Use This Skill

Use this skill when you need to:
- replace the Claude Code version of SEO Machine with a GitHub Copilot-native workflow
- run the full SEO Machine operating model inside any repository
- create SEO research briefs, long-form articles, rewrites, audits, landing pages, and publishing packages
- preserve specialist passes for SEO, metadata, internal linking, keyword mapping, editing, CRO, analytics, and prioritization
- standardize context, outputs, scoring, and content operations across teams

Trigger phrases:
- "SEO Machine"
- "seo-machine"
- "content workflow"
- "SEO research brief"
- "write SEO article"
- "refresh existing article"
- "content optimization"
- "landing page audit"
- "content priorities"

## Inputs to Gather

Before starting, collect:
- Business, product, or site name
- Target audience and core offerings
- Primary topic or keyword
- Preferred output location inside the current repository
- Brand voice and style expectations
- Existing internal pages worth linking
- Optional analytics or ranking data sources
- Publishing destination or CMS requirements

## Install Into Any Repository

Create a dedicated workspace in the target repository so the skill can act as a drop-in replacement for the original SEO Machine repo:

```text
<repo>/
└── seo-machine/
    ├── context/
    │   ├── brand-voice.md
    │   ├── style-guide.md
    │   ├── seo-guidelines.md
    │   ├── cro-best-practices.md
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
    ├── audits/
    ├── landing-pages/
    ├── output/
    └── review-required/
```

If the host repository already has established content folders, map these artifacts into that existing structure instead of duplicating directories.

Use the templates in `templates/context/` to create the required context files quickly.

## Core Operating Model

This skill preserves the functional layers of the original SEO Machine:

1. **Context layer** — brand voice, style, SEO rules, examples, features, keywords, competitors, internal links, CRO guidance
2. **Workflow layer** — research, write, optimize, rewrite, audit, publish, landing pages, prioritization, clustering
3. **Specialist layer** — SEO optimizer, meta creator, internal linker, keyword mapper, editor, headline generation, CRO, performance
4. **Analytics layer** — search intent, keyword analysis, length benchmarking, readability, SEO scoring, opportunity scoring, performance analysis
5. **Publishing layer** — publication-ready article output and WordPress/Yoast-compatible packaging

## Command Replacement Catalog

Use these commands as named task patterns in GitHub Copilot:

| Original command | Copilot replacement result |
|---|---|
| `/research [topic]` | Create a research brief in `research/` with keyword targets, search intent, SERP competitors, content gaps, outline, links, and metadata direction |
| `/write [topic]` | Create a 2000-3000+ word article draft in `drafts/` and trigger specialist review passes |
| `/article [topic]` | Run a shorter single-pass article workflow when full orchestration is unnecessary |
| `/rewrite [topic]` | Update an existing article using an audit or source file and save to `rewrites/` |
| `/optimize [file]` | Produce a final SEO optimization report and publication readiness review |
| `/analyze-existing [url/file]` | Audit an existing article or page and save findings in `audits/` or `research/` |
| `/performance-review` | Use analytics exports to identify opportunities and priority fixes |
| `/priorities` | Rank topics or pages with a repeatable opportunity-scoring model |
| `/cluster [topic]` | Produce a pillar/cluster strategy and internal linking plan |
| `/research-serp` | Perform SERP-focused analysis for a keyword or topic |
| `/research-gaps` | Produce a competitor content gap report |
| `/research-trending` | Identify emerging topics and freshness opportunities |
| `/research-performance` | Tie topic decisions to current performance data |
| `/research-topics` | Expand topic clusters and supporting article ideas |
| `/landing-write` | Create a conversion-focused landing page draft |
| `/landing-audit` | Audit a landing page for conversion and SEO issues |
| `/landing-research` | Research competitors and positioning for a landing page |
| `/landing-competitor` | Analyze a competitor landing page deeply |
| `/landing-publish` | Prepare landing-page publication output |
| `/publish-draft [file]` | Produce CMS-ready content and publication metadata |
| `/scrub [file]` | Remove obvious AI patterns and smooth tone before publication |

## Standard Execution Workflow

1. Install or map the `seo-machine/` workspace into the host repository.
2. Fill `seo-machine/context/` using the templates in `templates/context/`.
3. Add topic ideas under `topics/` or import current content needing review.
4. Run research workflows to generate briefs, SERP analyses, gaps, and priorities.
5. Draft new content or rewrites into `drafts/` and `rewrites/`.
6. Run specialist review passes for SEO, metadata, internal linking, keyword placement, editing, CRO, and performance.
7. Produce optimization and audit reports in `output/` or `audits/`.
8. Move approved work to `published/` or hand it to the project publishing system.

## Required Specialist Passes

For full parity with the original SEO Machine workflow, each major content item should support these passes:

- SEO optimization
- Meta title and description generation
- Internal linking suggestions
- Keyword mapping and density checks
- Editorial cleanup
- Headline option generation
- CRO review
- Performance or prioritization review when data exists

## Analytics and Scoring Expectations

This skill should be used with any available combination of:
- Google Analytics 4 exports
- Google Search Console exports
- DataForSEO exports or summaries
- WordPress or CMS exports
- internal business performance data

When structured data is available, preserve these analysis categories:
- search intent classification
- keyword density and distribution
- competitor length benchmarking
- readability scoring
- SEO quality scoring
- opportunity scoring across volume, ranking, intent, competition, cluster fit, CTR, freshness, and trend

## Publishing Expectations

To replace the original repo operationally, the skill should leave behind:
- publishable Markdown or CMS-ready content
- meta title and description options
- slug and internal link suggestions
- CTA recommendations
- audit and optimization reports
- optional WordPress and Yoast field mappings when that CMS is used

## Output Checklist

- [ ] `seo-machine/` workspace or mapped equivalent exists in the host repository
- [ ] context files are completed with project-specific content
- [ ] research, draft, rewrite, audit, landing-page, and output folders are ready
- [ ] command replacements are documented and repeatable in Copilot
- [ ] specialist passes are covered for SEO, meta, links, keywords, editing, CRO, and analytics
- [ ] publishing outputs are ready for the project CMS or handoff process

## Supporting References

- `references/getting-started.md`
- `references/repository-layout.md`
- `references/context-files.md`
- `references/commands.md`
- `references/agents.md`
- `references/analytics-pipeline.md`
- `references/data-integrations.md`
- `references/publishing.md`
- `references/migration.md`
