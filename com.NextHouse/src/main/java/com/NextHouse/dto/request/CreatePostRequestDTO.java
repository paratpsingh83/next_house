package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePostRequestDTO {

    @NotBlank(message = "Post type is required")
    private String postType;

    @NotBlank(message = "Content is required")
    @Size(max = 5000, message = "Post content cannot exceed 5000 characters")
    private String content;

    private Long communityId;
    private Long neighborhoodId;

    @Min(100)
    @Max(50000)
    private Integer visibilityRadius;

    @Builder.Default
    private Boolean anonymous = false;

    // Media IDs already uploaded via /api/v1/media/upload
    private java.util.List<Long> mediaIds;

    // Hashtags extracted from content (or provided by client)
    private java.util.List<String> hashtags;

    // Location of the post
    private Double latitude;
    private Double longitude;
    private String address;
}
