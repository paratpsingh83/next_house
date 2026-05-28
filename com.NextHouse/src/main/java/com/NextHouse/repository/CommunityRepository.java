package com.NextHouse.repository;

import com.NextHouse.entity.Community;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommunityRepository extends JpaRepository<Community, Long> {

    /** Communities in a specific neighborhood. */
    Page<Community> findByNeighborhoodIdAndIsDeletedFalse(Long neighborhoodId, Pageable pageable);

    /** Communities a user is a member of. */
    @Query("""
            SELECT c FROM Community c
            JOIN CommunityMember cm ON cm.community = c
            WHERE cm.user.id = :userId
              AND cm.approved = true
              AND c.isDeleted = false
            ORDER BY cm.createdAt DESC
            """)
    Page<Community> findUserCommunities(@Param("userId") Long userId, Pageable pageable);

    /** Nearby communities (by center point of neighborhood). */
    @Query(value = """
            SELECT c.* FROM communities c
            JOIN neighborhoods n ON n.id = c.neighborhood_id
            WHERE c.is_deleted = false
              AND ST_DWithin(
                    n.location::geography,
                    ST_MakePoint(:longitude, :latitude)::geography,
                    :radiusMeters
                  )
            ORDER BY ST_Distance(
                       n.location::geography,
                       ST_MakePoint(:longitude, :latitude)::geography
                     )
            """, nativeQuery = true)
    Page<Community> findNearbyCommunities(
            @Param("latitude")     double latitude,
            @Param("longitude")    double longitude,
            @Param("radiusMeters") int    radiusMeters,
            Pageable pageable
    );

    @Query("""
            SELECT c FROM Community c
            WHERE c.isDeleted = false
              AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(c.description) LIKE LOWER(CONCAT('%', :query, '%')))
            """)
    Page<Community> searchCommunities(@Param("query") String query, Pageable pageable);

    /** Live member count from junction table — replaces removed counter field. */
    @Query("""
            SELECT COUNT(cm) FROM CommunityMember cm
            WHERE cm.community.id = :communityId
              AND cm.approved = true
              AND cm.isDeleted = false
            """)
    long countMembers(@Param("communityId") Long communityId);
}
