package com.NextHouse.repository;

import com.NextHouse.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /**
     * Paginated chat history for a room — newest first.
     * - Globally deleted messages are excluded for everyone.
     * - Unsent messages are excluded for non-senders (sender still sees their placeholder).
     * - Per-user deleted messages are excluded for the requesting user only.
     */
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.room.id = :roomId
              AND m.isDeleted = false
              AND (m.isUnsent = false OR m.sender.id = :userId)
              AND NOT EXISTS (
                SELECT d FROM ChatMessageDeletion d
                WHERE d.message = m AND d.user.id = :userId
              )
            ORDER BY m.createdAt DESC
            """)
    Page<ChatMessage> findRoomHistory(
            @Param("roomId") Long roomId,
            @Param("userId")  Long userId,
            Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE ChatMessage m SET m.isUnsent = true WHERE m.id = :id AND m.sender.id = :senderId AND m.createdAt >= :cutoff")
    int unsendMessage(@Param("id") Long id, @Param("senderId") Long senderId, @Param("cutoff") java.time.LocalDateTime cutoff);

    /** Replies to a specific message. */
    @Query("""
            SELECT m FROM ChatMessage m
            WHERE m.replyToMessage.id = :messageId
              AND m.isDeleted = false
            ORDER BY m.createdAt ASC
            """)
    Page<ChatMessage> findReplies(@Param("messageId") Long messageId, Pageable pageable);

    /** Soft-delete a single message (mark as deleted). */
    @Modifying
    @Query("UPDATE ChatMessage m SET m.isDeleted = true WHERE m.id = :id AND m.sender.id = :senderId")
    int softDeleteMessage(@Param("id") Long id, @Param("senderId") Long senderId);

    /** Count total messages in a room — for admin dashboard. */
    long countByRoomIdAndIsDeletedFalse(Long roomId);
}
