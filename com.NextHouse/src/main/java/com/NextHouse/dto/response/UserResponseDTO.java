package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * FIX: Added phoneNumber field.
 *
 * phoneNumber was missing from the response DTO.
 * It is needed by:
 *   - Frontend 2FA enable screen: shows masked phone "Verify +60 *** *** 456"
 *   - Profile view: displays contact information
 *   - Admin panel: user management lookup
 *
 * All other fields remain unchanged.
 * online + lastSeen are still populated by UserServiceImpl.buildUserResponse()
 * (not the mapper, because presence data comes from a separate table/Redis).
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponseDTO {
    private Long          id;
    private String        name;
    private String        username;
    private String        phoneNumber;      // FIX: was missing
    private String        profileImage;
    private String        bio;
    private String        gender;
    private LocalDate     dob;
    private String        verificationStatus;
    private String        accountStatus;
    private Integer       trustScore;
    private Boolean       addressVerified;
    private Boolean       identityVerified;
    private Boolean       online;           // from UserPresence — set by service
    private LocalDateTime lastSeen;         // from UserPresence — set by service
    private Long          followerCount;
    private Long          followingCount;
    private Boolean       isFollowing;
    private Boolean       isFollowedBy;
    private Boolean       isBlocked;
    private LocalDateTime createdAt;
}
