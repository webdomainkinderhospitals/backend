# Kinder Hospitals API — container for GCP Cloud Run
FROM node:20-slim AS base
WORKDIR /app

# OpenSSL is needed by Prisma on debian-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 8080

# Sync the schema (additive changes only — no migrations dir), then start the API
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/server.js"]
