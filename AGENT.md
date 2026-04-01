# Agent Guidance

This repository is a catalog of installable skills.

Rules for working in this repo:
- Keep one skill per folder under `skills/<skill-slug>/`.
- Treat `skills/<skill-slug>/SKILL.md` as the primary skill file.
- Keep supporting references inside the same skill folder.
- Update `skills/index.json` whenever skills are added, renamed, or removed.
- Keep `.skillfish.json` next to each skill when install metadata is needed.

Current repo shape:
- `README.md` explains the repository to people.
- `.github/copilot-instructions.md` explains the repository to Copilot.
- `agent.md` explains the repository to automated agents.
- `skills/index.json` lists the installable skills.

When adding another skill later, create a new folder under `skills/`, add `SKILL.md`, add supporting docs, and register the skill in `skills/index.json`.