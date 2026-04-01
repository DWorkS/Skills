# GitHub Copilot Instructions

This repository is a Skillfish-compatible skills catalog.

Repository rules:
- Keep each skill in its own folder under `skills/<skill-slug>/`.
- Make `skills/<skill-slug>/SKILL.md` the primary entry point for the skill.
- Keep supporting docs inside the same skill folder.
- Keep `skills/index.json` as the canonical repository manifest.
- Keep each skill's optional `.skillfish.json` alongside `SKILL.md`.
- Prefer small, stable metadata so external installers can consume the repo reliably.

Required files for this repo:
- `README.md` for human-readable repository usage.
- `agent.md` for agent-specific repository guidance.
- `skills/index.json` for the skill catalog.
- `skills/<skill-slug>/SKILL.md` for each skill.
- `skills/<skill-slug>/.skillfish.json` when install metadata is needed.

When adding a new skill:
- Create a new folder under `skills/`.
- Add a `SKILL.md` file.
- Add any supporting docs inside the same folder.
- Add or update `.skillfish.json` if the skill needs install metadata.
- Add the skill to `skills/index.json`.

