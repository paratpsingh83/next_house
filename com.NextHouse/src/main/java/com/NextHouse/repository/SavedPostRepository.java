package com.NextHouse.repository;

import com.NextHouse.entity.SavedPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedPostRepository extends JpaRepository<SavedPost, Long> {

    Optional<SavedPost> findByUserIdAndPostId(Long userId, Long postId);

    boolean existsByUserIdAndPostId(Long userId, Long postId);

    void deleteByUserIdAndPostId(Long userId, Long postId);

    /** Batch: which postIds from the given list has this user saved — used for feed enrichment. */
    @Query("SELECT s.post.id FROM SavedPost s WHERE s.user.id = :userId AND s.post.id IN :postIds AND s.isDeleted = false")
    List<Long> findSavedPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);

    @Query("""
            SELECT s FROM SavedPost s
            WHERE s.user.id = :userId
              AND s.isDeleted = false
              AND (:collection IS NULL OR s.collectionName = :collection)
            ORDER BY s.createdAt DESC
            """)
    Page<SavedPost> findSavedPosts(
            @Param("userId") Long userId,
            @Param("collection") String collection,
            Pageable pageable
    );
}
