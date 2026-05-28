package com.NextHouse.security;

import com.NextHouse.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * SecurityUtils
 *
 * Static utility methods for accessing the current authenticated principal
 * from anywhere in the application (services, event listeners, etc.)
 * without injecting beans.
 *
 * NOTE: In controller methods, prefer the @CurrentUser annotation —
 * it is cleaner and testable. Use SecurityUtils in non-controller contexts
 * (e.g. service layer, AuditListener, Kafka consumers) where injection
 * of the principal is not possible via method parameters.
 *
 * Thread safety:
 *   Spring Security's SecurityContextHolder is thread-local by default.
 *   All methods here are safe to call from the same thread that handled
 *   the HTTP request. Do NOT call these from @Async methods — the security
 *   context is not propagated across thread boundaries by default.
 *   For @Async methods: pass userId as a method parameter instead.
 */
public final class SecurityUtils {

    private SecurityUtils() {} // utility class — no instantiation

    // ─── Principal access ─────────────────────────────────────────────────────

    /**
     * Returns the current authenticated user's ID.
     * Throws UnauthorizedException if no authentication is present.
     */
    public static Long getCurrentUserId() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(Authentication::isAuthenticated)
                .filter(auth -> !"anonymousUser".equals(auth.getPrincipal()))
                .map(auth -> {
                    try {
                        return Long.parseLong(auth.getName());
                    } catch (NumberFormatException e) {
                        throw new UnauthorizedException("Invalid principal format in security context");
                    }
                })
                .orElseThrow(() -> new UnauthorizedException("No authenticated user found"));
    }

    /**
     * Returns the current userId, or empty if the request is unauthenticated.
     * Use for endpoints that work for both guests and authenticated users.
     */
    public static Optional<Long> getCurrentUserIdOptional() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(Authentication::isAuthenticated)
                .filter(auth -> !"anonymousUser".equals(auth.getPrincipal()))
                .map(auth -> {
                    try { return Long.parseLong(auth.getName()); }
                    catch (NumberFormatException e) { return null; }
                });
    }

    // ─── Role checks ──────────────────────────────────────────────────────────

    public static boolean isAdmin() {
        return hasRole("ROLE_ADMIN");
    }

    public static boolean isModerator() {
        return hasRole("ROLE_MODERATOR") || hasRole("ROLE_ADMIN");
    }

    public static boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role::equals);
    }

    // ─── Ownership assertion ──────────────────────────────────────────────────

    /**
     * Asserts the current user owns the given resource OR is an ADMIN.
     * Use in service methods as a lightweight alternative to @PreAuthorize.
     *
     * Example:
     *   SecurityUtils.assertOwnerOrAdmin(post.getCreatedBy().getId());
     */
    public static void assertOwnerOrAdmin(Long ownerId) {
        Long currentUserId = getCurrentUserId();
        if (!currentUserId.equals(ownerId) && !isAdmin()) {
            throw new com.NextHouse.exception.ForbiddenException(
                "You do not have permission to perform this action"
            );
        }
    }

    /**
     * Returns true if the current user owns the resource or is an ADMIN.
     */
    public static boolean isOwnerOrAdmin(Long ownerId) {
        try {
            Long currentUserId = getCurrentUserId();
            return currentUserId.equals(ownerId) || isAdmin();
        } catch (UnauthorizedException e) {
            return false;
        }
    }
}
