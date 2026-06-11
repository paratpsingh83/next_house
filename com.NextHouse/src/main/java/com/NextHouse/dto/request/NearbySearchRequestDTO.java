package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbySearchRequestDTO {

    @NotNull
    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private Double latitude;

    @NotNull
    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private Double longitude;

    /**
     * Search radius in meters. Default 5000 (5 km). Max 50000 (50 km).
     */
    @Min(100)
    @Max(50000)
    @Builder.Default
    private int radiusMeters = 5000;
}
