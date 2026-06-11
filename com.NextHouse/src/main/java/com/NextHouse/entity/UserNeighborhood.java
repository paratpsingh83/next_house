package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "user_neighborhoods",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_user_neighborhood",
                        columnNames = {"user_id", "neighborhood_id"}
                )
        },
        indexes = {
                @Index(name = "idx_user_neighborhood_user", columnList = "user_id"),
                @Index(name = "idx_user_neighborhood_neighborhood", columnList = "neighborhood_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserNeighborhood extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_user_neighborhood_user"))
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "neighborhood_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_user_neighborhood_nbh"))
    private Neighborhood neighborhood;

    @Builder.Default
    @Column(name = "primary_neighborhood", nullable = false)
    private Boolean primaryNeighborhood = false;

    @Builder.Default
    @Column(name = "verified", nullable = false)
    private Boolean verified = false;

    /**
     * POSTCARD | GPS | DOCUMENT | ADMIN_OVERRIDE
     */
    @Column(name = "verification_method", length = 30)
    private String verificationMethod;

    @Column(name = "verified_at")
    private java.time.LocalDateTime verifiedAt;
}
