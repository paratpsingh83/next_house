package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "reports",
        indexes = {
                @Index(name = "idx_report_entity", columnList = "entity_type, entity_id"),
                @Index(name = "idx_report_reported_by", columnList = "reported_by"),
                @Index(name = "idx_report_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Report extends BaseEntity {

    /**
     * POST | COMMENT | USER | ACTIVITY | MARKETPLACE | COMMUNITY
     */
    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    /**
     * SPAM | HARASSMENT | INAPPROPRIATE | MISINFORMATION | SAFETY_RISK | OTHER
     */
    @Column(name = "reason", nullable = false, length = 50)
    private String reason;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * PENDING | REVIEWED | DISMISSED | ACTION_TAKEN
     */
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by", nullable = false,
            foreignKey = @ForeignKey(name = "fk_report_reporter"))
    private User reportedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by",
            foreignKey = @ForeignKey(name = "fk_report_reviewer"))
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "resolved_note", columnDefinition = "TEXT")
    private String resolvedNote;
}
