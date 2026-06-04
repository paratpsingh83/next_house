package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.ActivityMemberResponseDTO;
import com.NextHouse.dto.response.ActivityResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.ActivityService;
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
@RequestMapping("/api/v1/activities")
@RequiredArgsConstructor
@Tag(name = "Activities", description = "Local activity/event creation, discovery, join/leave, and member management")
public class ActivityController {

    private final ActivityService activityService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Create an activity",
        description = """
            Creates a new local activity/event.
            The creator is automatically added as HOST member (approved).
            
            **Activity types:** SOCIAL, SPORTS, LEARNING, VOLUNTEERING, FOOD, ARTS, OUTDOOR, NEIGHBORHOOD_WATCH, OTHER
            
            Set `approvalRequired: true` to manually approve join requests.
            """
    )
    public ResponseEntity<ApiResponseDTO<ActivityResponseDTO>> createActivity(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateActivityRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Activity created",
                    activityService.createActivity(currentUserId, dto)));
    }

    @GetMapping("/{activityId}")
    @SecurityRequirements
    @Operation(summary = "Get activity details", description = "Returns activity with current member count and the viewer's join status.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Activity found"),
        @ApiResponse(responseCode = "404", description = "Activity not found")
    })
    public ResponseEntity<ApiResponseDTO<ActivityResponseDTO>> getActivity(
            @PathVariable Long activityId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(activityService.getActivity(activityId, currentUserId)));
    }

    @PutMapping("/{activityId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update an activity", description = "Only the host can update. Cannot update once the activity is EXPIRED or CANCELLED.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Activity updated"),
        @ApiResponse(responseCode = "403", description = "Not the host")
    })
    public ResponseEntity<ApiResponseDTO<ActivityResponseDTO>> updateActivity(
            @PathVariable Long activityId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody UpdateActivityRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Activity updated",
                activityService.updateActivity(activityId, currentUserId, dto)));
    }

    @DeleteMapping("/{activityId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel and delete an activity", description = "Only the host can delete. Sets status to CANCELLED.")
    public ResponseEntity<ApiResponseDTO<Void>> deleteActivity(
            @PathVariable Long activityId,
            @CurrentUser Long currentUserId) {
        activityService.deleteActivity(activityId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Activity cancelled"));
    }

    // ─── Discovery ────────────────────────────────────────────────────────────

    @GetMapping("/nearby")
    @SecurityRequirements
    @Operation(
        summary = "Find nearby activities",
        description = "Upcoming activities within the given radius, ordered by distance. Optionally filter by activity type."
    )
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ActivityResponseDTO>>> getNearbyActivities(
            @Parameter(example = "3.1390") @RequestParam Double latitude,
            @Parameter(example = "101.6869") @RequestParam Double longitude,
            @Parameter(description = "Radius in meters", example = "10000")
            @RequestParam(defaultValue = "10000") Integer radiusMeters,
            @Parameter(description = "Filter by type: SOCIAL, SPORTS, LEARNING, etc.")
            @RequestParam(required = false) String activityType,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        NearbySearchRequestDTO geo = NearbySearchRequestDTO.builder()
                .latitude(latitude).longitude(longitude).radiusMeters(radiusMeters).build();
        return ResponseEntity.ok(
            ApiResponseDTO.success(
                activityService.getNearbyActivities(currentUserId, geo, activityType, page, size)));
    }

    @GetMapping("/community/{communityId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get upcoming activities in a community")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ActivityResponseDTO>>> getCommunityActivities(
            @PathVariable Long communityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(activityService.getCommunityActivities(communityId, page, size)));
    }

    @GetMapping("/my/hosting")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Activities I am hosting")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ActivityResponseDTO>>> getMyHostedActivities(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(activityService.getMyHostedActivities(currentUserId, page, size)));
    }

    @GetMapping("/my/joined")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Activities I have joined")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ActivityResponseDTO>>> getMyJoinedActivities(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(activityService.getMyJoinedActivities(currentUserId, page, size)));
    }

    // ─── Membership ───────────────────────────────────────────────────────────

    @PostMapping("/{activityId}/join")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Request to join an activity",
        description = """
            If `approvalRequired = false`: immediately joins with status APPROVED.
            If `approvalRequired = true`: status is set to PENDING and the host is notified.
            """
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Join request submitted"),
        @ApiResponse(responseCode = "409", description = "Already a member, or activity is full")
    })
    public ResponseEntity<ApiResponseDTO<Void>> joinActivity(
            @PathVariable Long activityId,
            @CurrentUser Long currentUserId,
            @RequestBody(required = false) JoinActivityRequestDTO dto) {
        activityService.joinActivity(activityId, currentUserId,
            dto != null ? dto : new JoinActivityRequestDTO());
        return ResponseEntity.ok(ApiResponseDTO.success("Join request submitted"));
    }

    @DeleteMapping("/{activityId}/join")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Leave an activity", description = "Cannot leave if you are the host — delete the activity instead.")
    public ResponseEntity<ApiResponseDTO<Void>> leaveActivity(
            @PathVariable Long activityId,
            @CurrentUser Long currentUserId) {
        activityService.leaveActivity(activityId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Left activity"));
    }

    @GetMapping("/{activityId}/members")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Get activity members",
        description = "Filter by joinStatus: APPROVED (default), PENDING, REJECTED, WAITLISTED."
    )
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ActivityMemberResponseDTO>>> getActivityMembers(
            @PathVariable Long activityId,
            @RequestParam(defaultValue = "APPROVED") String joinStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(
                activityService.getActivityMembers(activityId, joinStatus, page, size)));
    }

    @PostMapping("/{activityId}/members/{memberId}/approve")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Approve a join request", description = "Host only. Approves a PENDING membership request.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Member approved"),
        @ApiResponse(responseCode = "403", description = "Not the host"),
        @ApiResponse(responseCode = "409", description = "Activity full or request not pending")
    })
    public ResponseEntity<ApiResponseDTO<Void>> approveMember(
            @PathVariable Long activityId,
            @PathVariable Long memberId,
            @CurrentUser Long currentUserId) {
        activityService.approveJoinRequest(activityId, memberId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Member approved"));
    }

    @PostMapping("/{activityId}/members/{memberId}/reject")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Reject a join request", description = "Host only.")
    public ResponseEntity<ApiResponseDTO<Void>> rejectMember(
            @PathVariable Long activityId,
            @PathVariable Long memberId,
            @CurrentUser Long currentUserId) {
        activityService.rejectJoinRequest(activityId, memberId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Request rejected"));
    }
}
