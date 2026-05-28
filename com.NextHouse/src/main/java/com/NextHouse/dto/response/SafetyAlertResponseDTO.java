package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SafetyAlertResponseDTO {
    private Long id;
    private String title;
    private String description;
    private String alertType;
    private String severity;
    private Boolean emergency;
    private Boolean verified;
    private Double latitude;
    private Double longitude;
    private String address;
    private Double distanceMeters;
    private LocalDateTime resolvedAt;
    private UserSummaryDTO reportedBy;
    private UserSummaryDTO resolvedBy;
    private NeighborhoodSummaryDTO neighborhood;
    private LocalDateTime createdAt;
}
