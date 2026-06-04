package com.NextHouse.repository;

import com.NextHouse.constant.ActivityStatus;
import com.NextHouse.constant.ActivityType;
import com.NextHouse.entity.Activity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    // ─── Geo: nearby activities ───────────────────────────────────────────────

    /**
     * Find upcoming, non-expired activities within :radiusMeters of a point.
     * Ordered by distance ascending (closest first).
     */
    @Query(value = """
            SELECT a.* FROM activities a
            WHERE a.is_deleted = false
              AND a.status IN ('PUBLISHED', 'FULL')
              AND a.activity_time > NOW()
              AND ST_DWithin(
                    a.location::geography,
                    ST_MakePoint(:longitude, :latitude)::geography,
                    :radiusMeters
                  )
              AND (:activityType IS NULL OR a.activity_type = :activityType)
            ORDER BY ST_Distance(
                       a.location::geography,
                       ST_MakePoint(:longitude, :latitude)::geography
                     ) ASC,
                     a.activity_time ASC
            """, nativeQuery = true)
    Page<Activity> findNearbyActivities(
            @Param("latitude")     double  latitude,
            @Param("longitude")    double  longitude,
            @Param("radiusMeters") int     radiusMeters,
            @Param("activityType") String  activityType,
            Pageable pageable
    );

    /** Activities hosted by a user. */
    Page<Activity> findByHostUserIdAndIsDeletedFalse(Long hostUserId, Pageable pageable);

    /** Activities a user has joined (via ActivityMember). */
    @Query("""
            SELECT a FROM Activity a
            JOIN ActivityMember am ON am.activity = a
            WHERE am.user.id = :userId
              AND am.joinStatus = 'APPROVED'
              AND a.isDeleted = false
            ORDER BY a.activityTime ASC
            """)
    Page<Activity> findJoinedActivities(@Param("userId") Long userId, Pageable pageable);

    /** Upcoming activities in a community. */
    @Query("""
            SELECT a FROM Activity a
            WHERE a.isDeleted = false
              AND a.community.id = :communityId
              AND a.activityTime > :now
              AND a.status = com.NextHouse.constant.ActivityStatus.PUBLISHED
            ORDER BY a.activityTime ASC
            """)
    Page<Activity> findByCommunityId(
            @Param("communityId") Long          communityId,
            @Param("now")         LocalDateTime now,
            Pageable pageable
    );

    /** Text search by title or description. */
    @Query("""
            SELECT a FROM Activity a
            WHERE a.isDeleted = false
              AND a.status = com.NextHouse.constant.ActivityStatus.PUBLISHED
              AND a.activityTime > :now
              AND (LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(a.description) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY a.activityTime ASC
            """)
    Page<Activity> searchByQuery(@Param("query") String query, @Param("now") LocalDateTime now, Pageable pageable);

    /** Scheduler: expire activities whose end time has passed. */
    @Modifying
    @Query("""
            UPDATE Activity a
            SET a.status = com.NextHouse.constant.ActivityStatus.EXPIRED
            WHERE a.status = com.NextHouse.constant.ActivityStatus.PUBLISHED
              AND a.endTime < :now
            """)
    int expireActivities(@Param("now") LocalDateTime now);

    /** Count of approved members for an activity (replaces the removed currentMembers counter). */
    @Query("""
            SELECT COUNT(am) FROM ActivityMember am
            WHERE am.activity.id = :activityId
              AND am.joinStatus = 'APPROVED'
            """)
    int countApprovedMembers(@Param("activityId") Long activityId);
}
