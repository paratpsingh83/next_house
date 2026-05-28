package com.NextHouse.security.filter;

import com.NextHouse.security.jwt.JwtTokenProvider;
import com.NextHouse.security.jwt.JwtTokenProvider.JwtValidationResult;
import com.NextHouse.security.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JwtAuthenticationFilter
 *
 * Runs exactly once per request (OncePerRequestFilter) before any controller.
 *
 * Filter pipeline position:
 *   This filter is added BEFORE UsernamePasswordAuthenticationFilter in the
 *   security filter chain (see SecurityConfig.addFilterBefore).
 *
 * Token extraction:
 *   Reads the Authorization header: "Bearer {token}"
 *   Falls back to checking a "jwt" cookie for browser-based clients.
 *
 * Flow per request:
 *   1. Extract token from header or cookie.
 *   2. If no token → continue chain (public endpoints work, secured ones fail at authz).
 *   3. Validate token → if EXPIRED or INVALID → write 401 JSON immediately, halt chain.
 *   4. Extract userId from token claims.
 *   5. Load UserDetails from DB (UserDetailsServiceImpl).
 *   6. Check user is not banned/deleted (guards against tokens issued before a ban).
 *   7. Set Authentication into SecurityContextHolder.
 *   8. Continue filter chain.
 *
 * Why reload from DB on every request?
 *   JWT is stateless — if a user is banned after their token is issued, the token
 *   is still cryptographically valid until expiry. Loading from DB catches:
 *     - Banned users
 *     - Deleted accounts
 *     - Role changes (promoted to ADMIN)
 *   For performance: cache UserDetails in Redis with the same TTL as the access
 *   token (15 min). Key: "userdetails:{userId}". Invalidate on ban/delete/role-change.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String JWT_COOKIE    = "jwt";

    /**
     * Paths that are completely public — skip token extraction entirely.
     * Must match SecurityConfig.permitAll() patterns exactly.
     */
    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/v1/auth/**",
        "/api/v1/neighborhoods/detect",
        "/actuator/health",
        "/swagger-ui/**",
        "/v3/api-docs/**",
        "/ws/**"
    );

    private final JwtTokenProvider        jwtTokenProvider;
    private final UserDetailsServiceImpl  userDetailsService;
    private final AntPathMatcher          pathMatcher = new AntPathMatcher();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Skip public paths — no token needed
        if (isPublicPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = extractToken(request);

        // No token → continue chain; Spring Security will reject at authz stage
        if (!StringUtils.hasText(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Validate token
        JwtValidationResult result = jwtTokenProvider.validate(token);

        if (result != JwtValidationResult.VALID) {
            writeUnauthorizedError(response, result);
            return; // halt chain — do not continue to controller
        }

        // Extract userId and load user
        try {
            Long userId = jwtTokenProvider.extractUserId(token);
            String userIdStr = userId.toString();

            // Only set authentication if not already set (prevents re-processing)
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserById(userId);

                // Guard: check account is still active (post-issue ban/delete)
                if (!userDetails.isEnabled() || !userDetails.isAccountNonLocked()) {
                    writeUnauthorizedError(response, JwtValidationResult.INVALID_SIGNATURE);
                    return;
                }

                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                    );
                authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("[JWT] Authenticated userId={} path={}", userId, path);
            }

        } catch (Exception e) {
            log.error("[JWT] Authentication failed for path={}: {}", path, e.getMessage());
            SecurityContextHolder.clearContext();
            writeUnauthorizedError(response, JwtValidationResult.MALFORMED);
            return;
        }

        filterChain.doFilter(request, response);
    }

    // ─── Token extraction ─────────────────────────────────────────────────────

    /**
     * Extracts the JWT from:
     *   1. Authorization: Bearer {token} header (primary)
     *   2. "jwt" HttpOnly cookie (fallback for browser clients)
     */
    private String extractToken(HttpServletRequest request) {
        // 1. Authorization header
        String bearerToken = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }

        // 2. Cookie fallback
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if (JWT_COOKIE.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                    return cookie.getValue();
                }
            }
        }

        return null;
    }

    // ─── Error response ───────────────────────────────────────────────────────

    /**
     * Writes a JSON 401 response and halts the filter chain.
     * Using a structured JSON response (not the default Spring whitelabel error)
     * so mobile/frontend clients can parse the error code consistently.
     */
    private void writeUnauthorizedError(HttpServletResponse response,
                                         JwtValidationResult result) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        String message = switch (result) {
            case EXPIRED            -> "Access token has expired. Please refresh your token.";
            case INVALID_SIGNATURE  -> "Token signature is invalid. Please log in again.";
            case MALFORMED          -> "Malformed token. Please log in again.";
            case UNSUPPORTED        -> "Unsupported token format.";
            case EMPTY              -> "No authentication token provided.";
            default                 -> "Authentication failed.";
        };

        String errorCode = switch (result) {
            case EXPIRED           -> "TOKEN_EXPIRED";
            case INVALID_SIGNATURE -> "TOKEN_INVALID";
            case MALFORMED         -> "TOKEN_MALFORMED";
            default                -> "AUTH_ERROR";
        };

        String json = """
            {
              "success": false,
              "errorCode": "%s",
              "message": "%s",
              "timestamp": "%s"
            }
            """.formatted(errorCode, message, java.time.LocalDateTime.now());

        response.getWriter().write(json);
        response.getWriter().flush();
    }

    // ─── Path matching ────────────────────────────────────────────────────────

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(p -> pathMatcher.match(p, path));
    }
}
