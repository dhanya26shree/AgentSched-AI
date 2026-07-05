# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM eclipse-temurin:17-jdk-jammy AS backend-builder
WORKDIR /app
COPY backend/lib/ backend/lib/
COPY backend/src/ backend/src/
RUN mkdir -p backend/bin
RUN javac -encoding UTF-8 -cp "backend/lib/mysql-connector-j-8.4.0.jar:backend/lib/gson-2.11.0.jar" -d backend/bin backend/src/model/*.java backend/src/db/*.java backend/src/service/*.java backend/src/controller/*.java backend/src/Main.java

# Stage 3: Runtime stage
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app/backend

# Copy Java libraries and compiled classes
COPY backend/lib/ lib/
COPY --from=backend-builder /app/backend/bin bin
# Copy built public files from frontend builder directly into the backend public folder
COPY --from=frontend-builder /app/backend/public public

# Expose port 8080
EXPOSE 8080

# Start server
CMD ["java", "-cp", "bin:lib/mysql-connector-j-8.4.0.jar:lib/gson-2.11.0.jar", "Main"]
