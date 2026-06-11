package com.NextHouse.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * RateLimitingFilter
 *
 * Implements a sliding-window rate limiter using Redis atomic INCR + EXPIRE.
 *
 * Strategy — per-IP sliding window:
 *   Key:   "rate:{ip}:{windowStart}"
 *   Value: request count (incremented atomically)
 *   TTL:   window duration (auto-expires the counter)
 *
 * Configuration (application.yml):
 * ─────────────────────────────────────────────────────────────────────────
 * app:
 *   rate-limit:
 *     enabled: true
 *     requests-per-minute: 120       # global default per IP
 *     auth-requests-per-minute: 10   # stricter limit for auth endpoints
 *     window-seconds: 60
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Tier 1 — IP-based (anonymous / unauthenticated):
 *   Key: "rate:ip:{clientIp}"
 *   Protects against DDoS and brute force from unauthenticated clients.
 *
 * Tier 2 — User-based (authenticated):
 *   Key: "rate:user:{userId}"
 *   Allows legitimate users their full quota even behind a shared NAT/proxy.
 *
 * Auth endpoint protection:
 *   /api/v1/auth/** gets a much stricter limit (10 req/min) to prevent
 *   credential stuffing and OTP brute force.
 *
 * Response headers (RFC 6585 standard):
 *   X-RateLimit-Limit     → max requests allowed
 *   X-RateLimit-Remaining → requests left in window
 *   X-RateLimit-Reset     → Unix timestamp when window resets
 *   Retry-After           → seconds until retry allowed (only on 429)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    @Value("${app.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @Value("${app.rate-limit.requests-per-minute:120}")
    private int requestsPerMinute;

    @Value("${app.rate-limit.auth-requests-per-minute:10}")
    private int authRequestsPerMinute;

    @Value("${app.rate-limit.window-seconds:60}")
    private long windowSeconds;

    @Value("${app.rate-limit.trusted-proxy-cidrs:10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1/32}")
    private List<String> trustedProxyCidrs;

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Paths with tighter rate limits.
     */
    private static final Map<String, Integer> STRICT_PATH_LIMITS = Map.of(
        "/api/v1/auth/login",             10,
        "/api/v1/auth/register",          5,
        "/api/v1/auth/otp/request",       5,
        "/api/v1/auth/otp/verify",        10,
        "/api/v1/auth/password/forgot",   5,
        "/api/v1/auth/oauth2",            10
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (!rateLimitEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String  path      = request.getRequestURI();
        String  clientKey = resolveClientKey(request);
        int     limit     = resolveLimit(path);

        RateLimitResult result = checkRateLimit(clientKey, limit);

        // Set standard rate-limit headers on every response
        response.setHeader("X-RateLimit-Limit",     String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, result.remaining())));
        response.setHeader("X-RateLimit-Reset",     String.valueOf(result.resetEpoch()));

        if (result.limited()) {
            log.warn("[RateLimit] BLOCKED key={} path={} count={}/{}",
                    clientKey, path, result.count(), limit);
            writeTooManyRequestsError(response, result.resetEpoch());
            return;
        }

        filterChain.doFilter(request, response);
    }

    // ─── Rate limit check ─────────────────────────────────────────────────────

    /**
     * Atomically increments the counter for this client+window.
     * Sets TTL only on the first increment (SETNX-style logic via INCR + EXPIRE).
     */
    private RateLimitResult checkRateLimit(String clientKey, int limit) {
        String redisKey = "rate:" + clientKey;

        // Atomic increment
        Long count = redisTemplate.opsForValue().increment(redisKey);
        if (count == null) count = 1L;

        // Set TTL on first request in this window
        if (count == 1L) {
            redisTemplate.expire(redisKey, Duration.ofSeconds(windowSeconds));
        }

        // Calculate reset time
        Long ttlSeconds = redisTemplate.getExpire(redisKey);
        long resetEpoch = System.currentTimeMillis() / 1000
                + (ttlSeconds != null && ttlSeconds > 0 ? ttlSeconds : windowSeconds);

        long remaining = Math.max(0, limit - count);
        boolean limited = count > limit;

        return new RateLimitResult(count, remaining, resetEpoch, limited);
    }

    // ─── Client key resolution ────────────────────────────────────────────────

    /**
     * Builds the rate-limit key for this request.
     * For authenticated requests: prefer userId (fairness behind NAT).
     * For anonymous: use IP address.
     */
    private String resolveClientKey(HttpServletRequest request) {
        // Check if user is authenticated (JWT already processed by JwtAuthenticationFilter)
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null
                && !"anonymousUser".equals(auth.getPrincipal())) {
            // Use userId as the rate-limit key for authenticated users
            return "user:" + auth.getName();
        }

        // Fall back to IP
        return "ip:" + extractClientIp(request);
    }

    /**
     * Extracts the real client IP.
     * X-Forwarded-For is only trusted when remoteAddr is within a configured trusted CIDR
     * (load balancer / k8s node CIDR). Otherwise the header is ignored to prevent IP spoofing.
     */
    private String extractClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();

        if (isTrustedProxy(remoteAddr)) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.trim();
            }
        }

        return remoteAddr;
    }

    private boolean isTrustedProxy(String remoteAddr) {
        try {
            long remote = ipToLong(remoteAddr);
            for (String cidr : trustedProxyCidrs) {
                String[] parts  = cidr.split("/");
                long network    = ipToLong(parts[0]);
                int  prefixLen  = Integer.parseInt(parts[1]);
                long mask       = prefixLen == 0 ? 0L : (0xFFFFFFFFL << (32 - prefixLen)) & 0xFFFFFFFFL;
                if ((remote & mask) == (network & mask)) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private long ipToLong(String ip) {
        String[] octets = ip.split("\\.");
        if (octets.length != 4) return -1L;
        long result = 0;
        for (String octet : octets) result = (result << 8) | (Integer.parseInt(octet) & 0xFF);
        return result;
    }

    /**
     * Returns the applicable rate limit for a given path.
     * Stricter limits override the global default.
     */
    private int resolveLimit(String path) {
        return STRICT_PATH_LIMITS.entrySet().stream()
                .filter(e -> path.startsWith(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(requestsPerMinute);
    }

    // ─── Error response ───────────────────────────────────────────────────────

    private void writeTooManyRequestsError(HttpServletResponse response, long resetEpoch)
            throws IOException {
        long retryAfter = resetEpoch - (System.currentTimeMillis() / 1000);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(Math.max(1, retryAfter)));

        String json = """
            {
              "success": false,
              "errorCode": "RATE_LIMIT_EXCEEDED",
              "message": "Too many requests. Please slow down and try again later.",
              "retryAfterSeconds": %d,
              "timestamp": "%s"
            }
            """.formatted(Math.max(1, retryAfter), LocalDateTime.now());

        response.getWriter().write(json);
        response.getWriter().flush();
    }

    // ─── Result record ────────────────────────────────────────────────────────

    private record RateLimitResult(long count, long remaining, long resetEpoch, boolean limited) {}
}
