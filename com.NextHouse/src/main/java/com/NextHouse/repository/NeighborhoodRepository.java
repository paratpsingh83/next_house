package com.NextHouse.repository;

import com.NextHouse.entity.Neighborhood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NeighborhoodRepository extends JpaRepository<Neighborhood, Long> {

    List<Neighborhood> findByCity(String city);
    List<Neighborhood> findByPostalCode(String postalCode);

    /**
     * Find the neighborhood whose boundary polygon CONTAINS the given point.
     * Primary method for assigning users to neighborhoods at registration.
     */
    @Query(value = """
            SELECT * FROM neighborhoods
            WHERE is_deleted = false
              AND verified    = true
              AND ST_Within(
                    ST_MakePoint(:longitude, :latitude)::geography::geometry,
                    boundary::geometry
                  )
            ORDER BY ST_Distance(
                       location::geography,
                       ST_MakePoint(:longitude, :latitude)::geography
                     )
            LIMIT 1
            """, nativeQuery = true)
    Optional<Neighborhood> findNeighborhoodContainingPoint(
            @Param("latitude")  double latitude,
            @Param("longitude") double longitude
    );

    @Query(value = """
            SELECT * FROM neighborhoods
            WHERE is_deleted = false
              AND verified    = true
            ORDER BY ST_Distance(
                       location::geography,
                       ST_MakePoint(:longitude, :latitude)::geography
                     )
            LIMIT 1
            """, nativeQuery = true)
    Optional<Neighborhood> findNearestNeighborhood(
            @Param("latitude")  double latitude,
            @Param("longitude") double longitude
    );

    /**
     * Multiple nearest neighborhoods — used for the /neighborhoods/nearby endpoint.
     */
    @Query(value = """
            SELECT * FROM neighborhoods
            WHERE is_deleted = false
              AND verified    = true
            ORDER BY ST_Distance(
                       location::geography,
                       ST_MakePoint(:longitude, :latitude)::geography
                     )
            LIMIT :limitCount
            """, nativeQuery = true)
    List<Neighborhood> findNearestNeighborhoods(
            @Param("latitude")   double latitude,
            @Param("longitude")  double longitude,
            @Param("limitCount") int    limitCount
    );
}
