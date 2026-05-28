package com.NextHouse.repository;

import com.NextHouse.constant.ModerationStatus;
import com.NextHouse.entity.ModerationQueue;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ModerationQueueRepository extends JpaRepository<ModerationQueue, Long> {

    Optional<ModerationQueue> findByContentTypeAndContentId(String contentType, Long contentId);

    Page<ModerationQueue> findByStatusAndIsDeletedFalse(ModerationStatus status, Pageable pageable);

    long countByStatus(ModerationStatus status);

    @Query("""
            SELECT m FROM ModerationQueue m
            WHERE m.isDeleted = false
              AND (:status IS NULL OR m.status = :status)
              AND (:contentType IS NULL OR m.contentType = :contentType)
            ORDER BY m.createdAt DESC
            """)
    Page<ModerationQueue> findAllForAdmin(
            @Param("status") ModerationStatus status,
            @Param("contentType") String contentType,
            Pageable pageable
    );
}
