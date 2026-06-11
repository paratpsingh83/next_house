package com.NextHouse.dto.request;

import com.NextHouse.constant.ActivityType;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateActivityRequestDTO {

    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

    @Size(max = 3000)
    private String description;

    @NotNull(message = "Activity type is required")
    private ActivityType activityType;

    @NotNull(message = "Activity time is required")
    @Future(message = "Activity time must be in the future")
    private LocalDateTime activityTime;

    private LocalDateTime endTime;

    @Min(2)
    @Max(10000)
    private Integer maxMembers;

    @Builder.Default
    private Boolean privateActivity  = false;
    @Builder.Default
    private Boolean approvalRequired = false;

    private Long communityId;
    private Long neighborhoodId;

    @NotNull
    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private Double latitude;

    @NotNull
    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private Double longitude;

    private String address;
    private String coverImage;
}
