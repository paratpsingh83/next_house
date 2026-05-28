package com.NextHouse.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OAuth2LoginRequestDTO {

    @NotBlank(message = "Provider is required")
    private String provider;

    @NotBlank(message = "ID token is required")
    private String idToken;

    private String deviceId;
    private String deviceType;
    private String deviceToken;
}
