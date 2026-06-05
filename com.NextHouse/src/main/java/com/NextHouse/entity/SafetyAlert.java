package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "safety_alerts",
        indexes = {
                @Index(name = "idx_safety_neighborhood", columnList = "neighborhood_id"),
                @Index(name = "idx_safety_severity", columnList = "severity"),
                @Index(name = "idx_safety_emergency", columnList = "emergency"),
                @Index(name = "idx_safety_reporter", columnList = "reported_by")
                // GiST index on location added via migration.
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SafetyAlert extends CommunityScopedEntity {

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * CRIME | FIRE | FLOOD | ANIMAL | LOST_PERSON | ACCIDENT | OTHER
     */
    @Column(name = "alert_type", length = 50)
    private String alertType;

    /**
     * LOW | MEDIUM | HIGH | CRITICAL
     */
    @Column(name = "severity", nullable = false, length = 20)
    private String severity;

    @Builder.Default
    @Column(name = "emergency", nullable = false)
    private Boolean emergency = false;

    @Builder.Default
    @Column(name = "verified", nullable = false)
    private Boolean verified = false;

    @Column(name = "resolved_at")
    private java.time.LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by", nullable = false,
            foreignKey = @ForeignKey(name = "fk_safety_alert_reporter"))
    private User reportedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by",
            foreignKey = @ForeignKey(name = "fk_safety_alert_resolver"))
    private User resolvedBy;
}
