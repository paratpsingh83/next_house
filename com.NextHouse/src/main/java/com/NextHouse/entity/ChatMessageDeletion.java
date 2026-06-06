package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Per-user message deletion — records that a specific user hid a message from their own view.
 * Unlike isDeleted (global soft-delete), this only affects the requesting user's chat history.
 */
@Entity
@Table(
    name = "chat_message_deletions",
    indexes = { @Index(name = "idx_cmd_user_msg", columnList = "user_id, message_id") },
    uniqueConstraints = { @UniqueConstraint(name = "uc_cmd_user_message", columnNames = {"message_id", "user_id"}) }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ChatMessageDeletion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_cmd_message"))
    private ChatMessage message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_cmd_user"))
    private User user;
}