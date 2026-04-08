---
name: git-workflow
description: Git commit format and branch conventions
---

# Git Workflow

## Branch Naming
- Features: `feat/<feature-name>`
- Fixes: `fix/<bug-description>`
- Phases: `feat/phase<N>-<description>`

## Commit Messages
Format: `<type>: <description>`

Types:
- `feat:` — new feature or command
- `fix:` — bug fix
- `refactor:` — code restructure without behavior change
- `docs:` — documentation only
- `chore:` — tooling, deps, config changes

Examples:
```
feat: add /warn command for moderation
fix: handle DM context in channel restriction check
refactor: extract message truncation to utility
docs: update CLAUDE.md with Phase 2 commands
chore: upgrade discord.js to v14.27
```

## PR Process
- One PR per feature/phase
- PR title matches the primary commit type
- Squash merge to main
