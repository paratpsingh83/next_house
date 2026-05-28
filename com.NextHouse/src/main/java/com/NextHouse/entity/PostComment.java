package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "post_comments",
        indexes = {
                @Index(name = "idx_post_comment_post", columnList = "post_id"),
                @Index(name = "idx_post_comment_author", columnList = "commented_by"),
                @Index(name = "idx_post_comment_parent", columnList = "parent_comment_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PostComment extends BaseEntity {

    @Column(name = "comment", nullable = false, columnDefinition = "TEXT")
    private String comment;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Column(name = "edited", nullable = false)
    private Boolean edited = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id",
            foreignKey = @ForeignKey(name = "fk_comment_parent"))
    private PostComment parentComment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_comment_post"))
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commented_by", nullable = false,
            foreignKey = @ForeignKey(name = "fk_comment_author"))
    private User commentedBy;

    /**
     * FIX: Optimistic locking for likeCount increment safety.
     */
    @Version
    @Column(name = "version")
    private Long version;
}
