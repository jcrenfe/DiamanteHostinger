# Use node:alpine as base image
FROM node:alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (ignoring devDependencies)
RUN npm install --production

# Copy source code
COPY . .

# Expose port (Cloud Run uses PROCESS.ENV.PORT)
EXPOSE 3000

# Start the application
CMD ["node", "src/app.js"]
