# Web Next.js — output standalone (imagen mínima). Contexto = raíz del monorepo.
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tributo/core build
ENV NEXT_STANDALONE=1
RUN pnpm --filter @tributo/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# La salida standalone de Next para monorepo trae server.js + node_modules mínimos.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
