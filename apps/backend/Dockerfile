# ═══════════════════════════════════════════════════════
# Multi-Stage Dockerfile — Spring Boot Backend
# Target: JDK 21 LTS (eclipse-temurin)
# ═══════════════════════════════════════════════════════

# ── Stage 1: Build ──
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build

# Cache Maven dependencies
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
ENV MAVEN_OPTS="-Xmx256m -XX:MaxMetaspaceSize=128m"
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Compile
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# ── Stage 2: Runtime ──
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Security: Non-root user
RUN addgroup -S eapcet && adduser -S eapcet -G eapcet
USER eapcet

# Copy only the fat JAR
COPY --from=builder /build/target/*.jar app.jar

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

ENTRYPOINT ["java", \
    "-XX:+UseZGC", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
