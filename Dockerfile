# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app with environment variables
ARG SERVER_NAME
ENV SERVER_NAME=${SERVER_NAME}
ARG SERVER_PORT
ENV SERVER_PORT=${SERVER_PORT}
ARG POSTGRES_HOST
ENV POSTGRES_HOST=${POSTGRES_HOST}
ARG POSTGRES_DB
ENV POSTGRES_DB=${POSTGRES_DB}
ARG POSTGRES_USER
ENV POSTGRES_USER=${POSTGRES_USER}
ARG POSTGRES_PASSWORD
ENV POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Build the app in development mode
RUN npm run build -- --mode development

# Production stage
FROM nginx:alpine

# Create directories for SSL certificates
RUN mkdir -p /etc/letsencrypt/live/${SERVER_NAME}

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Draco files
COPY --from=build /app/public/draco /usr/share/nginx/html/draco

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 