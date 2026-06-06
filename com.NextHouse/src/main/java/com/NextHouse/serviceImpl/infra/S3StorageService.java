package com.NextHouse.serviceImpl.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Slf4j
@Service
public class S3StorageService {

    @Value("${app.media.cdn-base-url:http://localhost:8080}")
    private String cdnBaseUrl;

    private static final String UPLOAD_DIR = "uploads";

    public String upload(MultipartFile file, String storageKey) {
        if (cdnBaseUrl.contains("localhost")) {
            try {
                Path targetPath = Paths.get(UPLOAD_DIR, storageKey);
                Files.createDirectories(targetPath.getParent());
                Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
                String url = cdnBaseUrl + "/" + UPLOAD_DIR + "/" + storageKey;
                log.info("[Storage] Saved locally: {}", url);
                return url;
            } catch (IOException e) {
                log.error("[Storage] Local save failed for {}: {}", storageKey, e.getMessage());
                return cdnBaseUrl + "/" + UPLOAD_DIR + "/" + storageKey;
            }
        }
        // Production: real S3 upload goes here
        log.warn("[Storage] No S3 config, returning stub URL");
        return cdnBaseUrl + "/" + storageKey;
    }

    public void delete(String storageKey) {
        if (cdnBaseUrl.contains("localhost")) {
            try { Files.deleteIfExists(Paths.get(UPLOAD_DIR, storageKey)); }
            catch (IOException e) { log.warn("[Storage] Delete failed: {}", e.getMessage()); }
            return;
        }
        log.debug("[Storage] Delete stub: {}", storageKey);
    }

    public String generatePresignedUrl(String storageKey, long expirySeconds) {
        if (cdnBaseUrl.contains("localhost"))
            return cdnBaseUrl + "/" + UPLOAD_DIR + "/" + storageKey;
        return cdnBaseUrl + "/" + storageKey + "?signed=stub";
    }
}
