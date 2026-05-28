package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "device_tokens",
        indexes = {
                @Index(name = "idx_device_token_user", columnList = "user_id"),
                @Index(name = "idx_device_token_token", columnList = "device_token", unique = true)
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DeviceToken extends BaseEntity {

    @Column(name = "device_token", length = 1000, nullable = false, unique = true)
    private String deviceToken;

    /**
     * ANDROID | IOS | WEB
     */
    @Column(name = "device_type", length = 20)
    private String deviceType;

    @Column(name = "device_name", length = 100)
    private String deviceName;

    @Column(name = "os_version", length = 50)
    private String osVersion;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_device_token_user"))
    private User user;
}
