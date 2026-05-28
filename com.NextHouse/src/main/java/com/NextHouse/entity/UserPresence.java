package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_presence",
        indexes = {
                @Index(name = "idx_user_presence_user", columnList = "user_id", unique = true),
                @Index(name = "idx_user_presence_online", columnList = "online")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserPresence extends BaseEntity {

    @Column(name = "online", nullable = false)
    private Boolean online = false;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "current_device_type", length = 20)
    private String currentDeviceType;

    @Column(name = "socket_id", length = 200)
    private String socketId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_user_presence_user"))
    private User user;
}
