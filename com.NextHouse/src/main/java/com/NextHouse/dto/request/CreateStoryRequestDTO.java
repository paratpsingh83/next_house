package com.NextHouse.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStoryRequestDTO {

    private String mediaUrl;

    private Long mediaId;       // optional — used to attach uploaded media to this story

    @NotBlank
    private String mediaType;   // IMAGE | VIDEO | TEXT

    @Size(max = 500)
    private String textContent;

    private String backgroundColor;
}