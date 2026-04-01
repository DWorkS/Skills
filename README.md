# Skills Catalog

This repository packages installable Copilot skills in a Skillfish-friendly layout.

Current skills:
- `chrome-extension-builder` at `skills/chrome-extension-builder/SKILL.md`
- `skill-authoring-starter` at `skills/skill-authoring-starter/SKILL.md`

Repository guidance for automation lives in `agent.md`, and repository-specific Copilot instructions live in `.github/copilot-instructions.md`.

## How to use this repo

Each skill is self-contained inside `skills/<skill-slug>/`.

For Skillfish-compatible tooling, the canonical skill definition is the `SKILL.md` file in that folder. Optional metadata can live beside it in `.skillfish.json`.

## Adding a new skill

1. Create a new directory under `skills/`.
2. Add `SKILL.md` with the skill definition.
3. Add any supporting docs inside the same folder.
4. Update `skills/index.json`.
5. Add `.skillfish.json` if the skill needs install metadata.

## Repository intent

This repo currently ships one skill, but the layout is intentionally flat and repeatable so more skills can be added without changing the install model.