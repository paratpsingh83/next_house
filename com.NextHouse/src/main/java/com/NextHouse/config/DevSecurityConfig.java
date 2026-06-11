package com.NextHouse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Dev-only security chain (higher @Order than SecurityConfig = 1).
 * Permits /swagger-ui/** and /v3/api-docs/** without authentication.
 * This bean is NOT loaded in production (profile != dev).
 */
@Configuration
@Profile("dev")
public class DevSecurityConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain devSwaggerFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**")
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}