package com.NextHouse.config;

import com.NextHouse.repository.FollowRepository;
import com.NextHouse.service.UserPresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * Listens for WebSocket CONNECT and DISCONNECT events, updates user presence,
 * and broadcasts the change to all followers via /topic/presence/{userId}.
 *
 * Kept separate from WebSocketConfig to avoid circular dependency:
 * WebSocketConfig → UserPresenceService → repositories.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserPresenceEventListener {

    private final UserPresenceService   userPresenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final FollowRepository      followRepository;

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
            broadcastPresence(userId, true);
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
            broadcastPresence(userId, false);
            log.debug("[Presence] Session disconnected: userId={}", userId);
        } catch (NumberFormatException e) {
            log.warn("[Presence] Invalid principal on disconnect: {}", principal.getName());
        }
    }

    private void broadcastPresence(Long userId, boolean online) {
        try {
            Map<String, Object> payload = Map.of("userId", userId, "online", online);
            // Public topic — anyone subscribed to this user's presence channel receives it
            messagingTemplate.convertAndSend("/topic/presence/" + userId, payload);

            // Personal queue push to each follower so their contact lists update
            List<Long> followerIds = followRepository.findFollowerIds(userId);
            for (Long followerId : followerIds) {
                messagingTemplate.convertAndSendToUser(
                    followerId.toString(),
                    "/queue/presence",
                    payload
                );
            }
        } catch (Exception e) {
            log.warn("[Presence] Broadcast failed for userId={}: {}", userId, e.getMessage());
        }
    }
}