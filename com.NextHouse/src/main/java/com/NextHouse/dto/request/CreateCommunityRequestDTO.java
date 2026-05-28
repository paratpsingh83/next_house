package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommunityRequestDTO {

    @NotBlank(message = "Community name is required")
    @Size(min = 3, max = 150)
    private String name;

    @Size(max = 3000)
    private String description;

    @NotBlank(message = "Community type is required")
    private String communityType;

    private Boolean privateCommunity = false;
    private Long neighborhoodId;
    private Long parentCommunityId;
    private String coverImage;
    private String iconImage;
}
