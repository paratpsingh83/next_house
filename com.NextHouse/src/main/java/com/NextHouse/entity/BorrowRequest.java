package com.NextHouse.entity;

import com.NextHouse.constant.BorrowStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "borrow_requests",
        indexes = {
                @Index(name = "idx_borrow_requester", columnList = "requester_id"),
                @Index(name = "idx_borrow_neighborhood", columnList = "neighborhood_id"),
                @Index(name = "idx_borrow_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BorrowRequest extends CommunityScopedEntity {

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "required_duration", length = 100)
    private String requiredDuration;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BorrowStatus status = BorrowStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_borrow_requester"))
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responded_by_user_id",
            foreignKey = @ForeignKey(name = "fk_borrow_responder"))
    private User respondedBy;
}
