package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "post_likes",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_post_like",
                        columnNames = {"post_id", "liked_by"}
                )
        },
        indexes = {
                @Index(name = "idx_post_like_post", columnList = "post_id"),
                @Index(name = "idx_post_like_liked_by", columnList = "liked_by")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PostLike extends BaseEntity {

    /**
     * LIKE | HEART | HELPFUL | CELEBRATE | CURIOUS — extensible reaction type.
     */
    @Column(name = "reaction_type", nullable = false, length = 20)
    private String reactionType = "LIKE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_post_like_post"))
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "liked_by", nullable = false,
            foreignKey = @ForeignKey(name = "fk_post_like_user"))
    private User likedBy;
}
