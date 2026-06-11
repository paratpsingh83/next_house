package com.NextHouse.repository;

import com.NextHouse.entity.SellerReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SellerReviewRepository extends JpaRepository<SellerReview, Long> {

    Page<SellerReview> findBySellerIdAndIsDeletedFalse(Long sellerId, Pageable pageable);

    Optional<SellerReview> findByItemIdAndReviewerIdAndIsDeletedFalse(Long itemId, Long reviewerId);

    boolean existsByItemIdAndReviewerIdAndIsDeletedFalse(Long itemId, Long reviewerId);

    boolean existsBySellerIdAndReviewerIdAndIsDeletedFalse(Long sellerId, Long reviewerId);

    @Query("""
        SELECT AVG(r.rating) FROM SellerReview r
        WHERE r.seller.id = :sellerId AND r.isDeleted = false
        """)
    Double findAverageRatingBySellerId(@Param("sellerId") Long sellerId);

    @Query("""
        SELECT COUNT(r) FROM SellerReview r
        WHERE r.seller.id = :sellerId AND r.isDeleted = false
        """)
    long countBySellerId(@Param("sellerId") Long sellerId);
}
