package com.NextHouse.event;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Domain events published to Kafka topics.
 *
 * Topic naming convention: nexthouse.{domain}.{action}
 *   e.g. nexthouse.post.created
 *        nexthouse.user.followed
 *        nexthouse.activity.joined
 *
 * Consumers (notification-service, analytics-service, recommendation-service,
 * feed-service) subscribe to relevant topics and react asynchronously.
 *
 * All events carry:
 *  - eventId    — idempotency key (UUID string)
 *  - occurredAt — when the event happened
 *  - actorId    — who triggered it
 */
public class DomainEvents {

    // ─── Base ─────────────────────────────────────────────────────────────────

    @Getter
    @SuperBuilder
    @NoArgsConstructor
    @AllArgsConstructor
    public static abstract class BaseEvent {
        private String        eventId;
        private LocalDateTime occurredAt;
        private Long          actorId;
    }

    // ─── User events ──────────────────────────────────────────────────────────

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class UserRegisteredEvent extends BaseEvent {
        private Long   userId;
        private String username;
        private Double latitude;
        private Double longitude;
    }

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class UserFollowedEvent extends BaseEvent {
        private Long followerId;
        private Long followedId;
    }

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class UserLocationUpdatedEvent extends BaseEvent {
        private Long   userId;
        private Double latitude;
        private Double longitude;
    }

    // ─── Post events ──────────────────────────────────────────────────────────

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class PostCreatedEvent extends BaseEvent {
        private Long   postId;
        private Long   authorId;
        private Long   neighborhoodId;
        private Long   communityId;
        private String postType;
        private Double latitude;
        private Double longitude;
    }

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class PostLikedEvent extends BaseEvent {
        private Long   postId;
        private Long   postOwnerId;
        private Long   likerId;
        private String reactionType;
    }

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class PostCommentedEvent extends BaseEvent {
        private Long postId;
        private Long postOwnerId;
        private Long commentId;
        private Long commenterId;
        private Long parentCommentId; // null = top-level
    }

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class PostDeletedEvent extends BaseEvent {
        private Long postId;
        private Long authorId;
    }

    // ─── Activity events ──────────────────────────────────────────────────────

    @Getter @SuperBuilder
    @NoArgsConstructor @AllArgsConstructor
    public static class ActivityCreatedEvent extends BaseEvent {
        private Long   activityId;
        private Long   hostId;
        private Long   neighborhoodId;
        private Long   communityId;
        private String activityType;
        private Double latitude;
        private Double longitude;
    }

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class ActivityJoinRequestEvent extends BaseEvent {
        private Long    activityId;
        private Long    hostId;
        private Long    requesterId;
        private boolean approvalRequired;
    }

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class ActivityJoinApprovedEvent extends BaseEvent {
        private Long    activityId;
        private Long    userId;
        private boolean approved;
    }

    // ─── Community events ─────────────────────────────────────────────────────

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class CommunityJoinedEvent extends BaseEvent {
        private Long communityId;
        private Long userId;
        private Long adminId;
    }

    // ─── Chat events ──────────────────────────────────────────────────────────

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class MessageSentEvent extends BaseEvent {
        private Long   roomId;
        private Long   messageId;
        private Long   senderId;
        private String messageType;
        private String preview; // first 80 chars for inbox
    }

    // ─── Safety events ────────────────────────────────────────────────────────

    @Getter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
    public static class SafetyAlertCreatedEvent extends BaseEvent {
        private Long    alertId;
        private Long    neighborhoodId;
        private String  severity;
        private Boolean emergency;
        private Double  latitude;
        private Double  longitude;
    }
}
