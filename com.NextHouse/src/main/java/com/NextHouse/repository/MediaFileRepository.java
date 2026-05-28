package com.NextHouse.repository;

import com.NextHouse.entity.MediaFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, Long> {

    /** All media attached to a specific entity (post, activity, marketplace item, etc.). */
    List<MediaFile> findByEntityTypeAndEntityIdAndIsDeletedFalse(String entityType, Long entityId);

    /** Media uploaded by a user (for profile gallery). */
    @Query("""
            SELECT m FROM MediaFile m
            WHERE m.uploadedBy.id = :userId
              AND m.isDeleted = false
              AND (:type IS NULL OR m.type = :type)
            ORDER BY m.createdAt DESC
            """)
    Page<MediaFile> findByUploadedBy(
            @Param("userId") Long   userId,
            @Param("type")   String type,
            Pageable pageable
    );

    /** Soft-delete all media for a deleted entity. */
    @Modifying
    @Query("""
            UPDATE MediaFile m
            SET m.isDeleted = true
            WHERE m.entityType = :entityType AND m.entityId = :entityId
            """)
    int softDeleteByEntity(@Param("entityType") String entityType, @Param("entityId") Long entityId);
}
