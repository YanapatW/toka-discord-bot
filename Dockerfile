# Build stage
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN pnpm run build

# Run stage
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

COPY --from=builder /app/dist ./dist/

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.js"]
