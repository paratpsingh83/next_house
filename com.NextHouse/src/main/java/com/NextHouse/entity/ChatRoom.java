package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "chat_rooms",
        indexes = {
                @Index(name = "idx_chat_room_activity", columnList = "activity_id"),
                @Index(name = "idx_chat_room_community", columnList = "community_id"),
                @Index(name = "idx_chat_room_created_by", columnList = "created_by"),
                @Index(name = "idx_chat_room_last_msg", columnList = "last_message_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ChatRoom extends BaseEntity {

    /**
     * DIRECT | GROUP | ACTIVITY | COMMUNITY
     */
    @Column(name = "room_type", nullable = false, length = 20)
    private String roomType;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "last_message_preview", length = 150)
    private String lastMessagePreview;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id",
            foreignKey = @ForeignKey(name = "fk_chat_room_activity"))
    private Activity activity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id",
            foreignKey = @ForeignKey(name = "fk_chat_room_community"))
    private Community community;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_room_creator"))
    private User createdBy;
}
