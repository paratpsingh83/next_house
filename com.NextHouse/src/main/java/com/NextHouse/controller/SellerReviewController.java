package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateReviewRequestDTO;
import com.NextHouse.dto.response.SellerRatingSummaryDTO;
import com.NextHouse.dto.response.SellerReviewResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.SellerReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/marketplace")
@RequiredArgsConstructor
@Tag(name = "Seller Reviews", description = "Ratings and reviews for marketplace sellers")
public class SellerReviewController {

    private final SellerReviewService reviewService;

    @PostMapping("/items/{itemId}/reviews")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Leave a review for a marketplace item seller")
    public ResponseEntity<ApiResponseDTO<SellerReviewResponseDTO>> createReview(
            @PathVariable Long itemId,
            @Valid @RequestBody CreateReviewRequestDTO dto,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(
                reviewService.createReview(itemId, dto, currentUserId)));
    }

    @GetMapping("/sellers/{sellerId}/reviews")
    @Operation(summary = "Get paginated reviews for a seller")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<SellerReviewResponseDTO>>> getReviews(
            @PathVariable Long sellerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponseDTO.success(
                reviewService.getReviewsForSeller(sellerId, page, size)));
    }

    @GetMapping("/sellers/{sellerId}/rating")
    @Operation(summary = "Get rating summary for a seller")
    public ResponseEntity<ApiResponseDTO<SellerRatingSummaryDTO>> getRatingSummary(
            @PathVariable Long sellerId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(
                reviewService.getRatingSummary(sellerId, currentUserId)));
    }

    @DeleteMapping("/reviews/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete your review")
    public ResponseEntity<ApiResponseDTO<Void>> deleteReview(
            @PathVariable Long reviewId,
            @CurrentUser Long currentUserId) {
        reviewService.deleteReview(reviewId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Review deleted"));
    }
}
