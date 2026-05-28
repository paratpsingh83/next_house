package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.response.MediaFileResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Tag(name = "Media", description = "File upload and media management")
public class MediaController {

    private final MediaService mediaService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Upload a media file",
        description = """
            Uploads a file to cloud storage and returns a `mediaId`.
            
            **Upload flow:**
            1. Upload file here → get `mediaId`
            2. Include `mediaId` in your POST /posts, POST /activities, or POST /marketplace body
            3. After entity save, media is automatically linked
            
            **Accepted types:** image/jpeg, image/png, image/webp, image/gif, video/mp4, video/quicktime, application/pdf
            **Max size:** 50 MB
            
            **entityType options:** POST, ACTIVITY, COMMUNITY, MARKETPLACE, USER, CHAT
            """
    )
    public ResponseEntity<ApiResponseDTO<MediaFileResponseDTO>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam String entityType,
            @RequestParam(required = false) Long entityId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("File uploaded",
                    mediaService.upload(file, entityType, entityId, currentUserId)));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all media for an entity", description = "Returns all non-deleted media files attached to the given entity.")
    public ResponseEntity<ApiResponseDTO<List<MediaFileResponseDTO>>> getMediaForEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(mediaService.getMediaForEntity(entityType, entityId)));
    }

    @DeleteMapping("/{mediaId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a media file", description = "Uploader only. Deletes from cloud storage and soft-deletes the DB record.")
    public ResponseEntity<ApiResponseDTO<Void>> deleteMedia(
            @PathVariable Long mediaId,
            @CurrentUser Long currentUserId) {
        mediaService.deleteMedia(mediaId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Media deleted"));
    }
}
