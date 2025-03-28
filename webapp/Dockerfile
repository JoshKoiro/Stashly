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

# Create a public/env.js file for runtime environment variables
RUN mkdir -p public

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve package with explicit version to avoid browsing-topics policy issue
RUN npm install -g serve@13.0.4

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Create a simple health check endpoint
RUN mkdir -p ./build/health && \
    echo '{"status":"ok"}' > ./build/health/index.json

# Create basic favicon if missing
RUN if [ ! -f ./build/favicon.ico ]; then \
    echo -ne '\x00\x00\x01\x00\x01\x00\x10\x10\x00\x00\x01\x00\x18\x00h\x03\x00\x00\x16\x00\x00\x00(\x00\x00\x00\x10\x00\x00\x00 \x00\x00\x00\x01\x00\x18\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00' > ./build/favicon.ico; \
    fi

# Script to generate runtime env.js
RUN echo '#!/bin/sh\n\
cat > /app/build/env-config.js << EOF\n\
window._env_ = {\n\
  REACT_APP_API_URL: "${REACT_APP_API_URL}",\n\
  REACT_APP_QR_SERVICE_URL: "${REACT_APP_QR_SERVICE_URL}"\n\
}\n\
EOF\n\
exec "$@"' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/index.json || exit 1

# Create serve.json configuration file to customize serve behavior
RUN echo '{\
  "headers": [\
    {\
      "source": "**/*",\
      "headers": [\
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },\
        { "key": "Permissions-Policy", "value": "interest-cohort=(), camera=(), microphone=()" }\
      ]\
    }\
  ],\
  "rewrites": [\
    { "source": "**", "destination": "/index.html" }\
  ]\
}' > /app/serve.json

# Start the application with specific options
CMD ["/app/start.sh", "serve", "-s", "build", "-l", "3000"]