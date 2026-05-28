package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateChatRoomRequestDTO;
import com.NextHouse.dto.request.SendMessageRequestDTO;
import com.NextHouse.dto.response.ChatMessageResponseDTO;
import com.NextHouse.dto.response.ChatRoomResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Direct and group messaging, inbox, real-time chat (REST layer — use WebSocket for live delivery)")
public class ChatController {

    private final ChatService chatService;

    // ─── Inbox ────────────────────────────────────────────────────────────────

    @GetMapping("/inbox")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Get chat inbox",
        description = "All chat rooms for the current user, sorted by most recent message. Each room includes unread count."
    )
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ChatRoomResponseDTO>>> getInbox(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(chatService.getInbox(currentUserId, page, size)));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get total unread message count", description = "Sum of unread counts across all rooms. Use for notification badge.")
    public ResponseEntity<ApiResponseDTO<Long>> getTotalUnreadCount(@CurrentUser Long currentUserId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(chatService.getTotalUnreadCount(currentUserId)));
    }

    // ─── Direct chat ──────────────────────────────────────────────────────────

    @PostMapping("/direct/{otherUserId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Get or create a direct chat room",
        description = "Returns an existing DIRECT room with the given user, or creates one if none exists. Idempotent."
    )
    public ResponseEntity<ApiResponseDTO<ChatRoomResponseDTO>> getOrCreateDirectRoom(
            @CurrentUser Long currentUserId,
            @PathVariable Long otherUserId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(chatService.getOrCreateDirectRoom(currentUserId, otherUserId)));
    }

    // ─── Group chat ───────────────────────────────────────────────────────────

    @PostMapping("/group")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Create a group chat room",
        description = "Creator becomes ADMIN. Include `memberIds` of users to add. Can also create ACTIVITY or COMMUNITY typed rooms."
    )
    public ResponseEntity<ApiResponseDTO<ChatRoomResponseDTO>> createGroupRoom(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateChatRoomRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Group chat created",
                    chatService.createGroupRoom(currentUserId, dto)));
    }

    // ─── Room operations ──────────────────────────────────────────────────────

    @GetMapping("/rooms/{roomId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get room details", description = "Returns room info with full member list and unread count.")
    public ResponseEntity<ApiResponseDTO<ChatRoomResponseDTO>> getRoomDetails(
            @PathVariable Long roomId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(chatService.getRoomDetails(roomId, currentUserId)));
    }

    @PostMapping("/rooms/{roomId}/members/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add a member to a group room", description = "Room ADMIN only.")
    public ResponseEntity<ApiResponseDTO<Void>> addMember(
            @PathVariable Long roomId,
            @PathVariable Long userId,
            @CurrentUser Long currentUserId) {
        chatService.addMember(roomId, userId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Member added"));
    }

    @DeleteMapping("/rooms/{roomId}/members/{userId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Remove a member from a group room", description = "Room ADMIN only.")
    public ResponseEntity<ApiResponseDTO<Void>> removeMember(
            @PathVariable Long roomId,
            @PathVariable Long userId,
            @CurrentUser Long currentUserId) {
        chatService.removeMember(roomId, userId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Member removed"));
    }

    @PatchMapping("/rooms/{roomId}/mute")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mute or unmute a room", description = "Muted rooms don't send push notifications.")
    public ResponseEntity<ApiResponseDTO<Void>> muteRoom(
            @PathVariable Long roomId,
            @CurrentUser Long currentUserId,
            @RequestParam boolean muted) {
        chatService.muteRoom(roomId, currentUserId, muted);
        return ResponseEntity.ok(ApiResponseDTO.success(muted ? "Room muted" : "Room unmuted"));
    }

    // ─── Messages ─────────────────────────────────────────────────────────────

    @GetMapping("/rooms/{roomId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Get chat history",
        description = """
            Returns paginated message history for a room, newest first.
            Use `page=0` for the latest messages, then increment to load older ones (scroll-up pagination).
            
            **Note:** For real-time messaging, connect via WebSocket STOMP and subscribe to
            `/topic/rooms/{roomId}/messages`.
            """
    )
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<ChatMessageResponseDTO>>> getChatHistory(
            @PathVariable Long roomId,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(chatService.getHistory(roomId, currentUserId, page, size)));
    }

    @PostMapping("/rooms/{roomId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Send a message (REST fallback)",
        description = """
            REST fallback for sending a message. Prefer WebSocket for real-time delivery.
            Message is persisted to DB and the room's lastMessage preview is updated.
            """
    )
    public ResponseEntity<ApiResponseDTO<ChatMessageResponseDTO>> sendMessage(
            @PathVariable Long roomId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody SendMessageRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Message sent",
                    chatService.sendMessage(roomId, currentUserId, dto)));
    }

    @DeleteMapping("/rooms/{roomId}/messages/{messageId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a message", description = "Soft-deletes the message. Shows 'This message was deleted' in the UI.")
    public ResponseEntity<ApiResponseDTO<Void>> deleteMessage(
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            @CurrentUser Long currentUserId) {
        chatService.deleteMessage(messageId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Message deleted"));
    }

    @PostMapping("/rooms/{roomId}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark room as read", description = "Updates `lastReadAt` for the current user. Resets unread count to 0.")
    public ResponseEntity<ApiResponseDTO<Void>> markAsRead(
            @PathVariable Long roomId,
            @CurrentUser Long currentUserId) {
        chatService.markRoomAsRead(roomId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Room marked as read"));
    }

    @GetMapping("/rooms/{roomId}/unread-count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get unread message count for a room")
    public ResponseEntity<ApiResponseDTO<Long>> getUnreadCount(
            @PathVariable Long roomId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(chatService.getUnreadCount(roomId, currentUserId)));
    }
}
