package com.NextHouse.security.jwt;

import com.NextHouse.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

/**
 * JwtTokenProvider
 *
 * Handles all JWT lifecycle operations:
 *   - Access token generation (short-lived, HS256 signed)
 *   - Refresh token generation (opaque UUID — actual validation is DB-side)
 *   - Token parsing and claim extraction
 *   - Validation with detailed error categorisation
 *
 * Algorithm: HMAC-SHA256 (HS256)
 *   - Symmetric — same secret used to sign and verify.
 *   - Simpler than RS256 (no key-pair management) — suitable for single-service.
 *   - For microservice deployments: switch to RS256 so each service can verify
 *     tokens using only the public key (no secret distribution needed).
 *     Change: use RsaKey from application properties + Jwts.parserBuilder().verifyWith(publicKey).
 *
 * Token claims:
 *   - sub   : userId (String)
 *   - username : username
 *   - role  : USER | ADMIN | MODERATOR
 *   - iat   : issued-at
 *   - exp   : expiry
 *
 * application.yml config:
 * ───────────────────────────────────────────────────────────────────────────
 * app:
 *   jwt:
 *     secret: ${JWT_SECRET}              # min 256-bit Base64-encoded string
 *     access-token-expiry-seconds: 900   # 15 minutes
 *     refresh-token-expiry-days: 30
 *
 * Generate a strong secret:
 *   openssl rand -base64 64
 * ───────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.access-token-expiry-seconds:900}")
    private long accessTokenExpirySeconds;

    // ─── Token generation ─────────────────────────────────────────────────────

    /**
     * Generates a signed JWT access token for the given user.
     *
     * Claims embedded:
     *   sub      → userId (used to reload user on each request)
     *   username → for logging / convenience (not trusted for auth decisions)
     *   role     → used by method security @PreAuthorize("hasRole('ADMIN')")
     */
    public String generateAccessToken(User user) {
        Date now    = new Date();
        Date expiry = new Date(now.getTime() + (accessTokenExpirySeconds * 1_000));

        return Jwts.builder()
                .subject(user.getId().toString())
                .claims(Map.of(
                    "username", user.getUsername(),
                    "role",     user.getRole()
                ))
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey())
                .compact();
    }

    /**
     * Generates an opaque refresh token (UUID).
     * The actual token value is persisted in the refresh_tokens table.
     * Validation is performed by checking the DB record (not JWT parsing).
     *
     * Using UUID (not JWT) for refresh tokens means:
     *   - They can be individually revoked (row delete / revoked=true).
     *   - There is no embedded expiry that could be tampered with.
     *   - They are not decodable by the client (no payload exposure).
     */
    public String generateRefreshToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    // ─── Claims extraction ────────────────────────────────────────────────────

    public Long extractUserId(String token) {
        return Long.parseLong(extractAllClaims(token).getSubject());
    }

    public String extractUsername(String token) {
        return (String) extractAllClaims(token).get("username");
    }

    public String extractRole(String token) {
        return (String) extractAllClaims(token).get("role");
    }

    public Date extractExpiry(String token) {
        return extractAllClaims(token).getExpiration();
    }

    public boolean isTokenExpired(String token) {
        return extractExpiry(token).before(new Date());
    }

    // ─── Validation ───────────────────────────────────────────────────────────

    /**
     * Validates a JWT string and returns a typed result.
     *
     * Returning a typed enum instead of throwing allows the filter to respond
     * with a precise error message (expired vs tampered vs malformed).
     */
    public JwtValidationResult validate(String token) {
        try {
            Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token);
            return JwtValidationResult.VALID;
        } catch (ExpiredJwtException e) {
            log.debug("[JWT] Token expired");
            return JwtValidationResult.EXPIRED;
        } catch (SignatureException e) {
            log.warn("[JWT] Invalid signature — possible token tampering");
            return JwtValidationResult.INVALID_SIGNATURE;
        } catch (MalformedJwtException e) {
            log.warn("[JWT] Malformed token");
            return JwtValidationResult.MALFORMED;
        } catch (UnsupportedJwtException e) {
            log.warn("[JWT] Unsupported JWT type");
            return JwtValidationResult.UNSUPPORTED;
        } catch (IllegalArgumentException e) {
            log.warn("[JWT] Empty or null token");
            return JwtValidationResult.EMPTY;
        }
    }

    public boolean isValid(String token) {
        return validate(token) == JwtValidationResult.VALID;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Derives the HMAC signing key from the Base64-encoded secret.
     * The secret must be at least 256 bits (32 bytes) for HS256.
     */
    private SecretKey signingKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ─── Validation result enum ───────────────────────────────────────────────

    public enum JwtValidationResult {
        VALID,
        EXPIRED,
        INVALID_SIGNATURE,
        MALFORMED,
        UNSUPPORTED,
        EMPTY
    }
}
