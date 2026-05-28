package com.NextHouse.serviceImpl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * RedisTokenStore
 *
 * Thin wrapper around RedisTemplate for storing short-lived tokens:
 *   - 2FA session tokens  → key: "2fa:{uuid}",   TTL: 5 min
 *   - Password reset tokens → key: "reset:{uuid}", TTL: 15 min
 *   - OTP verification results for downstream flows
 *
 * All keys automatically expire via Redis TTL — no manual cleanup needed.
 */
@Component
@RequiredArgsConstructor
public class RedisTokenStore {

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Store a value with a TTL in seconds.
     */
    public void store(String key, String value, long ttlSeconds) {
        redisTemplate.opsForValue().set(key, value, Duration.ofSeconds(ttlSeconds));
    }

    /**
     * Retrieve a stored value. Returns null if expired or not found.
     */
    public String get(String key) {
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? value.toString() : null;
    }

    /**
     * Delete a key immediately (e.g. after consuming a one-time token).
     */
    public void delete(String key) {
        redisTemplate.delete(key);
    }

    public boolean exists(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    // ─── Atomic counters ──────────────────────────────────────────────────────

    /** Increment a counter and return new value. Used for view counts, rate limits. */
    public long increment(String key) {
        Long val = redisTemplate.opsForValue().increment(key);
        return val != null ? val : 0L;
    }

    /** Increment counter and set TTL only on first call (if key didn't exist before). */
    public long incrementWithTtl(String key, long ttlSeconds) {
        Long val = redisTemplate.opsForValue().increment(key);
        if (val != null && val == 1L) {
            // First increment — set expiry
            redisTemplate.expire(key, Duration.ofSeconds(ttlSeconds));
        }
        return val != null ? val : 0L;
    }

    // ─── Rate limiting helpers ────────────────────────────────────────────────

    /**
     * Rate-limit check: how many times has this key been incremented
     * within the current window?
     *
     * Example: OTP request rate limit — max 3 per phone per 10 min.
     *   long count = tokenStore.incrementWithTtl("otp:rate:" + phone, 600);
     *   if (count > 3) throw new RateLimitException("...");
     */
    public boolean isRateLimited(String key, long maxRequests, long windowSeconds) {
        long count = incrementWithTtl(key, windowSeconds);
        return count > maxRequests;
    }
}
