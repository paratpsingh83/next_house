package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "follow_requests",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_follow_request_pair",
                        columnNames = {"requester_id", "target_id"})
        },
        indexes = {
                @Index(name = "idx_follow_req_requester", columnList = "requester_id"),
                @Index(name = "idx_follow_req_target",    columnList = "target_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FollowRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_follow_req_requester"))
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_follow_req_target"))
    private User target;
}