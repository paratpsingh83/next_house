package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.AuthResponseDTO;
import com.NextHouse.dto.response.TokenResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.AuthService;
import com.NextHouse.util.CookieUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController — /api/v1/auth
 *
 * All endpoints are PUBLIC (no JWT required) except:
 *   - /logout, /logout-all  → requires valid JWT
 *   - /password/change      → requires valid JWT
 *   - /2fa/**               → requires valid JWT
 *
 * Cookie strategy (dual-mode):
 *   On successful auth (login / register / oauth2 / 2FA / refresh), the server sets:
 *     - nh_access  (httpOnly, Strict, 15 min)   — used by web browsers automatically
 *     - nh_refresh (httpOnly, Strict, 30 days)  — scoped to /api/v1/auth/refresh-token
 *   Mobile clients can still use the tokens from the response body with Bearer headers.
 *   On logout, both cookies are cleared (maxAge=0).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registration, login, token refresh, OTP, OAuth2, 2FA")
public class AuthController {

    private final AuthService authService;
    private final CookieUtil  cookieUtil;

    // ─── Register ─────────────────────────────────────────────────────────────

    @PostMapping("/register")
    @SecurityRequirements
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
            @Valid @RequestBody RegisterRequestDTO dto,
            HttpServletResponse response) {
        AuthResponseDTO auth = authService.register(dto);
        addAuthCookies(response, auth);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Registration successful", auth));
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
            @Valid @RequestBody LoginRequestDTO dto,
            HttpServletResponse response) {
        AuthResponseDTO auth = authService.login(dto);
        // Only set cookies when 2FA is not required (real tokens are present)
        if (!Boolean.TRUE.equals(auth.getTwoFactorRequired())) {
            addAuthCookies(response, auth);
        }
        return ResponseEntity.ok(ApiResponseDTO.success("Login successful", auth));
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
            @RequestHeader(value = "X-Device-Id", required = false) String deviceId,
            HttpServletResponse response) {
        authService.logout(currentUserId, deviceId);
        clearAuthCookies(response);
        return ResponseEntity.ok(ApiResponseDTO.success("Logged out successfully"));
    }

    @PostMapping("/logout-all")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Logout from all devices",
        description = "Revokes ALL refresh tokens for this user across all devices. Use after a password change or security concern."
    )
    public ResponseEntity<ApiResponseDTO<Void>> logoutAllDevices(
            @CurrentUser Long currentUserId,
            HttpServletResponse response) {
        authService.logoutAllDevices(currentUserId);
        clearAuthCookies(response);
        return ResponseEntity.ok(ApiResponseDTO.success("Logged out from all devices"));
    }

    // ─── Token refresh ────────────────────────────────────────────────────────

    @PostMapping("/refresh-token")
    @SecurityRequirements
    @Operation(
        summary = "Refresh access token",
        description = "Exchanges a valid refresh token for a new access + refresh token pair (rotation). " +
                      "Web clients supply the token via the nh_refresh httpOnly cookie; " +
                      "mobile clients send it in the request body."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Tokens refreshed"),
        @ApiResponse(responseCode = "401", description = "Refresh token invalid, expired, or revoked")
    })
    public ResponseEntity<ApiResponseDTO<TokenResponseDTO>> refreshToken(
            @RequestBody(required = false) RefreshTokenRequestDTO dto,
            HttpServletRequest request,
            HttpServletResponse response) {

        if (dto == null) dto = new RefreshTokenRequestDTO();

        // Prefer body token (mobile); fall back to nh_refresh cookie (web)
        if (!StringUtils.hasText(dto.getRefreshToken())) {
            dto.setRefreshToken(extractCookieValue(request, "nh_refresh"));
        }

        TokenResponseDTO tokens = authService.refreshToken(dto);
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.accessCookie(tokens.getAccessToken()).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.refreshCookie(tokens.getRefreshToken()).toString());
        return ResponseEntity.ok(ApiResponseDTO.success("Token refreshed", tokens));
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
        description = """
            Verifies the OTP code. Locks after 5 failed attempts (request a new OTP to reset).

            **2FA shortcut:** if `twoFactorToken` is included in the body (from the login response),
            this call also completes the 2FA login and returns full auth tokens instead of null.
            """
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "OTP verified"),
        @ApiResponse(responseCode = "400", description = "Invalid OTP"),
        @ApiResponse(responseCode = "429", description = "Too many attempts")
    })
    public ResponseEntity<ApiResponseDTO<?>> verifyOtp(
            @Valid @RequestBody OtpVerifyRequestDTO dto,
            HttpServletResponse response) {
        if (StringUtils.hasText(dto.getTwoFactorToken())) {
            AuthResponseDTO auth = authService.verifyTwoFactor(dto.getTwoFactorToken(), dto.getOtp());
            addAuthCookies(response, auth);
            return ResponseEntity.ok(ApiResponseDTO.success("2FA verified", auth));
        }
        String resetToken = authService.verifyOtp(dto);
        return ResponseEntity.ok(ApiResponseDTO.success("OTP verified successfully", resetToken));
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
            @Valid @RequestBody ChangePasswordRequestDTO dto,
            HttpServletResponse response) {
        authService.changePassword(currentUserId, dto);
        clearAuthCookies(response);
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
            @Valid @RequestBody OAuth2LoginRequestDTO dto,
            HttpServletResponse response) {
        AuthResponseDTO auth = authService.oauth2Login(dto);
        addAuthCookies(response, auth);
        return ResponseEntity.ok(ApiResponseDTO.success("OAuth2 login successful", auth));
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
    @SecurityRequirements
    @Operation(
        summary = "Complete 2FA login",
        description = "Called after a login that returned `twoFactorRequired: true`. Verifies the OTP and issues real tokens."
    )
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> verifyTwoFactor(
            @RequestParam String twoFactorToken,
            @RequestParam String otp,
            HttpServletResponse response) {
        AuthResponseDTO auth = authService.verifyTwoFactor(twoFactorToken, otp);
        addAuthCookies(response, auth);
        return ResponseEntity.ok(ApiResponseDTO.success("2FA verified", auth));
    }

    // ─── Cookie helpers ───────────────────────────────────────────────────────

    private void addAuthCookies(HttpServletResponse response, AuthResponseDTO auth) {
        if (auth.getAccessToken() != null) {
            response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.accessCookie(auth.getAccessToken()).toString());
        }
        if (auth.getRefreshToken() != null) {
            response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.refreshCookie(auth.getRefreshToken()).toString());
        }
    }

    private void clearAuthCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.clearAccessCookie().toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieUtil.clearRefreshCookie().toString());
    }

    private static String extractCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }
}
