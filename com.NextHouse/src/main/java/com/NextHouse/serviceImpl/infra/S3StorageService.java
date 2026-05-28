package com.NextHouse.serviceImpl.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * S3StorageService
 *
 * Wraps AWS SDK v2 S3Client for cloud file storage.
 * Replace stub bodies with real SDK calls when ready.
 *
 * Real implementation needs in application.yml:
 *   aws:
 *     s3:
 *       bucket: nexthouse-media
 *       region: ap-southeast-1
 *       cdn-base-url: https://cdn.nexthouse.app
 *
 * Maven dependency (already in pom.xml):
 *   software.amazon.awssdk:s3:2.25.69
 */
@Slf4j
@Service
public class S3StorageService {

    public String upload(MultipartFile file, String storageKey) {
        // TODO: Replace with real S3 upload
        // PutObjectRequest request = PutObjectRequest.builder()
        //     .bucket(bucket).key(storageKey)
        //     .contentType(file.getContentType())
        //     .contentLength(file.getSize()).build();
        // s3Client.putObject(request, RequestBody.fromInputStream(
        //     file.getInputStream(), file.getSize()));
        // return cdnBaseUrl + "/" + storageKey;
        log.debug("[S3] Upload stub: key={}", storageKey);
        return "https://cdn.nexthouse.app/" + storageKey;
    }

    public void delete(String storageKey) {
        // TODO: Replace with real S3 delete
        // s3Client.deleteObject(DeleteObjectRequest.builder()
        //     .bucket(bucket).key(storageKey).build());
        log.debug("[S3] Delete stub: key={}", storageKey);
    }

    public String generatePresignedUrl(String storageKey, long expirySeconds) {
        // TODO: Replace with real presigned URL generation
        // GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
        //     .signatureDuration(Duration.ofSeconds(expirySeconds))
        //     .getObjectRequest(r -> r.bucket(bucket).key(storageKey)).build();
        // return presigner.presignGetObject(presignRequest).url().toString();
        return "https://cdn.nexthouse.app/" + storageKey + "?signed=stub";
    }
}
