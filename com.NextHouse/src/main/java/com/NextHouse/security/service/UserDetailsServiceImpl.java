package com.NextHouse.security.service;

import com.NextHouse.entity.User;
import com.NextHouse.exception.NotFoundException;
import com.NextHouse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * UserDetailsServiceImpl
 *
 * Bridges NexHouse's User entity with Spring Security's UserDetails contract.
 *
 * Two load methods:
 *   1. loadUserByUsername(String) — Spring Security calls this during form-login
 *      and AuthenticationManager.authenticate(). We accept username OR email
 *      OR phone so the identifier field is flexible.
 *
 *   2. loadUserById(Long) — Called by JwtAuthenticationFilter on every
 *      authenticated request to verify the user is still active.
 *      This is the hot path — cache the result in Redis:
 *
 *        @Cacheable(value = "userdetails", key = "#userId")
 *
 *      Invalidate the cache on:
 *        - User ban    → @CacheEvict(value = "userdetails", key = "#userId")
 *        - Role change → @CacheEvict(value = "userdetails", key = "#userId")
 *        - Account deletion
 *
 * UserDetails fields:
 *   - username     → User.username (used as principal name in SecurityContext)
 *   - password     → BCrypt-hashed (only used during login, never on JWT path)
 *   - authorities  → ROLE_{role} (e.g. ROLE_USER, ROLE_ADMIN)
 *   - enabled      → !banned && !deleted
 *   - accountNonLocked → !banned
 *   - credentialsNonExpired → always true (no password expiry policy)
 *   - accountNonExpired    → always true (accounts don't expire)
 *
 * GrantedAuthority convention:
 *   Spring Security requires the "ROLE_" prefix for @PreAuthorize("hasRole('ADMIN')").
 *   Our User.role stores "ADMIN" without prefix — we add it here.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Called by AuthenticationManager during login.
     * Accepts: username, email, or phone number.
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .or(() -> userRepository.findByPhoneNumber(identifier))
                .orElseThrow(() -> new UsernameNotFoundException(
                    "User not found for identifier: " + identifier));

        return buildUserDetails(user);
    }

    /**
     * Called by JwtAuthenticationFilter on every authenticated request.
     * Loads by primary key — fastest possible lookup.
     *
     * Production optimisation: add @Cacheable here.
     */
    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        return buildUserDetails(user);
    }

    // ─── UserDetails builder ──────────────────────────────────────────────────

    private UserDetails buildUserDetails(User user) {
        boolean active = !Boolean.TRUE.equals(user.getIsDeleted())
                && "ACTIVE".equals(user.getAccountStatus());
        boolean notBanned = !Boolean.TRUE.equals(user.getBanned());

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getId().toString())   // principal name = userId string
                .password(user.getPassword() != null ? user.getPassword() : "")
                .authorities(buildAuthorities(user.getRole()))
                .disabled(!active)
                .accountExpired(false)
                .accountLocked(!notBanned)
                .credentialsExpired(false)
                .build();
    }

    /**
     * Converts our role string to Spring Security GrantedAuthority list.
     *
     * Example: "ADMIN" → [ROLE_ADMIN, ROLE_USER]
     * Hierarchy: ADMIN includes USER permissions automatically.
     *
     * In production, use a RoleHierarchy bean so ADMIN inherits MODERATOR
     * inherits USER permissions without listing all of them explicitly.
     */
    private List<SimpleGrantedAuthority> buildAuthorities(String role) {
        if (role == null) role = "USER";

        return switch (role.toUpperCase()) {
            case "ADMIN" -> List.of(
                new SimpleGrantedAuthority("ROLE_ADMIN"),
                new SimpleGrantedAuthority("ROLE_MODERATOR"),
                new SimpleGrantedAuthority("ROLE_USER")
            );
            case "MODERATOR" -> List.of(
                new SimpleGrantedAuthority("ROLE_MODERATOR"),
                new SimpleGrantedAuthority("ROLE_USER")
            );
            default -> List.of(new SimpleGrantedAuthority("ROLE_USER"));
        };
    }
}
