package com.NextHouse.repository;

import com.NextHouse.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByPostIdAndLikedById(Long postId, Long likedById);

    boolean existsByPostIdAndLikedById(Long postId, Long likedById);

    void deleteByPostIdAndLikedById(Long postId, Long likedById);

    long countByPostId(Long postId);

    /**
     * Reaction breakdown — how many of each reaction type on a post.
     */
    @Query("""
            SELECT pl.reactionType, COUNT(pl)
            FROM PostLike pl
            WHERE pl.post.id = :postId
            GROUP BY pl.reactionType
            """)
    List<Object[]> countReactionsByPostId(@Param("postId") Long postId);

    /**
     * Which of a list of postIds has the current user liked — batch check for feed.
     */
    @Query("SELECT pl.post.id FROM PostLike pl WHERE pl.post.id IN :postIds AND pl.likedBy.id = :userId")
    List<Long> findLikedPostIds(@Param("postIds") List<Long> postIds, @Param("userId") Long userId);

    /**
     * Batch: post.id + reactionType for a user across many posts.
     * Used in feed enrichment to populate isLiked + myReactionType in one query.
     */
    @Query("SELECT pl.post.id, pl.reactionType FROM PostLike pl WHERE pl.post.id IN :postIds AND pl.likedBy.id = :userId")
    List<Object[]> findUserReactionTypesByPostIds(@Param("postIds") List<Long> postIds, @Param("userId") Long userId);

    /**
     * Batch: post.id + reactionType + count across many posts.
     * Used in feed enrichment to build reaction summaries in one query.
     */
    @Query("""
            SELECT pl.post.id, pl.reactionType, COUNT(pl)
            FROM PostLike pl
            WHERE pl.post.id IN :postIds
            GROUP BY pl.post.id, pl.reactionType
            """)
    List<Object[]> countReactionsByPostIds(@Param("postIds") List<Long> postIds);
}
