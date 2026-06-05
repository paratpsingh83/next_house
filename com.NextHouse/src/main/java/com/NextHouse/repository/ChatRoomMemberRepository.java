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
     * Uses native query with explicit ::timestamp cast so PostgreSQL can type
     * the parameter even when lastReadAt is null (JPQL generates an untyped $n
     * in the IS NULL check which PostgreSQL rejects with "could not determine
     * data type of parameter").
     */
    @Query(value = """
            SELECT COUNT(cm.id)
            FROM chat_messages cm
            WHERE cm.room_id = :roomId
              AND cm.is_deleted = false
              AND (CAST(:lastReadAt AS timestamp) IS NULL OR cm.created_at > CAST(:lastReadAt AS timestamp))
              AND cm.sender_id <> :userId
            """, nativeQuery = true)
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
