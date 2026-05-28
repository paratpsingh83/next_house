package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "recommendation_scores",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_rec_score",
                        columnNames = {"user_id", "entity_type", "entity_id"}
                )
        },
        indexes = {
                @Index(name = "idx_rec_score_user", columnList = "user_id"),
                @Index(name = "idx_rec_score_user_type", columnList = "user_id, entity_type"),
                @Index(name = "idx_rec_score_user_score", columnList = "user_id, score DESC")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RecommendationScore extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_rec_score_user"))
    private User user;

    /**
     * POST | ACTIVITY | COMMUNITY | USER
     */
    @Column(name = "entity_type", nullable = false, length = 30)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "score", nullable = false)
    private Double score;

    @Column(name = "computed_at")
    private LocalDateTime computedAt;

    @Column(name = "score_version", length = 20)
    private String scoreVersion;
}
