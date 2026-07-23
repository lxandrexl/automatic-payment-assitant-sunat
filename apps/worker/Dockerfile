# Worker: proceso de crons. Corre TypeScript con tsx (sin build step).
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tributo/core build && pnpm --filter @tributo/notify build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/apps/worker
# stop_grace_period alto en compose para el cierre limpio de Mongo/IMAP.
CMD ["node", "--import", "tsx", "src/main.ts"]
