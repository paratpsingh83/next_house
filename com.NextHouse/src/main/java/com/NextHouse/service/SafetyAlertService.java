package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;

public interface SafetyAlertService {
    SafetyAlertResponseDTO createAlert(Long currentUserId, CreateSafetyAlertRequestDTO dto);
    SafetyAlertResponseDTO getAlert(Long alertId);
    PageResponseDTO<SafetyAlertResponseDTO> getActiveAlerts(Long neighborhoodId, int page, int size);
    PageResponseDTO<SafetyAlertResponseDTO> getNearbyAlerts(NearbySearchRequestDTO geoDto, int page, int size);
    void resolveAlert(Long alertId, Long currentUserId);
    void verifyAlert(Long alertId, Long currentUserId);
    void reportAlert(Long alertId, Long currentUserId, CreateReportRequestDTO dto);
}
