package com.NextHouse.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpRequestDTO {

    private String phone;
    private String email;

    @NotBlank(message = "Purpose is required")
    private String purpose;
}
