---
name: skill-authoring-starter
description: Create new repository-compatible skills quickly with templates, checklists, and manifest updates. Use when adding a new skill folder under skills/, creating SKILL.md and optional .skillfish.json, or updating skills/index.json and docs.
metadata:
  version: "1.0.0"
---

# Skill Authoring Starter

Create and register new skills in this repository with a repeatable process.

## When to Use This Skill

Use this skill when you need to:
- Add a brand new skill folder under `skills/`.
- Draft a complete `SKILL.md` with frontmatter and actionable sections.
- Add optional install metadata in `.skillfish.json`.
- Update `skills/index.json` correctly.
- Keep `README.md` and repository guidance in sync.

Trigger phrases:
- "create a new skill"
- "add skill to this repo"
- "skill template"
- "register skill in index"

## Required Repository Rules

- Keep one skill per folder in `skills/<skill-slug>/`.
- The canonical entrypoint is `skills/<skill-slug>/SKILL.md`.
- Keep supporting docs in the same skill folder.
- Register every new skill in `skills/index.json`.
- If install metadata is needed, add `skills/<skill-slug>/.skillfish.json`.

## Standard Creation Workflow

1. Pick a stable slug.
2. Create `skills/<slug>/SKILL.md`.
3. Add supporting docs under `skills/<slug>/references/` when needed.
4. Add `skills/<slug>/.skillfish.json`.
5. Add the skill entry to `skills/index.json`.
6. Update `README.md` current skill list.
7. Validate JSON files.

## SKILL.md Template

```md
---
name: <skill-slug>
description: <what this skill does and when to use it>
metadata:
  version: "1.0.0"
---

# <Human Friendly Title>

## When to Use This Skill
- <case 1>
- <case 2>

## Inputs to Gather
- <required input 1>
- <required input 2>

## Workflow
1. <step 1>
2. <step 2>
3. <step 3>

## Output Checklist
- [ ] `skills/<skill-slug>/SKILL.md` is complete
- [ ] `skills/index.json` is updated
- [ ] `.skillfish.json` added or updated if needed
```

## .skillfish.json Template

```json
{
  "version": 2,
  "name": "<skill-slug>",
  "title": "<Skill Title>",
  "description": "<Installable skill description>",
  "owner": "<github-owner>",
  "repo": "Skills",
  "path": "skills/<skill-slug>",
  "branch": "main",
  "entrypoint": "SKILL.md",
  "metadata": {
    "version": "1.0.0"
  },
  "source": "manual"
}
```

## skills/index.json Entry Template

```json
{
  "id": "<skill-slug>",
  "name": "<skill-slug>",
  "title": "<Skill Title>",
  "description": "<Catalog description>",
  "path": "skills/<skill-slug>",
  "entrypoint": "skills/<skill-slug>/SKILL.md",
  "metadata": {
    "version": "1.0.0"
  }
}
```

## Quality Checks

- Keep frontmatter values short and stable.
- Keep instructions concrete and copy-pasteable.
- Avoid references to files outside the skill folder.
- Ensure slug consistency across folder name, `name`, and catalog ID.

## Validation Commands

```bash
python3 -m json.tool skills/index.json >/dev/null
python3 -m json.tool skills/<skill-slug>/.skillfish.json >/dev/null
```

## Done Criteria

- New skill folder exists and is complete.
- Skill is discoverable in `skills/index.json`.
- README current skills list includes the new skill.
- JSON manifests are valid.