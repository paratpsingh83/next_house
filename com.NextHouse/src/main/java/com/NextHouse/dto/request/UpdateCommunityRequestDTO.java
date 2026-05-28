package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCommunityRequestDTO {

    @Size(min = 3, max = 150)
    private String name;

    @Size(max = 3000)
    private String description;

    private Boolean privateCommunity;
    private String coverImage;
    private String iconImage;
    private String communityType;
}
