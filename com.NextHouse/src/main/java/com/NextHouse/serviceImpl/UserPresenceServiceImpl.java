package com.NextHouse.serviceImpl;

import com.NextHouse.entity.UserPresence;
import com.NextHouse.exception.NotFoundException;
import com.NextHouse.repository.UserPresenceRepository;
import com.NextHouse.repository.UserRepository;
import com.NextHouse.service.UserPresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * UserPresenceServiceImpl
 *
 * Dual-layer presence:
 *
 * Layer 1 — Redis (source of truth for real-time):
 *   Key format: "presence:{userId}"
 *   Value: "online" | "offline"
 *   TTL: 90 seconds, refreshed on every heartbeat (client pings every 60 s).
 *   Auto-expires if client disconnects without sending a DISCONNECT frame
 *   (handles network drops, server restarts).
 *
 * Layer 2 — PostgreSQL (persistence for "last seen"):
 *   Updated on markOnline() / markOffline().
 *   Used by the scheduled job (ScheduledJobs.markStaleUsersOffline) to
 *   sync the DB when Redis TTL has already cleared a stale entry.
 *
 * WebSocket typing indicators:
 *   Typed via STOMP destination /topic/rooms/{roomId}/typing.
 *   NOT persisted in DB — ephemeral signal only.
 *
 * Batch presence (getBatchPresence):
 *   Uses Redis MGET for O(1) per user lookup regardless of batch size.
 *   This avoids N round-trips to the DB for chat member presence display.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserPresenceServiceImpl implements UserPresenceService {

    private static final String REDIS_PRESENCE_PREFIX = "presence:";
    private static final long   PRESENCE_TTL_SECONDS  = 90L; // expire if no heartbeat in 90 s

    private final UserPresenceRepository presenceRepository;
    private final UserRepository         userRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate  messagingTemplate;

    // ─── Online / offline ─────────────────────────────────────────────────────

    /**
     * Called by WebSocket CONNECT handler (SessionConnectedEvent listener).
     * Marks the user online in both Redis and PostgreSQL.
     */
    @Override
    @Transactional
    public void markOnline(Long userId, String socketId, String deviceType) {
        // Redis: set with TTL (auto-expires if no heartbeat)
        String key = presenceKey(userId);
        redisTemplate.opsForValue().set(key, "online", Duration.ofSeconds(PRESENCE_TTL_SECONDS));

        // PostgreSQL: upsert presence record
        presenceRepository.findByUserId(userId).ifPresentOrElse(
            presence -> {
                presence.setOnline(true);
                presence.setSocketId(socketId);
                presence.setCurrentDeviceType(deviceType);
                presence.setLastSeen(LocalDateTime.now());
                presenceRepository.save(presence);
            },
            () -> {
                // Create if first login
                userRepository.findById(userId).ifPresent(user -> {
                    UserPresence presence = UserPresence.builder()
                            .user(user)
                            .online(true)
                            .socketId(socketId)
                            .currentDeviceType(deviceType)
                            .lastSeen(LocalDateTime.now())
                            .build();
                    presenceRepository.save(presence);
                });
            }
        );

        // Broadcast presence change to followers (optional — only if you have a follower-presence feed)
        broadcastPresenceChange(userId, true);
        log.debug("[Presence] userId={} online socketId={}", userId, socketId);
    }

    /**
     * Called by WebSocket DISCONNECT handler (SessionDisconnectEvent listener).
     */
    @Override
    @Transactional
    public void markOffline(Long userId) {
        // Remove from Redis immediately
        redisTemplate.delete(presenceKey(userId));

        // Update PostgreSQL
        presenceRepository.updatePresence(userId, false, LocalDateTime.now(), null);

        broadcastPresenceChange(userId, false);
        log.debug("[Presence] userId={} offline", userId);
    }

    /**
     * Client sends a heartbeat ping every 60 seconds via WebSocket.
     * This refreshes the Redis TTL — preventing premature expiry.
     */
    @Override
    public void heartbeat(Long userId) {
        String key = presenceKey(userId);
        // Only refresh if key exists (user is supposed to be online)
        Boolean exists = redisTemplate.hasKey(key);
        if (Boolean.TRUE.equals(exists)) {
            redisTemplate.expire(key, Duration.ofSeconds(PRESENCE_TTL_SECONDS));
            // Update lastSeen in DB asynchronously via @Modifying query (no entity load)
            presenceRepository.updatePresence(userId, true, LocalDateTime.now(), null);
        }
    }

    // ─── Query ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public UserPresence getPresence(Long userId) {
        return presenceRepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Presence not found for userId: " + userId));
    }

    /**
     * Batch presence check via Redis MGET — single round-trip for all users.
     * Falls back to DB if Redis key is absent (user was recently online but
     * Redis was flushed / restarted).
     */
    @Override
    public Map<Long, Boolean> getBatchPresence(List<Long> userIds) {
        Map<Long, Boolean> result = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) return result;

        // Build Redis keys
        List<String> keys = userIds.stream()
                .map(this::presenceKey)
                .toList();

        // MGET: returns a list with null for missing keys
        List<Object> values = redisTemplate.opsForValue().multiGet(keys);

        for (int i = 0; i < userIds.size(); i++) {
            Long userId = userIds.get(i);
            Object val  = values != null ? values.get(i) : null;

            if (val != null) {
                // Redis hit
                result.put(userId, "online".equals(val.toString()));
            } else {
                // Redis miss — check DB (user may be offline)
                boolean dbOnline = presenceRepository.findByUserId(userId)
                        .map(p -> Boolean.TRUE.equals(p.getOnline()))
                        .orElse(false);
                result.put(userId, dbOnline);
            }
        }

        return result;
    }

    // ─── Typing indicators ────────────────────────────────────────────────────

    /**
     * Broadcasts a typing indicator to all subscribers of a chat room's STOMP topic.
     * The indicator is NOT persisted — it's a fire-and-forget WebSocket push.
     *
     * Client subscribes to: /topic/rooms/{roomId}/typing
     * Payload: { "userId": 42, "typing": true }
     */
    @Override
    public void broadcastTyping(Long roomId, Long userId, boolean isTyping) {
        Map<String, Object> payload = Map.of(
            "userId",  userId,
            "typing",  isTyping,
            "timestamp", System.currentTimeMillis()
        );
        messagingTemplate.convertAndSend(
            "/topic/rooms/" + roomId + "/typing",
            payload
        );
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private String presenceKey(Long userId) {
        return REDIS_PRESENCE_PREFIX + userId;
    }

    /**
     * Broadcasts an online/offline status change to the user's followers
     * so their UI can update the presence indicator without polling.
     *
     * STOMP destination: /user/{followerId}/queue/presence
     * Payload: { "userId": 42, "online": true }
     *
     * In production: fetch follower IDs from Redis (cached follow list)
     * rather than querying the DB on every connect/disconnect event.
     */
    private void broadcastPresenceChange(Long userId, boolean online) {
        Map<String, Object> payload = Map.of("userId", userId, "online", online);
        // Broadcast to the user's own presence topic — followers subscribe to this
        messagingTemplate.convertAndSend("/topic/presence/" + userId, payload);
    }
}
