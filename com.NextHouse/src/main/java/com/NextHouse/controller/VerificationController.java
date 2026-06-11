package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.VerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/verification")
@RequiredArgsConstructor
@Tag(name = "Verification", description = "KYC — Aadhaar Offline XML + DigiLocker address verification")
public class VerificationController {

    private final VerificationService verificationService;

    @Value("${digilocker.frontend-success-url}")
    private String frontendSuccessUrl;

    @Value("${digilocker.frontend-error-url}")
    private String frontendErrorUrl;

    // ─── Identity — Selfie + ID Photo ────────────────────────────────────────

    @PostMapping(value = "/identity/kyc", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Verify identity via Selfie + ID photo",
        description = """
            Upload a photo of any government-issued ID (Aadhaar / PAN / Driving License)
            and a selfie. Both images must be JPEG or PNG and under 10 MB.
            On success: identityVerified = true, +20 trust score.
            """
    )
    public ResponseEntity<ApiResponseDTO<Map<String, Object>>> verifyKyc(
            @CurrentUser Long currentUserId,
            @RequestPart("idPhoto") MultipartFile idPhoto,
            @RequestPart("selfie")  MultipartFile selfie) {

        verificationService.verifyKyc(currentUserId, idPhoto, selfie);
        return ResponseEntity.ok(ApiResponseDTO.success(
            "Identity verified successfully",
            Map.of("identityVerified", true, "trustScoreAdded", 20)
        ));
    }

    // ─── Identity — Aadhaar Offline XML ──────────────────────────────────────

    @PostMapping(value = "/identity/aadhaar-xml", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Verify identity via Aadhaar Offline XML",
        description = """
            Upload the password-protected ZIP downloaded from myaadhaar.uidai.gov.in.
            Provide the 4-digit share code you set during download.
            The backend verifies UIDAI's digital signature — no manual review needed.
            On success: identityVerified = true, verificationStatus = VERIFIED, +20 trust score.
            """
    )
    public ResponseEntity<ApiResponseDTO<Map<String, Object>>> verifyAadhaarXml(
            @CurrentUser Long currentUserId,
            @RequestPart("file")      MultipartFile file,
            @RequestPart("shareCode") String shareCode) {

        verificationService.verifyAadhaarXml(currentUserId, file, shareCode.trim());
        return ResponseEntity.ok(ApiResponseDTO.success(
            "Identity verified successfully via Aadhaar",
            Map.of("identityVerified", true, "trustScoreAdded", 20)
        ));
    }

    // ─── Address — DigiLocker OAuth ──────────────────────────────────────────

    @GetMapping("/address/digilocker/init")
    @Operation(
        summary = "Get DigiLocker OAuth URL",
        description = "Returns the URL to redirect the user to for DigiLocker login. Open this URL in the browser."
    )
    public ResponseEntity<ApiResponseDTO<Map<String, String>>> initDigiLocker(
            @CurrentUser Long currentUserId) {

        String url = verificationService.getDigiLockerAuthUrl(currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("DigiLocker URL generated", Map.of("url", url)));
    }

    @GetMapping("/address/digilocker/callback")
    @Operation(
        summary = "DigiLocker OAuth callback (public)",
        description = "Called by DigiLocker after user authorizes. Verifies address and redirects to frontend."
    )
    public RedirectView digiLockerCallback(
            @RequestParam("code")  String code,
            @RequestParam("state") String state) {

        try {
            verificationService.handleDigiLockerCallback(code, state);
            return new RedirectView(frontendSuccessUrl);
        } catch (Exception e) {
            return new RedirectView(frontendErrorUrl);
        }
    }
}