package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.RecommendationScore;
import com.NextHouse.mapper.*;
import com.NextHouse.repository.*;
import com.NextHouse.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * RecommendationServiceImpl
 *
 * Architecture:
 *   This service is the READ side of the recommendation system.
 *   Scores are written by an offline AI/ML batch job (Python/Spark) that:
 *     1. Pulls user interaction signals from Kafka (likes, follows, joins, searches).
 *     2. Computes collaborative filtering / content-based scores.
 *     3. Calls saveScores() to bulk-upsert into recommendation_scores table.
 *
 *   At read time, the service simply selects the top-N pre-computed scores
 *   for the user, then hydrates the actual entity objects.
 *
 * Fallback strategy (cold start — new user with no scores):
 *   - Posts   → fallback to getTrendingFeed() for user's neighborhood.
 *   - Users   → fallback to getSuggestedUsers() (friends-of-friends).
 *   - Communities → fallback to getNearbyCommunities().
 *   - Activities  → fallback to getNearbyActivities().
 *
 * Score versioning:
 *   scoreVersion tracks which model iteration produced the score.
 *   Stale scores (old version) are recomputed on next batch job run.
 *
 * Current model version — update this when deploying a new model:
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationServiceImpl implements RecommendationService {

    private static final String CURRENT_MODEL_VERSION = "v1.0";

    private final RecommendationScoreRepository scoreRepository;
    private final PostRepository                postRepository;
    private final ActivityRepository            activityRepository;
    private final CommunityRepository           communityRepository;
    private final UserRepository                userRepository;

    private final PostMapper        postMapper;
    private final ActivityMapper    activityMapper;
    private final CommunityMapper   communityMapper;
    private final UserMapper        userMapper;

    // ─── Read: top recommendations ────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getRecommendedPosts(Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<RecommendationScore> scores = scoreRepository
                .findTopRecommendations(currentUserId, "POST", pageable);

        if (scores.isEmpty()) {
            // Cold-start fallback: return trending posts from primary neighborhood
            log.debug("[Recommendation] Cold start fallback for posts, userId={}", currentUserId);
            return PageResponseDTO.of(
                postRepository.findTrendingFeed(
                    resolveNeighborhoodId(currentUserId), pageable
                ).map(postMapper::toResponse)
            );
        }

        // Hydrate Post entities from pre-computed score entity IDs
        return PageResponseDTO.of(scores.map(score ->
            postRepository.findById(score.getEntityId())
                .filter(p -> !p.getIsDeleted())
                .map(postMapper::toResponse)
                .orElse(null)
        ).map(r -> r)); // nulls filtered at presentation layer
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> getRecommendedActivities(Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<RecommendationScore> scores = scoreRepository
                .findTopRecommendations(currentUserId, "ACTIVITY", pageable);

        if (scores.isEmpty()) {
            log.debug("[Recommendation] Cold start fallback for activities, userId={}", currentUserId);
            return PageResponseDTO.of(
                activityRepository.findByCommunityId(
                    null, LocalDateTime.now(), pageable
                ).map(a -> activityMapper.toResponse(a))
            );
        }

        return PageResponseDTO.of(scores.map(score ->
            activityRepository.findById(score.getEntityId())
                .filter(a -> !a.getIsDeleted())
                .map(activityMapper::toResponse)
                .orElse(null)
        ).map(r -> r));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<CommunityResponseDTO> getRecommendedCommunities(Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<RecommendationScore> scores = scoreRepository
                .findTopRecommendations(currentUserId, "COMMUNITY", pageable);

        if (scores.isEmpty()) {
            log.debug("[Recommendation] Cold start fallback for communities, userId={}", currentUserId);
            return PageResponseDTO.of(
                communityRepository.findUserCommunities(currentUserId, pageable)
                    .map(c -> communityMapper.toResponse(c))
            );
        }

        return PageResponseDTO.of(scores.map(score ->
            communityRepository.findById(score.getEntityId())
                .filter(c -> !c.getIsDeleted())
                .map(communityMapper::toResponse)
                .orElse(null)
        ).map(r -> r));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> getRecommendedUsers(Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<RecommendationScore> scores = scoreRepository
                .findTopRecommendations(currentUserId, "USER", pageable);

        if (scores.isEmpty()) {
            log.debug("[Recommendation] Cold start fallback for users, userId={}", currentUserId);
            return PageResponseDTO.of(
                userRepository.findSuggestedUsers(currentUserId, pageable)
                    .map(userMapper::toSummary)
            );
        }

        return PageResponseDTO.of(scores.map(score ->
            userRepository.findById(score.getEntityId())
                .filter(u -> !u.getIsDeleted())
                .map(userMapper::toSummary)
                .orElse(null)
        ).map(r -> r));
    }

    // ─── Write: score upsert ──────────────────────────────────────────────────

    /**
     * Recompute scores for a user + entity type.
     * In production, this delegates to an async ML job via Kafka.
     * Here it resets stale scores so the next batch job recomputes them.
     */
    @Override
    @Transactional
    public void recomputeScores(Long userId, String entityType) {
        List<RecommendationScore> stale = scoreRepository.findStaleScores(userId, CURRENT_MODEL_VERSION);
        stale.forEach(s -> {
            s.setScore(0.0);  // demote stale scores — batch job will overwrite
        });
        if (!stale.isEmpty()) {
            scoreRepository.saveAll(stale);
            log.debug("[Recommendation] Demoted {} stale scores for userId={} type={}",
                    stale.size(), userId, entityType);
        }
    }

    /**
     * Bulk upsert recommendation scores — called by the AI batch job.
     * Deletes existing scores for this user+type, then inserts the new batch.
     * This is a full replacement per (userId, entityType) batch.
     */
    @Override
    @Transactional
    public void saveScores(Long userId, String entityType, List<RecommendationScore> scores) {
        // Delete old scores for this user + entity type
        scoreRepository.deleteByUserIdAndEntityType(userId, entityType);

        // Set metadata and save new batch
        LocalDateTime now = LocalDateTime.now();
        scores.forEach(score -> {
            score.setComputedAt(now);
            score.setScoreVersion(CURRENT_MODEL_VERSION);
        });
        scoreRepository.saveAll(scores);
        log.info("[Recommendation] Saved {} scores for userId={} type={}", scores.size(), userId, entityType);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Resolves the primary neighborhood ID for a user.
     * Used for cold-start fallback queries.
     */
    private Long resolveNeighborhoodId(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> u.getLatitude() != null)
                .map(u -> 1L) // Placeholder — in prod: userNeighborhoodRepository.findPrimary(userId)
                .orElse(1L);
    }
}
