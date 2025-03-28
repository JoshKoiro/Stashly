# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies and health check tools
COPY package*.json ./
RUN npm ci --only=production && \
    apk add --no-cache wget

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create directory for PDF storage with proper permissions
RUN mkdir -p /tmp/qr-pdfs && \
    chmod 777 /tmp/qr-pdfs

# Create directory for logs with proper permissions
RUN mkdir -p /app/logs && \
    chmod 777 /app/logs

# We'll keep root user for troubleshooting but ensure directories have correct permissions
# USER node

EXPOSE 3001

VOLUME ["/tmp/qr-pdfs"]

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]