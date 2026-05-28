package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.NeighborhoodSummaryDTO;
import com.NextHouse.entity.Neighborhood;

public interface NeighborhoodService {

    /** Detect neighborhood from GPS coordinates (polygon containment → nearest fallback). */
    NeighborhoodSummaryDTO detectNeighborhood(double latitude, double longitude);

    /** Assign or update a user's primary neighborhood. */
    void assignUserNeighborhood(Long userId, Long neighborhoodId);

    /** Update user's primary neighborhood from fresh GPS coordinates. */
    void updateUserNeighborhoodFromLocation(Long userId, double latitude, double longitude);

    NeighborhoodSummaryDTO getNeighborhood(Long neighborhoodId);

    PageResponseDTO<NeighborhoodSummaryDTO> getNearbyNeighborhoods(double latitude, double longitude, int limitCount);

    /** Admin: create / verify a neighborhood. */
    Neighborhood createNeighborhood(Neighborhood neighborhood);

    void verifyNeighborhood(Long neighborhoodId, Long adminUserId);
}
