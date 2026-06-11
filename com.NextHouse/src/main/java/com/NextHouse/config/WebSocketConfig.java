package com.NextHouse.config;

import com.NextHouse.security.jwt.JwtTokenProvider;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;
import java.util.List;

/**
 * WebSocketConfig
 *
 * Endpoints:
 *   /ws         → SockJS (web browsers via @stomp/stompjs + sockjs-client)
 *   /ws-native  → raw WebSocket (mobile via @stomp/stompjs brokerURL, no SockJS)
 *
 * Broker:
 *   Dev  (RABBITMQ_HOST not set) → in-memory SimpleBroker, single-node only
 *   Prod (RABBITMQ_HOST set)     → StompBrokerRelay → RabbitMQ STOMP plugin
 *                                  Messages survive restarts, work across all HPA pods
 *
 * Destinations:
 *   /app/**                    → @MessageMapping handlers
 *   /topic/**                  → broadcast
 *   /queue/**                  → unicast
 *   /user/{id}/queue/**        → user-specific unicast
 */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;
    private final Environment      environment;

    @Value("${app.rabbitmq.stomp.host:}")
    private String rabbitHost;

    @Value("${app.rabbitmq.stomp.port:61613}")
    private int rabbitPort;

    @Value("${app.rabbitmq.stomp.login:guest}")
    private String rabbitLogin;

    @Value("${app.rabbitmq.stomp.passcode:guest}")
    private String rabbitPasscode;

    @PostConstruct
    public void logBrokerMode() {
        if (rabbitHost.isBlank()) {
            boolean isDev = Arrays.asList(environment.getActiveProfiles()).contains("dev");
            if (!isDev) {
                log.warn("[WebSocket] Using in-memory SimpleBroker — RABBITMQ_HOST not set. " +
                         "With HPA minReplicas>1, subscribers on Pod A will NOT receive messages " +
                         "published on Pod B. Set RABBITMQ_HOST to enable the STOMP broker relay.");
            } else {
                log.info("[WebSocket] SimpleBroker active (dev mode)");
            }
        } else {
            log.info("[WebSocket] StompBrokerRelay active → {}:{}", rabbitHost, rabbitPort);
        }
    }

    // ─── Endpoints ────────────────────────────────────────────────────────────

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Web: SockJS fallback for browsers
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                        "https://nexthouse.app",
                        "https://www.nexthouse.app",
                        "http://localhost:3000",
                        "http://localhost:3001",
                        "http://localhost:8080"
                )
                .withSockJS();

        // Mobile: raw WebSocket — React Native does not support SockJS
        registry.addEndpoint("/ws-native")
                .setAllowedOriginPatterns("*");
    }

    // ─── Broker ───────────────────────────────────────────────────────────────

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");

        if (!rabbitHost.isBlank()) {
            // Production: relay to RabbitMQ (requires rabbitmq_stomp plugin enabled)
            registry.enableStompBrokerRelay("/topic", "/queue")
                    .setRelayHost(rabbitHost)
                    .setRelayPort(rabbitPort)
                    .setClientLogin(rabbitLogin)
                    .setClientPasscode(rabbitPasscode)
                    .setSystemLogin(rabbitLogin)
                    .setSystemPasscode(rabbitPasscode)
                    .setSystemHeartbeatSendInterval(10_000)
                    .setSystemHeartbeatReceiveInterval(10_000);
        } else {
            // Dev / single-node: in-memory broker
            registry.enableSimpleBroker("/topic", "/queue");
        }
    }

    // ─── JWT channel interceptor ──────────────────────────────────────────────

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new JwtChannelInterceptor(jwtTokenProvider));
    }

    @RequiredArgsConstructor
    static class JwtChannelInterceptor implements ChannelInterceptor {

        private final JwtTokenProvider jwtTokenProvider;

        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            StompHeaderAccessor accessor =
                    MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

            if (accessor == null) return message;

            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String token = extractToken(accessor);

                if (token != null && jwtTokenProvider.isValid(token)) {
                    Long   userId = jwtTokenProvider.extractUserId(token);
                    String role   = jwtTokenProvider.extractRole(token);

                    accessor.setUser(new UsernamePasswordAuthenticationToken(
                            userId.toString(), null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role))));

                    log.debug("[WS] CONNECT authenticated: userId={}", userId);
                } else {
                    log.warn("[WS] CONNECT rejected — invalid or missing token");
                    return null;
                }
            }
            return message;
        }

        private String extractToken(StompHeaderAccessor accessor) {
            String auth = accessor.getFirstNativeHeader("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) return auth.substring(7);
            return null;
        }
    }
}