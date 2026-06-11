package com.NextHouse.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Entity
@Table(
        name = "communities",
        indexes = {
                @Index(name = "idx_community_created_by", columnList = "created_by"),
                @Index(name = "idx_community_neighborhood", columnList = "neighborhood_id"),
                @Index(name = "idx_community_type", columnList = "community_type"),
                @Index(name = "idx_community_verified", columnList = "verified")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Community extends GeoBaseEntity {

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * GENERAL, SPORTS, EDUCATION, MARKETPLACE, SAFETY, CULTURE, etc.
     */
    @Column(name = "community_type", length = 50)
    private String communityType;

    @Column(name = "cover_image", length = 500)
    private String coverImage;

    @Column(name = "icon_image", length = 500)
    private String iconImage;

    @Builder.Default
    @Column(name = "private_community", nullable = false)
    private Boolean privateCommunity = false;

    @Builder.Default
    @Column(name = "verified", nullable = false)
    private Boolean verified = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_community_id",
            foreignKey = @ForeignKey(name = "fk_community_parent"))
    private Community parentCommunity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "neighborhood_id",
            foreignKey = @ForeignKey(name = "fk_community_neighborhood"))
    private Neighborhood neighborhood;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false,
            foreignKey = @ForeignKey(name = "fk_community_creator"))
    private User createdBy;
}
