# ══════════════════════════════════════════════════════════════════════════════
# NexHouse — Dockerfile (Multi-stage build)
#
# Stage 1: BUILD   — Maven + JDK 21, compiles the fat JAR
# Stage 2: RUNTIME — Distroless JRE 21, runs the JAR
#
# Multi-stage rationale:
#   - Build stage installs Maven, source code, ALL dependencies → ~800 MB image
#   - Runtime stage contains ONLY the compiled JAR + JRE → ~180 MB final image
#   - No build tools, no source code, no Maven cache in the production image
#   - Distroless base: no shell, no package manager, minimal attack surface
#
# Build:
#   docker build -t nexthouse-backend:latest .
#   docker build --build-arg APP_VERSION=1.2.3 -t nexthouse-backend:1.2.3 .
#
# Run locally:
#   docker run -p 8080:8080 \
#     -e DB_HOST=localhost \
#     -e DB_PASSWORD=secret \
#     -e JWT_SECRET=<base64-secret> \
#     nexthouse-backend:latest
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-jammy AS build

LABEL maintainer="NexHouse Team <api@nexthouse.app>"
LABEL description="NexHouse backend build stage"

# Build arguments
ARG APP_VERSION=1.0.0-SNAPSHOT
ARG MAVEN_OPTS="-Xmx1024m"

WORKDIR /build

# ── Copy Maven wrapper and POM first (layer cache optimisation)
# If pom.xml hasn't changed, Maven won't re-download dependencies
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# ── Download dependencies (cached layer — only re-runs when pom.xml changes)
RUN chmod +x mvnw && \
    ./mvnw dependency:go-offline -B --no-transfer-progress

# ── Copy source code (invalidates cache on any source change)
COPY src ./src

# ── Build the fat JAR, skip tests (tests run in CI pipeline separately)
RUN ./mvnw clean package -B \
    --no-transfer-progress \
    -DskipTests \
    -Dapp.version=${APP_VERSION} && \
    # Rename for consistent artifact name regardless of version
    cp target/nexthouse-backend-*.jar target/nexthouse-backend.jar && \
    # Extract Spring Boot layers for optimised Docker layer caching
    java -Djarmode=layertools -jar target/nexthouse-backend.jar extract --destination target/extracted

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# Use distroless: no shell, no OS packages, minimal CVE surface
FROM gcr.io/distroless/java21-debian12:nonroot AS runtime

LABEL maintainer="NexHouse Team <api@nexthouse.app>"
LABEL description="NexHouse backend production image"
LABEL org.opencontainers.image.source="https://github.com/nexthouse/nexthouse-backend"

WORKDIR /app

# ── Copy Spring Boot extracted layers in optimal order
# Layers change from least-frequent to most-frequent:
#   dependencies    → external Maven deps (changes rarely)
#   spring-boot-loader → Spring Boot loader (changes with Spring Boot upgrades)
#   snapshot-dependencies → SNAPSHOT deps (changes sometimes)
#   application     → your code (changes every commit)
COPY --from=build /build/target/extracted/dependencies/          ./
COPY --from=build /build/target/extracted/spring-boot-loader/    ./
COPY --from=build /build/target/extracted/snapshot-dependencies/ ./
COPY --from=build /build/target/extracted/application/           ./

# ── Firebase service account (mounted as K8s Secret in production)
# In production: mount as /app/secrets/firebase-service-account.json
# and set FIREBASE_CREDENTIALS_FILE=/app/secrets/firebase-service-account.json

# ── JVM tuning for containerised environment
# -XX:+UseContainerSupport          → respect cgroup CPU/memory limits (default on Java 11+)
# -XX:MaxRAMPercentage=75.0         → use 75% of container memory for heap
# -XX:InitialRAMPercentage=50.0     → start at 50% to allow faster startup
# -XX:+ExitOnOutOfMemoryError       → crash fast on OOM (K8s will restart cleanly)
# -XX:+HeapDumpOnOutOfMemoryError   → dump heap for post-mortem analysis
# -Djava.security.egd=...           → faster SecureRandom (important for JWT signing)
ENV JAVA_OPTS="\
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0 \
  -XX:+ExitOnOutOfMemoryError \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/tmp/heapdump.hprof \
  -Djava.security.egd=file:/dev/./urandom \
  -Dspring.profiles.active=prod"

# Application port
EXPOSE 8080

# Health check — Kubernetes also has its own liveness/readiness probes,
# but this helps with docker-compose and local development
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD ["java", "-cp", "BOOT-INF/lib/*:.", "org.springframework.boot.loader.launch.PropertiesLauncher", \
       "--spring.main.web-application-type=none", \
       "--check=health"] || exit 1

# Run as non-root (distroless nonroot = UID 65532)
USER nonroot:nonroot

# Spring Boot layered JAR entry point
ENTRYPOINT ["java", "-cp", "BOOT-INF/lib/*:.", "org.springframework.boot.loader.launch.JarLauncher"]
