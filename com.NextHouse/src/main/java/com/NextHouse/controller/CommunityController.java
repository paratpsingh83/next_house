package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.CommunityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/communities")
@RequiredArgsConstructor
@Tag(name = "Communities", description = "Community CRUD, membership, discovery, and role management")
public class CommunityController {

    private final CommunityService communityService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a community", description = "Creator becomes the OWNER. Can optionally link to a parent community to create a sub-community.")
    public ResponseEntity<ApiResponseDTO<CommunityResponseDTO>> createCommunity(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateCommunityRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Community created",
                    communityService.createCommunity(currentUserId, dto)));
    }

    @GetMapping("/{communityId}")
    @SecurityRequirements
    @Operation(summary = "Get community details", description = "Includes live member count and the viewer's membership context.")
    public ResponseEntity<ApiResponseDTO<CommunityResponseDTO>> getCommunity(
            @PathVariable Long communityId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(communityService.getCommunity(communityId, currentUserId)));
    }

    @PutMapping("/{communityId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update community settings", description = "Requires ADMIN role or higher.")
    public ResponseEntity<ApiResponseDTO<CommunityResponseDTO>> updateCommunity(
            @PathVariable Long communityId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody UpdateCommunityRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Community updated",
                communityService.updateCommunity(communityId, currentUserId, dto)));
    }

    @DeleteMapping("/{communityId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a community", description = "OWNER only. Soft-deletes the community and all associated content.")
    public ResponseEntity<ApiResponseDTO<Void>> deleteCommunity(
            @PathVariable Long communityId,
            @CurrentUser Long currentUserId) {
        communityService.deleteCommunity(communityId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Community deleted"));
    }

    @GetMapping("/nearby")
    @SecurityRequirements
    @Operation(summary = "Find nearby communities", description = "Communities near a GPS point, ordered by distance.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<CommunityResponseDTO>>> getNearbyCommunities(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "10000") Integer radiusMeters,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        NearbySearchRequestDTO geo = NearbySearchRequestDTO.builder()
                .latitude(latitude).longitude(longitude).radiusMeters(radiusMeters).build();
        return ResponseEntity.ok(
            ApiResponseDTO.success(communityService.getNearbyCommunities(currentUserId, geo, page, size)));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "My communities", description = "All communities the current user belongs to.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<CommunityResponseDTO>>> getMyCommunities(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(communityService.getMyCommunities(currentUserId, page, size)));
    }

    @GetMapping("/search")
    @SecurityRequirements
    @Operation(summary = "Search communities by name or description")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<CommunityResponseDTO>>> searchCommunities(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(communityService.searchCommunities(query, page, size)));
    }

    @PostMapping("/{communityId}/join")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Join a community", description = "Public communities auto-approve. Private communities require ADMIN approval.")
    public ResponseEntity<ApiResponseDTO<Void>> joinCommunity(
            @PathVariable Long communityId,
            @CurrentUser Long currentUserId) {
        communityService.joinCommunity(communityId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Join request submitted"));
    }

    @DeleteMapping("/{communityId}/join")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Leave a community", description = "OWNER cannot leave — transfer ownership first.")
    public ResponseEntity<ApiResponseDTO<Void>> leaveCommunity(
            @PathVariable Long communityId,
            @CurrentUser Long currentUserId) {
        communityService.leaveCommunity(communityId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Left community"));
    }

    @GetMapping("/{communityId}/members")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get community members", description = "Optionally filter by role: OWNER, ADMIN, MODERATOR, MEMBER.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<UserSummaryDTO>>> getMembers(
            @PathVariable Long communityId,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(communityService.getMembers(communityId, role, page, size)));
    }

    @PostMapping("/{communityId}/members/{memberId}/approve")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Approve a pending member", description = "Requires MODERATOR role or higher.")
    public ResponseEntity<ApiResponseDTO<Void>> approveMember(
            @PathVariable Long communityId,
            @PathVariable Long memberId,
            @CurrentUser Long currentUserId) {
        communityService.approveMember(communityId, memberId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Member approved"));
    }

    @DeleteMapping("/{communityId}/members/{memberId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kick a member", description = "Requires MODERATOR role or higher. Cannot kick OWNER.")
    public ResponseEntity<ApiResponseDTO<Void>> kickMember(
            @PathVariable Long communityId,
            @PathVariable Long memberId,
            @CurrentUser Long currentUserId) {
        communityService.kickMember(communityId, memberId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Member removed"));
    }

    @PostMapping("/{communityId}/transfer-ownership")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Transfer community ownership",
        description = "OWNER only. The target user must be an existing approved member. Current owner is demoted to MEMBER.")
    public ResponseEntity<ApiResponseDTO<Void>> transferOwnership(
            @PathVariable Long communityId,
            @RequestParam Long newOwnerUserId,
            @CurrentUser Long currentUserId) {
        communityService.transferOwnership(communityId, newOwnerUserId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Ownership transferred successfully"));
    }

    @PatchMapping("/{communityId}/members/{memberId}/role")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update a member's role", description = "OWNER only. Valid roles: ADMIN, MODERATOR, MEMBER.")
    public ResponseEntity<ApiResponseDTO<Void>> updateMemberRole(
            @PathVariable Long communityId,
            @PathVariable Long memberId,
            @RequestParam String role,
            @CurrentUser Long currentUserId) {
        communityService.updateMemberRole(communityId, memberId, role, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Role updated"));
    }
}
