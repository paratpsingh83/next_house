package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.NotificationResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "In-app notification management")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get notifications", description = "Returns paginated notifications. Set `unreadOnly=true` to fetch only unread ones.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<NotificationResponseDTO>>> getNotifications(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(notificationService.getNotifications(currentUserId, unreadOnly, page, size)));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get unread notification count", description = "Use for notification bell badge.")
    public ResponseEntity<ApiResponseDTO<Long>> getUnreadCount(@CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(notificationService.getUnreadCount(currentUserId)));
    }

    @PostMapping("/{notificationId}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark a single notification as read")
    public ResponseEntity<ApiResponseDTO<Void>> markAsRead(
            @PathVariable Long notificationId,
            @CurrentUser Long currentUserId) {
        notificationService.markAsRead(notificationId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Notification marked as read"));
    }

    @PostMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<ApiResponseDTO<Void>> markAllAsRead(@CurrentUser Long currentUserId) {
        notificationService.markAllAsRead(currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("All notifications marked as read"));
    }

    @DeleteMapping("/{notificationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a notification")
    public ResponseEntity<ApiResponseDTO<Void>> deleteNotification(
            @PathVariable Long notificationId,
            @CurrentUser Long currentUserId) {
        notificationService.deleteNotification(notificationId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Notification deleted"));
    }
}
