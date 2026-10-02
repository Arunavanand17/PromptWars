# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html
# Expose port 8080 for Cloud Run
EXPOSE 8080
# Start nginx
CMD ["nginx", "-g", "daemon off;"]
