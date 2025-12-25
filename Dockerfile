# Multi-stage build
FROM oven/bun:alpine AS builder

# Build frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lockb* ./
RUN bun install

COPY frontend/ .
RUN bun run build

# Production stage
FROM oven/bun:alpine AS production

# Install dependencies for network detection
RUN apk add --no-cache iproute2

# Create app directory
WORKDIR /app

# Copy backend code
COPY backend/package.json backend/tsconfig.json ./
COPY backend/src ./src/

# Install backend dependencies
RUN bun install --production

# Copy built frontend from builder stage
COPY --from=builder /app/backend/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lan-share -u 1001

# Create temp directory for file uploads
RUN mkdir -p /tmp && chown -R lan-share:nodejs /tmp

# Switch to non-root user
USER lan-share

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/network || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]
