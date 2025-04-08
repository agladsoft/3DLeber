FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port 8080 (default for live-server)
EXPOSE 8080

# Command to run the application using npx live-server
CMD ["npx", "live-server", "--host=0.0.0.0", "--port=8080"]
