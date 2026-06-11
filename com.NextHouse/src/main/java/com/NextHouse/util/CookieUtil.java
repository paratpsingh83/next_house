package com.NextHouse.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Builds HttpOnly, SameSite=Strict cookies for JWT tokens.
 *
 * - nh_access  : short-lived access token, sent on every API request (path = /)
 * - nh_refresh : long-lived refresh token, scoped to refresh endpoint only
 *
 * The `secure` flag is driven by `app.cookie.secure` — set to false in dev (HTTP),
 * true in production (HTTPS). Controlled via COOKIE_SECURE env var.
 */
@Component
public class CookieUtil {

    @Value("${app.cookie.secure:true}")
    private boolean secure;

    @Value("${app.jwt.access-token-expiry-seconds:900}")
    private long accessExpirySeconds;

    public ResponseCookie accessCookie(String token) {
        return ResponseCookie.from("nh_access", token)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(accessExpirySeconds)
                .sameSite("Strict")
                .build();
    }

    public ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from("nh_refresh", token)
                .httpOnly(true)
                .secure(secure)
                .path("/api/v1/auth/refresh-token")
                .maxAge(Duration.ofDays(30))
                .sameSite("Strict")
                .build();
    }

    public ResponseCookie clearAccessCookie() {
        return ResponseCookie.from("nh_access", "")
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();
    }

    public ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from("nh_refresh", "")
                .httpOnly(true)
                .secure(secure)
                .path("/api/v1/auth/refresh-token")
                .maxAge(0)
                .sameSite("Strict")
                .build();
    }
}
