# ---- Stage 1: Builder ----
# Use a Node.js image with build tools. Alpine is smaller.
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install *all* dependencies (including dev)
# This leverages Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build both frontend and backend
RUN npm run build

# ---- Stage 2: Runtime ----
# Use a minimal Node.js Alpine image for the final stage
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production
# Optional: Define the port, although the app reads it or defaults
# ENV PORT=3000

# Copy package files again
COPY package.json package-lock.json ./

# Install *only* production dependencies
RUN npm ci --omit=dev

# Copy the built application artifacts from the builder stage
# This includes dist/backend and dist/public
COPY --from=builder /app/dist ./dist

# Create directories for volumes if they don't exist (optional but safer)
# The application code might create these, but being explicit is good practice
# These directories will be mount points for volumes
RUN mkdir -p data uploads

# Optional but recommended: Run as a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Expose the port the application listens on
EXPOSE 3000

# The command to run the application using the container-specific script
CMD ["npm", "run", "start-container"]