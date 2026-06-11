package com.NextHouse.repository;

import com.NextHouse.constant.BorrowStatus;
import com.NextHouse.entity.BorrowRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BorrowRequestRepository extends JpaRepository<BorrowRequest, Long> {

    Page<BorrowRequest> findByRequesterIdAndIsDeletedFalse(Long requesterId, Pageable pageable);

    @Query("""
            SELECT b FROM BorrowRequest b
            WHERE b.isDeleted = false
              AND (
                  :neighborhoodId IS NULL
                  OR b.neighborhood.id = :neighborhoodId
                  OR b.neighborhood IS NULL
              )
              AND (:status IS NULL OR b.status = :status)
            ORDER BY b.createdAt DESC
            """)
    Page<BorrowRequest> findByNeighborhood(
            @Param("neighborhoodId") Long neighborhoodId,
            @Param("status") BorrowStatus status,
            Pageable pageable
    );
}
