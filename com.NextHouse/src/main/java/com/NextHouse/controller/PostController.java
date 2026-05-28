package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.PostCommentResponseDTO;
import com.NextHouse.dto.response.PostResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
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
@Tag(name = "Posts", description = "Post CRUD, reactions, comments, saved posts, and all feed endpoints")
public class PostController {

    private final PostService postService;

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Create a post",
        description = """
            Creates a new post in the community feed.
            
            **Post types:** NEWS, HELP, MARKETPLACE, SAFETY, EVENT, RECOMMENDATION, GENERAL
            
            **Media:** Upload media first via `POST /api/v1/media/upload`, then include
            the returned `mediaId` list in this request.
            
            **Anonymous posts:** Set `anonymous: true` to hide your identity.
            The author is still stored internally for moderation purposes.
            """
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Post created"),
        @ApiResponse(responseCode = "400", description = "Validation error"),
        @ApiResponse(responseCode = "404", description = "Community or neighborhood not found")
    })
    public ResponseEntity<ApiResponseDTO<PostResponseDTO>> createPost(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreatePostRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Post created", postService.createPost(currentUserId, dto)));
    }

    @GetMapping("/{postId}")
    @SecurityRequirements
    @Operation(summary = "Get a single post", description = "Returns post with media, reactions, and per-user context (isLiked, isSaved) if authenticated.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Post found"),
        @ApiResponse(responseCode = "404", description = "Post not found or deleted")
    })
    public ResponseEntity<ApiResponseDTO<PostResponseDTO>> getPost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(postService.getPost(postId, currentUserId)));
    }

    @PutMapping("/{postId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update a post", description = "Only the post author can update. Marks the post as `edited: true`.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Post updated"),
        @ApiResponse(responseCode = "403", description = "Not the post author"),
        @ApiResponse(responseCode = "404", description = "Post not found")
    })
    public ResponseEntity<ApiResponseDTO<PostResponseDTO>> updatePost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody UpdatePostRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Post updated", postService.updatePost(postId, currentUserId, dto)));
    }

    @DeleteMapping("/{postId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a post", description = "Author or ADMIN can delete. Soft-deletes the post and all attached media.")
    public ResponseEntity<ApiResponseDTO<Void>> deletePost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        postService.deletePost(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Post deleted"));
    }

    // ─── Feed endpoints ───────────────────────────────────────────────────────

    @GetMapping("/feed/following")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Following feed",
        description = "Posts from users you follow, ordered by newest first. Excludes content from blocked users."
    )
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getFollowingFeed(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getFollowingFeed(currentUserId, page, size)));
    }

    @GetMapping("/feed/nearby")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Nearby feed",
        description = "Posts from your neighborhood within the specified visibility radius. Ordered by newest first."
    )
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
    @SecurityRequirements
    @Operation(
        summary = "Trending feed",
        description = "Most-engaged posts in a neighborhood over the last 48 hours. Cached for 5 minutes."
    )
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getTrendingFeed(
            @CurrentUser Long currentUserId,
            @Parameter(description = "Neighborhood ID to scope trending results", required = true)
            @RequestParam Long neighborhoodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getTrendingFeed(currentUserId, neighborhoodId, page, size)));
    }

    @GetMapping("/feed/community/{communityId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Community feed", description = "Posts within a specific community, ordered by newest first.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getCommunityFeed(
            @PathVariable Long communityId,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getCommunityFeed(currentUserId, communityId, page, size)));
    }

    @GetMapping("/user/{userId}")
    @SecurityRequirements
    @Operation(summary = "Posts by a user", description = "All published posts by a specific user, ordered newest first.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getUserPosts(
            @PathVariable Long userId,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getUserPosts(userId, currentUserId, page, size)));
    }

    @GetMapping("/hashtag/{hashtag}")
    @SecurityRequirements
    @Operation(summary = "Posts by hashtag", description = "Posts containing the given hashtag, ordered newest first.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostResponseDTO>>> getHashtagFeed(
            @PathVariable String hashtag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getHashtagFeed(hashtag, page, size)));
    }

    // ─── Reactions ────────────────────────────────────────────────────────────

    @PostMapping("/{postId}/react")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "React to a post",
        description = """
            Adds or changes a reaction on a post.
            
            **Reaction types:** LIKE, HEART, HELPFUL, CELEBRATE, CURIOUS
            
            If you already reacted, this updates your existing reaction type.
            """
    )
    public ResponseEntity<ApiResponseDTO<Void>> reactToPost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody ReactPostRequestDTO dto) {
        postService.reactToPost(postId, currentUserId, dto);
        return ResponseEntity.ok(ApiResponseDTO.success("Reaction added"));
    }

    @DeleteMapping("/{postId}/react")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Remove your reaction from a post")
    public ResponseEntity<ApiResponseDTO<Void>> removeReaction(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        postService.removeReaction(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Reaction removed"));
    }

    // ─── Save / Share ─────────────────────────────────────────────────────────

    @PostMapping("/{postId}/save")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Save a post", description = "Saves to your personal collection for later reading.")
    public ResponseEntity<ApiResponseDTO<Void>> savePost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        postService.savePost(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Post saved"));
    }

    @DeleteMapping("/{postId}/save")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Unsave a post")
    public ResponseEntity<ApiResponseDTO<Void>> unsavePost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        postService.unsavePost(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Post unsaved"));
    }

    @GetMapping("/saved")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get saved posts", description = "Returns all posts saved by the current user, optionally filtered by collection name.")
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
    @Operation(summary = "Share a post", description = "Increments the share counter. Client handles the actual share mechanism (deep link, copy URL).")
    public ResponseEntity<ApiResponseDTO<Void>> sharePost(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId) {
        postService.sharePost(postId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Share recorded"));
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    @GetMapping("/{postId}/comments")
    @SecurityRequirements
    @Operation(summary = "Get top-level comments on a post", description = "Returns paginated top-level comments (parentCommentId = null).")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostCommentResponseDTO>>> getComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getComments(postId, page, size)));
    }

    @PostMapping("/{postId}/comments")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Add a comment or reply",
        description = "Set `parentCommentId` to reply to a comment. Max nesting depth is 1 (replies to replies are rejected)."
    )
    public ResponseEntity<ApiResponseDTO<PostCommentResponseDTO>> addComment(
            @PathVariable Long postId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateCommentRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Comment added",
                    postService.addComment(postId, currentUserId, dto)));
    }

    @GetMapping("/comments/{commentId}/replies")
    @SecurityRequirements
    @Operation(summary = "Get replies to a comment")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<PostCommentResponseDTO>>> getReplies(
            @PathVariable Long commentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(postService.getReplies(commentId, page, size)));
    }

    @PutMapping("/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update a comment", description = "Only the comment author can update. Marks the comment as `edited: true`.")
    public ResponseEntity<ApiResponseDTO<PostCommentResponseDTO>> updateComment(
            @PathVariable Long commentId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateCommentRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Comment updated",
                postService.updateComment(commentId, currentUserId, dto)));
    }

    @DeleteMapping("/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a comment", description = "Author or ADMIN can delete. Decrements the parent post's comment count.")
    public ResponseEntity<ApiResponseDTO<Void>> deleteComment(
            @PathVariable Long commentId,
            @CurrentUser Long currentUserId) {
        postService.deleteComment(commentId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Comment deleted"));
    }

    @PostMapping("/comments/{commentId}/like")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Like a comment")
    public ResponseEntity<ApiResponseDTO<Void>> likeComment(
            @PathVariable Long commentId,
            @CurrentUser Long currentUserId) {
        postService.reactToComment(commentId, currentUserId, "LIKE");
        return ResponseEntity.ok(ApiResponseDTO.success("Comment liked"));
    }
}
