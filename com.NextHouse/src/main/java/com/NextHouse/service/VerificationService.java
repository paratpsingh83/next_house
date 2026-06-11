package com.NextHouse.service;

import org.springframework.web.multipart.MultipartFile;

public interface VerificationService {

    /**
     * Verify identity using UIDAI Aadhaar Offline XML.
     * User downloads the ZIP from myaadhaar.uidai.gov.in and provides
     * the 4-digit share code they set during download.
     */
    void verifyAadhaarXml(Long userId, MultipartFile file, String shareCode);

    /**
     * Verify identity using a selfie + photo of any government ID.
     * Images are stored securely and the user is marked verified.
     */
    void verifyKyc(Long userId, org.springframework.web.multipart.MultipartFile idPhoto, org.springframework.web.multipart.MultipartFile selfie);

    /**
     * Generate DigiLocker OAuth URL for address verification.
     * The state parameter embeds the userId so the callback can look up the user.
     */
    String getDigiLockerAuthUrl(Long userId);

    /**
     * Handle DigiLocker OAuth callback.
     * Exchanges auth code for token, fetches issued documents, marks address verified.
     */
    void handleDigiLockerCallback(String code, String state);
}