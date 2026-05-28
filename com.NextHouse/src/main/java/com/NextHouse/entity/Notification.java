package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notification_receiver", columnList = "receiver_id"),
                @Index(name = "idx_notification_receiver_read", columnList = "receiver_id, is_read"),
                @Index(name = "idx_notification_created", columnList = "created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Notification extends BaseEntity {

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    /**
     * LIKE | COMMENT | FOLLOW | ACTIVITY_INVITE | COMMUNITY_JOIN | SAFETY_ALERT | SYSTEM
     */
    @Column(name = "notification_type", nullable = false, length = 50)
    private String notificationType;

    /**
     * Type of the referenced entity: POST | ACTIVITY | COMMENT | USER | COMMUNITY
     */
    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "is_read", nullable = false)
    private Boolean read = false;

    @Column(name = "push_sent", nullable = false)
    private Boolean pushSent = false;

    @Column(name = "websocket_sent", nullable = false)
    private Boolean websocketSent = false;

    @Column(name = "redirect_url", length = 500)
    private String redirectUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_notification_receiver"))
    private User receiver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id",
            foreignKey = @ForeignKey(name = "fk_notification_sender"))
    private User sender;
}
