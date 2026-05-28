package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PostResponseDTO {
    private Long id;
    private String postType;
    private String content;
    private String status;
    private Integer visibilityRadius;
    private Boolean anonymous;
    private Boolean edited;

    private Integer likeCount;
    private Integer commentCount;
    private Integer shareCount;

    private String hashtagString;
    private String thumbnailUrl;

    // Geo
    private Double latitude;
    private Double longitude;
    private String address;

    // Author — null if anonymous=true
    private UserSummaryDTO createdBy;

    // Scope
    private CommunitySummaryDTO community;
    private NeighborhoodSummaryDTO neighborhood;

    // Media attached to this post
    private List<MediaFileResponseDTO> media;

    // Reaction summary
    private List<ReactionSummaryDTO> reactions;

    // Context for requesting user
    private Boolean isLiked;
    private Boolean isSaved;
    private String myReactionType;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
