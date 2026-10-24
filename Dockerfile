# Use official Node.js LTS Alpine image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Define build arguments with default values matching .env
ARG PORT=5001
ARG NODE_ENV=production
ARG DB_NAME=practice_erp_v3
ARG DB_USER=root
ARG DB_PASS=
ARG DB_HOST=localhost
ARG DB_PORT=3306
ARG JWT_SECRET=himanshu
ARG BACKEND_URL=http://localhost:5001
ARG ADMIN_EMAIL=admin@erp.local
ARG ADMIN_PASSWORD=admin123
ARG RAZORPAY_KEY_ID=
ARG RAZORPAY_KEY_SECRET=
ARG RAZORPAY_WEBHOOK_SECRET=
ARG openai_api_key=
ARG SMTP_HOST=smtp.gmail.com
ARG SMTP_PORT=465
ARG SMTP_SECURE=true
ARG SMTP_USER=
ARG SMTP_PASS=
ARG SMTP_FROM=
ARG SMTP_BACKUP_FROM=

# Export environment variables so they are accessible to process.env in Node.js
# (These defaults can be overridden at runtime via `docker run --env-file .env` or `-e KEY=VAL`)
ENV PORT=${PORT} \
    NODE_ENV=${NODE_ENV} \
    DB_NAME=${DB_NAME} \
    DB_USER=${DB_USER} \
    DB_PASS=${DB_PASS} \
    DB_HOST=${DB_HOST} \
    DB_PORT=${DB_PORT} \
    JWT_SECRET=${JWT_SECRET} \
    BACKEND_URL=${BACKEND_URL} \
    ADMIN_EMAIL=${ADMIN_EMAIL} \
    ADMIN_PASSWORD=${ADMIN_PASSWORD} \
    RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID} \
    RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET} \
    RAZORPAY_WEBHOOK_SECRET=${RAZORPAY_WEBHOOK_SECRET} \
    openai_api_key=${openai_api_key} \
    SMTP_HOST=${SMTP_HOST} \
    SMTP_PORT=${SMTP_PORT} \
    SMTP_SECURE=${SMTP_SECURE} \
    SMTP_USER=${SMTP_USER} \
    SMTP_PASS=${SMTP_PASS} \
    SMTP_FROM=${SMTP_FROM} \
    SMTP_BACKUP_FROM=${SMTP_BACKUP_FROM}

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code into container
COPY . .

# Ensure storage directories exist
RUN mkdir -p uploads public

# Expose backend port
EXPOSE ${PORT}

# Start the application
CMD ["npm", "start"]
