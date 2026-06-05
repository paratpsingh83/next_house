package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.NotificationResponseDTO;
import com.NextHouse.entity.*;
import com.NextHouse.exception.ForbiddenException;
import com.NextHouse.exception.NotFoundException;
import com.NextHouse.mapper.NotificationMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * NotificationServiceImpl
 *
 * Dispatch pipeline for every notification:
 *   1. Persist Notification entity (always — source of truth for in-app bell).
 *   2. WebSocket push: if the target user is online, send via STOMP destination
 *      /user/{userId}/queue/notifications (handled by SimpMessagingTemplate).
 *   3. Push notification: if the user has device tokens AND is not online (or
 *      has push enabled regardless), call FirebasePushService asynchronously.
 *
 * All sendNotification calls are @Async — they must never block the caller
 * thread (e.g. the HTTP request thread that triggered a post-like).
 *
 * @Async requires @EnableAsync on a @Configuration class.
 * The thread pool is configured in AsyncConfig.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository         userRepository;
    private final UserPresenceRepository presenceRepository;
    private final DeviceTokenRepository  deviceTokenRepository;
    private final NotificationMapper     notificationMapper;

    // STOMP broker relay — sends to a specific user's queue
    private final SimpMessagingTemplate messagingTemplate;

    // FCM push notification service (see FirebasePushService)
    private final FirebasePushService   firebasePushService;

    // ─── Query methods ────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<NotificationResponseDTO> getNotifications(
            Long currentUserId, boolean unreadOnly, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notifications =
                notificationRepository.findByReceiverId(currentUserId, unreadOnly, pageable);
        return PageResponseDTO.of(notifications.map(notificationMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long currentUserId) {
        return notificationRepository
                .countByReceiverIdAndReadFalseAndIsDeletedFalse(currentUserId);
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId, Long currentUserId) {
        int rows = notificationRepository.markAsRead(notificationId, currentUserId);
        if (rows == 0) {
            throw new NotFoundException("Notification not found or does not belong to you");
        }
    }

    @Override
    @Transactional
    public void markAllAsRead(Long currentUserId) {
        notificationRepository.markAllAsRead(currentUserId);
    }

    @Override
    @Transactional
    public void deleteNotification(Long notificationId, Long currentUserId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification not found"));
        if (!notification.getReceiver().getId().equals(currentUserId)) {
            throw new ForbiddenException("Not your notification");
        }
        notification.setIsDeleted(true);
        notificationRepository.save(notification);
    }

    // ─── Core dispatch ────────────────────────────────────────────────────────

    /**
     * Persist + dispatch a notification to the target user.
     * Marked @Async so it never blocks the calling request thread.
     *
     * Flow:
     *  1. Persist to DB (source of truth).
     *  2. Try WebSocket push (fire-and-forget, user may not be connected).
     *  3. If user offline or push always enabled → FCM push notification.
     */
    @Override
    @Async("notificationExecutor")
    @Transactional
    public void sendNotification(Long receiverId, Long senderId, String type,
                                 String title, String message,
                                 String referenceType, Long referenceId,
                                 String redirectUrl) {

        User receiver = userRepository.findById(receiverId).orElse(null);
        if (receiver == null || receiver.getIsDeleted()) {
            log.warn("[Notification] Receiver not found: {}", receiverId);
            return;
        }

        User sender = senderId != null
                ? userRepository.findById(senderId).orElse(null)
                : null;

        // 1. Persist
        Notification notification = Notification.builder()
                .receiver(receiver)
                .sender(sender)
                .notificationType(type)
                .title(title)
                .message(message)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .redirectUrl(redirectUrl)
                .read(false)
                .pushSent(false)
                .websocketSent(false)
                .build();
        Notification saved = notificationRepository.save(notification);

        // 2. WebSocket push (STOMP) — delivered only if user is connected
        try {
            NotificationResponseDTO dto = notificationMapper.toResponse(saved);
            messagingTemplate.convertAndSendToUser(
                    receiverId.toString(),
                    "/queue/notifications",
                    dto
            );
            notificationRepository.markPushSent(saved.getId()); // reuse flag for websocket
            log.debug("[Notification] WebSocket delivered notificationId={} to userId={}",
                    saved.getId(), receiverId);
        } catch (Exception e) {
            log.warn("[Notification] WebSocket delivery failed for userId={}: {}", receiverId, e.getMessage());
        }

        // 3. FCM push — for offline users or users with push always enabled
        boolean isOnline = presenceRepository.findByUserId(receiverId)
                .map(p -> Boolean.TRUE.equals(p.getOnline()))
                .orElse(false);

        List<DeviceToken> tokens = deviceTokenRepository.findByUserIdAndIsDeletedFalse(receiverId);
        if (!tokens.isEmpty() && (!isOnline)) {
            try {
                firebasePushService.sendPush(tokens, title, message, referenceType, referenceId);
                notificationRepository.markPushSent(saved.getId());
                log.debug("[Notification] FCM push sent for notificationId={}", saved.getId());
            } catch (Exception e) {
                log.error("[Notification] FCM push failed for userId={}: {}", receiverId, e.getMessage());
            }
        }
    }

    // ─── Domain-specific convenience methods ──────────────────────────────────

    @Override
    public void notifyFollow(User follower, User followed) {
        sendNotification(
            followed.getId(), follower.getId(),
            "FOLLOW",
            follower.getName() + " started following you",
            "@" + follower.getUsername() + " is now following you",
            "USER", follower.getId(),
            "/profile/" + follower.getId()
        );
    }

    @Override
    public void notifyPostLike(User liker, Long postId, Long postOwnerId) {
        sendNotification(
            postOwnerId, liker.getId(),
            "LIKE",
            liker.getName() + " reacted to your post",
            "@" + liker.getUsername() + " liked your post",
            "POST", postId,
            "/posts/" + postId
        );
    }

    @Override
    public void notifyComment(User commenter, Long postId, Long postOwnerId) {
        sendNotification(
            postOwnerId, commenter.getId(),
            "COMMENT",
            commenter.getName() + " commented on your post",
            "@" + commenter.getUsername() + " left a comment",
            "POST", postId,
            "/posts/" + postId
        );
    }

    @Override
    public void notifyActivityJoin(User joiner, Long activityId, Long hostId) {
        sendNotification(
            hostId, joiner.getId(),
            "ACTIVITY_JOIN_REQUEST",
            joiner.getName() + " wants to join your activity",
            "@" + joiner.getUsername() + " has requested to join",
            "ACTIVITY", activityId,
            "/activities/" + activityId + "/members"
        );
    }

    @Override
    public void notifyActivityApproval(Long userId, Long activityId, boolean approved) {
        String status = approved ? "approved" : "declined";
        sendNotification(
            userId, null,
            approved ? "ACTIVITY_APPROVED" : "ACTIVITY_REJECTED",
            "Your join request was " + status,
            "Your request to join the activity was " + status,
            "ACTIVITY", activityId,
            "/activities/" + activityId
        );
    }

    @Override
    public void notifyCommunityJoin(User joiner, Long communityId, Long adminId) {
        sendNotification(
            adminId, joiner.getId(),
            "COMMUNITY_JOIN_REQUEST",
            joiner.getName() + " wants to join your community",
            "@" + joiner.getUsername() + " has requested to join",
            "COMMUNITY", communityId,
            "/communities/" + communityId + "/members"
        );
    }
}
