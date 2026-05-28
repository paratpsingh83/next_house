package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.ActivityResponseDTO;
import com.NextHouse.dto.response.CommunityResponseDTO;
import com.NextHouse.dto.response.PostResponseDTO;
import com.NextHouse.dto.response.UserSummaryDTO;

public interface RecommendationService {

    /** Top recommended posts for a user's personalised feed. */
    PageResponseDTO<PostResponseDTO> getRecommendedPosts(Long currentUserId, int page, int size);

    /** Top recommended activities near the user. */
    PageResponseDTO<ActivityResponseDTO> getRecommendedActivities(Long currentUserId, int page, int size);

    /** Top recommended communities for the user to join. */
    PageResponseDTO<CommunityResponseDTO> getRecommendedCommunities(Long currentUserId, int page, int size);

    /** People the user might know. */
    PageResponseDTO<UserSummaryDTO> getRecommendedUsers(Long currentUserId, int page, int size);

    /**
     * Called by Kafka consumer after user action (like, follow, join, location change).
     * Recomputes and upserts recommendation scores for the affected user.
     */
    void recomputeScores(Long userId, String entityType);

    /** Bulk upsert scores — called by batch AI job. */
    void saveScores(Long userId, String entityType,
                    java.util.List<com.NextHouse.entity.RecommendationScore> scores);
}
