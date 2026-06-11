package com.NextHouse.entity;

import com.NextHouse.constant.CommunityRole;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "community_members",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_community_member",
                        columnNames = {"community_id", "user_id"}
                )
        },
        indexes = {
                @Index(name = "idx_community_member_community", columnList = "community_id"),
                @Index(name = "idx_community_member_user", columnList = "user_id"),
                @Index(name = "idx_community_member_role", columnList = "role")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CommunityMember extends BaseEntity {

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private CommunityRole role = CommunityRole.MEMBER;

    @Builder.Default
    @Column(name = "approved", nullable = false)
    private Boolean approved = true;

    @Builder.Default
    @Column(name = "muted", nullable = false)
    private Boolean muted = false;

    @Builder.Default
    @Column(name = "notifications_enabled", nullable = false)
    private Boolean notificationsEnabled = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_community_member_community"))
    private Community community;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_community_member_user"))
    private User user;
}
