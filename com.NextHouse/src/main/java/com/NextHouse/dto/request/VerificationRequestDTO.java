package com.NextHouse.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class VerificationRequestDTO {

    @NotBlank(message = "Document type is required")
    private String docType;

    @NotNull(message = "Document media ID is required")
    private Long mediaId;
}