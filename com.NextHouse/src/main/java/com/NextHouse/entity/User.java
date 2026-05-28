package com.NextHouse.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * FIX: User was "extends BaseEntity".
 *
 * MUST be "extends GeoBaseEntity" because these service methods call
 * geo setters/getters that do not exist on BaseEntity:
 *
 *   UserServiceImpl.updateLocation():
 *     user.setLatitude()   ← COMPILE ERROR without GeoBaseEntity
 *     user.setLongitude()  ← COMPILE ERROR
 *     user.setAddress()    ← COMPILE ERROR
 *     user.setCity()       ← COMPILE ERROR
 *     user.setState()      ← COMPILE ERROR
 *     user.setZipCode()    ← COMPILE ERROR
 *     user.setLocation()   ← COMPILE ERROR
 *
 *   UserServiceImpl.updateProfile():
 *     user.setLocation()   ← COMPILE ERROR
 *
 *   AuthServiceImpl.register():
 *     user.setLatitude()   ← COMPILE ERROR
 *     user.setLongitude()  ← COMPILE ERROR
 *     user.setLocation()   ← COMPILE ERROR
 *
 *   PostServiceImpl.getNearbyFeed():
 *     u.getLatitude()      ← COMPILE ERROR
 *
 *   RecommendationServiceImpl.resolveNeighborhoodId():
 *     u.getLatitude() != null  ← COMPILE ERROR
 *
 * GeoBaseEntity adds: latitude, longitude, address, city, state,
 * country, zipCode, location (geography(Point,4326))
 *
 * DB: Add these columns to the `users` table in your Flyway V2 migration:
 *   latitude   DOUBLE PRECISION,
 *   longitude  DOUBLE PRECISION,
 *   address    VARCHAR(500),
 *   city       VARCHAR(100),
 *   state      VARCHAR(100),
 *   country    VARCHAR(100),
 *   zip_code   VARCHAR(20),
 *   location   geography(Point, 4326)
 */
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

    @Column(name = "phone_number", unique = true, nullable = false, length = 20)
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

    @Builder.Default
    @Column(name = "identity_verified", nullable = false)
    private Boolean identityVerified = false;

    @Builder.Default
    @Column(name = "banned", nullable = false)
    private Boolean banned = false;

    @Builder.Default
    @Column(name = "two_factor_enabled", nullable = false)
    private Boolean twoFactorEnabled = false;

    @Column(name = "last_location_updated_at")
    private LocalDateTime lastLocationUpdatedAt;
}
