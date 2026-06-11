package com.NextHouse.serviceImpl;

import com.NextHouse.constant.BorrowStatus;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateBorrowRequestDTO;
import com.NextHouse.dto.response.BorrowRequestResponseDTO;
import com.NextHouse.entity.*;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.BorrowRequestMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.BorrowRequestService;
import com.NextHouse.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BorrowRequestServiceImpl
 *
 * Flow:
 *   1. Requester creates a borrow request scoped to their neighborhood.
 *   2. Any neighbor can call respondToRequest() to volunteer.
 *      - respondedBy is set, status → IN_PROGRESS.
 *   3. Requester closes the request (status → FULFILLED) once they have the item.
 *   4. Requester or admin can cancel at any time (status → CANCELLED).
 *
 * Visibility:
 *   Requests are neighborhood-scoped. Only members of that neighborhood
 *   (via UserNeighborhood) can see them. The PostGIS-capable nearby query
 *   in BorrowRequestRepository handles geo filtering.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BorrowRequestServiceImpl implements BorrowRequestService {

    private final BorrowRequestRepository   requestRepository;
    private final UserRepository            userRepository;
    private final CommunityRepository       communityRepository;
    private final NeighborhoodRepository    neighborhoodRepository;

    private final BorrowRequestMapper   borrowRequestMapper;
    private final NotificationService   notificationService;

    // ─── Create ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public BorrowRequestResponseDTO createRequest(Long currentUserId, CreateBorrowRequestDTO dto) {
        User requester = findUserOrThrow(currentUserId);

        BorrowRequest request = borrowRequestMapper.toEntity(dto);
        request.setRequester(requester);
        request.setStatus(BorrowStatus.OPEN);

        if (dto.getNeighborhoodId() != null) {
            request.setNeighborhood(neighborhoodRepository.findById(dto.getNeighborhoodId())
                    .orElseThrow(() -> new NotFoundException("Neighborhood not found")));
        }
        if (dto.getCommunityId() != null) {
            request.setCommunity(communityRepository.findById(dto.getCommunityId())
                    .orElseThrow(() -> new NotFoundException("Community not found")));
        }

        BorrowRequest saved = requestRepository.save(request);
        log.info("[Borrow] Request created: id={} by userId={}", saved.getId(), currentUserId);
        return borrowRequestMapper.toResponse(saved);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public BorrowRequestResponseDTO getRequest(Long requestId) {
        return borrowRequestMapper.toResponse(findRequestOrThrow(requestId));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<BorrowRequestResponseDTO> getNeighborhoodRequests(
            Long neighborhoodId, String status, int page, int size) {
        BorrowStatus borrowStatus = status != null ? BorrowStatus.valueOf(status) : null;
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            requestRepository.findByNeighborhood(neighborhoodId, borrowStatus, pageable)
                             .map(borrowRequestMapper::toResponse)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<BorrowRequestResponseDTO> getMyRequests(Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            requestRepository.findByRequesterIdAndIsDeletedFalse(currentUserId, pageable)
                             .map(borrowRequestMapper::toResponse)
        );
    }

    // ─── State transitions ────────────────────────────────────────────────────

    /**
     * A neighbor volunteers to fulfil the request.
     * Status: OPEN → IN_PROGRESS.
     */
    @Override
    @Transactional
    public BorrowRequestResponseDTO respondToRequest(Long requestId, Long currentUserId) {
        BorrowRequest request = findRequestOrThrow(requestId);

        if (request.getStatus() != BorrowStatus.OPEN) {
            throw new ConflictException("Request is no longer open (status: " + request.getStatus() + ")");
        }
        if (request.getRequester().getId().equals(currentUserId)) {
            throw new ConflictException("You cannot respond to your own request");
        }

        User responder = findUserOrThrow(currentUserId);
        request.setRespondedBy(responder);
        request.setStatus(BorrowStatus.IN_PROGRESS);

        BorrowRequest saved = requestRepository.save(request);
        log.info("[Borrow] Request id={} responded to by userId={}", requestId, currentUserId);

        // Notify the requester — they can then open a DM with the responder
        notificationService.notifyBorrowResponse(
            responder,
            requestId,
            request.getTitle(),
            request.getRequester().getId()
        );

        return borrowRequestMapper.toResponse(saved);
    }

    /**
     * Requester marks request as fulfilled/closed once they have the item.
     * Status: IN_PROGRESS → FULFILLED.
     */
    @Override
    @Transactional
    public void closeRequest(Long requestId, Long currentUserId) {
        BorrowRequest request = findRequestOrThrow(requestId);
        assertOwner(request.getRequester().getId(), currentUserId);

        if (request.getStatus() == BorrowStatus.FULFILLED
                || request.getStatus() == BorrowStatus.CANCELLED) {
            throw new ConflictException("Request is already " + request.getStatus());
        }

        request.setStatus(BorrowStatus.FULFILLED);
        requestRepository.save(request);
        log.info("[Borrow] Request id={} closed as FULFILLED by userId={}", requestId, currentUserId);
    }

    /**
     * Soft-delete. Requester or admin can cancel any open/pending request.
     */
    @Override
    @Transactional
    public void deleteRequest(Long requestId, Long currentUserId) {
        BorrowRequest request = findRequestOrThrow(requestId);
        assertOwner(request.getRequester().getId(), currentUserId);

        request.setStatus(BorrowStatus.CANCELLED);
        request.setIsDeleted(true);
        requestRepository.save(request);
        log.info("[Borrow] Request id={} cancelled by userId={}", requestId, currentUserId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private BorrowRequest findRequestOrThrow(Long requestId) {
        return requestRepository.findById(requestId)
                .filter(r -> !r.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Borrow request not found: " + requestId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private void assertOwner(Long ownerId, Long currentUserId) {
        if (!ownerId.equals(currentUserId)) {
            throw new ForbiddenException("You do not have permission to modify this request");
        }
    }
}
