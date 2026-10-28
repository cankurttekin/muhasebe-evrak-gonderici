# Stage 1: Build Frontend
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:22-bookworm-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --ignore-scripts
COPY backend/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy backend package files and install production deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev --ignore-scripts

# Copy compiled backend dist
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copy compiled frontend dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 5000

# Create default directories for volume mounts
RUN mkdir -p /app/data /zirvedata

WORKDIR /app/backend
CMD ["node", "dist/server.js"]
