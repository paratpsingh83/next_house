package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.NearbySearchRequestDTO;
import com.NextHouse.dto.request.UpdateLocationRequestDTO;
import com.NextHouse.dto.request.UpdateProfileRequestDTO;
import com.NextHouse.dto.request.VerificationRequestDTO;
import com.NextHouse.dto.response.FollowRequestResponseDTO;
import com.NextHouse.dto.response.NearbyUserResponseDTO;
import com.NextHouse.dto.response.UserResponseDTO;
import com.NextHouse.dto.response.UserSummaryDTO;
import java.util.List;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profiles, follow system, block system, nearby users")
public class UserController {

    private final UserService userService;

    // ─── Profile ──────────────────────────────────────────────────────────────

    @GetMapping("/me")
    @SecurityRequirements
    @Operation(summary = "Get my profile", description = "Returns the full profile of the currently authenticated user.")
    public ResponseEntity<ApiResponseDTO<UserResponseDTO>> getMyProfile(@CurrentUser Long currentUserId) {
        if (currentUserId == null) return ResponseEntity.status(401).body(ApiResponseDTO.error("Not authenticated"));
        return ResponseEntity.ok(ApiResponseDTO.success(userService.getMyProfile(currentUserId)));
    }

    @GetMapping("/{userId}")
    @SecurityRequirements   // public — works for guests too
    @Operation(
        summary = "Get a user's public profile",
        description = "Returns public profile. If the viewer is authenticated, includes `isFollowing`, `isFollowedBy`, `isBlocked` context fields."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile found"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<ApiResponseDTO<UserResponseDTO>> getProfile(
            @PathVariable Long userId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(userService.getProfile(userId, currentUserId)));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update my profile", description = "Partial update — only provided fields are changed. Null fields are ignored.")
    public ResponseEntity<ApiResponseDTO<UserResponseDTO>> updateProfile(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody UpdateProfileRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Profile updated", userService.updateProfile(currentUserId, dto)));
    }

