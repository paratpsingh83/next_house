package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_preferences")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true,
        foreignKey = @ForeignKey(name = "fk_notif_pref_user"))
    private User user;

    @Builder.Default @Column(nullable = false) private Boolean likes          = true;
    @Builder.Default @Column(nullable = false) private Boolean comments       = true;
    @Builder.Default @Column(nullable = false) private Boolean follows        = true;
    @Builder.Default @Column(name = "follow_requests", nullable = false) private Boolean followRequests = true;
    @Builder.Default @Column(nullable = false) private Boolean messages       = true;
    @Builder.Default @Column(nullable = false) private Boolean activities     = true;
    @Builder.Default @Column(nullable = false) private Boolean marketplace    = false;
    @Builder.Default @Column(name = "safety_alerts", nullable = false) private Boolean safetyAlerts  = true;
    @Builder.Default @Column(nullable = false) private Boolean communities    = true;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
