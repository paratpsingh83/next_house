package com.NextHouse.dto.response;

import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NeighborhoodSummaryDTO {
    private Long id;
    private String name;
    private String city;
    private String state;
    private String country;
    private String postalCode;
}
