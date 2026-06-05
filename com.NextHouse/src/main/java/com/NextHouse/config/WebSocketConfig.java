package com.NextHouse.config;

import com.NextHouse.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
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
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;

/**
 * WebSocketConfig
 * <p>
 * Configures STOMP over WebSocket for real-time features:
 * - Chat messaging
 * - Typing indicators
 * - Presence (online/offline)
 * - Notifications
 * - Live activity updates
 * <p>
 * Connection flow:
 * 1. Client connects to ws://host/ws?token={jwt}  (or sets Authorization header).
 * 2. JwtChannelInterceptor validates the JWT on CONNECT frame.
 * 3. Sets the UsernamePasswordAuthenticationToken as the session principal.
 * 4. Spring Security principal is now available in all @MessageMapping handlers.
 * <p>
 * Destination prefixes:
 * /app/{path}            → @MessageMapping handlers (client sends TO server)
 * /topic/{path}          → Broadcast (server sends TO all subscribers)
 * /user/{userId}/queue/{path} → Unicast (server sends TO specific user)
 * <p>
 * Client subscriptions:
 * /user/queue/notifications     → personal notification bell
 * /user/queue/presence          → followers' presence changes
 * /topic/rooms/{roomId}/messages → group/direct chat
 * /topic/rooms/{roomId}/typing  → typing indicators
 * /topic/presence/{userId}      → specific user's online status
 * <p>
 * In-memory broker:
 * Currently using Spring's in-memory broker (SimpleBroker).
 * For production scale (multi-node): switch to a full message broker:
 *
 * @Override public void configureMessageBroker(MessageBrokerRegistry registry) {
 * registry.enableStompBrokerRelay("/topic", "/queue")
 * .setRelayHost("rabbitmq-host")
 * .setRelayPort(61613)
 * .setClientLogin("guest")
 * .setClientPasscode("guest");
 * }
 * <p>
 * This enables WebSocket state to survive server restarts and work across
 * multiple pods (horizontal scaling).
 * <p>
 * Maven dependency:
 * <dependency>
 * <groupId>org.springframework.boot</groupId>
 * <artifactId>spring-boot-starter-websocket</artifactId>
 * </dependency>
 */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;

    // ─── Endpoint registration ────────────────────────────────────────────────

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                        "https://nexthouse.app",
                        "https://www.nexthouse.app",
                        "http://localhost:3000",
                        "http://localhost:3001",
                        "http://localhost:8080"
                )
                .withSockJS();  // SockJS fallback for browsers that don't support WebSocket
    }

    // ─── Message broker ───────────────────────────────────────────────────────

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Client sends messages to destinations prefixed with /app
        registry.setApplicationDestinationPrefixes("/app");

        // Server sends messages to /topic (broadcast) and /queue (unicast)
        registry.enableSimpleBroker("/topic", "/queue");

        // For /user/{userId}/queue/{dest} routing — must match SimpMessagingTemplate usage
        registry.setUserDestinationPrefix("/user");
    }

    // ─── Channel interceptor (JWT auth on CONNECT) ────────────────────────────

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new JwtChannelInterceptor(jwtTokenProvider));
    }

    // ─── JWT Channel Interceptor ──────────────────────────────────────────────

    /**
     * Validates the JWT on every STOMP CONNECT frame.
     * Sets the Spring Security principal so @MessageMapping methods can inject it.
     * <p>
     * Token location: STOMP header  Authorization: Bearer {token}
     * or query param: ws://host/ws?token={jwt}  (extracted from native headers)
     */
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
                    Long userId = jwtTokenProvider.extractUserId(token);
                    String role = jwtTokenProvider.extractRole(token);

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    userId.toString(),
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
                            );

                    accessor.setUser(auth);
                    log.debug("[WS] CONNECT authenticated: userId={}", userId);
                } else {
                    log.warn("[WS] CONNECT rejected — invalid or missing token");
                    // Return null to refuse the connection
                    return null;
                }
            }

            return message;
        }

        private String extractToken(StompHeaderAccessor accessor) {
            // 1. Authorization header: Bearer {token}
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }

            // 2. token query param (SockJS fallback): ws://host/ws?token={jwt}
            String tokenParam = accessor.getFirstNativeHeader("token");
            if (tokenParam != null && !tokenParam.isBlank()) {
                return tokenParam;
            }

            return null;
        }
    }

    // ─── Session lifecycle events ─────────────────────────────────────────────

    /**
     * These @EventListener methods are defined here for documentation but in practice
     * should live in UserPresenceEventListener (a dedicated @Component) so they can
     * inject UserPresenceService without circular dependencies.
     *
     * @Component
     * class UserPresenceEventListener {
     *     @EventListener
     *     public void handleConnect(SessionConnectedEvent event) {
     *         // Extract userId from event.getUser().getName()
     *         // Call userPresenceService.markOnline(userId, socketId, deviceType)
     *     }
     *
     *     @EventListener
     *     public void handleDisconnect(SessionDisconnectEvent event) {
     *         // Call userPresenceService.markOffline(userId)
     *     }
     * }
     */
}
