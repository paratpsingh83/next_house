package com.NextHouse.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddReactionRequestDTO {
    @NotBlank
    @Size(max = 10)
    private String emoji;
}
