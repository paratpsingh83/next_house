package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.SafetyAlertResponseDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.SafetyAlertService;
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
@RequestMapping("/api/v1/safety-alerts")
@RequiredArgsConstructor
@Tag(name = "Safety Alerts", description = "Local safety and emergency alerts")
public class SafetyAlertController {

    private final SafetyAlertService safetyAlertService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a safety alert", description = "Emergency alerts (`emergency: true`) trigger immediate push notification fanout to all neighborhood members.")
    public ResponseEntity<ApiResponseDTO<SafetyAlertResponseDTO>> createAlert(
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateSafetyAlertRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Safety alert created",
                    safetyAlertService.createAlert(currentUserId, dto)));
    }

    @GetMapping("/{alertId}")
    @SecurityRequirements
    @Operation(summary = "Get safety alert details")
    public ResponseEntity<ApiResponseDTO<SafetyAlertResponseDTO>> getAlert(@PathVariable Long alertId) {
        return ResponseEntity.ok(ApiResponseDTO.success(safetyAlertService.getAlert(alertId)));
    }

    @GetMapping("/neighborhood/{neighborhoodId}")
    @SecurityRequirements
    @Operation(summary = "Get active alerts in a neighborhood", description = "Unresolved alerts only, ordered by emergency then recency.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<SafetyAlertResponseDTO>>> getActiveAlerts(
            @PathVariable Long neighborhoodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(safetyAlertService.getActiveAlerts(neighborhoodId, page, size)));
    }

    @GetMapping("/nearby")
    @SecurityRequirements
    @Operation(summary = "Get nearby active alerts (map view)", description = "Active alerts within a GPS radius, ordered by emergency then distance.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<SafetyAlertResponseDTO>>> getNearbyAlerts(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "5000") Integer radiusMeters,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        NearbySearchRequestDTO geo = NearbySearchRequestDTO.builder()
                .latitude(latitude).longitude(longitude).radiusMeters(radiusMeters).build();
        return ResponseEntity.ok(
            ApiResponseDTO.success(safetyAlertService.getNearbyAlerts(geo, page, size)));
    }

    @PostMapping("/{alertId}/resolve")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Resolve an alert", description = "Reporter or users with trustScore >= 80 can resolve.")
    public ResponseEntity<ApiResponseDTO<Void>> resolveAlert(
            @PathVariable Long alertId,
            @CurrentUser Long currentUserId) {
        safetyAlertService.resolveAlert(alertId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Alert resolved"));
    }

    @PostMapping("/{alertId}/verify")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Verify an alert as legitimate", description = "Requires trustScore >= 80. Adds a verified badge.")
    public ResponseEntity<ApiResponseDTO<Void>> verifyAlert(
            @PathVariable Long alertId,
            @CurrentUser Long currentUserId) {
        safetyAlertService.verifyAlert(alertId, currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Alert verified"));
    }

    @PostMapping("/{alertId}/report")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Report a safety alert as false or inappropriate")
    public ResponseEntity<ApiResponseDTO<Void>> reportAlert(
            @PathVariable Long alertId,
            @CurrentUser Long currentUserId,
            @Valid @RequestBody CreateReportRequestDTO dto) {
        safetyAlertService.reportAlert(alertId, currentUserId, dto);
        return ResponseEntity.ok(ApiResponseDTO.success("Alert reported"));
    }
}
