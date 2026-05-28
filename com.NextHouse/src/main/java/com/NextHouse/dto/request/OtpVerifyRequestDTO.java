package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerifyRequestDTO {

    private String phone;
    private String email;

    @NotBlank(message = "OTP is required")
    @Size(min = 4, max = 8, message = "Invalid OTP length")
    private String otp;

    @NotBlank(message = "Purpose is required")
    private String purpose;
}
