# Copilot Workflows

Use these prompt patterns to replace the original Claude slash commands.

## Research Brief

Ask Copilot to:
- read the context files
- inspect existing related content in the repository
- build a research brief for a target topic
- summarize search intent, likely competitors, topic gaps, recommended outline, internal links, and metadata direction
- save the result under `seo-machine/research/`

## New Article Draft

Ask Copilot to:
- use a specific research brief plus the context files
- draft a long-form article for the chosen audience
- include title, meta description, H1/H2/H3 structure, suggested internal links, and CTA opportunities
- save the draft under `seo-machine/drafts/`

## Existing Content Audit

Ask Copilot to:
- analyze a URL export, markdown file, or pasted article
- identify SEO weaknesses, stale sections, missing intent coverage, readability issues, and conversion gaps
- produce an actionable audit under `seo-machine/audits/`

## Rewrite / Refresh

Ask Copilot to:
- use the audit plus the original article
- preserve useful sections
- refresh stale facts and examples
- improve structure, keyword coverage, and internal links
- save the updated version under `seo-machine/rewrites/`

## Final Optimization Pass

Ask Copilot to review:
- title and meta description quality
- heading structure
- keyword coverage without stuffing
- internal/external links
- CTA clarity
- readability and scannability
- publication readiness

## Prioritization

Ask Copilot to rank topics or existing pages using:
- business value
- traffic opportunity
- current ranking position
- search intent fit
- update effort
- internal linking leverage

Save prioritization outputs as Markdown tables so they remain easy to review in pull requests.
