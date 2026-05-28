package com.NextHouse.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Central Kafka event publisher.
 *
 * All services publish domain events through this component.
 * Publishing is fire-and-forget with async callback logging.
 *
 * Topics follow the pattern: nexthouse.{domain}.{action}
 * Configure these in application.yml:
 *
 *   spring:
 *     kafka:
 *       bootstrap-servers: localhost:9092
 *       producer:
 *         key-serializer: org.apache.kafka.common.serialization.StringSerializer
 *         value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    // ─── Topic constants ──────────────────────────────────────────────────────

    public static final String TOPIC_USER_REGISTERED       = "nexthouse.user.registered";
    public static final String TOPIC_USER_FOLLOWED         = "nexthouse.user.followed";
    public static final String TOPIC_USER_LOCATION_UPDATED = "nexthouse.user.location-updated";

    public static final String TOPIC_POST_CREATED          = "nexthouse.post.created";
    public static final String TOPIC_POST_LIKED            = "nexthouse.post.liked";
    public static final String TOPIC_POST_COMMENTED        = "nexthouse.post.commented";
    public static final String TOPIC_POST_DELETED          = "nexthouse.post.deleted";

    public static final String TOPIC_ACTIVITY_CREATED      = "nexthouse.activity.created";
    public static final String TOPIC_ACTIVITY_JOIN_REQUEST = "nexthouse.activity.join-request";
    public static final String TOPIC_ACTIVITY_JOIN_APPROVED= "nexthouse.activity.join-approved";

    public static final String TOPIC_COMMUNITY_JOINED      = "nexthouse.community.joined";

    public static final String TOPIC_MESSAGE_SENT          = "nexthouse.chat.message-sent";

    public static final String TOPIC_SAFETY_ALERT_CREATED  = "nexthouse.safety.alert-created";

    // ─── Core publish method ──────────────────────────────────────────────────

    /**
     * Publish an event to a Kafka topic.
     *
     * @param topic  Kafka topic name
     * @param key    Partition key — use entity ID to guarantee ordering
     *               for the same entity (e.g. all events for post 42 → same partition)
     * @param event  the event payload (serialized to JSON)
     */
    public void publish(String topic, String key, Object event) {
        CompletableFuture<SendResult<String, Object>> future =
                kafkaTemplate.send(topic, key, event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("[Kafka] Failed to publish event to topic={} key={} error={}",
                        topic, key, ex.getMessage(), ex);
            } else {
                log.debug("[Kafka] Published event to topic={} key={} partition={} offset={}",
                        topic, key,
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }

    // ─── Domain-specific convenience methods ──────────────────────────────────

    public void publishUserRegistered(DomainEvents.UserRegisteredEvent event) {
        publish(TOPIC_USER_REGISTERED, event.getUserId().toString(), event);
    }

    public void publishUserFollowed(DomainEvents.UserFollowedEvent event) {
        publish(TOPIC_USER_FOLLOWED, event.getFollowedId().toString(), event);
    }

    public void publishPostCreated(DomainEvents.PostCreatedEvent event) {
        publish(TOPIC_POST_CREATED, event.getPostId().toString(), event);
    }

    public void publishPostLiked(DomainEvents.PostLikedEvent event) {
        publish(TOPIC_POST_LIKED, event.getPostId().toString(), event);
    }

    public void publishPostCommented(DomainEvents.PostCommentedEvent event) {
        publish(TOPIC_POST_COMMENTED, event.getPostId().toString(), event);
    }

    public void publishPostDeleted(DomainEvents.PostDeletedEvent event) {
        publish(TOPIC_POST_DELETED, event.getPostId().toString(), event);
    }

    public void publishActivityCreated(DomainEvents.ActivityCreatedEvent event) {
        publish(TOPIC_ACTIVITY_CREATED, event.getActivityId().toString(), event);
    }

    public void publishActivityJoinRequest(DomainEvents.ActivityJoinRequestEvent event) {
        publish(TOPIC_ACTIVITY_JOIN_REQUEST, event.getActivityId().toString(), event);
    }

    public void publishActivityJoinApproved(DomainEvents.ActivityJoinApprovedEvent event) {
        publish(TOPIC_ACTIVITY_JOIN_APPROVED, event.getActivityId().toString(), event);
    }

    public void publishCommunityJoined(DomainEvents.CommunityJoinedEvent event) {
        publish(TOPIC_COMMUNITY_JOINED, event.getCommunityId().toString(), event);
    }

    public void publishMessageSent(DomainEvents.MessageSentEvent event) {
        publish(TOPIC_MESSAGE_SENT, event.getRoomId().toString(), event);
    }

    public void publishSafetyAlertCreated(DomainEvents.SafetyAlertCreatedEvent event) {
        publish(TOPIC_SAFETY_ALERT_CREATED, event.getAlertId().toString(), event);
    }

    // ─── Event builder helpers ────────────────────────────────────────────────

    public static String newEventId() {
        return UUID.randomUUID().toString();
    }
}
