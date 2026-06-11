package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "message_reactions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_message_reaction_user",
        columnNames = {"message_id", "user_id"}
    ),
    indexes = @Index(name = "idx_message_reactions_message", columnList = "message_id")
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_reaction_message"))
    private ChatMessage message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_reaction_user"))
    private User user;

    @Column(name = "emoji", length = 10, nullable = false)
    private String emoji;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
