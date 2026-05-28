package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "blocked_users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_blocked_user_pair",
                        columnNames = {"user_id", "blocked_user_id"}
                )
        },
        indexes = {
                @Index(name = "idx_blocked_user_id", columnList = "user_id"),
                @Index(name = "idx_blocked_blocked_user_id", columnList = "blocked_user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BlockedUser extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_blocked_user"))
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocked_user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_blocked_target"))
    private User blockedUser;

    @Column(name = "reason", length = 50)
    private String reason;
}
