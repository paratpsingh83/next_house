package com.NextHouse.dto.response;

import lombok.*;

/**
 * Lightweight community embed for other responses.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunitySummaryDTO {
    private Long id;
    private String name;
    private String iconImage;
    private String communityType;
}
