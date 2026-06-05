package com.NextHouse.entity;

import com.NextHouse.constant.PostStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "posts",
        indexes = {
                @Index(name = "idx_post_created_by", columnList = "created_by"),
                @Index(name = "idx_post_community", columnList = "community_id"),
                @Index(name = "idx_post_neighborhood", columnList = "neighborhood_id"),
                @Index(name = "idx_post_status", columnList = "status"),
                @Index(name = "idx_post_created_at", columnList = "created_at")
                // GiST index on location added via migration for geo-feed queries.
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Post extends CommunityScopedEntity {

    /**
     * NEWS | HELP | MARKETPLACE | SAFETY | EVENT | RECOMMENDATION | GENERAL
     */
    @Column(name = "post_type", nullable = false, length = 50)
    private String postType;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /**
     * Radius in meters — who can see this post geographically.
     */
    @Column(name = "visibility_radius")
    private Integer visibilityRadius;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PostStatus status = PostStatus.PUBLISHED;

    /**
     * Denormalized counters — use atomic SQL increments only.
     *
     * @Version prevents full lost-update on concurrent writes.
     */
    @Builder.Default
    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Builder.Default
    @Column(name = "comment_count", nullable = false)
    private Integer commentCount = 0;

    @Builder.Default
    @Column(name = "share_count", nullable = false)
    private Integer shareCount = 0;

    @Builder.Default
    @Column(name = "anonymous", nullable = false)
    private Boolean anonymous = false;

    @Builder.Default
    @Column(name = "edited", nullable = false)
    private Boolean edited = false;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Column(name = "hashtag_string", length = 500)
    private String hashtagString;

    /**
     * FIX: Optimistic locking — required for safe counter increments.
     */
    @Version
    @Column(name = "version")
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false,
            foreignKey = @ForeignKey(name = "fk_post_creator"))
    private User createdBy;
}
