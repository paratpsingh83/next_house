package com.NextHouse.repository;

import com.NextHouse.constant.PostStatus;
import com.NextHouse.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeleted = false AND p.status = 'PUBLISHED'
              AND p.createdBy.id IN (SELECT f.following.id FROM Follow f WHERE f.follower.id = :userId)
              AND p.createdBy.id NOT IN :blockedIds
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findFollowingFeed(
            @Param("userId") Long userId,
            @Param("blockedIds") List<Long> blockedIds,
            Pageable pageable);

    /** Tier 1+2 — neighborhood-scoped nearby feed */
    @Query(value = """
            SELECT p.* FROM posts p
            WHERE p.is_deleted = false AND p.status = 'PUBLISHED'
              AND p.neighborhood_id = :neighborhoodId
              AND p.created_by NOT IN (:blockedIds)
              AND (p.visibility_radius IS NULL
                   OR ST_DWithin(p.location::geography,
                        ST_MakePoint(:longitude,:latitude)::geography,
                        p.visibility_radius))
            ORDER BY p.created_at DESC
            """, nativeQuery = true)
    Page<Post> findNearbyFeed(
            @Param("neighborhoodId") Long neighborhoodId,
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("blockedIds") List<Long> blockedIds,
            Pageable pageable);

    /**
     * FIX: Tier 3 fallback — pure GPS radius when no neighborhoods exist.
     * Without this, newly registered users see a 404 on the feed page.
     */
    @Query(value = """
            SELECT p.* FROM posts p
            WHERE p.is_deleted = false AND p.status = 'PUBLISHED'
              AND p.created_by NOT IN (:blockedIds)
              AND p.location IS NOT NULL
              AND ST_DWithin(p.location::geography,
                    ST_MakePoint(:longitude,:latitude)::geography,
                    :radiusMeters)
            ORDER BY p.created_at DESC
            """, nativeQuery = true)
    Page<Post> findNearbyFeedByGps(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusMeters") int radiusMeters,
            @Param("blockedIds") List<Long> blockedIds,
            Pageable pageable);

    @Query(value = """
            SELECT p.* FROM posts p
            WHERE p.is_deleted = false AND p.status = 'PUBLISHED'
              AND p.neighborhood_id = :neighborhoodId
              AND p.created_at >= NOW() - INTERVAL '48 hours'
            ORDER BY (p.like_count + p.comment_count * 2) DESC, p.created_at DESC
            """, nativeQuery = true)
    Page<Post> findTrendingFeed(
            @Param("neighborhoodId") Long neighborhoodId,
            Pageable pageable);

    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeleted = false AND p.status = com.NextHouse.constant.PostStatus.PUBLISHED
              AND p.community.id = :communityId
              AND p.createdBy.id NOT IN :blockedIds
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findCommunityFeed(
            @Param("communityId") Long communityId,
            @Param("blockedIds") List<Long> blockedIds,
            Pageable pageable);

    /**
     * FIX: renamed findByCreatedById → findUserPosts to match PostServiceImpl.
     * Also respects blocked user list.
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeleted = false AND p.status = com.NextHouse.constant.PostStatus.PUBLISHED
              AND p.createdBy.id = :userId
              AND p.createdBy.id NOT IN :blockedIds
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findUserPosts(
            @Param("userId") Long userId,
            @Param("blockedIds") List<Long> blockedIds,
            Pageable pageable);

    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeleted = false AND p.status = com.NextHouse.constant.PostStatus.PUBLISHED
              AND LOWER(p.hashtagString) LIKE LOWER(CONCAT('%', :hashtag, '%'))
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findByHashtag(@Param("hashtag") String hashtag, Pageable pageable);

    @Modifying @Query("UPDATE Post p SET p.likeCount    = p.likeCount    + 1 WHERE p.id = :id") int incrementLikeCount   (@Param("id") Long id);
    @Modifying @Query("UPDATE Post p SET p.likeCount    = p.likeCount    - 1 WHERE p.id = :id AND p.likeCount    > 0") int decrementLikeCount   (@Param("id") Long id);
    @Modifying @Query("UPDATE Post p SET p.commentCount = p.commentCount + 1 WHERE p.id = :id") int incrementCommentCount(@Param("id") Long id);
    @Modifying @Query("UPDATE Post p SET p.commentCount = p.commentCount - 1 WHERE p.id = :id AND p.commentCount > 0") int decrementCommentCount(@Param("id") Long id);
    @Modifying @Query("UPDATE Post p SET p.shareCount   = p.shareCount   + 1 WHERE p.id = :id") int incrementShareCount  (@Param("id") Long id);

    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeleted = false
              AND (:status IS NULL OR p.status = :status)
              AND (:neighborhoodId IS NULL OR p.neighborhood.id = :neighborhoodId)
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findAllForAdmin(
            @Param("status") PostStatus status,
            @Param("neighborhoodId") Long neighborhoodId,
            Pageable pageable);
}
