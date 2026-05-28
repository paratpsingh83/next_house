package com.NextHouse.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactPostRequestDTO {

    @NotBlank
    private String reactionType; // LIKE | HEART | HELPFUL | CELEBRATE | CURIOUS
}
