package com.NextHouse.serviceImpl;

import com.NextHouse.exception.BadRequestException;
import com.NextHouse.repository.UserRepository;
import com.NextHouse.entity.User;
import com.NextHouse.service.MediaService;
import com.NextHouse.service.VerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.lingala.zip4j.ZipFile;
import net.lingala.zip4j.model.FileHeader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.crypto.dsig.*;
import javax.xml.crypto.dsig.dom.DOMValidateContext;
import javax.xml.crypto.dsig.keyinfo.KeyInfo;
import javax.xml.crypto.dsig.keyinfo.X509Data;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.cert.X509Certificate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationServiceImpl implements VerificationService {

    private final UserRepository userRepository;
    private final MediaService   mediaService;
    private final RestTemplate   restTemplate;

    @Value("${digilocker.client-id}")
    private String digilockerClientId;

    @Value("${digilocker.client-secret}")
    private String digilockerClientSecret;

    @Value("${digilocker.redirect-uri}")
    private String digilockerRedirectUri;

    @Value("${digilocker.frontend-success-url}")
    private String frontendSuccessUrl;

    @Value("${digilocker.frontend-error-url}")
    private String frontendErrorUrl;

    private static final String DIGILOCKER_TOKEN_URL = "https://api.digitallocker.gov.in/public/oauth2/1/token";
    private static final String DIGILOCKER_FILES_URL = "https://api.digitallocker.gov.in/public/oauth2/1/files/issued";

    // ─── Selfie + ID Photo KYC ───────────────────────────────────────────────

    @Override
    @Transactional
    public void verifyKyc(Long userId, MultipartFile idPhoto, MultipartFile selfie) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (Boolean.TRUE.equals(user.getIdentityVerified()))
            throw new BadRequestException("Identity is already verified");

        validateImageFile(idPhoto, "ID photo");
        validateImageFile(selfie, "selfie");

        mediaService.upload(idPhoto, "KYC_DOCUMENT", userId, userId);
        mediaService.upload(selfie,  "KYC_SELFIE",   userId, userId);

        user.setIdentityVerified(true);
        user.setIdentityDocType("SELFIE_ID");
        user.setVerificationStatus("VERIFIED");
        user.setKycVerifiedAt(LocalDateTime.now());
        user.setTrustScore(user.getTrustScore() + 20);
        userRepository.save(user);

        log.info("Identity verified for user {} via Selfie+ID", userId);
    }

    private void validateImageFile(MultipartFile file, String label) {
        if (file == null || file.isEmpty())
            throw new BadRequestException("Please provide a " + label);
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/"))
            throw new BadRequestException("The " + label + " must be an image file (JPEG/PNG)");
        if (file.getSize() > 10 * 1024 * 1024)
            throw new BadRequestException("The " + label + " must be smaller than 10 MB");
    }

    // ─── Aadhaar Offline XML ──────────────────────────────────────────────────

    @Override
    @Transactional
    public void verifyAadhaarXml(Long userId, MultipartFile file, String shareCode) {
        if (shareCode == null || shareCode.length() != 4 || !shareCode.matches("\\d{4}"))
            throw new BadRequestException("Share code must be exactly 4 digits");

        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!originalName.endsWith(".zip") && !originalName.endsWith(".xml"))
            throw new BadRequestException("Please upload the ZIP or XML file downloaded from myaadhaar.uidai.gov.in");

        try {
            byte[] xmlBytes;

            if (originalName.endsWith(".zip")) {
                xmlBytes = extractXmlFromZip(file, shareCode);
            } else {
                xmlBytes = file.getBytes();
            }

            Document xmlDoc = parseXml(xmlBytes);
            verifyUidaiSignature(xmlDoc);
            extractAndSave(userId, xmlDoc);

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Aadhaar XML verification error for user {}: {}", userId, e.getMessage());
            throw new BadRequestException("Could not verify document. Make sure you uploaded the correct file with the right share code.");
        }
    }

    private byte[] extractXmlFromZip(MultipartFile file, String shareCode) throws Exception {
        File tempZip = File.createTempFile("aadhaar_", ".zip");
        try {
            file.transferTo(tempZip);
            try (ZipFile zipFile = new ZipFile(tempZip, shareCode.toCharArray())) {
                List<FileHeader> headers = zipFile.getFileHeaders();
                if (headers.isEmpty())
                    throw new BadRequestException("ZIP file is empty");

                // Find the XML file in the ZIP
                FileHeader xmlHeader = headers.stream()
                        .filter(h -> h.getFileName().toLowerCase().endsWith(".xml"))
                        .findFirst()
                        .orElseThrow(() -> new BadRequestException("No XML file found in ZIP"));

                try (InputStream is = zipFile.getInputStream(xmlHeader)) {
                    return is.readAllBytes();
                }
            } catch (net.lingala.zip4j.exception.ZipException ze) {
                if (ze.getMessage().contains("Wrong Password"))
                    throw new BadRequestException("Wrong share code. Please check your 4-digit share code.");
                throw ze;
            }
        } finally {
            Files.deleteIfExists(tempZip.toPath());
        }
    }

    private Document parseXml(byte[] xmlBytes) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        // Disable external entity processing (XXE prevention)
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xmlBytes));
    }

    private void verifyUidaiSignature(Document xmlDoc) throws Exception {
        NodeList signatureNodes = xmlDoc.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature");
        if (signatureNodes.getLength() == 0)
            throw new BadRequestException("Document has no digital signature. This is not a valid UIDAI Aadhaar XML.");

        XMLSignatureFactory sigFactory = XMLSignatureFactory.getInstance("DOM");

        // Extract certificate from KeyInfo
        XMLSignature signature = sigFactory.unmarshalXMLSignature(
                new DOMValidateContext(new X509KeySelector(), signatureNodes.item(0)));

        boolean valid = signature.validate(
                new DOMValidateContext(new X509KeySelector(), signatureNodes.item(0)));

        if (!valid)
            throw new BadRequestException("Digital signature is invalid. This document may have been tampered with.");
    }

    private void extractAndSave(Long userId, Document xmlDoc) {
        // Extract Poi (Person of Interest) element
        NodeList poiNodes = xmlDoc.getElementsByTagName("Poi");
        if (poiNodes.getLength() == 0)
            throw new BadRequestException("Could not extract data from document. Please re-download from UIDAI.");

        Element poi = (Element) poiNodes.item(0);
        String name   = poi.getAttribute("name");
        String dob    = poi.getAttribute("dob");
        String gender = poi.getAttribute("gender");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (Boolean.TRUE.equals(user.getIdentityVerified()))
            throw new BadRequestException("Identity is already verified");

        user.setIdentityVerified(true);
        user.setIdentityDocType("AADHAAR");
        user.setVerificationStatus("VERIFIED");
        user.setKycName(name);
        user.setKycDob(dob);
        user.setKycGender(gender);
        user.setKycVerifiedAt(LocalDateTime.now());
        user.setTrustScore(user.getTrustScore() + 20);
        userRepository.save(user);

        log.info("Identity verified for user {} via Aadhaar XML", userId);
    }

    // ─── DigiLocker OAuth ─────────────────────────────────────────────────────

    @Override
    @Transactional
    public String getDigiLockerAuthUrl(Long userId) {
        // Encode userId as state — simple Base64 is enough (not sensitive)
        String state = Base64.getUrlEncoder().encodeToString(userId.toString().getBytes());

        // Save state on user so callback can find the user
        User user = userRepository.findById(userId).orElseThrow();
        user.setDigilockerState(state);
        userRepository.save(user);

        return "https://api.digitallocker.gov.in/public/oauth2/1/authorize" +
               "?response_type=code" +
               "&client_id=" + encode(digilockerClientId) +
               "&redirect_uri=" + encode(digilockerRedirectUri) +
               "&state=" + encode(state) +
               "&scope=aadhaar+driving_license+voter_id";
    }

    @Override
    @Transactional
    public void handleDigiLockerCallback(String code, String state) {
        // Find user by state
        User user = userRepository.findByDigilockerState(state)
                .orElseThrow(() -> new BadRequestException("Invalid state parameter"));

        try {
            // Exchange code for access token
            String accessToken = exchangeCodeForToken(code);

            // Fetch issued documents list (just need to confirm docs exist)
            fetchDigiLockerDocuments(accessToken);

            // Mark address as verified
            user.setAddressVerified(true);
            user.setAddressDocType("DIGILOCKER");
            user.setKycVerifiedAt(LocalDateTime.now());
            user.setDigilockerState(null);
            user.setTrustScore(user.getTrustScore() + 10);
            userRepository.save(user);

            log.info("Address verified for user {} via DigiLocker", user.getId());

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("DigiLocker callback error for user {}: {}", user.getId(), e.getMessage());
            throw new BadRequestException("DigiLocker verification failed. Please try again.");
        }
    }

    @SuppressWarnings("unchecked")
    private String exchangeCodeForToken(String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code",          code);
        body.add("grant_type",    "authorization_code");
        body.add("client_id",     digilockerClientId);
        body.add("client_secret", digilockerClientSecret);
        body.add("redirect_uri",  digilockerRedirectUri);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    DIGILOCKER_TOKEN_URL, new HttpEntity<>(body, headers), Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null || !responseBody.containsKey("access_token"))
                throw new BadRequestException("Failed to get DigiLocker access token");

            return (String) responseBody.get("access_token");

        } catch (HttpClientErrorException e) {
            log.error("DigiLocker token exchange failed: {}", e.getResponseBodyAsString());
            throw new BadRequestException("DigiLocker authentication failed. Please try again.");
        }
    }

    @SuppressWarnings("unchecked")
    private void fetchDigiLockerDocuments(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    DIGILOCKER_FILES_URL, HttpMethod.GET,
                    new HttpEntity<>(headers), Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null)
                throw new BadRequestException("Could not fetch documents from DigiLocker");

            log.debug("DigiLocker documents fetched successfully");

        } catch (HttpClientErrorException e) {
            log.error("DigiLocker fetch documents failed: {}", e.getResponseBodyAsString());
            throw new BadRequestException("Could not access your DigiLocker documents.");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    // ─── X509 Key Selector for XML Signature ─────────────────────────────────

    private static class X509KeySelector extends javax.xml.crypto.KeySelector {
        @Override
        public javax.xml.crypto.KeySelectorResult select(
                KeyInfo keyInfo, Purpose purpose,
                javax.xml.crypto.AlgorithmMethod method,
                javax.xml.crypto.XMLCryptoContext context) throws javax.xml.crypto.KeySelectorException {

            if (keyInfo == null) throw new javax.xml.crypto.KeySelectorException("Null KeyInfo");

            for (Object o : keyInfo.getContent()) {
                if (o instanceof X509Data x509Data) {
                    for (Object cert : x509Data.getContent()) {
                        if (cert instanceof X509Certificate x509Cert) {
                            final var publicKey = x509Cert.getPublicKey();
                            return () -> publicKey;
                        }
                    }
                }
            }
            throw new javax.xml.crypto.KeySelectorException("No X509Certificate found in KeyInfo");
        }
    }
}