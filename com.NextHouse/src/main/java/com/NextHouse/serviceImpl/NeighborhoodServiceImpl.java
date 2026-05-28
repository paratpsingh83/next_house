package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.NeighborhoodSummaryDTO;
import com.NextHouse.entity.*;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.NeighborhoodMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.NeighborhoodService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * NeighborhoodServiceImpl
 *
 * Neighborhood detection strategy:
 *   1. Try ST_Within(userPoint, neighborhood.boundary) — exact polygon match.
 *   2. If no polygon match (boundary is null / not set), fall back to
 *      nearest neighborhood center within 10 km.
 *   3. If still no match → return null (user prompted to select manually).
 *
 * This service is called:
 *   - At registration (assignUserNeighborhood from GPS).
 *   - When user updates their location (updateUserNeighborhoodFromLocation).
 *   - By the scheduled location-update batch (for users who move).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NeighborhoodServiceImpl implements NeighborhoodService {

    private static final int FALLBACK_RADIUS_METERS = 10_000; // 10 km
    private static final int NEARBY_LIMIT           = 5;

    private final NeighborhoodRepository     neighborhoodRepository;
    private final UserRepository             userRepository;
    private final UserNeighborhoodRepository userNeighborhoodRepository;

    private final NeighborhoodMapper neighborhoodMapper;

    // ─── Detection ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public NeighborhoodSummaryDTO detectNeighborhood(double latitude, double longitude) {
        // Step 1: polygon containment
        return neighborhoodRepository
                .findNeighborhoodContainingPoint(latitude, longitude)
                // Step 2: nearest centre fallback
                .or(() -> neighborhoodRepository
                        .findNearestNeighborhoods(latitude, longitude, 1)
                        .stream().findFirst())
                .map(neighborhoodMapper::toSummary)
                .orElseThrow(() -> new NotFoundException(
                    "No neighborhood found for the given coordinates. " +
                    "Please select your neighborhood manually."));
    }

    // ─── User ↔ Neighborhood assignment ──────────────────────────────────────

    @Override
    @Transactional
    public void assignUserNeighborhood(Long userId, Long neighborhoodId) {
        User user = findUserOrThrow(userId);
        Neighborhood neighborhood = neighborhoodRepository.findById(neighborhoodId)
                .orElseThrow(() -> new NotFoundException("Neighborhood not found: " + neighborhoodId));

        // Demote any existing primary neighborhood
        userNeighborhoodRepository.clearPrimaryNeighborhood(userId);

        // Upsert: if already linked, promote to primary
        userNeighborhoodRepository
                .findByUserIdAndNeighborhoodId(userId, neighborhoodId)
                .ifPresentOrElse(
                    existing -> {
                        existing.setPrimaryNeighborhood(true);
                        userNeighborhoodRepository.save(existing);
                    },
                    () -> {
                        UserNeighborhood un = UserNeighborhood.builder()
                                .user(user)
                                .neighborhood(neighborhood)
                                .primaryNeighborhood(true)
                                .verified(false)
                                .build();
                        userNeighborhoodRepository.save(un);
                    }
                );

        log.info("[Neighborhood] userId={} assigned to neighborhoodId={}", userId, neighborhoodId);
    }

    @Override
    @Transactional
    public void updateUserNeighborhoodFromLocation(Long userId, double latitude, double longitude) {
        // Detect the correct neighborhood from the new GPS position
        Neighborhood detected = neighborhoodRepository
                .findNeighborhoodContainingPoint(latitude, longitude)
                .or(() -> neighborhoodRepository
                        .findNearestNeighborhoods(latitude, longitude, 1)
                        .stream().findFirst())
                .orElse(null);

        if (detected == null) {
            log.warn("[Neighborhood] No neighborhood detected for userId={} at ({},{})",
                    userId, latitude, longitude);
            return;
        }

        // Only reassign if the neighborhood has actually changed
        userNeighborhoodRepository
                .findByUserIdAndPrimaryNeighborhoodTrue(userId)
                .ifPresentOrElse(
                    existing -> {
                        if (!existing.getNeighborhood().getId().equals(detected.getId())) {
                            // Neighborhood changed — reassign
                            assignUserNeighborhood(userId, detected.getId());
                            log.info("[Neighborhood] userId={} moved to neighborhoodId={}",
                                    userId, detected.getId());
                        }
                    },
                    () -> assignUserNeighborhood(userId, detected.getId())
                );
    }

    // ─── Query ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public NeighborhoodSummaryDTO getNeighborhood(Long neighborhoodId) {
        Neighborhood nbh = neighborhoodRepository.findById(neighborhoodId)
                .orElseThrow(() -> new NotFoundException("Neighborhood not found: " + neighborhoodId));
        return neighborhoodMapper.toSummary(nbh);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<NeighborhoodSummaryDTO> getNearbyNeighborhoods(
            double latitude, double longitude, int limitCount) {
        List<Neighborhood> nearby = neighborhoodRepository
                .findNearestNeighborhoods(latitude, longitude, limitCount);
        List<NeighborhoodSummaryDTO> dtos = nearby.stream()
                .map(neighborhoodMapper::toSummary)
                .collect(Collectors.toList());
        // Wrap in a page for API consistency
        return PageResponseDTO.of(new PageImpl<>(dtos, PageRequest.of(0, limitCount), dtos.size()));
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public Neighborhood createNeighborhood(Neighborhood neighborhood) {
        Neighborhood saved = neighborhoodRepository.save(neighborhood);
        log.info("[Neighborhood] Created neighborhoodId={} name={}", saved.getId(), saved.getName());
        return saved;
    }

    @Override
    @Transactional
    public void verifyNeighborhood(Long neighborhoodId, Long adminUserId) {
        Neighborhood nbh = neighborhoodRepository.findById(neighborhoodId)
                .orElseThrow(() -> new NotFoundException("Neighborhood not found: " + neighborhoodId));
        nbh.setVerified(true);
        neighborhoodRepository.save(nbh);
        log.info("[Neighborhood] Verified neighborhoodId={} by adminId={}", neighborhoodId, adminUserId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }
}
