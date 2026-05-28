package com.NextHouse.repository;

import com.NextHouse.constant.OtpPurpose;
import com.NextHouse.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    /** Find the most recent unexpired, unverified OTP for a phone+purpose pair. */
    @Query("""
            SELECT o FROM OtpVerification o
            WHERE o.phone = :phone
              AND o.purpose = :purpose
              AND o.verified = false
              AND o.expiresAt > :now
            ORDER BY o.createdAt DESC
            """)
    Optional<OtpVerification> findLatestByPhone(
            @Param("phone")   String      phone,
            @Param("purpose") OtpPurpose  purpose,
            @Param("now")     LocalDateTime now
    );

    @Query("""
            SELECT o FROM OtpVerification o
            WHERE o.email = :email
              AND o.purpose = :purpose
              AND o.verified = false
              AND o.expiresAt > :now
            ORDER BY o.createdAt DESC
            """)
    Optional<OtpVerification> findLatestByEmail(
            @Param("email")   String      email,
            @Param("purpose") OtpPurpose  purpose,
            @Param("now")     LocalDateTime now
    );

    /** Increment attempt counter atomically. */
    @Modifying
    @Query("UPDATE OtpVerification o SET o.attempts = o.attempts + 1 WHERE o.id = :id")
    int incrementAttempts(@Param("id") Long id);

    /** Cleanup expired OTPs — run via scheduled job. */
    @Modifying
    @Query("DELETE FROM OtpVerification o WHERE o.expiresAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}
