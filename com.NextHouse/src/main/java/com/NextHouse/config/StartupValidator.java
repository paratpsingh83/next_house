package com.NextHouse.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Fails fast on startup if required secrets are not configured.
 * Prevents silent misconfiguration where a default/fallback secret would be used in production.
 */
@Component
public class StartupValidator {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @PostConstruct
    public void validate() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                "[StartupValidator] JWT_SECRET environment variable is not set. " +
                "Generate one with: openssl rand -base64 64 | tr -d '\\n'");
        }
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException(
                "[StartupValidator] JWT_SECRET is too short (< 32 chars). " +
                "Use at least 256 bits (32 bytes) for HS256.");
        }
    }
}