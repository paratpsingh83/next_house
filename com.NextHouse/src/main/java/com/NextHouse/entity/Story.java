package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "stories",
    indexes = {
        @Index(name = "idx_story_user",       columnList = "user_id"),
        @Index(name = "idx_story_expires_at", columnList = "expires_at"),
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Story extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_story_user"))
    private User user;

    @Column(name = "media_url", length = 2048)
    private String mediaUrl;

    @Column(name = "media_type", length = 10, nullable = false)
    private String mediaType;   // IMAGE | VIDEO | TEXT

    @Column(name = "text_content", length = 500)
    private String textContent;

    @Column(name = "background_color", length = 20)
    private String backgroundColor;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Builder.Default
    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;
}