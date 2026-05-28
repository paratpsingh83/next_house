package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateBorrowRequestDTO;
import com.NextHouse.dto.response.BorrowRequestResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.BorrowRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/borrow-requests")
@RequiredArgsConstructor
@Tag(name = "Borrow Requests", description = "Neighbourhood borrow/lend requests")
public class BorrowRequestController {

    private final BorrowRequestService borrowRequestService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a borrow request", description = "Post a request to borrow something from your neighbourhood.")
    public ResponseEntity<ApiResponseDTO<BorrowRequestResponseDTO>> createRequest(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateBorrowRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Request posted",
                    borrowRequestService.createRequest(currentUserId, dto)));
    }

    @GetMapping("/{requestId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a borrow request")
    public ResponseEntity<ApiResponseDTO<BorrowRequestResponseDTO>> getRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(ApiResponseDTO.success(borrowRequestService.getRequest(requestId)));
    }

    @GetMapping("/neighborhood/{neighborhoodId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Browse borrow requests in a neighbourhood", description = "Filter by status: OPEN, IN_PROGRESS, FULFILLED, CANCELLED.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<BorrowRequestResponseDTO>>> getNeighborhoodRequests(
            @PathVariable Long neighborhoodId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(
                borrowRequestService.getNeighborhoodRequests(neighborhoodId, status, page, size)));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "My borrow requests")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<BorrowRequestResponseDTO>>> getMyRequests(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(borrowRequestService.getMyRequests(currentUserId, page, size)));
    }

    @PostMapping("/{requestId}/respond")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Volunteer to fulfil a request", description = "Sets respondedBy to the current user and status to IN_PROGRESS.")
    public ResponseEntity<ApiResponseDTO<BorrowRequestResponseDTO>> respondToRequest(
            @PathVariable Long requestId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Response recorded",
                borrowRequestService.respondToRequest(requestId, currentUserId)));
    }

    @PostMapping("/{requestId}/close")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Close a request as fulfilled", description = "Requester only. Sets status to FULFILLED.")
    public ResponseEntity<ApiResponseDTO<Void>> closeRequest(
            @PathVariable Long requestId,
            @CurrentUser Long currentUserId) {
        borrowRequestService.closeRequest(requestId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Request closed as fulfilled"));
    }

    @DeleteMapping("/{requestId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel and delete a request", description = "Requester only.")
    public ResponseEntity<ApiResponseDTO<Void>> deleteRequest(
            @PathVariable Long requestId,
            @CurrentUser Long currentUserId) {
        borrowRequestService.deleteRequest(requestId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Request cancelled"));
    }
}
