package com.NextHouse.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateRepostRequestDTO {
    @Size(max = 2000)
    private String content; // optional caption
}
