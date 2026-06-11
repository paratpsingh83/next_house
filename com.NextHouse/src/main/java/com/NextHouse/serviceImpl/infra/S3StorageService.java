package com.NextHouse.serviceImpl.infra;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3StorageService {

    @Value("${app.media.cdn-base-url:http://localhost:8080}")
    private String cdnBaseUrl;

    @Value("${aws.s3.bucket:nexthouse-media}")
    private String bucket;

    private final S3Client    s3Client;
    private final S3Presigner s3Presigner;

    private static final String UPLOAD_DIR = "uploads";

    public String upload(MultipartFile file, String storageKey) {
        if (cdnBaseUrl.contains("localhost")) {
            return uploadLocally(file, storageKey);
        }
        try {
            PutObjectRequest req = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(storageKey)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();
            s3Client.putObject(req, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            String url = cdnBaseUrl + "/" + storageKey;
            log.info("[S3] Uploaded key={} size={}", storageKey, file.getSize());
            return url;
        } catch (IOException e) {
            throw new RuntimeException("S3 upload failed for key=" + storageKey, e);
        }
    }

    public void delete(String storageKey) {
        if (cdnBaseUrl.contains("localhost")) {
            try { Files.deleteIfExists(Paths.get(UPLOAD_DIR, storageKey)); }
            catch (IOException e) { log.warn("[Storage] Local delete failed: {}", e.getMessage()); }
            return;
        }
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
        log.debug("[S3] Deleted key={}", storageKey);
    }

    public String generatePresignedUrl(String storageKey, long expirySeconds) {
        if (cdnBaseUrl.contains("localhost")) {
            return cdnBaseUrl + "/" + UPLOAD_DIR + "/" + storageKey;
        }
        var presignReq = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(expirySeconds))
                .getObjectRequest(r -> r.bucket(bucket).key(storageKey))
                .build();
        return s3Presigner.presignGetObject(presignReq).url().toString();
    }

    private String uploadLocally(MultipartFile file, String storageKey) {
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
}