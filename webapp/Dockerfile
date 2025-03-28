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

# Install serve package
RUN npm install -g serve@14.2.1

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Create a simple health check endpoint
RUN mkdir -p ./build/health && \
    echo '{"status":"ok"}' > ./build/health/index.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/index.json || exit 1

# Start the application with specific options to fix CORS and other issues
CMD ["serve", "-s", "build", "-l", "3000", "--no-clipboard", "--no-request-logging"]