package com.NextHouse.repository;

import com.NextHouse.entity.ChatRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    /**
     * Find a DIRECT (1:1) room between exactly two users.
     * Uses a double-join to confirm both users are members.
     */
    @Query("""
            SELECT r FROM ChatRoom r
            JOIN ChatRoomMember m1 ON m1.room = r AND m1.user.id = :userId1
            JOIN ChatRoomMember m2 ON m2.room = r AND m2.user.id = :userId2
            WHERE r.roomType = 'DIRECT'
              AND r.isDeleted = false
            """)
    Optional<ChatRoom> findDirectRoom(
            @Param("userId1") Long userId1,
            @Param("userId2") Long userId2
    );

    /**
     * All chat rooms a user belongs to, ordered by most recent activity.
     * This is the inbox view.
     */
    @Query("""
            SELECT r FROM ChatRoom r
            JOIN ChatRoomMember m ON m.room = r AND m.user.id = :userId
            WHERE r.isDeleted = false
              AND m.isDeleted = false
            ORDER BY r.lastMessageAt DESC NULLS LAST
            """)
    Page<ChatRoom> findUserInbox(@Param("userId") Long userId, Pageable pageable);

    Optional<ChatRoom> findByActivityIdAndRoomType(Long activityId, String roomType);

    Optional<ChatRoom> findByCommunityIdAndRoomType(Long communityId, String roomType);
}
