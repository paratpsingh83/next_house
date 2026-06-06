package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.NotificationResponseDTO;
import com.NextHouse.entity.User;

public interface NotificationService {

    PageResponseDTO<NotificationResponseDTO> getNotifications(Long currentUserId, boolean unreadOnly, int page, int size);

    long getUnreadCount(Long currentUserId);

    void markAsRead(Long notificationId, Long currentUserId);

    void markAllAsRead(Long currentUserId);

    void deleteNotification(Long notificationId, Long currentUserId);

    // Internal: called by other services to create + dispatch notifications
    void sendNotification(Long receiverId, Long senderId, String type,
                          String title, String message,
                          String referenceType, Long referenceId,
                          String redirectUrl);

    // Convenience methods used by event listeners
    void notifyFollow(User follower, User followed);

    void notifyFollowRequest(User requester, User target);

    void notifyFollowRequestAccepted(User acceptor, User requester);

    void notifyPostLike(User liker, Long postId, Long postOwnerId);

    void notifyComment(User commenter, Long postId, Long postOwnerId);

    void notifyActivityJoin(User joiner, Long activityId, Long hostId);

    void notifyActivityApproval(Long userId, Long activityId, boolean approved);

    void notifyCommunityJoin(User joiner, Long communityId, Long adminId);
}
