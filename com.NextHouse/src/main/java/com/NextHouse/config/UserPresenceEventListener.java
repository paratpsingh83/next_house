package com.NextHouse.config;

import com.NextHouse.service.UserPresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

/**
 * Listens for WebSocket CONNECT and DISCONNECT events and updates user presence.
 *
 * Kept separate from WebSocketConfig to avoid circular dependencies between
 * WebSocketConfig → UserPresenceService → repositories.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserPresenceEventListener {

    private final UserPresenceService userPresenceService;

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) return;

        try {
            Long userId    = Long.parseLong(principal.getName());
            String session = accessor.getSessionId();
            String device  = accessor.getFirstNativeHeader("X-Device-Type");
            userPresenceService.markOnline(userId, session, device != null ? device : "WEB");
            log.debug("[Presence] Session connected: userId={} session={}", userId, session);
        } catch (NumberFormatException e) {
            log.warn("[Presence] Invalid principal on connect: {}", principal.getName());
        }
    }

    @EventListener
    public void handleSessionDisconnected(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) return;

        try {
            Long userId = Long.parseLong(principal.getName());
            userPresenceService.markOffline(userId);
            log.debug("[Presence] Session disconnected: userId={}", userId);
        } catch (NumberFormatException e) {
            log.warn("[Presence] Invalid principal on disconnect: {}", principal.getName());
        }
    }
}