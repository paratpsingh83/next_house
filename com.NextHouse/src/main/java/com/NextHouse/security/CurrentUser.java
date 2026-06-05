package com.NextHouse.security;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.lang.annotation.*;

/**
 * This means:
 *   - Authenticated request  → returns Long userId (as before)
 *   - Anonymous request      → returns null (controller must handle null if endpoint is public)
 *   - @PreAuthorize("isAuthenticated()") endpoints → Spring Security rejects before
 *     reaching the controller, so this null case never fires for protected endpoints.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal(expression = "#this == 'anonymousUser' ? null : T(java.lang.Long).parseLong(username)")
public @interface CurrentUser {
}
