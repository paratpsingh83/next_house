package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(
        name = "marketplace_items",
        indexes = {
                @Index(name = "idx_market_seller", columnList = "seller_id"),
                @Index(name = "idx_market_neighborhood", columnList = "neighborhood_id"),
                @Index(name = "idx_market_status", columnList = "status"),
                @Index(name = "idx_market_category", columnList = "category"),
                @Index(name = "idx_market_available", columnList = "available")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MarketplaceItem extends CommunityScopedEntity {

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", length = 80)
    private String category;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    /**
     * NEW | LIKE_NEW | GOOD | FAIR | POOR | FREE
     */
    @Column(name = "condition_type", length = 20)
    private String conditionType;

    @Builder.Default
    @Column(name = "negotiable", nullable = false)
    private Boolean negotiable = false;

    @Builder.Default
    @Column(name = "available", nullable = false)
    private Boolean available = true;

    @Builder.Default
    @Column(name = "featured", nullable = false)
    private Boolean featured = false;

    /**
     * ACTIVE | SOLD | REMOVED | EXPIRED
     */
    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_market_item_seller"))
    private User seller;
}
