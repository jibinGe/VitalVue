# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start Vite in hostname 0.0.0.0 so Docker/Nginx can access it
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
