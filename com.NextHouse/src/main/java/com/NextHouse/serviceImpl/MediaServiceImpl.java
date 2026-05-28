package com.NextHouse.serviceImpl;

import com.NextHouse.dto.response.MediaFileResponseDTO;
import com.NextHouse.entity.MediaFile;
import com.NextHouse.entity.User;
import com.NextHouse.exception.BadRequestException;
import com.NextHouse.exception.ForbiddenException;
import com.NextHouse.exception.NotFoundException;
import com.NextHouse.mapper.MediaFileMapper;
import com.NextHouse.repository.MediaFileRepository;
import com.NextHouse.repository.UserRepository;
import com.NextHouse.service.MediaService;
import com.NextHouse.serviceImpl.infra.S3StorageService;
import com.NextHouse.serviceImpl.infra.ThumbnailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * MediaServiceImpl
 *
 * Storage strategy:
 *   Files are uploaded to cloud storage (S3/GCS/Cloudinary) via S3StorageService.
 *   The returned public CDN URL is stored in MediaFile.url.
 *   The internal storage key (S3 object key) is stored in MediaFile.storageKey
 *   for server-side deletion.
 *
 * Upload flow:
 *   1. Client calls POST /api/v1/media/upload (multipart/form-data)
 *      with entityType=POST (or ACTIVITY, MARKETPLACE, etc.) and optional entityId.
 *   2. MediaService uploads to S3, generates thumbnail if image, persists MediaFile.
 *   3. Returns mediaId. Client includes mediaId(s) in the create-post/activity request.
 *   4. After the entity is saved, MediaService.attachMediaToEntity() updates
 *      MediaFile.entityId so the media is linked.
 *
 * Allowed MIME types (configurable in application.yml):
 *   images: image/jpeg, image/png, image/webp, image/gif
 *   videos: video/mp4, video/quicktime
 *   docs:   application/pdf
 *   max size: 50 MB (configured in spring.servlet.multipart.max-file-size)
 *
 * Thumbnail generation:
 *   Images → resize to 400×400 max via Thumbnailator library (synchronous, fast).
 *   Videos → thumbnails generated asynchronously via a Kafka job (first frame).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MediaServiceImpl implements MediaService {

    private static final long   MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024; // 50 MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/quicktime",
        "application/pdf"
    );

    @Value("${app.media.cdn-base-url}")
    private String cdnBaseUrl;

    private final MediaFileRepository mediaFileRepository;
    private final UserRepository      userRepository;
    private final S3StorageService s3StorageService;   // infrastructure adapter
    private final ThumbnailService thumbnailService;   // image resize utility
    private final MediaFileMapper     mediaFileMapper;

    @Override
    @Transactional
    public MediaFileResponseDTO upload(MultipartFile file, String entityType,
                                       Long entityId, Long uploaderId) {
        // --- Validation ---
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        String mimeType = file.getContentType();
        if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new BadRequestException("Unsupported file type: " + mimeType);
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File exceeds maximum allowed size of 50 MB");
        }

        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new NotFoundException("Uploader not found"));

        // --- Determine file type bucket ---
        String type = mimeType.startsWith("image/") ? "IMAGE"
                    : mimeType.startsWith("video/") ? "VIDEO"
                    : "DOCUMENT";

        // --- Build storage key: {entityType}/{uploaderId}/{uuid}.{ext} ---
        String ext = getExtension(file.getOriginalFilename());
        String storageKey = String.format("%s/%d/%s.%s",
            entityType.toLowerCase(), uploaderId, UUID.randomUUID(), ext);

        // --- Upload to S3/cloud storage ---
        String cdnUrl = s3StorageService.upload(file, storageKey);

        // --- Generate thumbnail for images ---
        String thumbnailUrl = null;
        Integer width = null, height = null;
        if ("IMAGE".equals(type)) {
            try {
                ThumbnailService.ThumbnailResult thumb = thumbnailService.generate(file, storageKey);
                thumbnailUrl = thumb.url();
                width        = thumb.width();
                height       = thumb.height();
            } catch (Exception e) {
                log.warn("[Media] Thumbnail generation failed for key={}: {}", storageKey, e.getMessage());
            }
        }

        // --- Persist metadata ---
        MediaFile media = MediaFile.builder()
                .url(cdnUrl)
                .storageKey(storageKey)
                .storageProvider("S3")
                .type(type)
                .mimeType(mimeType)
                .size(file.getSize())
                .originalFilename(file.getOriginalFilename())
                .thumbnailUrl(thumbnailUrl)
                .width(width)
                .height(height)
                .entityType(entityType)
                .entityId(entityId)     // may be null until attachMediaToEntity() is called
                .uploadedBy(uploader)
                .build();

        MediaFile saved = mediaFileRepository.save(media);
        log.info("[Media] Uploaded: mediaId={} type={} size={}B by userId={}",
                saved.getId(), type, file.getSize(), uploaderId);

        return mediaFileMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MediaFileResponseDTO> getMediaForEntity(String entityType, Long entityId) {
        return mediaFileRepository
                .findByEntityTypeAndEntityIdAndIsDeletedFalse(entityType, entityId)
                .stream()
                .map(mediaFileMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteMedia(Long mediaId, Long currentUserId) {
        MediaFile media = mediaFileRepository.findById(mediaId)
                .orElseThrow(() -> new NotFoundException("Media not found"));
        if (!media.getUploadedBy().getId().equals(currentUserId)) {
            throw new ForbiddenException("You can only delete your own media");
        }

        // Delete from cloud storage
        try {
            s3StorageService.delete(media.getStorageKey());
        } catch (Exception e) {
            log.warn("[Media] S3 delete failed for key={}: {}", media.getStorageKey(), e.getMessage());
        }

        media.setIsDeleted(true);
        mediaFileRepository.save(media);
    }

    @Override
    @Transactional
    public void attachMediaToEntity(List<Long> mediaIds, String entityType, Long entityId) {
        if (mediaIds == null || mediaIds.isEmpty()) return;

        List<MediaFile> files = mediaFileRepository.findAllById(mediaIds);
        for (MediaFile file : files) {
            file.setEntityType(entityType);
            file.setEntityId(entityId);
        }
        mediaFileRepository.saveAll(files);
        log.debug("[Media] Attached {} files to {}:{}", files.size(), entityType, entityId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "bin";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
