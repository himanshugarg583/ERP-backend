# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build tools needed for native modules like bcrypt
RUN apk add --no-cache python3 make g++

# Copy package management files
COPY package*.json ./

# Install production dependencies
RUN npm ci

# Copy application source code
COPY . .

# Final runtime image
FROM node:20-alpine

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Copy application code and dependencies from builder stage
COPY --from=builder /app /app

# Create uploads directory if missing
RUN mkdir -p uploads

# Expose backend port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
