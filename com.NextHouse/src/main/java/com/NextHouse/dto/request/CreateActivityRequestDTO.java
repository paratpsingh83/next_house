package com.NextHouse.dto.request;

import com.NextHouse.constant.ActivityType;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * FIX: activityType was String.
 *
 * Activity.activityType field is ActivityType ENUM:
 *   SOCIAL, SPORTS, LEARNING, VOLUNTEERING, FOOD, ARTS, OUTDOOR, NEIGHBORHOOD_WATCH, OTHER
 *
 * MapStruct CANNOT auto-convert String → Enum.
 * ActivityMapper.toEntity() would fail at compile time with:
 *   "Can't map property String activityType to ActivityType activityType"
 *
 * Also: ActivityServiceImpl calls dto.getActivityType().toString()
 * which proves dto.activityType must be ActivityType (has .toString() returning name).
 *
 * FIX: Change activityType from String to ActivityType enum.
 * Jackson automatically deserializes "SOCIAL" (JSON string) → ActivityType.SOCIAL.
 * No controller or service changes needed.
 *
 * Validation changed: @NotBlank (String) → @NotNull (enum can't be blank)
 */
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

    // FIX: was String — MapStruct cannot auto-convert String to ActivityType enum
    @NotNull(message = "Activity type is required")
    private ActivityType activityType;

    @NotNull(message = "Activity time is required")
    @Future(message = "Activity time must be in the future")
    private LocalDateTime activityTime;

    private LocalDateTime endTime;

    @Min(2)
    @Max(10000)
    private Integer maxMembers;

    private Boolean privateActivity  = false;
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
