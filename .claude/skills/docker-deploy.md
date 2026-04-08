---
name: docker-deploy
description: Docker deployment workflow for the ToKa bot
---

# Docker Deployment

## Local Development
```bash
pnpm dev                    # Run with tsx (hot reload)
pnpm db:push                # Sync schema to local PostgreSQL
```

## Docker Commands
```bash
docker-compose up -d        # Start bot + PostgreSQL
docker-compose up -d --build  # Rebuild and start
docker-compose logs -f bot  # Follow bot logs
docker-compose down         # Stop all services
```

## Production Deploy (Oracle Cloud)
```bash
git pull
docker-compose up -d --build
```

## Environment
- `.env` file required (copy from `.env.example`)
- Docker overrides `DATABASE_URL` to point to the `db` service
- Bot waits for PostgreSQL healthcheck before starting
- Prisma migrations run automatically on container start

## Dockerfile
Multi-stage build: build stage compiles TypeScript, run stage copies compiled JS. Prisma client is generated in both stages (build needs types, run needs runtime).
