package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ActivityResponseDTO {
    private Long id;
    private String title;
    private String description;
    private String activityType;
    private String status;
    private LocalDateTime activityTime;
    private LocalDateTime endTime;
    private Integer maxMembers;
    private Integer currentMemberCount; // computed from DB
    private Boolean privateActivity;
    private Boolean approvalRequired;
    private String coverImage;

    private Double latitude;
    private Double longitude;
    private String address;
    private Double distanceMeters; // populated in nearby searches

    private UserSummaryDTO hostUser;
    private CommunitySummaryDTO community;
    private NeighborhoodSummaryDTO neighborhood;

    // Context for requesting user
    private String myJoinStatus; // NONE | PENDING | APPROVED | REJECTED
    private Boolean isHost;

    private LocalDateTime createdAt;
}
