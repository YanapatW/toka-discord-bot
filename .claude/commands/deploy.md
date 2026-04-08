---
name: deploy
description: /deploy — Build and verify the bot is ready for deployment
---

# Deploy Check

Verify the bot is ready for deployment.

## Steps
1. Run TypeScript check: `pnpm exec tsc --noEmit`
2. Build: `pnpm run build`
3. Verify `dist/` output exists
4. Check for uncommitted changes: `git status`
5. Report readiness status
