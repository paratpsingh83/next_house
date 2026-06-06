package com.NextHouse.repository;

import com.NextHouse.entity.Story;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StoryRepository extends JpaRepository<Story, Long> {

    /** Active (non-expired, non-deleted) stories for a specific user — newest first. */
    @Query("""
        SELECT s FROM Story s
        WHERE s.user.id = :userId
          AND s.isDeleted = false
          AND s.expiresAt > :now
        ORDER BY s.createdAt DESC
        """)
    List<Story> findActiveByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** Active stories from users that :viewerId follows — for the story tray. */
    @Query("""
        SELECT s FROM Story s
        WHERE s.isDeleted = false
          AND s.expiresAt > :now
          AND s.user.id IN (
              SELECT f.following.id FROM Follow f
              WHERE f.follower.id = :viewerId AND f.isDeleted = false
          )
        ORDER BY s.user.id ASC, s.createdAt DESC
        """)
    List<Story> findFollowingStoriesForUser(@Param("viewerId") Long viewerId, @Param("now") LocalDateTime now);

    /** Soft-delete all expired stories — called by a scheduled cleanup job. */
    @Modifying
    @Query("UPDATE Story s SET s.isDeleted = true WHERE s.expiresAt <= :now AND s.isDeleted = false")
    int expireOldStories(@Param("now") LocalDateTime now);
}