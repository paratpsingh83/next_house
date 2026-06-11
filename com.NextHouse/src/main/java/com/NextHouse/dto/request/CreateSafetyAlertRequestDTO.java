package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSafetyAlertRequestDTO {

    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

    @Size(max = 3000)
    private String description;

    private String alertType;

    @NotBlank(message = "Severity is required")
    private String severity;

    @Builder.Default
    private Boolean emergency = false;
    private Long communityId;
    private Long neighborhoodId;

    private Double latitude;
    private Double longitude;
    private String address;
}
