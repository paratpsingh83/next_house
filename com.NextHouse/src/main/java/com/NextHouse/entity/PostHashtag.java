package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "post_hashtags",
    indexes = {
        @Index(name = "idx_post_hashtags_hashtag", columnList = "hashtag"),
        @Index(name = "idx_post_hashtags_post_id", columnList = "post_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostHashtag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_post_hashtag_post"))
    private Post post;

    @Column(name = "hashtag", length = 100, nullable = false)
    private String hashtag;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
