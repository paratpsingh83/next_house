package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.NeighborhoodSummaryDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.NeighborhoodService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/neighborhoods")
@RequiredArgsConstructor
@Tag(name = "Neighborhoods", description = "Neighborhood detection, assignment, and discovery")
public class NeighborhoodController {

    private final NeighborhoodService neighborhoodService;

    @GetMapping("/detect")
    @SecurityRequirements
    @Operation(
        summary = "Detect neighborhood from GPS coordinates",
        description = "Uses PostGIS polygon containment (ST_Within). Falls back to nearest center if no polygon match. Called at registration and on location update."
    )
    public ResponseEntity<ApiResponseDTO<NeighborhoodSummaryDTO>> detectNeighborhood(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(neighborhoodService.detectNeighborhood(latitude, longitude)));
    }

    @GetMapping("/{neighborhoodId}")
    @SecurityRequirements
    @Operation(summary = "Get neighborhood details")
    public ResponseEntity<ApiResponseDTO<NeighborhoodSummaryDTO>> getNeighborhood(
            @PathVariable Long neighborhoodId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(neighborhoodService.getNeighborhood(neighborhoodId)));
    }

    @GetMapping("/nearby")
    @SecurityRequirements
    @Operation(summary = "Find nearby neighborhoods", description = "Ordered by distance from the given coordinates.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<NeighborhoodSummaryDTO>>> getNearbyNeighborhoods(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(
                neighborhoodService.getNearbyNeighborhoods(latitude, longitude, limit)));
    }

    @PostMapping("/me/assign/{neighborhoodId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Manually assign my primary neighborhood", description = "Called when user selects their neighborhood manually from a list.")
    public ResponseEntity<ApiResponseDTO<Void>> assignMyNeighborhood(
            @PathVariable Long neighborhoodId,
            @CurrentUser Long currentUserId) {
        neighborhoodService.assignUserNeighborhood(currentUserId, neighborhoodId);
        return ResponseEntity.ok(ApiResponseDTO.success("Neighborhood assigned"));
    }

    @PostMapping("/{neighborhoodId}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "[ADMIN] Verify a neighborhood", description = "Marks the neighborhood as verified. Only verified neighborhoods appear in detection results.")
    public ResponseEntity<ApiResponseDTO<Void>> verifyNeighborhood(
            @PathVariable Long neighborhoodId,
            @CurrentUser Long currentUserId) {
        neighborhoodService.verifyNeighborhood(neighborhoodId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Neighborhood verified"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "[ADMIN] Create a neighborhood",
        description = "Creates a new neighborhood record. Set `verified: true` to make it immediately active in geo-detection. Boundary polygon (PostGIS) should be set for accurate ST_Within queries."
    )
    public ResponseEntity<ApiResponseDTO<NeighborhoodSummaryDTO>> createNeighborhood(
            @RequestBody com.NextHouse.entity.Neighborhood neighborhood) {
        com.NextHouse.entity.Neighborhood saved = neighborhoodService.createNeighborhood(neighborhood);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Neighborhood created",
                    neighborhoodService.getNeighborhood(saved.getId())));
    }
}
