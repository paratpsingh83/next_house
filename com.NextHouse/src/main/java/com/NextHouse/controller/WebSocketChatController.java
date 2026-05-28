package com.NextHouse.controller;

import com.NextHouse.dto.request.SendMessageRequestDTO;
import com.NextHouse.dto.response.ChatMessageResponseDTO;
import com.NextHouse.service.ChatService;
import com.NextHouse.service.UserPresenceService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

/**
 * WebSocketChatController
 *
 * STOMP @MessageMapping handlers — processes messages FROM the client.
 *
 * NOT a @RestController — does not appear in Swagger (annotated @Hidden).
 *
 * Client sends to:      /app/{destination}
 * Server broadcasts to: /topic/rooms/{roomId}/messages
 * Server sends user to: /user/{userId}/queue/notifications
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WebSocket protocol flow:
 *
 * 1. CONNECT:
 *    ws://host/ws?token={jwt}
 *    → JwtChannelInterceptor validates token, sets Principal = userId
 *
 * 2. SUBSCRIBE (client):
 *    /topic/rooms/{roomId}/messages     — receive room messages
 *    /topic/rooms/{roomId}/typing       — receive typing indicators
 *    /user/queue/notifications          — receive personal notifications
 *    /topic/presence/{userId}           — receive presence changes
 *
 * 3. SEND (client → server):
 *    /app/chat/rooms/{roomId}/send      — send a chat message
 *    /app/chat/rooms/{roomId}/typing    — broadcast typing indicator
 *    /app/presence/heartbeat            — refresh online status
 *
 * 4. DISCONNECT:
 *    → SessionDisconnectEvent → UserPresenceService.markOffline()
 * ──────────────────────────────────────────────────────────────────────────
 */
@Slf4j
@Hidden
@Controller
@RequiredArgsConstructor
public class WebSocketChatController {

    private final ChatService            chatService;
    private final UserPresenceService    userPresenceService;
    private final SimpMessagingTemplate  messagingTemplate;

    // ─── Send a chat message ──────────────────────────────────────────────────

    /**
     * Client sends to: /app/chat/rooms/{roomId}/send
     * Server broadcasts to: /topic/rooms/{roomId}/messages
     *
     * Flow:
     *   1. Persist the message via ChatService.sendMessage().
     *   2. Broadcast the saved message DTO to all room subscribers.
     *   3. Kafka event publishes push notification for offline members.
     */
    @MessageMapping("/chat/rooms/{roomId}/send")
    public void sendMessage(
            @DestinationVariable Long roomId,
            @Payload SendMessageRequestDTO dto,
            Principal principal) {

        Long senderId = extractUserId(principal);
        if (senderId == null) return;

        try {
            ChatMessageResponseDTO message = chatService.sendMessage(roomId, senderId, dto);
            // Broadcast to all room subscribers
            messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/messages", message);
            log.debug("[WS] Message sent: roomId={} senderId={}", roomId, senderId);
        } catch (Exception e) {
            log.error("[WS] Message send failed: roomId={} senderId={} error={}", roomId, senderId, e.getMessage());
            // Send error back to sender only
            messagingTemplate.convertAndSendToUser(
                senderId.toString(),
                "/queue/errors",
                Map.of("error", "MESSAGE_SEND_FAILED", "message", e.getMessage())
            );
        }
    }

    // ─── Typing indicator ─────────────────────────────────────────────────────

    /**
     * Client sends to: /app/chat/rooms/{roomId}/typing
     * Payload: { "typing": true|false }
     * Server broadcasts to: /topic/rooms/{roomId}/typing
     *
     * NOT persisted — ephemeral real-time signal.
     */
    @MessageMapping("/chat/rooms/{roomId}/typing")
    public void sendTypingIndicator(
            @DestinationVariable Long roomId,
            @Payload Map<String, Boolean> payload,
            Principal principal) {

        Long userId = extractUserId(principal);
        if (userId == null) return;

        boolean isTyping = Boolean.TRUE.equals(payload.get("typing"));
        userPresenceService.broadcastTyping(roomId, userId, isTyping);
    }

    // ─── Presence heartbeat ───────────────────────────────────────────────────

    /**
     * Client sends to: /app/presence/heartbeat  (every 60 seconds)
     * Refreshes the Redis TTL for the user's presence key.
     * No broadcast — server-side operation only.
     */
    @MessageMapping("/presence/heartbeat")
    public void heartbeat(Principal principal) {
        Long userId = extractUserId(principal);
        if (userId != null) {
            userPresenceService.heartbeat(userId);
        }
    }

    // ─── Mark room as read ────────────────────────────────────────────────────

    /**
     * Client sends to: /app/chat/rooms/{roomId}/read
     * Updates lastReadAt — resets unread count to 0.
     */
    @MessageMapping("/chat/rooms/{roomId}/read")
    public void markRoomAsRead(
            @DestinationVariable Long roomId,
            Principal principal) {
        Long userId = extractUserId(principal);
        if (userId != null) {
            chatService.markRoomAsRead(roomId, userId);
        }
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    /**
     * Extracts userId from the STOMP session principal.
     * Principal.getName() returns userId.toString() as set by JwtChannelInterceptor.
     */
    private Long extractUserId(Principal principal) {
        if (principal == null) return null;
        try {
            return Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            log.warn("[WS] Invalid principal name: {}", principal.getName());
            return null;
        }
    }
}
