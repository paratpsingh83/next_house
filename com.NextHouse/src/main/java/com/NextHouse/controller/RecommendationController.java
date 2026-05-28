package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.*;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommendations", description = "AI-powered personalised recommendations (read-only; scores written by ML batch job)")
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/posts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Recommended posts", description = "AI-personalised post feed. Falls back to trending posts for new users (cold start).")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getRecommendedPosts(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(recommendationService.getRecommendedPosts(currentUserId, page, size)));
    }

    @GetMapping("/activities")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Recommended activities", description = "Activities matching your interests and location. Cold start falls back to nearby activities.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ActivityResponseDTO>>> getRecommendedActivities(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(recommendationService.getRecommendedActivities(currentUserId, page, size)));
    }

    @GetMapping("/communities")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Recommended communities to join", description = "Communities you might like based on location and interests.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<CommunityResponseDTO>>> getRecommendedCommunities(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(recommendationService.getRecommendedCommunities(currentUserId, page, size)));
    }

    @GetMapping("/users")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "People you may know", description = "User recommendations based on mutual connections and neighborhood proximity.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<UserSummaryDTO>>> getRecommendedUsers(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(recommendationService.getRecommendedUsers(currentUserId, page, size)));
    }
}