    @PatchMapping("/me/location")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Update current location",
        description = "Updates the user's GPS coordinates. Also auto-reassigns the primary neighborhood if the user has moved. Call this on app foreground or significant location change."
    )
    public ResponseEntity<ApiResponseDTO<Void>> updateLocation(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody UpdateLocationRequestDTO dto) {
        userService.updateLocation(currentUserId, dto);
        return ResponseEntity.ok(ApiResponseDTO.success("Location updated"));
    }

    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete account", description = "Soft-deletes the account. Data is retained for 30 days then permanently purged.")
    public ResponseEntity<ApiResponseDTO<Void>> deleteAccount(@CurrentUser Long currentUserId) {
        userService.deleteAccount(currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Account deleted successfully"));
    }

    // ─── Discovery ────────────────────────────────────────────────────────────

    @GetMapping("/nearby")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Find nearby users",
        description = """
            Returns verified neighbors within the specified radius.
            Results ordered by distance. Excludes blocked users.
            Requires the user to have a verified location set.
            """
    )
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<NearbyUserResponseDTO>>> getNearbyUsers(
            @CurrentUser Long currentUserId,
            @Parameter(description = "Latitude of the search center", example = "3.1390")
            @RequestParam Double latitude,
            @Parameter(description = "Longitude of the search center", example = "101.6869")
            @RequestParam Double longitude,
            @Parameter(description = "Search radius in meters (100–50000)", example = "5000")
            @RequestParam(defaultValue = "5000") Integer radiusMeters,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        NearbySearchRequestDTO geoDto = NearbySearchRequestDTO.builder()
                .latitude(latitude).longitude(longitude).radiusMeters(radiusMeters).build();
        return ResponseEntity.ok(
            ApiResponseDTO.success(userService.getNearbyUsers(currentUserId, geoDto, page, size)));
    }

    @GetMapping("/suggestions")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Get user suggestions",
        description = "Friends-of-friends algorithm. Excludes users you already follow or have blocked."
    )
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<UserSummaryDTO>>> getSuggestedUsers(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(userService.getSuggestedUsers(currentUserId, page, size)));
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search users by name or username")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<UserSummaryDTO>>> searchUsers(
            @Parameter(description = "Search query (min 2 characters)") @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(userService.searchUsers(query, page, size)));
    }

    // ─── Follow system ────────────────────────────────────────────────────────

    @PostMapping("/{userId}/follow")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Follow a user",
        description = "If the target account is public, follows immediately (status=FOLLOWING). If private, sends a follow request (status=REQUESTED).")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Followed or follow request sent"),
        @ApiResponse(responseCode = "409", description = "Already following or request already sent")
    })
    public ResponseEntity<ApiResponseDTO<String>> followUser(
            @CurrentUser Long currentUserId,
            @PathVariable Long userId) {
        String status = userService.followUser(currentUserId, userId);
        String msg = "REQUESTED".equals(status) ? "Follow request sent" : "User followed successfully";
        return ResponseEntity.ok(ApiResponseDTO.success(msg, status));
    }

    @GetMapping("/follow-requests")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get pending follow requests", description = "Returns users who sent you a follow request, including the requestId needed for accept/reject.")
    public ResponseEntity<ApiResponseDTO<List<FollowRequestResponseDTO>>> getFollowRequests(@CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(userService.getPendingFollowRequests(currentUserId)));
    }

    @PostMapping("/follow-requests/{requestId}/accept")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Accept a follow request")
    public ResponseEntity<ApiResponseDTO<Void>> acceptFollowRequest(
            @PathVariable Long requestId, @CurrentUser Long currentUserId) {
        userService.acceptFollowRequest(requestId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Follow request accepted"));
    }

    @DeleteMapping("/follow-requests/{requestId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Reject (delete) a follow request")
    public ResponseEntity<ApiResponseDTO<Void>> rejectFollowRequest(
            @PathVariable Long requestId, @CurrentUser Long currentUserId) {
        userService.rejectFollowRequest(requestId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Follow request rejected"));
    }

    @DeleteMapping("/{userId}/follow")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Unfollow a user")
    public ResponseEntity<ApiResponseDTO<Void>> unfollowUser(
            @CurrentUser Long currentUserId,
            @PathVariable Long userId) {
        userService.unfollowUser(currentUserId, userId);
        return ResponseEntity.ok(ApiResponseDTO.success("User unfollowed"));
    }

    @GetMapping("/{userId}/followers")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a user's followers list")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<UserSummaryDTO>>> getFollowers(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(userService.getFollowers(userId, page, size)));
    }

    @GetMapping("/{userId}/following")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get users that a user follows")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<UserSummaryDTO>>> getFollowing(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(userService.getFollowing(userId, page, size)));
    }

    // ─── Block system ─────────────────────────────────────────────────────────

    @PostMapping("/{userId}/block")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Block a user",
        description = "Blocks the user and automatically unfollows in both directions. The blocked user cannot see your content."
    )
    public ResponseEntity<ApiResponseDTO<Void>> blockUser(
            @CurrentUser Long currentUserId,
            @PathVariable Long userId) {
        userService.blockUser(currentUserId, userId);
        return ResponseEntity.ok(ApiResponseDTO.success("User blocked"));
    }

    @DeleteMapping("/{userId}/block")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Unblock a user")
    public ResponseEntity<ApiResponseDTO<Void>> unblockUser(
            @CurrentUser Long currentUserId,
            @PathVariable Long userId) {
        userService.unblockUser(currentUserId, userId);
        return ResponseEntity.ok(ApiResponseDTO.success("User unblocked"));
    }

    @GetMapping("/me/blocked")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get blocked users", description = "Returns all users the current user has blocked.")
    public ResponseEntity<ApiResponseDTO<List<UserSummaryDTO>>> getBlockedUsers(@CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(userService.getBlockedUsers(currentUserId)));
    }

    // ─── Verification ─────────────────────────────────────────────────────────

    @PostMapping("/me/verify-address")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Submit address verification",
        description = """
            Verifies the user's address using an uploaded document.
            **docType options:** UTILITY_BILL, RENTAL_AGREEMENT, BANK_STATEMENT, GOVERNMENT_LETTER, PROPERTY_TAX
            Upload the document first via POST /api/v1/media/upload (entityType=USER), then pass the returned mediaId here.
            Adds +10 trust score on success.
            """
    )
    public ResponseEntity<ApiResponseDTO<Void>> verifyAddress(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody VerificationRequestDTO dto) {
        userService.requestAddressVerification(currentUserId, dto.getDocType(), dto.getMediaId());
        return ResponseEntity.ok(ApiResponseDTO.success("Address verified successfully"));
    }

    @PostMapping("/me/verify-identity")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Submit identity verification",
        description = """
            Verifies the user's identity using a government-issued document.
            **docType options:** AADHAAR, PASSPORT, DRIVING_LICENSE, NATIONAL_ID, VOTER_ID
            Upload the document first via POST /api/v1/media/upload (entityType=USER), then pass the returned mediaId here.
            Adds +20 trust score on success.
            """
    )
    public ResponseEntity<ApiResponseDTO<Void>> verifyIdentity(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody VerificationRequestDTO dto) {
        userService.requestIdentityVerification(currentUserId, dto.getDocType(), dto.getMediaId());
        return ResponseEntity.ok(ApiResponseDTO.success("Identity verified successfully"));
    }
}
