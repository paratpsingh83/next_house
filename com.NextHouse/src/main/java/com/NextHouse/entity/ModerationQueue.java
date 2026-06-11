package com.NextHouse.entity;

import com.NextHouse.constant.ModerationStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "moderation_queue",
        indexes = {
                @Index(name = "idx_mod_status", columnList = "status"),
                @Index(name = "idx_mod_entity", columnList = "content_type, content_id"),
                @Index(name = "idx_mod_reviewed_by", columnList = "reviewed_by")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ModerationQueue extends BaseEntity {

    /**
     * POST | COMMENT | MARKETPLACE | ACTIVITY | CHAT | USER
     */
    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "content_id", nullable = false)
    private Long contentId;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ModerationStatus status = ModerationStatus.PENDING;

    @Column(name = "reason", length = 200)
    private String reason;

    /**
     * AI confidence score (0.0–1.0). Null if flagged by a user manually.
     */
    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "ai_response", columnDefinition = "TEXT")
    private String aiResponse;

    @Builder.Default
    @Column(name = "auto_blocked", nullable = false)
    private Boolean autoBlocked = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by",
            foreignKey = @ForeignKey(name = "fk_mod_reviewed_by"))
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by",
            foreignKey = @ForeignKey(name = "fk_mod_reported_by"))
    private User reportedBy;
}
