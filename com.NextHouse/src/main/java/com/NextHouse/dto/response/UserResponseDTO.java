package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponseDTO {
    private Long          id;
    private String        name;
    private String        username;
    private String        phoneNumber;
    private String        profileImage;
    private String        bio;
    private String        gender;
    private LocalDate     dob;
    private String        address;
    private String        role;
    private String        verificationStatus;
    private String        accountStatus;
    private Integer       trustScore;
    private Boolean       addressVerified;
    private Boolean       identityVerified;
    private Boolean       online;           // from UserPresence — set by service
    private LocalDateTime lastSeen;         // from UserPresence — set by service
    private Long          followerCount;
    private Long          followingCount;
    private Boolean       isPrivate;
    private Boolean       isFollowing;
    private Boolean       isFollowedBy;
    private Boolean       isBlocked;
    private Boolean       isRequested;
    private String        kycName;
    private LocalDateTime createdAt;
}
