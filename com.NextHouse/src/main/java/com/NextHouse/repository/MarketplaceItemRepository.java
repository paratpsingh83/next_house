package com.NextHouse.repository;

import com.NextHouse.entity.MarketplaceItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public interface MarketplaceItemRepository extends JpaRepository<MarketplaceItem, Long> {

    /**
     * Browse nearby listings with optional category + price filters.
     */
    @Query(value = """
            SELECT m.* FROM marketplace_items m
            WHERE m.is_deleted = false
              AND m.available = true
              AND m.status = 'ACTIVE'
              AND (:category IS NULL OR m.category = :category)
              AND (:minPrice IS NULL OR m.price >= :minPrice)
              AND (:maxPrice IS NULL OR m.price <= :maxPrice)
              AND ST_DWithin(
                    m.location::geography,
                    ST_MakePoint(:longitude, :latitude)::geography,
                    :radiusMeters
                  )
            ORDER BY m.featured DESC,
                     ST_Distance(m.location::geography,
                                 ST_MakePoint(:longitude, :latitude)::geography) ASC
            """, nativeQuery = true)
    Page<MarketplaceItem> findNearbyListings(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusMeters") int radiusMeters,
            @Param("category") String category,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable
    );

    Page<MarketplaceItem> findBySellerIdAndIsDeletedFalse(Long sellerId, Pageable pageable);

    @Query("""
            SELECT m FROM MarketplaceItem m
            WHERE m.isDeleted = false
              AND m.available = true
              AND (LOWER(m.title) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(m.description) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY m.featured DESC, m.createdAt DESC
            """)
    Page<MarketplaceItem> searchListings(@Param("query") String query, Pageable pageable);
}
