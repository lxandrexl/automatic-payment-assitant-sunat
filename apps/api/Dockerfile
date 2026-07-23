# Multi-stage, base node:22-alpine, arm64 (VM Ampere). Contexto = raíz del monorepo.
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tributo/core build \
 && pnpm --filter @tributo/notify build \
 && pnpm --filter @tributo/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copiamos el workspace completo (preserva los symlinks de pnpm hacia packages/*).
COPY --from=builder /app /app
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
