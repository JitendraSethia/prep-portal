# syntax=docker/dockerfile:1
# Production image for the Prep Portal (Next.js 16 + Prisma + PostgreSQL).
FROM node:22-slim AS base
WORKDIR /app
# Prisma requires OpenSSL at runtime.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# --- Dependencies (with Prisma client generation via postinstall) -----------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- Build ------------------------------------------------------------------
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runtime ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
# Apply pending migrations, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
