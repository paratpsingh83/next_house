package com.NextHouse.repository;

import com.NextHouse.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * All notifications for a user (newest first).
     */
    @Query("""
            SELECT n FROM Notification n
            WHERE n.receiver.id = :userId
              AND n.isDeleted = false
              AND (:unreadOnly = false OR n.read = false)
            ORDER BY n.createdAt DESC
            """)
    Page<Notification> findByReceiverId(
            @Param("userId") Long userId,
            @Param("unreadOnly") boolean unreadOnly,
            Pageable pageable
    );

    long countByReceiverIdAndReadFalseAndIsDeletedFalse(Long receiverId);

    /**
     * Bulk mark all as read for a user.
     */
    @Modifying
    @Query("""
            UPDATE Notification n
            SET n.read = true
            WHERE n.receiver.id = :userId AND n.read = false
            """)
    int markAllAsRead(@Param("userId") Long userId);

    /**
     * Mark a single notification as read.
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.id = :id AND n.receiver.id = :userId")
    int markAsRead(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * Mark push as sent — called after FCM delivery.
     */
    @Modifying
    @Query("UPDATE Notification n SET n.pushSent = true WHERE n.id = :id")
    int markPushSent(@Param("id") Long id);
}
