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

    @Query("""
            SELECT u FROM User u
            WHERE u.isDeleted = false
              AND u.banned = false
              AND u.accountStatus = 'ACTIVE'
              AND (
                LOWER(u.name)        LIKE LOWER(CONCAT('%', TRIM(:query), '%'))
                OR LOWER(u.username) LIKE LOWER(CONCAT('%', TRIM(:query), '%'))
                OR u.phoneNumber     LIKE CONCAT('%', TRIM(:query), '%')
              )
            ORDER BY
              CASE WHEN LOWER(u.username) = LOWER(:query) THEN 0
                   WHEN LOWER(u.name)     = LOWER(:query) THEN 1
                   ELSE 2 END,
              u.trustScore DESC
            """)
    Page<User> searchUsers(@Param("query") String query, Pageable pageable);

    // ─── Geo — Nearby users ───────────────────────────────────────────────────

    @Query(value = """
            SELECT u.*
            FROM users u
            LEFT JOIN user_neighborhoods un ON un.user_id = u.id AND un.primary_neighborhood = true
            LEFT JOIN neighborhoods n       ON n.id = un.neighborhood_id
            WHERE u.is_deleted      = false
              AND u.banned          = false
              AND u.account_status  = 'ACTIVE'
              AND u.id             <> :currentUserId
              AND (u.location IS NOT NULL OR n.location IS NOT NULL)
              AND NOT EXISTS (
                  SELECT 1 FROM blocked_users b
                  WHERE (b.user_id = :currentUserId AND b.blocked_user_id = u.id)
                     OR (b.user_id = u.id AND b.blocked_user_id = :currentUserId)
              )
              AND ST_DWithin(
                    COALESCE(n.location, u.location)::geography,
                    ST_MakePoint(:longitude, :latitude)::geography,
                    :radiusMeters
                  )
            ORDER BY ST_Distance(
                        COALESCE(n.location, u.location)::geography,
                        ST_MakePoint(:longitude, :latitude)::geography
                     )
            LIMIT :limitCount
            """,
            nativeQuery = true)
    List<User> findNearbyUsers(
            @Param("latitude")      double latitude,
            @Param("longitude")     double longitude,
            @Param("radiusMeters")  int radiusMeters,
            @Param("currentUserId") Long currentUserId,
            @Param("limitCount")    int limitCount
    );

    // ─── Follow graph ─────────────────────────────────────────────────────────

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

    @Modifying
    @Query("UPDATE User u SET u.banned = true WHERE u.id IN :ids")
    int banUsers(@Param("ids") List<Long> ids);

    @Modifying
    @Query("UPDATE User u SET u.trustScore = u.trustScore + :delta WHERE u.id = :userId")
    int incrementTrustScore(@Param("userId") Long userId, @Param("delta") int delta);
}
