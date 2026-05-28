package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateActivityRequestDTO {

    @Size(max = 200)
    private String title;

    @Size(max = 3000)
    private String description;

    @Future
    private LocalDateTime activityTime;
    private LocalDateTime endTime;

    @Min(2)
    @Max(10000)
    private Integer maxMembers;

    private Boolean privateActivity;
    private Boolean approvalRequired;
    private String coverImage;
    private String status;
}
