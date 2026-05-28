package com.NextHouse.service;

import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.AuthResponseDTO;
import com.NextHouse.dto.response.TokenResponseDTO;

public interface AuthService {

    AuthResponseDTO register(RegisterRequestDTO dto);

    AuthResponseDTO login(LoginRequestDTO dto);

    void logout(Long currentUserId, String deviceId);

    void logoutAllDevices(Long currentUserId);

    TokenResponseDTO refreshToken(RefreshTokenRequestDTO dto);

    void requestOtp(OtpRequestDTO dto);

    void verifyOtp(OtpVerifyRequestDTO dto);

    void forgotPassword(ForgotPasswordRequestDTO dto);

    void resetPassword(ResetPasswordRequestDTO dto);

    void changePassword(Long currentUserId, ChangePasswordRequestDTO dto);

    AuthResponseDTO oauth2Login(OAuth2LoginRequestDTO dto);

    void enableTwoFactor(Long currentUserId);

    void disableTwoFactor(Long currentUserId);

    AuthResponseDTO verifyTwoFactor(Long currentUserId, String otp);
}
