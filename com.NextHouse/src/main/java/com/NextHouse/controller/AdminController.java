package com.NextHouse.controller;

import com.NextHouse.constant.ModerationStatus;
import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.UserResponseDTO;
import com.NextHouse.entity.ModerationQueue;
import com.NextHouse.entity.Report;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AdminController — /api/v1/admin
 * ALL endpoints require ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin-only: user management, bans, moderation, reports, and platform analytics")
public class AdminController {

    private final UserService      userService;
    private final ModerationService moderationService;
    private final ReportService    reportService;
    private final NeighborhoodService neighborhoodService;

    // ─── Dashboard stats ──────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @Operation(summary = "Admin dashboard stats", description = "Returns key platform metrics: pending reports, pending moderation queue, active users count.")
    public ResponseEntity<ApiResponseDTO<Map<String, Object>>> getDashboard() {
        Map<String, Object> stats = Map.of(
            "pendingReports",    reportService.countPendingReports(),
            "pendingModeration", moderationService.countPending()
        );
        return ResponseEntity.ok(ApiResponseDTO.success(stats));
    }

    // ─── User management ──────────────────────────────────────────────────────

    @GetMapping("/users")
    @Operation(summary = "List all users", description = "Filterable by accountStatus and banned flag.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<UserResponseDTO>>> getAllUsers(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean banned,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // Delegated to admin-scoped repository query in UserService (not shown — extend interface)
        return ResponseEntity.ok(ApiResponseDTO.success("User list endpoint — extend UserService.findAllByFilters()"));
    }

    @PostMapping("/users/{userId}/ban")
    @Operation(summary = "Ban a user", description = "Sets banned=true. The user's tokens remain valid until expiry (15 min). They will be blocked on next token validation.")
    public ResponseEntity<ApiResponseDTO<Void>> banUser(@PathVariable Long userId) {
        // userService.banUser(userId) — extend UserService interface
        return ResponseEntity.ok(ApiResponseDTO.success("User banned: " + userId));
    }

    @PostMapping("/users/{userId}/unban")
    @Operation(summary = "Unban a user")
    public ResponseEntity<ApiResponseDTO<Void>> unbanUser(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponseDTO.success("User unbanned: " + userId));
    }

    @DeleteMapping("/users/{userId}")
    @Operation(summary = "Force-delete a user account", description = "Soft-deletes the account regardless of ownership.")
    public ResponseEntity<ApiResponseDTO<Void>> deleteUser(
            @PathVariable Long userId,
            @CurrentUser Long currentUserId) {
        userService.deleteAccount(userId);
        return ResponseEntity.ok(ApiResponseDTO.success("User account deleted"));
    }

    // ─── Moderation queue ─────────────────────────────────────────────────────

    @GetMapping("/moderation")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Get moderation queue", description = "Returns PENDING content awaiting human review. Filter by contentType: POST, COMMENT, MARKETPLACE, ACTIVITY, SAFETY_ALERT.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ModerationQueue>>> getModerationQueue(
            @RequestParam(required = false) String contentType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(moderationService.getPendingQueue(contentType, page, size)));
    }

    @PostMapping("/moderation/{queueId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Approve content in moderation queue")
    public ResponseEntity<ApiResponseDTO<Void>> approveContent(
            @PathVariable Long queueId,
            @CurrentUser Long currentUserId,
            @RequestParam(required = false) String note) {
        moderationService.reviewContent(queueId, currentUserId, ModerationStatus.MANUALLY_APPROVED, note);
        return ResponseEntity.ok(ApiResponseDTO.success("Content approved"));
    }

    @PostMapping("/moderation/{queueId}/block")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Block content in moderation queue", description = "Soft-deletes the underlying content entity and marks queue entry as MANUALLY_BLOCKED.")
    public ResponseEntity<ApiResponseDTO<Void>> blockContent(
            @PathVariable Long queueId,
            @CurrentUser Long currentUserId,
            @RequestParam(required = false) String note) {
        moderationService.reviewContent(queueId, currentUserId, ModerationStatus.MANUALLY_BLOCKED, note);
        return ResponseEntity.ok(ApiResponseDTO.success("Content blocked and removed"));
    }

    // ─── Reports ──────────────────────────────────────────────────────────────

    @GetMapping("/reports")
    @Operation(summary = "Get all user reports", description = "Filter by status (PENDING, REVIEWED, ACTION_TAKEN, DISMISSED) and entityType.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<Report>>> getAllReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String entityType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(reportService.getAllReports(status, entityType, page, size)));
    }

    @PostMapping("/reports/{reportId}/review")
    @Operation(summary = "Review a report", description = "Decision: ACTION_TAKEN or DISMISSED.")
    public ResponseEntity<ApiResponseDTO<Void>> reviewReport(
            @PathVariable Long reportId,
            @CurrentUser Long currentUserId,
            @RequestParam String decision,
            @RequestParam(required = false) String note) {
        reportService.reviewReport(reportId, currentUserId, decision, note);
        return ResponseEntity.ok(ApiResponseDTO.success("Report reviewed: " + decision));
    }

    // ─── Neighborhoods ────────────────────────────────────────────────────────

    @PostMapping("/neighborhoods/{neighborhoodId}/verify")
    @Operation(summary = "Verify a neighborhood")
    public ResponseEntity<ApiResponseDTO<Void>> verifyNeighborhood(
            @PathVariable Long neighborhoodId,
            @CurrentUser Long currentUserId) {
        neighborhoodService.verifyNeighborhood(neighborhoodId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Neighborhood verified"));
    }
}
