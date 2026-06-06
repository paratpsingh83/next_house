package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "chat_messages",
        indexes = {
                @Index(name = "idx_chat_msg_room_created", columnList = "room_id, created_at"),
                @Index(name = "idx_chat_msg_sender", columnList = "sender_id"),
                @Index(name = "idx_chat_msg_reply_to", columnList = "reply_to_message_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ChatMessage extends BaseEntity {

    @Builder.Default
    @Column(name = "message_type", nullable = false, length = 20)
    private String messageType = "TEXT";

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_message_id",
            foreignKey = @ForeignKey(name = "fk_chat_msg_reply_to"))
    private ChatMessage replyToMessage;

    @Column(name = "media_url", length = 500)
    private String mediaUrl;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_msg_room"))
    private ChatRoom room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_msg_sender"))
    private User sender;

    @Builder.Default
    @Column(name = "is_unsent", nullable = false)
    private Boolean isUnsent = false;
}
