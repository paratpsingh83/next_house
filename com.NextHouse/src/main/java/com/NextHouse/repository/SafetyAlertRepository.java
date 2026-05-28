package com.NextHouse.repository;

import com.NextHouse.entity.SafetyAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SafetyAlertRepository extends JpaRepository<SafetyAlert, Long> {

    /** Active (unresolved) alerts in a neighborhood. */
    @Query("""
            SELECT s FROM SafetyAlert s
            WHERE s.isDeleted = false
              AND s.neighborhood.id = :neighborhoodId
              AND s.resolvedAt IS NULL
            ORDER BY s.emergency DESC, s.createdAt DESC
            """)
    Page<SafetyAlert> findActiveByNeighborhood(@Param("neighborhoodId") Long neighborhoodId, Pageable pageable);

    /** Nearby alerts by GPS — used in map view. */
    @Query(value = """
            SELECT s.* FROM safety_alerts s
            WHERE s.is_deleted = false
              AND s.resolved_at IS NULL
              AND ST_DWithin(
                    s.location::geography,
                    ST_MakePoint(:longitude, :latitude)::geography,
                    :radiusMeters
                  )
            ORDER BY s.emergency DESC,
                     ST_Distance(s.location::geography,
                                 ST_MakePoint(:longitude, :latitude)::geography) ASC
            """, nativeQuery = true)
    Page<SafetyAlert> findNearbyAlerts(
            @Param("latitude")     double latitude,
            @Param("longitude")    double longitude,
            @Param("radiusMeters") int    radiusMeters,
            Pageable pageable
    );
}
