package com.NextHouse.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateReviewRequestDTO {

    @NotNull
    @Min(1) @Max(5)
    private Short rating;

    @Size(max = 1000)
    private String comment;
}
