package com.NextHouse.security;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.lang.annotation.*;

/**
 * @CurrentUser
 *
 * Convenience annotation for injecting the authenticated userId into
 * controller methods — replaces verbose @AuthenticationPrincipal boilerplate.
 *
 * Usage in controllers:
 *
 *   @GetMapping("/me")
 *   public ResponseEntity<?> getMyProfile(@CurrentUser Long currentUserId) {
 *       return ResponseEntity.ok(userService.getMyProfile(currentUserId));
 *   }
 *
 * This works because UserDetailsServiceImpl.loadUserById() sets the
 * Spring Security username to userId.toString(), and SecurityUtils.getCurrentUserId()
 * parses it back to Long.
 *
 * The annotation is meta-annotated with @AuthenticationPrincipal(expression="...")
 * to extract the Long userId directly from the UserDetails principal:
 *
 *   @AuthenticationPrincipal(expression = "T(java.lang.Long).parseLong(username)")
 *
 * This means Spring will call Long.parseLong(userDetails.getUsername()) at runtime.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal(expression = "T(java.lang.Long).parseLong(username)")
public @interface CurrentUser {
}
