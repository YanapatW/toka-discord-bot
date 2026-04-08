---
name: coding-style
description: TypeScript and project coding conventions
---

# Coding Style

## TypeScript
- Strict mode enabled — no implicit `any`
- Use `import/export` (compiled to CommonJS by tsc)
- File extensions in imports: use `.js` (TypeScript resolves to `.ts` at compile time)
- Prefer `interface` over `type` for object shapes
- Use `const` by default, `let` when reassignment needed

## Naming
- Files: kebab-case (`command-handler.ts`)
- Variables/functions: camelCase
- Interfaces/types: PascalCase
- Database columns: snake_case (via Prisma `@map`)
- Discord commands: lowercase with hyphens (`/set-channel`)

## Exports
- Commands and events: `export default` (single export per file)
- Services: named exports (multiple functions per file)
- Types: named exports from `src/types/index.ts`

## Error Handling
- Commands: try/catch in execute, reply with ephemeral error message
- Services: let errors propagate to the command handler
- Startup: fail fast with clear error messages (missing env vars, DB connection)
