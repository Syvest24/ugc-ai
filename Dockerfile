# Use Node 22 LTS (latest) which satisfies Prisma's >=22.12 requirement
FROM node:22-slim AS builder

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all dependencies (including dev for build)
RUN npm ci

# Ensure Remotion's headless browser is downloaded
RUN npx remotion browser ensure

# Copy the rest of the source
COPY . .

# Generate Prisma client and build Next.js
# DATABASE_URL is needed at build time for page pre-rendering (not actually connected)
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL=${DATABASE_URL}
ENV AUTH_SECRET="build-secret-not-used-at-runtime"
RUN npx prisma generate && npm run build

# --- Production stage ---
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    openssl \
    ca-certificates \
    # Chromium dependencies for Remotion headless rendering
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
# Ensure Railway is detected as a cloud environment (for file storage decisions)
ENV RAILWAY_ENVIRONMENT=production
# Let Railway set PORT via env var (defaults to 8080)
# Next.js reads PORT automatically

# Copy built app and dependencies
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src

EXPOSE 8080

CMD ["npm", "start"]
