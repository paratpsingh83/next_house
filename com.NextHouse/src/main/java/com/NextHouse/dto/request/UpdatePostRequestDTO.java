package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePostRequestDTO {

    @NotBlank(message = "Content is required")
    @Size(max = 5000)
    private String content;

    private java.util.List<String> hashtags;
    private Integer visibilityRadius;
}
