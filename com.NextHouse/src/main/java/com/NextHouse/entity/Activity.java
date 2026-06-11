package com.NextHouse.entity;

import com.NextHouse.constant.ActivityStatus;
import com.NextHouse.constant.ActivityType;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "activities",
        indexes = {
                @Index(name = "idx_activity_host", columnList = "host_user_id"),
                @Index(name = "idx_activity_community", columnList = "community_id"),
                @Index(name = "idx_activity_neighborhood_time", columnList = "neighborhood_id, activity_time"),
                @Index(name = "idx_activity_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Activity extends CommunityScopedEntity {

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false, length = 30)
    private ActivityType activityType;

    @Column(name = "activity_time", nullable = false)
    private LocalDateTime activityTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "max_members")
    private Integer maxMembers;

    @Column(name = "cover_image", length = 500)
    private String coverImage;

    @Builder.Default
    @Column(name = "private_activity", nullable = false)
    private Boolean privateActivity = false;

    @Builder.Default
    @Column(name = "approval_required", nullable = false)
    private Boolean approvalRequired = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ActivityStatus status = ActivityStatus.PUBLISHED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_activity_host_user"))
    private User hostUser;

    @Builder.Default
    @Column(name = "reminder_sent", nullable = false)
    private Boolean reminderSent = false;

    @Version
    @Column(name = "version")
    private Long version;
}
