package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.PostCommentResponseDTO;
import com.NextHouse.dto.response.PostResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.PostService;
import com.NextHouse.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
@Tag(name = "Posts", description = "Post CRUD, reactions, comments, saved posts, feeds, and reporting")
public class PostController {

    private final PostService   postService;
    private final ReportService reportService;   // FIX: inject ReportService for report endpoint

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<PostResponseDTO>> createPost(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreatePostRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Post created", postService.createPost(currentUserId, dto)));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponseDTO<PostResponseDTO>> getPost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(postService.getPost(postId, currentUserId)));
    }

    @PutMapping("/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<PostResponseDTO>> updatePost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody UpdatePostRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Post updated", postService.updatePost(postId, currentUserId, dto)));
    }

    @DeleteMapping("/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<Void>> deletePost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        postService.deletePost(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Post deleted"));
    }

    // ─── FIX: Report endpoint ─────────────────────────────────────────────────
    /**
     * FIX: This endpoint was missing from the original PostController.
     *
     * Frontend calls POST /api/v1/posts/{postId}/report with { reason }
     * but the endpoint did not exist, causing 404 errors when users tried
     * to report posts from the PostCard "More" menu.
     *
     * The ReportService already exists and handles:
     * - Duplicate report prevention
     * - Auto-escalation to moderation queue after 3 reports
     * - Admin review workflow
     */
    @PostMapping("/{postId}/report")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Report a post", description = "Reports a post for review. Duplicate reports from the same user are rejected.")
    public ResponseEntity<ApiResponseDTO<Void>> reportPost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId,
            @RequestBody ReportPostRequestDTO dto) {
        reportService.createReport(currentUserId,
            CreateReportRequestDTO.builder()
                .entityType("POST")
                .entityId(postId)
                .reason(dto.getReason())
                .description(dto.getDescription())
                .build());
        return ResponseEntity.ok(ApiResponseDTO.success("Post reported"));
    }

    // ─── Feed endpoints ───────────────────────────────────────────────────────

    @GetMapping("/feed/following")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getFollowingFeed(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getFollowingFeed(currentUserId, page, size)));
    }

    @GetMapping("/feed/nearby")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getNearbyFeed(
            @CurrentUser Long currentUserId,
            @Parameter(example = "3.1390") @RequestParam Double latitude,
            @Parameter(example = "101.6869") @RequestParam Double longitude,
            @RequestParam(defaultValue = "5000") Integer radiusMeters,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        NearbySearchRequestDTO geo = NearbySearchRequestDTO.builder()
                .latitude(latitude).longitude(longitude).radiusMeters(radiusMeters).build();
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getNearbyFeed(currentUserId, geo, page, size)));
    }

    @GetMapping("/feed/trending")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getTrendingFeed(
            @CurrentUser Long currentUserId,
            @RequestParam Long neighborhoodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getTrendingFeed(currentUserId, neighborhoodId, page, size)));
    }

    @GetMapping("/feed/community/{communityId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getCommunityFeed(
            @PathVariable Long communityId,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getCommunityFeed(currentUserId, communityId, page, size)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getUserPosts(
            @PathVariable Long userId,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getUserPosts(userId, currentUserId, page, size)));
    }

    @GetMapping("/hashtag/{hashtag}")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getHashtagFeed(
            @PathVariable String hashtag,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getHashtagFeed(hashtag, currentUserId, page, size)));
    }

    // ─── Reactions ────────────────────────────────────────────────────────────

    @PostMapping("/{postId}/react")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<Void>> reactToPost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody ReactPostRequestDTO dto) {
        postService.reactToPost(postId, currentUserId, dto);
        return ResponseEntity.ok(ApiResponseDTO.success("Reaction added"));
    }

    @DeleteMapping("/{postId}/react")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<Void>> removeReaction(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        postService.removeReaction(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Reaction removed"));
    }

    // ─── Save / Share ─────────────────────────────────────────────────────────

    @PostMapping("/{postId}/save")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<Void>> savePost(
            @PathVariable Long postId, @CurrentUser Long currentUserId) {
        postService.savePost(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Post saved"));
    }

    @DeleteMapping("/{postId}/save")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<Void>> unsavePost(
            @PathVariable Long postId, @CurrentUser Long currentUserId) {
        postService.unsavePost(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Post unsaved"));
    }

    @GetMapping("/saved")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getSavedPosts(
            @CurrentUser Long currentUserId,
            @RequestParam(required = false) String collection,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getSavedPosts(currentUserId, collection, page, size)));
    }

    @PostMapping("/{postId}/share")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<Void>> sharePost(
            @PathVariable Long postId, @CurrentUser Long currentUserId) {
        postService.sharePost(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Share recorded"));
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    @GetMapping("/{postId}/comments")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostCommentResponseDTO>>> getComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponseDTO.success(postService.getComments(postId, page, size)));
    }

    @PostMapping("/{postId}/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<PostCommentResponseDTO>> addComment(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateCommentRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Comment added",
                    postService.addComment(postId, currentUserId, dto)));
    }

    @GetMapping("/comments/{commentId}/replies")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostCommentResponseDTO>>> getReplies(
            @PathVariable Long commentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponseDTO.success(postService.getReplies(commentId, page, size)));
    }

    @PutMapping("/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<PostCommentResponseDTO>> updateComment(
            @PathVariable Long commentId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateCommentRequestDTO dto) {
        return ResponseEntity.ok(ApiResponseDTO.success("Comment updated",
            postService.updateComment(commentId, currentUserId, dto)));
    }

    @DeleteMapping("/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<Void>> deleteComment(
            @PathVariable Long commentId, @CurrentUser Long currentUserId) {
        postService.deleteComment(commentId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Comment deleted"));
    }

    @PostMapping("/comments/{commentId}/like")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponseDTO<Void>> likeComment(
            @PathVariable Long commentId, @CurrentUser Long currentUserId) {
        postService.reactToComment(commentId, currentUserId, "LIKE");
        return ResponseEntity.ok(ApiResponseDTO.success("Comment liked"));
    }
}
