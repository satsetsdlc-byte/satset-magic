# syntax=docker/dockerfile:1
# Stage 1: Build stage with dependency caching
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml duluan agar dependensi di-cache terpisah dari kode sumber
COPY pom.xml .

# Download dependencies (akan di-cache selama pom.xml tidak berubah)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build JAR tanpa download ulang dependency
RUN mvn package -DskipTests

# Stage 2: Runtime stage (Lightweight Alpine JRE)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache git curl

COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseZGC", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
