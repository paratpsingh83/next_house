package com.NextHouse.repository;

import com.NextHouse.entity.UserPresence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserPresenceRepository extends JpaRepository<UserPresence, Long> {

    Optional<UserPresence> findByUserId(Long userId);

    /** Bulk mark users offline whose socket has been silent since a cutoff time. */
    @Modifying
    @Query("""
            UPDATE UserPresence p
            SET p.online = false, p.socketId = null
            WHERE p.online = true
              AND p.lastSeen < :cutoff
            """)
    int markStaleUsersOffline(@Param("cutoff") LocalDateTime cutoff);

    /** Fetch presence for a list of user IDs — used for chat member presence display. */
    @Query("SELECT p FROM UserPresence p WHERE p.user.id IN :userIds")
    List<UserPresence> findByUserIdIn(@Param("userIds") List<Long> userIds);

    @Modifying
    @Query("""
            UPDATE UserPresence p
            SET p.online = :online, p.lastSeen = :lastSeen, p.socketId = :socketId
            WHERE p.user.id = :userId
            """)
    int updatePresence(
            @Param("userId")   Long          userId,
            @Param("online")   boolean       online,
            @Param("lastSeen") LocalDateTime lastSeen,
            @Param("socketId") String        socketId
    );
}
