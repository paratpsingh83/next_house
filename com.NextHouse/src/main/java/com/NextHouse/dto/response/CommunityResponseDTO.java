package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CommunityResponseDTO {
    private Long id;
    private String name;
    private String description;
    private String communityType;
    private String coverImage;
    private String iconImage;
    private Boolean privateCommunity;
    private Boolean verified;
    private Long memberCount; // live from DB

    private UserSummaryDTO createdBy;
    private NeighborhoodSummaryDTO neighborhood;
    private CommunitySummaryDTO parentCommunity;

    // Context for requesting user
    private String myRole;    // OWNER | ADMIN | MODERATOR | MEMBER | null
    private Boolean isMember;
    private Boolean isPending;

    private LocalDateTime createdAt;
}
