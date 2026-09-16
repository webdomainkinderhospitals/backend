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
COPY content ./content

ENV NODE_ENV=production
EXPOSE 8080

# Apply explicit content additions before schema sync, then start the API.
# Keep Prisma safety checks enabled for all other schema changes.
CMD ["sh", "-c", "npx prisma db execute --file scripts/content-schema.sql --schema prisma/schema.prisma && npx prisma db push --skip-generate && node src/server.js"]
