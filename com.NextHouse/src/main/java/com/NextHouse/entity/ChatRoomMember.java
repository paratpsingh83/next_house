package com.NextHouse.entity;

import com.NextHouse.constant.ChatRoomRole;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "chat_room_members",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_chat_room_member",
                        columnNames = {"room_id", "user_id"}
                )
        },
        indexes = {
                @Index(name = "idx_chat_room_member_room", columnList = "room_id"),
                @Index(name = "idx_chat_room_member_user", columnList = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ChatRoomMember extends BaseEntity {

    @Builder.Default
    @Column(name = "muted", nullable = false)
    private Boolean muted = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private ChatRoomRole role = ChatRoomRole.MEMBER;

    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_room_member_room"))
    private ChatRoom room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_room_member_user"))
    private User user;
}
