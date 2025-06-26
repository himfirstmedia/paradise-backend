# Stage 1: Build the application
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TailwindCSS
RUN npx tailwindcss -i ./src/styles/input.css -o ./public/css/styles.css

# Stage 2: Production image
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y python3 \
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
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9 && pnpm install

# Copy built assets
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src

# Create non-root user
RUN useradd -m -u 1001 nodejs
USER nodejs

EXPOSE 3000

CMD ["npm", "run", "start"]