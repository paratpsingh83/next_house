package com.NextHouse.serviceImpl;

import com.NextHouse.constant.ModerationStatus;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.entity.*;
import com.NextHouse.exception.*;
import com.NextHouse.repository.*;
import com.NextHouse.service.ModerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * ModerationServiceImpl
 *
 * Two moderation pathways:
 *
 * 1. AI-triggered:
 *    When content is created (post, comment, marketplace listing), a Kafka consumer
 *    sends it to the AI moderation API. The AI responds with a confidence score.
 *    - score >= 0.9  → AUTO_BLOCKED immediately.
 *    - score 0.5–0.9 → PENDING (goes to human review queue).
 *    - score < 0.5   → AUTO_APPROVED (no action).
 *
 * 2. User-reported:
 *    When a user files a report (via ReportService), it triggers
 *    submitForModeration() with confidenceScore=null (no AI, human review only).
 *
 * Admin review:
 *    Admin calls reviewContent() with MANUALLY_APPROVED or MANUALLY_BLOCKED.
 *    On MANUALLY_BLOCKED: the underlying content entity is soft-deleted.
 *
 * Content action execution:
 *    This service only manages the queue. The actual soft-delete of the content
 *    is performed by calling the relevant repository directly (no service call
 *    to avoid circular dependencies). Each content type has its own handler.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationServiceImpl implements ModerationService {

    private final ModerationQueueRepository  queueRepository;
    private final UserRepository             userRepository;

    // Repositories needed to act on content when a block decision is made
    private final PostRepository             postRepository;
    private final PostCommentRepository      commentRepository;
    private final MarketplaceItemRepository  marketplaceItemRepository;
    private final ActivityRepository         activityRepository;
    private final SafetyAlertRepository      safetyAlertRepository;

    // ─── Submit ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void submitForModeration(String contentType, Long contentId,
                                    String reason, Double confidenceScore,
                                    String aiResponse, Long reportedByUserId) {

        // Upsert: if already in queue, update score; don't create duplicate rows
        ModerationQueue entry = queueRepository
                .findByContentTypeAndContentId(contentType, contentId)
                .orElse(ModerationQueue.builder()
                        .contentType(contentType)
                        .contentId(contentId)
                        .status(ModerationStatus.PENDING)
                        .autoBlocked(false)
                        .build());

        entry.setReason(reason);
        entry.setConfidenceScore(confidenceScore);
        entry.setAiResponse(aiResponse);

        if (reportedByUserId != null) {
            userRepository.findById(reportedByUserId)
                    .ifPresent(entry::setReportedBy);
        }

        // Auto-block on high confidence
        if (confidenceScore != null && confidenceScore >= 0.9) {
            entry.setStatus(ModerationStatus.AUTO_BLOCKED);
            entry.setAutoBlocked(true);
            queueRepository.save(entry);
            executeContentBlock(contentType, contentId);
            log.warn("[Moderation] AUTO_BLOCKED {}:{} (score={})", contentType, contentId, confidenceScore);
            return;
        }

        // Auto-approve on low confidence (AI confident it's safe)
        if (confidenceScore != null && confidenceScore < 0.3) {
            entry.setStatus(ModerationStatus.AUTO_APPROVED);
            queueRepository.save(entry);
            log.debug("[Moderation] AUTO_APPROVED {}:{} (score={})", contentType, contentId, confidenceScore);
            return;
        }

        // Otherwise queue for human review
        entry.setStatus(ModerationStatus.PENDING);
        queueRepository.save(entry);
        log.info("[Moderation] Queued for review: {}:{} reason={}", contentType, contentId, reason);
    }

    // ─── Admin review ─────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void reviewContent(Long queueId, Long adminUserId,
                               ModerationStatus decision, String note) {

        ModerationQueue entry = queueRepository.findById(queueId)
                .orElseThrow(() -> new NotFoundException("Moderation queue entry not found: " + queueId));

        if (entry.getStatus() != ModerationStatus.PENDING
                && entry.getStatus() != ModerationStatus.ESCALATED) {
            throw new ConflictException("Entry is already reviewed: " + entry.getStatus());
        }

        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new NotFoundException("Admin user not found"));

        entry.setStatus(decision);
        entry.setReviewedBy(admin);
        entry.setReviewedAt(LocalDateTime.now());
        entry.setReason(note != null ? note : entry.getReason());

        if (decision == ModerationStatus.MANUALLY_BLOCKED) {
            entry.setAutoBlocked(true);
            executeContentBlock(entry.getContentType(), entry.getContentId());
            log.info("[Moderation] MANUALLY_BLOCKED {}:{} by adminId={}",
                    entry.getContentType(), entry.getContentId(), adminUserId);
        }

        queueRepository.save(entry);
    }

    @Override
    @Transactional
    public void autoBlockContent(Long queueId) {
        ModerationQueue entry = queueRepository.findById(queueId)
                .orElseThrow(() -> new NotFoundException("Queue entry not found: " + queueId));
        entry.setStatus(ModerationStatus.AUTO_BLOCKED);
        entry.setAutoBlocked(true);
        executeContentBlock(entry.getContentType(), entry.getContentId());
        queueRepository.save(entry);
    }

    // ─── Query ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ModerationQueue> getPendingQueue(String contentType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            queueRepository.findAllForAdmin(ModerationStatus.PENDING, contentType, pageable)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ModerationQueue> getQueueByStatus(ModerationStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            queueRepository.findByStatusAndIsDeletedFalse(status, pageable)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public long countPending() {
        return queueRepository.countByStatus(ModerationStatus.PENDING);
    }

    // ─── Content action ───────────────────────────────────────────────────────

    /**
     * Soft-deletes the underlying entity for blocked content.
     * Each content type is handled via its own repository — no service layer
     * calls to avoid circular bean dependencies.
     */
    private void executeContentBlock(String contentType, Long contentId) {
        switch (contentType.toUpperCase()) {
            case "POST" -> postRepository.findById(contentId).ifPresent(post -> {
                post.setIsDeleted(true);
                postRepository.save(post);
            });
            case "COMMENT" -> commentRepository.findById(contentId).ifPresent(comment -> {
                comment.setIsDeleted(true);
                commentRepository.save(comment);
            });
            case "MARKETPLACE" -> marketplaceItemRepository.findById(contentId).ifPresent(item -> {
                item.setIsDeleted(true);
                item.setStatus("REMOVED");
                marketplaceItemRepository.save(item);
            });
            case "ACTIVITY" -> activityRepository.findById(contentId).ifPresent(activity -> {
                activity.setIsDeleted(true);
                activityRepository.save(activity);
            });
            case "SAFETY_ALERT" -> safetyAlertRepository.findById(contentId).ifPresent(alert -> {
                alert.setIsDeleted(true);
                safetyAlertRepository.save(alert);
            });
            default -> log.warn("[Moderation] Unknown contentType for block action: {}", contentType);
        }
    }
}
