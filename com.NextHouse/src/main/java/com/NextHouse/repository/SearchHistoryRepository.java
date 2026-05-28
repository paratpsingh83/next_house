package com.NextHouse.repository;

import com.NextHouse.entity.SearchHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {

    /** User's recent searches — for autocomplete. */
    @Query("""
            SELECT s FROM SearchHistory s
            WHERE s.user.id = :userId
              AND s.isDeleted = false
            ORDER BY s.createdAt DESC
            """)
    Page<SearchHistory> findRecentSearches(@Param("userId") Long userId, Pageable pageable);

    /** Trending searches in the past 24h across all users. */
    @Query(value = """
            SELECT keyword, COUNT(*) as cnt
            FROM search_history
            WHERE created_at >= NOW() - INTERVAL '24 hours'
              AND is_deleted = false
            GROUP BY keyword
            ORDER BY cnt DESC
            LIMIT 20
            """, nativeQuery = true)
    java.util.List<Object[]> findTrendingKeywords();

    @Modifying
    @Query("DELETE FROM SearchHistory s WHERE s.user.id = :userId")
    int clearHistoryForUser(@Param("userId") Long userId);
}
