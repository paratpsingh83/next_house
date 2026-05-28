package com.NextHouse.repository;

import com.NextHouse.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    Optional<RefreshToken> findByUserIdAndDeviceId(Long userId, String deviceId);

    List<RefreshToken> findByUserId(Long userId);

    /**
     * Revoke all tokens for a user (password reset / security logout-all).
     */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.user.id = :userId")
    int revokeAllForUser(@Param("userId") Long userId);

    /**
     * Revoke a single device's token (logout from this device).
     */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.user.id = :userId AND rt.deviceId = :deviceId")
    int revokeByDevice(@Param("userId") Long userId, @Param("deviceId") String deviceId);

    /**
     * Delete expired + revoked tokens — run via scheduled cleanup job.
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiryDate < :now OR rt.revoked = true")
    int deleteExpiredAndRevoked(@Param("now") LocalDateTime now);

    boolean existsByTokenAndRevokedFalse(String token);
}
