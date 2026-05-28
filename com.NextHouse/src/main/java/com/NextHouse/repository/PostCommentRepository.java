package com.NextHouse.repository;

import com.NextHouse.entity.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    /**
     * Top-level comments for a post (parentComment is null).
     */
    @Query("""
            SELECT c FROM PostComment c
            WHERE c.post.id = :postId
              AND c.parentComment IS NULL
              AND c.isDeleted = false
            ORDER BY c.createdAt DESC
            """)
    Page<PostComment> findTopLevelComments(@Param("postId") Long postId, Pageable pageable);

    /**
     * Replies to a specific comment.
     */
    @Query("""
            SELECT c FROM PostComment c
            WHERE c.parentComment.id = :parentCommentId
              AND c.isDeleted = false
            ORDER BY c.createdAt ASC
            """)
    Page<PostComment> findReplies(@Param("parentCommentId") Long parentCommentId, Pageable pageable);

    long countByPostIdAndIsDeletedFalse(Long postId);

    @Modifying
    @Query("UPDATE PostComment c SET c.likeCount = c.likeCount + 1 WHERE c.id = :id")
    int incrementLikeCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE PostComment c SET c.likeCount = c.likeCount - 1 WHERE c.id = :id AND c.likeCount > 0")
    int decrementLikeCount(@Param("id") Long id);
}
