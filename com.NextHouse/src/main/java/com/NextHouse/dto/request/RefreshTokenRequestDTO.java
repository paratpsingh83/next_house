package com.NextHouse.dto.request;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenRequestDTO {

    // Optional — web clients supply via nh_refresh httpOnly cookie; mobile clients send in body
    private String refreshToken;

    private String deviceId;
}
