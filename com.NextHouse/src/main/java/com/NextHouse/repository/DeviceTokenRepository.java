package com.NextHouse.repository;

import com.NextHouse.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByDeviceToken(String deviceToken);

    List<DeviceToken> findByUserIdAndIsDeletedFalse(Long userId);

    /**
     * Tokens for multiple users — used for batch push notifications.
     */
    @Query("""
            SELECT dt FROM DeviceToken dt
            WHERE dt.user.id IN :userIds
              AND dt.isDeleted = false
              AND dt.active = true
            """)
    List<DeviceToken> findActiveTokensForUsers(@Param("userIds") List<Long> userIds);

    /**
     * Purge stale tokens not used in 30 days.
     */
    @Modifying
    @Query("DELETE FROM DeviceToken dt WHERE dt.lastUsedAt < :cutoff")
    int deleteStaleTokens(@Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("UPDATE DeviceToken dt SET dt.lastUsedAt = :now WHERE dt.deviceToken = :token")
    int updateLastUsed(@Param("token") String token, @Param("now") LocalDateTime now);
}
