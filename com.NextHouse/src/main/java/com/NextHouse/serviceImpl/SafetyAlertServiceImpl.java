package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.*;
import com.NextHouse.event.DomainEvents;
import com.NextHouse.event.KafkaEventPublisher;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.SafetyAlertMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.SafetyAlertService;
import com.NextHouse.util.geo.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * SafetyAlertServiceImpl
 *
 * Emergency alerts trigger an immediate fanout:
 *   - Kafka event → all users in the neighborhood receive a push notification
 *     (handled by the notification consumer, not this service directly).
 *   - Non-emergency alerts are distributed via the normal feed mechanism.
 *
 * Trust-based verification:
 *   Any ADMIN or MODERATOR of the neighborhood community, or a user with
 *   trustScore >= 80, can call verifyAlert() to mark it as legitimate.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SafetyAlertServiceImpl implements SafetyAlertService {

    private final SafetyAlertRepository alertRepository;
    private final UserRepository        userRepository;
    private final NeighborhoodRepository neighborhoodRepository;
    private final CommunityRepository   communityRepository;
    private final ReportRepository      reportRepository;

    private final SafetyAlertMapper   alertMapper;
    private final GeoUtils            geoUtils;
    private final KafkaEventPublisher eventPublisher;

    @Override
    @Transactional
    public SafetyAlertResponseDTO createAlert(Long currentUserId, CreateSafetyAlertRequestDTO dto) {
        User reporter = findUserOrThrow(currentUserId);

        SafetyAlert alert = alertMapper.toEntity(dto);
        alert.setReportedBy(reporter);
        alert.setVerified(false);

        if (dto.getLatitude() != null && dto.getLongitude() != null) {
            alert.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));
        }
        if (dto.getNeighborhoodId() != null) {
            alert.setNeighborhood(neighborhoodRepository.findById(dto.getNeighborhoodId())
                    .orElseThrow(() -> new NotFoundException("Neighborhood not found")));
        }
        if (dto.getCommunityId() != null) {
            alert.setCommunity(communityRepository.findById(dto.getCommunityId())
                    .orElseThrow(() -> new NotFoundException("Community not found")));
        }

        SafetyAlert saved = alertRepository.save(alert);

        // Publish to Kafka — consumers fan out push notifications to neighborhood members
        eventPublisher.publishSafetyAlertCreated(
            DomainEvents.SafetyAlertCreatedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(currentUserId)
                .alertId(saved.getId())
                .neighborhoodId(dto.getNeighborhoodId())
                .severity(dto.getSeverity())
                .emergency(dto.getEmergency())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .build()
        );

        log.info("[SafetyAlert] Created alertId={} severity={} emergency={} by userId={}",
                saved.getId(), dto.getSeverity(), dto.getEmergency(), currentUserId);
        return alertMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SafetyAlertResponseDTO getAlert(Long alertId) {
        return alertMapper.toResponse(findAlertOrThrow(alertId));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<SafetyAlertResponseDTO> getActiveAlerts(Long neighborhoodId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            alertRepository.findActiveByNeighborhood(neighborhoodId, pageable)
                           .map(alertMapper::toResponse)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<SafetyAlertResponseDTO> getNearbyAlerts(NearbySearchRequestDTO geoDto, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            alertRepository.findNearbyAlerts(
                geoDto.getLatitude(), geoDto.getLongitude(), geoDto.getRadiusMeters(), pageable
            ).map(alertMapper::toResponse)
        );
    }

    @Override
    @Transactional
    public void resolveAlert(Long alertId, Long currentUserId) {
        SafetyAlert alert = findAlertOrThrow(alertId);
        User resolver = findUserOrThrow(currentUserId);

        // Only reporter, admin, or high-trust user can resolve
        boolean isReporter = alert.getReportedBy().getId().equals(currentUserId);
        boolean isTrusted  = resolver.getTrustScore() >= 80;
        if (!isReporter && !isTrusted) {
            throw new ForbiddenException("You do not have permission to resolve this alert");
        }

        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolvedBy(resolver);
        alertRepository.save(alert);
        log.info("[SafetyAlert] Resolved alertId={} by userId={}", alertId, currentUserId);
    }

    @Override
    @Transactional
    public void verifyAlert(Long alertId, Long currentUserId) {
        SafetyAlert alert = findAlertOrThrow(alertId);
        User verifier = findUserOrThrow(currentUserId);

        if (verifier.getTrustScore() < 80) {
            throw new ForbiddenException("Trust score too low to verify alerts (minimum: 80)");
        }

        alert.setVerified(true);
        alertRepository.save(alert);
        log.info("[SafetyAlert] Verified alertId={} by userId={}", alertId, currentUserId);
    }

    @Override
    @Transactional
    public void reportAlert(Long alertId, Long currentUserId, CreateReportRequestDTO dto) {
        findAlertOrThrow(alertId); // ensure alert exists
        User reporter = findUserOrThrow(currentUserId);

        if (reportRepository.existsByEntityTypeAndEntityIdAndReportedById(
                "SAFETY_ALERT", alertId, currentUserId)) {
            throw new ConflictException("You have already reported this alert");
        }

        Report report = Report.builder()
                .entityType("SAFETY_ALERT")
                .entityId(alertId)
                .reason(dto.getReason())
                .description(dto.getDescription())
                .status("PENDING")
                .reportedBy(reporter)
                .build();
        reportRepository.save(report);
    }

    private SafetyAlert findAlertOrThrow(Long alertId) {
        return alertRepository.findById(alertId)
                .filter(a -> !a.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Safety alert not found: " + alertId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }
}
