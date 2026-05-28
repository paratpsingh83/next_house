package com.NextHouse.serviceImpl.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * ThumbnailService
 *
 * Generates image thumbnails using Thumbnailator (pure Java, no native deps).
 * Replace stub body with real implementation when ready.
 *
 * Real implementation:
 *   BufferedImage original = ImageIO.read(file.getInputStream());
 *   ByteArrayOutputStream baos = new ByteArrayOutputStream();
 *   Thumbnails.of(original)
 *       .size(400, 400)
 *       .keepAspectRatio(true)
 *       .outputFormat("jpg")
 *       .toOutputStream(baos);
 *   String thumbKey = originalKey.replace(".", "_thumb.");
 *   s3StorageService.uploadBytes(baos.toByteArray(), thumbKey, "image/jpeg");
 *   return new ThumbnailResult("https://cdn.nexthouse.app/" + thumbKey, 400, 400);
 *
 * Maven dependency (already in pom.xml):
 *   net.coobird:thumbnailator:0.4.20
 *
 * Called by: MediaServiceImpl.upload()
 */
@Slf4j
@Service
public class ThumbnailService {

    /**
     * Result record — url is the CDN URL of the generated thumbnail.
     * width/height are the actual output dimensions (may differ from input
     * if keepAspectRatio=true and input was not square).
     */
    public record ThumbnailResult(String url, int width, int height) {}

    public ThumbnailResult generate(MultipartFile file, String originalKey) throws Exception {
        // TODO: Replace with real Thumbnailator call
        log.debug("[Thumbnail] Generation stub for key={}", originalKey);
        return new ThumbnailResult(
            "https://cdn.nexthouse.app/thumb_stub.jpg",
            400,
            400
        );
    }
}
