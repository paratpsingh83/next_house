package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateMarketplaceItemRequestDTO;
import com.NextHouse.dto.response.MarketplaceItemResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.MarketplaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/marketplace")
@RequiredArgsConstructor
@Tag(name = "Marketplace", description = "Buy/sell/free listings in the neighbourhood")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a marketplace listing", description = "Upload media first via /api/v1/media/upload, then include mediaIds here.")
    public ResponseEntity<ApiResponseDTO<MarketplaceItemResponseDTO>> createItem(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateMarketplaceItemRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Listing created",
                    marketplaceService.createItem(currentUserId, dto)));
    }

    @GetMapping("/{itemId}")
    @SecurityRequirements
    @Operation(summary = "Get a listing")
    public ResponseEntity<ApiResponseDTO<MarketplaceItemResponseDTO>> getItem(
            @PathVariable Long itemId,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(ApiResponseDTO.success(marketplaceService.getItem(itemId, currentUserId)));
    }

    @PutMapping("/{itemId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update a listing", description = "Seller only.")
    public ResponseEntity<ApiResponseDTO<MarketplaceItemResponseDTO>> updateItem(
            @PathVariable Long itemId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateMarketplaceItemRequestDTO dto) {
        return ResponseEntity.ok(
            ApiResponseDTO.success("Listing updated",
                marketplaceService.updateItem(itemId, currentUserId, dto)));
    }

    @DeleteMapping("/{itemId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a listing")
    public ResponseEntity<ApiResponseDTO<Void>> deleteItem(
            @PathVariable Long itemId,
            @CurrentUser Long currentUserId) {
        marketplaceService.deleteItem(itemId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Listing deleted"));
    }

    @PatchMapping("/{itemId}/sold")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark a listing as sold", description = "Seller only. Sets status to SOLD and available to false.")
    public ResponseEntity<ApiResponseDTO<Void>> markAsSold(
            @PathVariable Long itemId,
            @CurrentUser Long currentUserId) {
        marketplaceService.markAsSold(itemId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Listing marked as sold"));
    }

    @GetMapping("/nearby")
    @SecurityRequirements
    @Operation(summary = "Browse nearby listings", description = "Geo-filtered listings with optional category and price range filters.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<MarketplaceItemResponseDTO>>> getNearbyListings(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "10000") Integer radiusMeters,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        com.NextHouse.dto.request.NearbySearchRequestDTO geo =
            com.NextHouse.dto.request.NearbySearchRequestDTO.builder()
                .latitude(latitude).longitude(longitude).radiusMeters(radiusMeters).build();
        return ResponseEntity.ok(
            ApiResponseDTO.success(
                marketplaceService.getNearbyListings(currentUserId, geo, category, minPrice, maxPrice, page, size)));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "My listings")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<MarketplaceItemResponseDTO>>> getMyListings(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(marketplaceService.getMyListings(currentUserId, page, size)));
    }

    @GetMapping("/search")
    @SecurityRequirements
    @Operation(summary = "Search listings by title or description")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<MarketplaceItemResponseDTO>>> searchListings(
            @RequestParam String query,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(marketplaceService.searchListings(query, page, size)));
    }
}
