package com.NextHouse.service;

import com.NextHouse.entity.UserPresence;

import java.util.List;
import java.util.Map;

public interface UserPresenceService {

    /** Called by WebSocket CONNECT handler. */
    void markOnline(Long userId, String socketId, String deviceType);

    /** Called by WebSocket DISCONNECT handler. */
    void markOffline(Long userId);

    /** Heartbeat from client to refresh lastSeen (every 60 s via WebSocket ping). */
    void heartbeat(Long userId);

    /** Get presence for a single user. */
    UserPresence getPresence(Long userId);

    /**
     * Batch presence lookup — used in chat member list, activity member list.
     * Returns a map of userId → isOnline for fast O(1) lookups.
     */
    Map<Long, Boolean> getBatchPresence(List<Long> userIds);

    /** Push a typing indicator event to all room members via WebSocket. */
    void broadcastTyping(Long roomId, Long userId, boolean isTyping);
}
