package com.NextHouse.repository;

import com.NextHouse.entity.SavedPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SavedPostRepository extends JpaRepository<SavedPost, Long> {

    Optional<SavedPost> findByUserIdAndPostId(Long userId, Long postId);

    boolean existsByUserIdAndPostId(Long userId, Long postId);

    void deleteByUserIdAndPostId(Long userId, Long postId);

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
