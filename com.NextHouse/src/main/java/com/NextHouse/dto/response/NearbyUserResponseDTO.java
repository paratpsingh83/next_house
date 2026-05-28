package com.NextHouse.dto.response;

import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyUserResponseDTO {
    private UserSummaryDTO user;
    private Double distanceMeters;
    private String neighborhoodName;
}
