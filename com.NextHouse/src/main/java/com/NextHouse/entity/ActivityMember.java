package com.NextHouse.entity;

import com.NextHouse.constant.ActivityMemberRole;
import com.NextHouse.constant.JoinStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "activity_members",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_activity_member",
                        columnNames = {"activity_id", "user_id"}
                )
        },
        indexes = {
                @Index(name = "idx_activity_member_activity", columnList = "activity_id"),
                @Index(name = "idx_activity_member_user", columnList = "user_id"),
                @Index(name = "idx_activity_member_status", columnList = "join_status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ActivityMember extends BaseEntity {

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "join_status", nullable = false, length = 20)
    private JoinStatus joinStatus = JoinStatus.PENDING;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private ActivityMemberRole role = ActivityMemberRole.MEMBER;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_activity_member_activity"))
    private Activity activity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_activity_member_user"))
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by_user_id",
            foreignKey = @ForeignKey(name = "fk_activity_member_invited_by"))
    private User invitedBy;
}
