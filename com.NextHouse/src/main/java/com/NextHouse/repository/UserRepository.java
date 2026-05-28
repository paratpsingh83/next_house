package com.NextHouse.repository;

import com.NextHouse.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for User entity.
 * <p>
 * Patterns used:
 * - Derived queries for simple lookups.
 * - @Query (JPQL) for joins / conditional filtering.
 * - @Query (nativeQuery=true) for PostGIS geo-spatial searches.
 * - @Modifying for bulk update operations (avoids loading entities into memory).
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // ─── Basic lookups ────────────────────────────────────────────────────────

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByPhoneNumber(String phoneNumber);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);

    // ─── Search ───────────────────────────────────────────────────────────────

    /**
     * Full-text style search across name and username.
     * For production: replace with Elasticsearch query via ElasticsearchOperations.
     */
    @Query("""
            SELECT u FROM User u
            WHERE u.isDeleted = false
              AND u.banned = false
              AND u.accountStatus = 'ACTIVE'
              AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')))
            """)
    Page<User> searchUsers(@Param("query") String query, Pageable pageable);

    // ─── Geo — Nearby users ───────────────────────────────────────────────────

    /**
     * Find users whose last known location is within :radiusMeters of a given point.
     * Uses PostGIS ST_DWithin on the geography type for accurate meter-based distance.
     * <p>
     * The CROSS JOIN to user_neighborhoods lets us find users who live in the area
     * even if their GPS was not recently updated.
     * <p>
     * NOTE: Requires a GIST spatial index on users.location (add via Flyway migration).
     */
    @Query(value = """
            SELECT DISTINCT u.*
            FROM users u
            JOIN user_neighborhoods un ON un.user_id = u.id AND un.primary_neighborhood = true
            JOIN neighborhoods n       ON n.id = un.neighborhood_id
            WHERE u.is_deleted = false
              AND u.banned     = false
              AND u.account_status = 'ACTIVE'
              AND u.id <> :currentUserId
              AND ST_DWithin(
                    n.location::geography,
                    ST_MakePoint(:longitude, :latitude)::geography,
                    :radiusMeters
                  )
            ORDER BY ST_Distance(n.location::geography,
                                 ST_MakePoint(:longitude, :latitude)::geography)
            LIMIT :limitCount
            """,
            nativeQuery = true)
    List<User> findNearbyUsers(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusMeters") int radiusMeters,
            @Param("currentUserId") Long currentUserId,
            @Param("limitCount") int limitCount
    );

    // ─── Follow graph ─────────────────────────────────────────────────────────

    /**
     * Suggested users: people followed by the users you follow (friends-of-friends),
     * excluding users you already follow and yourself.
     */
    @Query("""
            SELECT DISTINCT u FROM User u
            JOIN Follow f2 ON f2.following = u
            JOIN Follow f1 ON f1.following = f2.follower
            WHERE f1.follower.id = :userId
              AND u.id <> :userId
              AND u.isDeleted = false
              AND u.banned = false
              AND NOT EXISTS (
                  SELECT 1 FROM Follow f3
                  WHERE f3.follower.id = :userId AND f3.following = u
              )
            """)
    Page<User> findSuggestedUsers(@Param("userId") Long userId, Pageable pageable);

    // ─── Admin ────────────────────────────────────────────────────────────────

    @Query("""
            SELECT u FROM User u
            WHERE u.isDeleted = false
              AND (:status IS NULL OR u.accountStatus = :status)
              AND (:banned IS NULL OR u.banned = :banned)
            """)
    Page<User> findAllByFilters(
            @Param("status") String status,
            @Param("banned") Boolean banned,
            Pageable pageable
    );

    /**
     * Bulk ban — avoids loading N entities into memory.
     */
    @Modifying
    @Query("UPDATE User u SET u.banned = true WHERE u.id IN :ids")
    int banUsers(@Param("ids") List<Long> ids);

    /**
     * Update trust score atomically.
     */
    @Modifying
    @Query("UPDATE User u SET u.trustScore = u.trustScore + :delta WHERE u.id = :userId")
    int incrementTrustScore(@Param("userId") Long userId, @Param("delta") int delta);
}
