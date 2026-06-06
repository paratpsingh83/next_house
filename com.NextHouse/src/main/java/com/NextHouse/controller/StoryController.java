package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.request.CreateStoryRequestDTO;
import com.NextHouse.dto.response.StoryResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.StoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stories")
@RequiredArgsConstructor
@Tag(name = "Stories", description = "24-hour ephemeral stories — Instagram/WhatsApp style")
public class StoryController {

    private final StoryService storyService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a story", description = "Story expires automatically after 24 hours.")
    public ResponseEntity<ApiResponseDTO<StoryResponseDTO>> createStory(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateStoryRequestDTO dto) {
        StoryResponseDTO story = storyService.createStory(currentUserId, dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Story created", story));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get my active stories")
    public ResponseEntity<ApiResponseDTO<List<StoryResponseDTO>>> getMyStories(
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(storyService.getMyStories(currentUserId)));
    }

    @GetMapping("/feed")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get story feed", description = "Active stories from followed users, sorted by user then newest-first. Client groups by authorId.")
    public ResponseEntity<ApiResponseDTO<List<StoryResponseDTO>>> getFeedStories(
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(storyService.getFeedStories(currentUserId)));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a specific user's active stories")
    public ResponseEntity<ApiResponseDTO<List<StoryResponseDTO>>> getUserStories(
            @PathVariable Long userId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(storyService.getUserStories(userId, currentUserId)));
    }

    @PostMapping("/{storyId}/view")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark story as viewed", description = "Idempotent — safe to call multiple times.")
    public ResponseEntity<ApiResponseDTO<Void>> markViewed(
            @PathVariable Long storyId,
            @CurrentUser Long currentUserId) {
        storyService.markViewed(storyId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Story marked as viewed"));
    }

    @DeleteMapping("/{storyId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete your story")
    public ResponseEntity<ApiResponseDTO<Void>> deleteStory(
            @PathVariable Long storyId,
            @CurrentUser Long currentUserId) {
        storyService.deleteStory(storyId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Story deleted"));
    }
}