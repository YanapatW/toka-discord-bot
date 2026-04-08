---
name: add-service
description: /add-service — Create a new service module
---

# Add Service

Create a new service in `src/services/` with proper imports and structure.

## Usage
`/add-service <name>`

## Steps
1. Create `src/services/<name>.ts`
2. Import Prisma client if DB access needed: `import prisma from "./database.js";`
3. Export functions (not a class) for each operation
4. Verify it compiles: `pnpm exec tsc --noEmit`
