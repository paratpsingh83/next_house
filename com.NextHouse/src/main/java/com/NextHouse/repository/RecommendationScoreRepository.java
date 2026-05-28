package com.NextHouse.repository;

import com.NextHouse.entity.RecommendationScore;
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
public interface RecommendationScoreRepository extends JpaRepository<RecommendationScore, Long> {

    Optional<RecommendationScore> findByUserIdAndEntityTypeAndEntityId(
            Long userId, String entityType, Long entityId
    );

    /**
     * Top-N recommendations for a user by entity type, ordered by score descending.
     */
    @Query("""
            SELECT r FROM RecommendationScore r
            WHERE r.user.id = :userId
              AND r.entityType = :entityType
            ORDER BY r.score DESC
            """)
    Page<RecommendationScore> findTopRecommendations(
            @Param("userId") Long userId,
            @Param("entityType") String entityType,
            Pageable pageable
    );

    /**
     * Bulk upsert — delete old scores for user+type, then insert new batch.
     */
    @Modifying
    @Query("DELETE FROM RecommendationScore r WHERE r.user.id = :userId AND r.entityType = :entityType")
    int deleteByUserIdAndEntityType(@Param("userId") Long userId, @Param("entityType") String entityType);

    /**
     * Stale scores older than a version — used to trigger recompute.
     */
    @Query("SELECT r FROM RecommendationScore r WHERE r.user.id = :userId AND r.scoreVersion <> :version")
    List<RecommendationScore> findStaleScores(@Param("userId") Long userId, @Param("version") String version);
}
