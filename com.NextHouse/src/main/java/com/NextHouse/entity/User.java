package com.NextHouse.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_user_username",       columnList = "username"),
                @Index(name = "idx_user_email",          columnList = "email"),
                @Index(name = "idx_user_phone",          columnList = "phone_number"),
                @Index(name = "idx_user_account_status", columnList = "account_status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class User extends GeoBaseEntity {   // ← FIX: was "extends BaseEntity"

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "username", unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "phone_number", unique = true, nullable = true, length = 20)
    private String phoneNumber;

    @Column(name = "email", unique = true, length = 150)
    private String email;

    @Column(name = "password")
    private String password;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "profile_image", length = 500)
    private String profileImage;

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "dob")
    private LocalDate dob;

    @Builder.Default
    @Column(name = "role", nullable = false, length = 20)
    private String role = "USER";

    @Builder.Default
    @Column(name = "verification_status", length = 30)
    private String verificationStatus = "UNVERIFIED";

    @Builder.Default
    @Column(name = "account_status", length = 20)
    private String accountStatus = "ACTIVE";

    @Builder.Default
    @Column(name = "trust_score", nullable = false)
    private Integer trustScore = 0;

    @Builder.Default
    @Column(name = "address_verified", nullable = false)
    private Boolean addressVerified = false;

    @Column(name = "address_doc_type", length = 50)
    private String addressDocType;

    @Column(name = "address_doc_media_id")
    private Long addressDocMediaId;

    @Builder.Default
    @Column(name = "identity_verified", nullable = false)
    private Boolean identityVerified = false;

    @Column(name = "identity_doc_type", length = 50)
    private String identityDocType;

    @Column(name = "identity_doc_media_id")
    private Long identityDocMediaId;

    @Column(name = "kyc_name", length = 200)
    private String kycName;

    @Column(name = "kyc_dob", length = 20)
    private String kycDob;

    @Column(name = "kyc_gender", length = 10)
    private String kycGender;

    @Column(name = "kyc_verified_at")
    private java.time.LocalDateTime kycVerifiedAt;

    @Column(name = "digilocker_state", length = 100)
    private String digilockerState;

    @Builder.Default
    @Column(name = "banned", nullable = false)
    private Boolean banned = false;

    @Builder.Default
    @Column(name = "two_factor_enabled", nullable = false)
    private Boolean twoFactorEnabled = false;

    @Builder.Default
    @Column(name = "is_private", nullable = false)
    private Boolean isPrivate = false;

    @Column(name = "last_location_updated_at")
    private LocalDateTime lastLocationUpdatedAt;
}
