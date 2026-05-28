package com.NextHouse.entity;

import com.NextHouse.constant.OtpPurpose;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "otp_verifications",
        indexes = {
                @Index(name = "idx_otp_phone_purpose", columnList = "phone, purpose"),
                @Index(name = "idx_otp_email_purpose", columnList = "email, purpose"),
                @Index(name = "idx_otp_expires", columnList = "expires_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OtpVerification extends BaseEntity {

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    /**
     * Hashed OTP value (never store plaintext OTPs).
     */
    @Column(name = "otp", nullable = false, length = 200)
    private String otp;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private OtpPurpose purpose;

    @Column(name = "verified", nullable = false)
    private Boolean verified = false;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "attempts", nullable = false)
    private Integer attempts = 0;

    @Column(name = "used_at")
    private LocalDateTime usedAt;
}
