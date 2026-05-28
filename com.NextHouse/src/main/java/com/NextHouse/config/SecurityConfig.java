package com.NextHouse.config;

import com.NextHouse.security.filter.JwtAuthenticationFilter;
import com.NextHouse.security.filter.RateLimitingFilter;
import com.NextHouse.security.handler.JwtAccessDeniedHandler;
import com.NextHouse.security.handler.JwtAuthenticationEntryPoint;
import com.NextHouse.security.service.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * SecurityConfig
 *
 * Spring Security 6 (Lambda DSL) configuration.
 *
 * Key design decisions:
 *
 * 1. STATELESS sessions:
 *    SessionCreationPolicy.STATELESS — no HttpSession created or used.
 *    All state lives in the JWT. This enables horizontal scaling
 *    (any server can handle any request).
 *
 * 2. CSRF disabled:
 *    REST APIs consumed by mobile/SPA clients don't use browser cookie sessions,
 *    so CSRF tokens are irrelevant. If you add cookie-based auth, re-enable CSRF
 *    with CookieCsrfTokenRepository.withHttpOnlyFalse().
 *
 * 3. Filter order:
 *    RateLimitingFilter → JwtAuthenticationFilter → UsernamePasswordAuthenticationFilter
 *    Rate limiting runs first to reject abusive clients before any token processing.
 *
 * 4. Method security (@EnableMethodSecurity):
 *    Enables @PreAuthorize, @PostAuthorize, @Secured on controller/service methods.
 *    Examples used throughout the project:
 *      @PreAuthorize("hasRole('ADMIN')")
 *      @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
 *      @PreAuthorize("#userId == authentication.name or hasRole('ADMIN')")
 *
 * 5. Security headers:
 *    Production-grade HTTP headers added via headers() DSL:
 *      - X-Content-Type-Options: nosniff
 *      - X-Frame-Options: DENY
 *      - Strict-Transport-Security (HSTS)
 *      - Content-Security-Policy
 *      - Referrer-Policy
 *
 * application.yml CORS config:
 * ─────────────────────────────────────────────────────────────────
 * app:
 *   cors:
 *     allowed-origins:
 *       - https://nexthouse.app
 *       - https://www.nexthouse.app
 *       - http://localhost:3000   # dev
 *     allowed-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
 *     max-age: 3600
 * ─────────────────────────────────────────────────────────────────
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsServiceImpl      userDetailsService;
    private final JwtAuthenticationFilter     jwtAuthenticationFilter;
    private final RateLimitingFilter          rateLimitingFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final JwtAccessDeniedHandler      accessDeniedHandler;

    // ─── Security filter chain ────────────────────────────────────────────────

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ── Session ──────────────────────────────────────────────────────
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── CSRF ─────────────────────────────────────────────────────────
            .csrf(AbstractHttpConfigurer::disable)

            // ── CORS ─────────────────────────────────────────────────────────
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // ── HTTP security headers ─────────────────────────────────────────
            .headers(headers -> headers
                .contentTypeOptions(contentType -> {}) // X-Content-Type-Options: nosniff
                .frameOptions(frame -> frame.deny())   // X-Frame-Options: DENY
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31_536_000))       // 1 year HSTS
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "img-src 'self' data: https://cdn.nexthouse.app; " +
                        "script-src 'self'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "connect-src 'self' wss://nexthouse.app"))
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
            )

            // ── Authorization rules ───────────────────────────────────────────
            .authorizeHttpRequests(auth -> auth

                // ── Fully public ─────────────────────────────────────────────
                .requestMatchers(
                    "/api/v1/auth/**",
                    "/actuator/health",
                    "/actuator/info",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**",
                    "/ws/**"                     // WebSocket handshake
                ).permitAll()

                // ── Public GET endpoints ──────────────────────────────────────
                .requestMatchers(HttpMethod.GET,
                    "/api/v1/posts/**",
                    "/api/v1/activities/**",
                    "/api/v1/communities/**",
                    "/api/v1/neighborhoods/**",
                    "/api/v1/marketplace/**",
                    "/api/v1/safety-alerts/**",
                    "/api/v1/users/{userId}"
                ).permitAll()

                // ── Admin-only endpoints ──────────────────────────────────────
                .requestMatchers("/api/v1/admin/**")
                    .hasRole("ADMIN")

                // ── Moderation endpoints ──────────────────────────────────────
                .requestMatchers("/api/v1/moderation/**")
                    .hasAnyRole("ADMIN", "MODERATOR")

                // ── Everything else requires authentication ────────────────────
                .anyRequest().authenticated()
            )

            // ── Custom error handlers ─────────────────────────────────────────
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler))

            // ── Authentication provider ───────────────────────────────────────
            .authenticationProvider(authenticationProvider())

            // ── Filter order ──────────────────────────────────────────────────
            // Rate limit runs first → then JWT auth
            .addFilterBefore(rateLimitingFilter,          UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter,     UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ─── CORS ─────────────────────────────────────────────────────────────────

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(
            "https://nexthouse.app",
            "https://www.nexthouse.app",
            "http://localhost:3000",   // React dev server
            "http://localhost:8080"    // Swagger UI
        ));

        config.setAllowedMethods(List.of(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));

        config.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Requested-With",
            "Cache-Control",
            "X-Device-Id",
            "X-Device-Type"
        ));

        config.setExposedHeaders(List.of(
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset"
        ));

        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ─── Authentication provider ──────────────────────────────────────────────

    /**
     * DaoAuthenticationProvider wires together:
     *   - UserDetailsService (loads user from DB)
     *   - PasswordEncoder (BCrypt verification)
     *
     * Used by AuthenticationManager during login
     * (AuthService.login() → authenticationManager.authenticate()).
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    // ─── Password encoder ─────────────────────────────────────────────────────

    /**
     * BCryptPasswordEncoder with strength 12.
     *
     * Strength (cost factor) 12 → ~250ms per hash on modern hardware.
     * This is intentionally slow to resist brute-force attacks.
     * Default (10) → ~100ms. Increase to 13 for extra security on powerful servers.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
