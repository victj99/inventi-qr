# Etapa 1: build del frontend Angular (PWA).
FROM node:24-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Etapa 2: build del backend Spring Boot.
FROM maven:3.9-eclipse-temurin-17 AS api
WORKDIR /api
COPY backend/pom.xml ./
RUN mvn -q -DskipTests dependency:go-offline || true
COPY backend/src ./src
RUN mvn -q -DskipTests package

# Etapa 3: runtime único que sirve la API y el frontend estático (mismo origen, sin CORS).
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=api /api/target/inventario-ti-1.0.0.jar app.jar
COPY --from=web /web/dist/inventario-ti-pwa/browser ./static
ENV STATIC_LOCATIONS=file:/app/static/
EXPOSE 8090
CMD ["java", "-jar", "/app/app.jar"]