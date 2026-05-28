package com.NextHouse.service;

import com.NextHouse.dto.response.MediaFileResponseDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MediaService {

    /**
     * Upload a file to cloud storage (S3/GCS/Cloudinary) and persist metadata.
     *
     * @param file        the multipart upload
     * @param entityType  POST | ACTIVITY | COMMUNITY | MARKETPLACE | USER | CHAT
     * @param entityId    optional entity this file belongs to (null until entity is created)
     * @param uploaderId  the user performing the upload
     */
    MediaFileResponseDTO upload(MultipartFile file, String entityType, Long entityId, Long uploaderId);

    List<MediaFileResponseDTO> getMediaForEntity(String entityType, Long entityId);

    void deleteMedia(Long mediaId, Long currentUserId);

    void attachMediaToEntity(List<Long> mediaIds, String entityType, Long entityId);
}
