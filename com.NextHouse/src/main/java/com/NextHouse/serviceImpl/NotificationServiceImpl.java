package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.NotificationPreferenceDTO;
import com.NextHouse.dto.response.NotificationResponseDTO;
import com.NextHouse.entity.*;
import com.NextHouse.exception.ForbiddenException;
import com.NextHouse.exception.NotFoundException;
import com.NextHouse.mapper.NotificationMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
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

    private final NotificationRepository           notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository                   userRepository;
    private final UserPresenceRepository           presenceRepository;
    private final DeviceTokenRepository            deviceTokenRepository;
    private final NotificationMapper               notificationMapper;

    // STOMP broker relay — sends to a specific user's queue
    private final SimpMessagingTemplate messagingTemplate;

    // FCM push notification service (see FirebasePushService)
    private final FirebasePushService   firebasePushService;

    // Self-reference via proxy so that @Async on sendNotification is not bypassed
    // when convenience methods (notifyFollow, notifyBorrowResponse, etc.) call it.
    @Lazy @Autowired
    private NotificationService self;

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

        // Check user's notification preferences — skip if muted
        if (isMuted(receiverId, type)) {
            log.debug("[Notification] Muted by prefs: userId={} type={}", receiverId, type);
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
        self.sendNotification(
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
        self.sendNotification(
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
        self.sendNotification(
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
        self.sendNotification(
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
        self.sendNotification(
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
        self.sendNotification(
            adminId, joiner.getId(),
            "COMMUNITY_JOIN_REQUEST",
            joiner.getName() + " wants to join your community",
            "@" + joiner.getUsername() + " has requested to join",
            "COMMUNITY", communityId,
            "/communities/" + communityId + "/members"
        );
    }

    @Override
    public void notifyFollowRequest(User requester, User target) {
        self.sendNotification(
            target.getId(), requester.getId(),
            "FOLLOW_REQUEST",
            requester.getName() + " wants to follow you",
            "@" + requester.getUsername() + " sent you a follow request",
            "USER", requester.getId(),
            "/profile/" + requester.getId()
        );
    }

    @Override
    public void notifyFollowRequestAccepted(User acceptor, User requester) {
        self.sendNotification(
            requester.getId(), acceptor.getId(),
            "FOLLOW_REQUEST_ACCEPTED",
            acceptor.getName() + " accepted your follow request",
            "@" + acceptor.getUsername() + " accepted your follow request",
            "USER", acceptor.getId(),
            "/profile/" + acceptor.getId()
        );
    }

    @Override
    public void notifyActivityReminder(Long userId, Long activityId, String activityTitle) {
        self.sendNotification(
            userId, null,
            "ACTIVITY_REMINDER",
            "Activity starting soon",
            activityTitle + " starts in about 1 hour",
            "ACTIVITY", activityId,
            "/activities/" + activityId
        );
    }

    @Override
    public void notifyBorrowResponse(User responder, Long requestId, String requestTitle, Long requesterId) {
        self.sendNotification(
            requesterId,
            responder.getId(),
            "BORROW_RESPONSE",
            responder.getName() + " can help!",
            responder.getName() + " offered to help with your request: \"" + requestTitle + "\"",
            "BORROW_REQUEST", requestId,
            "/borrow"
        );
    }

    // ─── Notification Preferences ─────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public NotificationPreferenceDTO getPreferences(Long userId) {
        NotificationPreference prefs = preferenceRepository.findByUserId(userId)
                .orElseGet(() -> NotificationPreference.builder()
                        .user(userRepository.findById(userId)
                                .orElseThrow(() -> new NotFoundException("User not found")))
                        .build());
        return toDTO(prefs);
    }

    @Override
    @Transactional
    public NotificationPreferenceDTO updatePreferences(Long userId, NotificationPreferenceDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        NotificationPreference prefs = preferenceRepository.findByUserId(userId)
                .orElse(NotificationPreference.builder().user(user).build());
        prefs.setLikes(dto.isLikes());
        prefs.setComments(dto.isComments());
        prefs.setFollows(dto.isFollows());
        prefs.setFollowRequests(dto.isFollowRequests());
        prefs.setMessages(dto.isMessages());
        prefs.setActivities(dto.isActivities());
        prefs.setMarketplace(dto.isMarketplace());
        prefs.setSafetyAlerts(dto.isSafetyAlerts());
        prefs.setCommunities(dto.isCommunities());
        prefs.setUpdatedAt(java.time.LocalDateTime.now());
        return toDTO(preferenceRepository.save(prefs));
    }

    private boolean isMuted(Long userId, String type) {
        NotificationPreference prefs = preferenceRepository.findByUserId(userId).orElse(null);
        if (prefs == null) return false;
        return switch (type) {
            case "LIKE", "REACTION"                                             -> !prefs.getLikes();
            case "COMMENT", "COMMENT_REPLY"                                     -> !prefs.getComments();
            case "FOLLOW"                                                        -> !prefs.getFollows();
            case "FOLLOW_REQUEST", "FOLLOW_REQUEST_ACCEPTED"                    -> !prefs.getFollowRequests();
            case "MESSAGE"                                                       -> !prefs.getMessages();
            case "ACTIVITY_JOIN_REQUEST", "ACTIVITY_APPROVED", "ACTIVITY_REJECTED", "ACTIVITY_REMINDER" -> !prefs.getActivities();
            case "SAFETY_ALERT"                                                  -> !prefs.getSafetyAlerts();
            case "MARKETPLACE"                                                   -> !prefs.getMarketplace();
            case "COMMUNITY_JOIN_REQUEST", "COMMUNITY_APPROVED", "COMMUNITY_ROLE_CHANGE" -> !prefs.getCommunities();
            default -> false;
        };
    }

    private NotificationPreferenceDTO toDTO(NotificationPreference p) {
        return NotificationPreferenceDTO.builder()
                .likes(p.getLikes()).comments(p.getComments()).follows(p.getFollows())
                .followRequests(p.getFollowRequests()).messages(p.getMessages())
                .activities(p.getActivities()).marketplace(p.getMarketplace())
                .safetyAlerts(p.getSafetyAlerts()).communities(p.getCommunities())
                .build();
    }
}
