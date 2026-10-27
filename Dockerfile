# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy backend package files and install production deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copy compiled frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 5000

# Volume directories
RUN mkdir -p /app/data /zirvedata

WORKDIR /app/backend
CMD ["node", "dist/server.js"]
