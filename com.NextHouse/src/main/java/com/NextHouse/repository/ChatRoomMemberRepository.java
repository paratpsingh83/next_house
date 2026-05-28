package com.NextHouse.repository;

import com.NextHouse.entity.ChatRoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {

    Optional<ChatRoomMember> findByRoomIdAndUserId(Long roomId, Long userId);

    boolean existsByRoomIdAndUserId(Long roomId, Long userId);

    List<ChatRoomMember> findByRoomIdAndIsDeletedFalse(Long roomId);

    /**
     * Count unread messages for a user in a room.
     */
    @Query("""
            SELECT COUNT(m) FROM ChatMessage m
            WHERE m.room.id = :roomId
              AND m.isDeleted = false
              AND (:lastReadAt IS NULL OR m.createdAt > :lastReadAt)
              AND m.sender.id <> :userId
            """)
    long countUnreadMessages(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("lastReadAt") LocalDateTime lastReadAt
    );

    @Modifying
    @Query("""
            UPDATE ChatRoomMember m
            SET m.lastReadAt = :now
            WHERE m.room.id = :roomId AND m.user.id = :userId
            """)
    int markAsRead(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("now") LocalDateTime now
    );
}
