package com.NextHouse.service;

import com.NextHouse.constant.ModerationStatus;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.entity.ModerationQueue;

public interface ModerationService {

    /**
     * Called by AI moderation pipeline or user report trigger.
     * Checks if content already in queue — upserts if so.
     */
    void submitForModeration(String contentType, Long contentId,
                             String reason, Double confidenceScore,
                             String aiResponse, Long reportedByUserId);

    void reviewContent(Long queueId, Long adminUserId, ModerationStatus decision, String note);

    void autoBlockContent(Long queueId);

    PageResponseDTO<ModerationQueue> getPendingQueue(String contentType, int page, int size);

    PageResponseDTO<ModerationQueue> getQueueByStatus(ModerationStatus status, int page, int size);

    long countPending();
}
