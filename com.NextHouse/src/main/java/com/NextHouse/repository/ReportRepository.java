package com.NextHouse.repository;

import com.NextHouse.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsByEntityTypeAndEntityIdAndReportedById(String entityType, Long entityId, Long reportedById);

    /**
     * Admin: all reports filtered by status.
     */
    @Query("""
            SELECT r FROM Report r
            WHERE r.isDeleted = false
              AND (:status IS NULL OR r.status = :status)
              AND (:entityType IS NULL OR r.entityType = :entityType)
            ORDER BY r.createdAt DESC
            """)
    Page<Report> findAllForAdmin(
            @Param("status") String status,
            @Param("entityType") String entityType,
            Pageable pageable
    );

    long countByStatusAndIsDeletedFalse(String status);
}
