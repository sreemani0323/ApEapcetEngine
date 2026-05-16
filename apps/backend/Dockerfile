# ═══════════════════════════════════════════════════════
# Multi-Stage Dockerfile — Spring Boot Backend
# Optimized for Render Free Tier (512MB RAM)
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

# Memory-optimized entrypoint for 512MB containers:
#   SerialGC       — smallest GC footprint (ZGC uses 2-3x more native memory)
#   Xmx200m        — leaves ~300MB for metaspace, threads, native buffers
#   MaxMetaspace    — caps class metadata memory
#   ReservedCodeCache — caps JIT compiler memory
#   TieredStopAtLevel=1 — reduces JIT memory usage
ENTRYPOINT ["java", \
    "-XX:+UseSerialGC", \
    "-Xmx200m", \
    "-Xms200m", \
    "-XX:MaxMetaspaceSize=100m", \
    "-XX:ReservedCodeCacheSize=64m", \
    "-XX:MaxDirectMemorySize=32m", \
    "-XX:-TieredCompilation", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
