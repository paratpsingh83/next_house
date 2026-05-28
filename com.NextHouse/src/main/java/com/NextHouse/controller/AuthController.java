package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.AuthResponseDTO;
import com.NextHouse.dto.response.TokenResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController — /api/v1/auth
 *
 * All endpoints are PUBLIC (no JWT required) except:
 *   - /logout, /logout-all  → requires valid JWT
 *   - /password/change      → requires valid JWT
 *   - /2fa/**               → requires valid JWT
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registration, login, token refresh, OTP, OAuth2, 2FA")
public class AuthController {

    private final AuthService authService;

    // ─── Register ─────────────────────────────────────────────────────────────

    @PostMapping("/register")
    @SecurityRequirements   // public — no JWT needed
    @Operation(
        summary = "Register a new user",
        description = """
            Creates a new user account and returns JWT tokens.
            Optionally accepts GPS coordinates to auto-assign the user's neighborhood.
            An FCM device token can be provided to enable push notifications immediately.
            """
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "User registered successfully"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "409", description = "Username / email / phone already exists")
    })
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> register(
            @Valid @RequestBody RegisterRequestDTO dto) {
        AuthResponseDTO response = authService.register(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Registration successful", response));
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(
        summary = "Login with email / phone / username + password",
        description = """
            Returns access token (15 min) and refresh token (30 days).
            If 2FA is enabled, returns `twoFactorRequired: true` and a short-lived
            `twoFactorToken` instead of real tokens. Complete 2FA via `POST /auth/2fa/verify`.
            """
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Login successful"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
        @ApiResponse(responseCode = "403", description = "Account banned")
    })
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> login(
            @Valid @RequestBody LoginRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Login successful", authService.login(dto)));
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Logout from current device",
        description = "Revokes the refresh token for the current device. Access token remains valid until expiry (15 min)."
    )
    public ResponseEntity<ApiResponseDTO<Void>> logout(
            @CurrentUser Long currentUserId,
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId) {
        authService.logout(currentUserId, deviceId);
        return ResponseEntity.ok(ApiResponseDTO.success("Logged out successfully"));
    }

    @PostMapping("/logout-all")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Logout from all devices",
        description = "Revokes ALL refresh tokens for this user across all devices. Use after a password change or security concern."
    )
    public ResponseEntity<ApiResponseDTO<Void>> logoutAllDevices(@CurrentUser Long currentUserId) {
        authService.logoutAllDevices(currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Logged out from all devices"));
    }

    // ─── Token refresh ────────────────────────────────────────────────────────

    @PostMapping("/refresh-token")
    @SecurityRequirements
    @Operation(
        summary = "Refresh access token",
        description = "Exchanges a valid refresh token for a new access + refresh token pair (rotation). The old refresh token is invalidated."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Tokens refreshed"),
        @ApiResponse(responseCode = "401", description = "Refresh token invalid, expired, or revoked")
    })
    public ResponseEntity<ApiResponseDTO<TokenResponseDTO>> refreshToken(
            @Valid @RequestBody RefreshTokenRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Token refreshed", authService.refreshToken(dto)));
    }

    // ─── OTP ──────────────────────────────────────────────────────────────────

    @PostMapping("/otp/request")
    @SecurityRequirements
    @Operation(
        summary = "Request an OTP",
        description = """
            Sends a 6-digit OTP via SMS (if phone provided) or email.
            
            **Purposes:**
            - `REGISTRATION` — verify phone/email after sign-up
            - `LOGIN` — OTP-based login
            - `PASSWORD_RESET` — initiate password reset
            - `PHONE_VERIFICATION` — verify phone number
            - `TWO_FACTOR_AUTH` — 2FA verification
            
            Rate limited to **5 requests/min** per IP.
            """
    )
    public ResponseEntity<ApiResponseDTO<Void>> requestOtp(
            @Valid @RequestBody OtpRequestDTO dto) {
        authService.requestOtp(dto);
        return ResponseEntity.ok(ApiResponseDTO.success("OTP sent successfully"));
    }

    @PostMapping("/otp/verify")
    @SecurityRequirements
    @Operation(
        summary = "Verify an OTP",
        description = "Verifies the OTP code. Locks after 5 failed attempts (request a new OTP to reset)."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "OTP verified"),
        @ApiResponse(responseCode = "400", description = "Invalid OTP"),
        @ApiResponse(responseCode = "429", description = "Too many attempts")
    })
    public ResponseEntity<ApiResponseDTO<Void>> verifyOtp(
            @Valid @RequestBody OtpVerifyRequestDTO dto) {
        authService.verifyOtp(dto);
        return ResponseEntity.ok(ApiResponseDTO.success("OTP verified successfully"));
    }

    // ─── Password ─────────────────────────────────────────────────────────────

    @PostMapping("/password/forgot")
    @SecurityRequirements
    @Operation(
        summary = "Request password reset",
        description = "Sends a password reset OTP to the user's registered phone or email."
    )
    public ResponseEntity<ApiResponseDTO<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDTO dto) {
        authService.forgotPassword(dto);
        return ResponseEntity.ok(ApiResponseDTO.success("Password reset OTP sent"));
    }

    @PostMapping("/password/reset")
    @SecurityRequirements
    @Operation(
        summary = "Reset password using token",
        description = "Sets a new password using the reset token obtained after OTP verification. Revokes all existing sessions."
    )
    public ResponseEntity<ApiResponseDTO<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDTO dto) {
        authService.resetPassword(dto);
        return ResponseEntity.ok(ApiResponseDTO.success("Password reset successfully"));
    }

    @PostMapping("/password/change")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Change password (authenticated)", description = "Requires current password. Revokes all sessions after change.")
    public ResponseEntity<ApiResponseDTO<Void>> changePassword(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody ChangePasswordRequestDTO dto) {
        authService.changePassword(currentUserId, dto);
        return ResponseEntity.ok(ApiResponseDTO.success("Password changed successfully. Please log in again."));
    }

    // ─── OAuth2 ───────────────────────────────────────────────────────────────

    @PostMapping("/oauth2")
    @SecurityRequirements
    @Operation(
        summary = "Social login (Google / Facebook / Apple)",
        description = """
            Verifies the `idToken` with the specified provider.
            Auto-registers the user if no account exists for the email.
            Returns standard auth tokens on success.
            """
    )
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> oauth2Login(
            @Valid @RequestBody OAuth2LoginRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("OAuth2 login successful", authService.oauth2Login(dto)));
    }

    // ─── 2FA ──────────────────────────────────────────────────────────────────

    @PostMapping("/2fa/enable")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Enable two-factor authentication", description = "Requires a verified phone number on the account.")
    public ResponseEntity<ApiResponseDTO<Void>> enableTwoFactor(@CurrentUser Long currentUserId) {
        authService.enableTwoFactor(currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("2FA enabled successfully"));
    }

    @PostMapping("/2fa/disable")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Disable two-factor authentication")
    public ResponseEntity<ApiResponseDTO<Void>> disableTwoFactor(@CurrentUser Long currentUserId) {
        authService.disableTwoFactor(currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("2FA disabled successfully"));
    }

    @PostMapping("/2fa/verify")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Complete 2FA login",
        description = "Called after a login that returned `twoFactorRequired: true`. Verifies the OTP and issues real tokens."
    )
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> verifyTwoFactor(
            @CurrentUser Long currentUserId,
            @RequestParam String otp) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("2FA verified", authService.verifyTwoFactor(currentUserId, otp)));
    }
}
