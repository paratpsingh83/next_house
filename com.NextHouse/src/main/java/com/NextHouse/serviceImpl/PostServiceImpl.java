package com.NextHouse.serviceImpl;

import com.NextHouse.constant.PostStatus;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.*;
import com.NextHouse.event.DomainEvents;
import com.NextHouse.event.KafkaEventPublisher;
import com.NextHouse.exception.ConflictException;
import com.NextHouse.exception.ForbiddenException;
import com.NextHouse.exception.NotFoundException;
import com.NextHouse.mapper.PostCommentMapper;
import com.NextHouse.mapper.PostMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.MediaService;
import com.NextHouse.service.NotificationService;
import com.NextHouse.service.PostService;
import com.NextHouse.util.geo.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostServiceImpl implements PostService {

    private final PostRepository         postRepository;
    private final PostHashtagRepository  postHashtagRepository;
    private final PostCommentRepository  commentRepository;
    private final PostLikeRepository     postLikeRepository;
    private final SavedPostRepository    savedPostRepository;
    private final UserRepository         userRepository;
    private final CommunityRepository    communityRepository;
    private final NeighborhoodRepository neighborhoodRepository;
    private final BlockedUserRepository  blockedUserRepository;
    private final MediaFileRepository    mediaFileRepository;

    private final PostMapper        postMapper;
    private final PostCommentMapper commentMapper;
    private final GeoUtils          geoUtils;
    private final MediaService      mediaService;
    private final NotificationService notificationService;
    private final KafkaEventPublisher eventPublisher;

    // ─── Create ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(value = {"feed:trending"}, allEntries = true)
    public PostResponseDTO createPost(Long currentUserId, CreatePostRequestDTO dto) {
        User author = findUserOrThrow(currentUserId);

        Post post = postMapper.toEntity(dto);
        post.setCreatedBy(author);
        post.setStatus(PostStatus.PUBLISHED);

        if (dto.getLatitude() != null && dto.getLongitude() != null) {
            post.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));
        }

        if (dto.getCommunityId() != null) {
            post.setCommunity(communityRepository.findById(dto.getCommunityId())
                    .orElseThrow(() -> new NotFoundException("Community not found")));
        }

        if (dto.getNeighborhoodId() != null) {
            post.setNeighborhood(neighborhoodRepository.findById(dto.getNeighborhoodId())
                    .orElseThrow(() -> new NotFoundException("Neighborhood not found")));
        } else {
            // Prefer the post's own GPS coords; fall back to author's stored location
            Double nLat = dto.getLatitude()  != null ? dto.getLatitude()  : author.getLatitude();
            Double nLon = dto.getLongitude() != null ? dto.getLongitude() : author.getLongitude();
            if (nLat != null && nLon != null) {
                neighborhoodRepository
                        .findNeighborhoodContainingPoint(nLat, nLon)
                        .ifPresent(post::setNeighborhood);
            }
        }

        if (dto.getHashtags() != null && !dto.getHashtags().isEmpty()) {
            post.setHashtagString(String.join(",", dto.getHashtags()).toLowerCase());
        }

        Post saved = postRepository.save(post);
        saveHashtags(saved.getId(), dto.getHashtags());

        if (dto.getMediaIds() != null && !dto.getMediaIds().isEmpty()) {
            mediaService.attachMediaToEntity(dto.getMediaIds(), "POST", saved.getId());
        }

        eventPublisher.publishPostCreated(
                DomainEvents.PostCreatedEvent.builder()
                        .eventId(KafkaEventPublisher.newEventId())
                        .occurredAt(LocalDateTime.now())
                        .actorId(currentUserId)
                        .postId(saved.getId())
                        .authorId(currentUserId)
                        .neighborhoodId(dto.getNeighborhoodId())
                        .communityId(dto.getCommunityId())
                        .postType(dto.getPostType())
                        .latitude(dto.getLatitude())
                        .longitude(dto.getLongitude())
                        .build()
        );

        log.info("[Post] Created postId={} by userId={}", saved.getId(), currentUserId);
        return enrichPostResponse(postMapper.toResponse(saved), currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "post", key = "#postId")
    public PostResponseDTO getPost(Long postId, Long currentUserId) {
        Post post = findPostOrThrow(postId);
        return enrichPostResponse(postMapper.toResponse(post), currentUserId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "post", key = "#postId")
    public PostResponseDTO updatePost(Long postId, Long currentUserId, UpdatePostRequestDTO dto) {
        Post post = findPostOrThrow(postId);
        if (!post.getCreatedBy().getId().equals(currentUserId))
            throw new ForbiddenException("Not the post author");
        postMapper.updateFromRequest(dto, post);
        post.setEdited(true);
        if (dto.getHashtags() != null)
            post.setHashtagString(String.join(",", dto.getHashtags()).toLowerCase());
        Post saved = postRepository.save(post);
        if (dto.getHashtags() != null) {
            postHashtagRepository.deleteByPostId(postId);
            saveHashtags(postId, dto.getHashtags());
        }
        return enrichPostResponse(postMapper.toResponse(saved), currentUserId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"post", "feed:trending"}, allEntries = true)
    public void deletePost(Long postId, Long currentUserId) {
        Post post = findPostOrThrow(postId);
        User user = findUserOrThrow(currentUserId);
        if (!post.getCreatedBy().getId().equals(currentUserId) && !"ADMIN".equals(user.getRole()))
            throw new ForbiddenException("Not authorized to delete this post");
        post.setIsDeleted(true);
        post.setStatus(PostStatus.REMOVED);
        postRepository.save(post);
        mediaFileRepository.softDeleteByEntity("POST", postId);
        log.info("[Post] Deleted postId={} by userId={}", postId, currentUserId);
    }

    // ─── Feeds ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getFollowingFeed(Long currentUserId, int page, int size) {
        List<Long> blockedIds = getBlockedIds(currentUserId);
        Page<Post> posts = postRepository.findFollowingFeed(currentUserId, blockedIds, PageRequest.of(page, size));
        return enrichedPage(posts, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getNearbyFeed(
            Long currentUserId, NearbySearchRequestDTO geoDto, int page, int size) {

        List<Long> blockedIds = getBlockedIds(currentUserId);
        Pageable pageable = PageRequest.of(page, size);

        // Tier 1 — neighborhood containing user's stored location
        Long neighborhoodId = userRepository.findById(currentUserId)
                .flatMap(u -> u.getLatitude() != null
                        ? neighborhoodRepository.findNeighborhoodContainingPoint(u.getLatitude(), u.getLongitude())
                        : java.util.Optional.empty())
                .map(Neighborhood::getId)
                .orElse(null);

        // Tier 2 — nearest neighborhood to requested coords
        if (neighborhoodId == null) {
            neighborhoodId = neighborhoodRepository
                    .findNearestNeighborhood(geoDto.getLatitude(), geoDto.getLongitude())
                    .map(Neighborhood::getId)
                    .orElse(null);
        }

        Page<Post> posts = neighborhoodId != null
                ? postRepository.findNearbyFeed(neighborhoodId, geoDto.getLatitude(), geoDto.getLongitude(),
                        geoDto.getRadiusMeters(), blockedIds, pageable)
                : postRepository.findNearbyFeedByGps(geoDto.getLatitude(), geoDto.getLongitude(),
                        geoDto.getRadiusMeters(), blockedIds, pageable);

        return enrichedPage(posts, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "feed:trending", key = "#neighborhoodId + ':' + #page")
    public PageResponseDTO<PostResponseDTO> getTrendingFeed(Long currentUserId, Long neighborhoodId, int page, int size) {
        Page<Post> posts = postRepository.findTrendingFeed(neighborhoodId, PageRequest.of(page, size));
        return enrichedPage(posts, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getCommunityFeed(Long currentUserId, Long communityId, int page, int size) {
        List<Long> blockedIds = getBlockedIds(currentUserId);
        Page<Post> posts = postRepository.findCommunityFeed(communityId, blockedIds, PageRequest.of(page, size));
        return enrichedPage(posts, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getUserPosts(Long userId, Long currentUserId, int page, int size) {
        List<Long> blockedIds = getBlockedIds(currentUserId);
        Page<Post> posts = postRepository.findUserPosts(userId, blockedIds, PageRequest.of(page, size));
        return enrichedPage(posts, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getHashtagFeed(String hashtag, Long currentUserId, int page, int size) {
        Page<Post> posts = postRepository.findByHashtag(hashtag.toLowerCase(), PageRequest.of(page, size));
        return enrichedPage(posts, currentUserId);
    }

    // ─── Reactions ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(value = "post", key = "#postId")
    public void reactToPost(Long postId, Long currentUserId, ReactPostRequestDTO dto) {
        Post post = findPostOrThrow(postId);
        User user = findUserOrThrow(currentUserId);

        postLikeRepository.findByPostIdAndLikedById(postId, currentUserId).ifPresentOrElse(
                existing -> { existing.setReactionType(dto.getReactionType()); postLikeRepository.save(existing); },
                () -> {
                    postLikeRepository.save(PostLike.builder()
                            .post(post).likedBy(user).reactionType(dto.getReactionType()).build());
                    postRepository.incrementLikeCount(postId);
                    // Notify post author — skip self-reactions
                    if (!currentUserId.equals(post.getCreatedBy().getId())) {
                        notificationService.notifyPostLike(user, postId, post.getCreatedBy().getId());
                    }
                }
        );
    }

    @Override
    @Transactional
    @CacheEvict(value = "post", key = "#postId")
    public void removeReaction(Long postId, Long currentUserId) {
        PostLike like = postLikeRepository.findByPostIdAndLikedById(postId, currentUserId)
                .orElseThrow(() -> new NotFoundException("Reaction not found"));
        postLikeRepository.delete(like);
        postRepository.decrementLikeCount(postId);
    }

    // ─── Save / Share ─────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void savePost(Long postId, Long currentUserId) {
        if (savedPostRepository.existsByUserIdAndPostId(currentUserId, postId))
            throw new ConflictException("Post already saved");
        Post post = findPostOrThrow(postId);
        User user = findUserOrThrow(currentUserId);
        savedPostRepository.save(SavedPost.builder().user(user).post(post).build());
    }

    @Override
    @Transactional
    public void unsavePost(Long postId, Long currentUserId) {
        SavedPost sp = savedPostRepository.findByUserIdAndPostId(currentUserId, postId)
                .orElseThrow(() -> new NotFoundException("Saved post not found"));
        savedPostRepository.delete(sp);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getSavedPosts(Long currentUserId, String collection, int page, int size) {
        Page<SavedPost> savedPage = savedPostRepository.findSavedPosts(currentUserId, collection, PageRequest.of(page, size));
        List<PostResponseDTO> baseDtos = savedPage.getContent().stream()
                .map(sp -> postMapper.toResponse(sp.getPost()))
                .collect(Collectors.toList());
        List<PostResponseDTO> enriched = enrichPostResponsesBatch(baseDtos, currentUserId);
        return PageResponseDTO.of(new PageImpl<>(enriched, savedPage.getPageable(), savedPage.getTotalElements()));
    }

    @Override
    @Transactional
    public void sharePost(Long postId, Long currentUserId) {
        findPostOrThrow(postId);
        postRepository.incrementShareCount(postId);
    }

    @Override
    @Transactional
    public PostResponseDTO repostPost(Long postId, CreateRepostRequestDTO dto, Long currentUserId) {
        Post original = findPostOrThrow(postId);
        if (original.getIsDeleted()) throw new NotFoundException("Post not found");

        User user = findUserOrThrow(currentUserId);

        // If original is itself a repost, point to its root to avoid repost chains
        Post root = original.getOriginalPost() != null ? original.getOriginalPost() : original;

        Post repost = Post.builder()
                .postType(root.getPostType())
                .content(dto.getContent())
                .status(com.NextHouse.constant.PostStatus.PUBLISHED)
                .anonymous(false)
                .originalPost(root)
                .createdBy(user)
                .build();

        Post saved = postRepository.save(repost);
        postRepository.incrementShareCount(root.getId());

        PostResponseDTO originalDto = postMapper.toResponse(root);
        return postMapper.toResponse(saved).toBuilder()
                .originalPost(originalDto)
                .build();
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostCommentResponseDTO> getComments(Long postId, int page, int size) {
        return PageResponseDTO.of(commentRepository.findTopLevelComments(postId, PageRequest.of(page, size))
                .map(commentMapper::toResponse));
    }

    @Override
    @Transactional
    public PostCommentResponseDTO addComment(Long postId, Long currentUserId, CreateCommentRequestDTO dto) {
        Post post = findPostOrThrow(postId);
        User user = findUserOrThrow(currentUserId);
        PostComment comment = PostComment.builder()
                .post(post).commentedBy(user).comment(dto.getComment()).build();
        if (dto.getParentCommentId() != null) {
            PostComment parent = commentRepository.findById(dto.getParentCommentId())
                    .orElseThrow(() -> new NotFoundException("Parent comment not found"));
            comment.setParentComment(parent);
        }
        PostComment saved = commentRepository.save(comment);
        postRepository.incrementCommentCount(postId);
        return commentMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostCommentResponseDTO> getReplies(Long commentId, int page, int size) {
        return PageResponseDTO.of(commentRepository.findReplies(commentId, PageRequest.of(page, size))
                .map(commentMapper::toResponse));
    }

    @Override
    @Transactional
    public PostCommentResponseDTO updateComment(Long commentId, Long currentUserId, CreateCommentRequestDTO dto) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        if (!comment.getCommentedBy().getId().equals(currentUserId))
            throw new ForbiddenException("Not the comment author");
        comment.setComment(dto.getComment());
        comment.setEdited(true);
        return commentMapper.toResponse(commentRepository.save(comment));
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, Long currentUserId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        if (!comment.getCommentedBy().getId().equals(currentUserId))
            throw new ForbiddenException("Not the comment author");
        comment.setIsDeleted(true);
        commentRepository.save(comment);
        postRepository.decrementCommentCount(comment.getPost().getId());
    }

    @Override
    @Transactional
    public void reactToComment(Long commentId, Long currentUserId, String reactionType) {
        commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        commentRepository.incrementLikeCount(commentId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Post findPostOrThrow(Long postId) {
        return postRepository.findById(postId)
                .filter(p -> !p.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private List<Long> getBlockedIds(Long userId) {
        List<Long> blocked = new ArrayList<>(blockedUserRepository.findBlockedUserIds(userId));
        blocked.addAll(blockedUserRepository.findUsersWhoBlockedMe(userId));
        // Native SQL queries use NOT IN (:blockedIds); PostgreSQL rejects NOT IN ()
        // so we add a sentinel that matches no real user ID.
        if (blocked.isEmpty()) blocked.add(-1L);
        return blocked;
    }

    /**
     * Converts a Page<Post> to an enriched PageResponseDTO using batch queries.
     * 4 total DB queries regardless of page size (was 4 × page_size before).
     */
    private PageResponseDTO<PostResponseDTO> enrichedPage(Page<Post> page, Long currentUserId) {
        List<PostResponseDTO> baseDtos = page.getContent().stream()
                .map(postMapper::toResponse)
                .collect(Collectors.toList());
        List<PostResponseDTO> enriched = enrichPostResponsesBatch(baseDtos, currentUserId);
        return PageResponseDTO.of(new PageImpl<>(enriched, page.getPageable(), page.getTotalElements()));
    }

    /**
     * Batch-enriches a list of post DTOs — 4 queries total for any list size.
     * Replaces the per-post enrichPostResponse calls in feed endpoints.
     */
    private List<PostResponseDTO> enrichPostResponsesBatch(List<PostResponseDTO> dtos, Long currentUserId) {
        if (dtos.isEmpty()) return dtos;

        List<Long> postIds = dtos.stream().map(PostResponseDTO::getId).collect(Collectors.toList());

        // 1. Batch media — group by postId
        Map<Long, List<MediaFileResponseDTO>> mediaByPost = new HashMap<>();
        mediaFileRepository.findByEntityTypeAndEntityIdsAndIsDeletedFalse("POST", postIds)
                .forEach(mf -> mediaByPost
                        .computeIfAbsent(mf.getEntityId(), k -> new ArrayList<>())
                        .add(MediaFileResponseDTO.builder()
                                .id(mf.getId()).url(mf.getUrl()).thumbnailUrl(mf.getThumbnailUrl())
                                .type(mf.getType()).mimeType(mf.getMimeType())
                                .width(mf.getWidth()).height(mf.getHeight()).size(mf.getSize()).build()));

        // 2. Batch reactions — group by postId
        Map<Long, List<ReactionSummaryDTO>> reactionsByPost = new HashMap<>();
        postLikeRepository.countReactionsByPostIds(postIds)
                .forEach(row -> reactionsByPost
                        .computeIfAbsent((Long) row[0], k -> new ArrayList<>())
                        .add(ReactionSummaryDTO.builder()
                                .reactionType((String) row[1])
                                .count((Long) row[2])
                                .build()));

        // 3. Batch current-user reactions (isLiked + myReactionType in one query)
        Map<Long, String> myReactionByPost = new HashMap<>();
        if (currentUserId != null) {
            postLikeRepository.findUserReactionTypesByPostIds(postIds, currentUserId)
                    .forEach(row -> myReactionByPost.put((Long) row[0], (String) row[1]));
        }

        // 4. Batch saved post IDs
        Set<Long> savedPostIds = new HashSet<>();
        if (currentUserId != null) {
            savedPostIds.addAll(savedPostRepository.findSavedPostIds(currentUserId, postIds));
        }

        return dtos.stream().map(dto -> {
            UserSummaryDTO author = Boolean.TRUE.equals(dto.getAnonymous()) ? null : dto.getCreatedBy();
            return PostResponseDTO.builder()
                    .id(dto.getId())
                    .postType(dto.getPostType())
                    .content(dto.getContent())
                    .status(dto.getStatus())
                    .visibilityRadius(dto.getVisibilityRadius())
                    .anonymous(dto.getAnonymous())
                    .edited(dto.getEdited())
                    .likeCount(dto.getLikeCount())
                    .commentCount(dto.getCommentCount())
                    .shareCount(dto.getShareCount())
                    .hashtagString(dto.getHashtagString())
                    .thumbnailUrl(dto.getThumbnailUrl())
                    .latitude(dto.getLatitude())
                    .longitude(dto.getLongitude())
                    .address(dto.getAddress())
                    .createdBy(author)
                    .community(dto.getCommunity())
                    .neighborhood(dto.getNeighborhood())
                    .media(mediaByPost.getOrDefault(dto.getId(), List.of()))
                    .reactions(reactionsByPost.getOrDefault(dto.getId(), List.of()))
                    .isLiked(myReactionByPost.containsKey(dto.getId()))
                    .isSaved(savedPostIds.contains(dto.getId()))
                    .myReactionType(myReactionByPost.get(dto.getId()))
                    .createdAt(dto.getCreatedAt())
                    .updatedAt(dto.getUpdatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    /** Single-post enrichment — used only for getPost() — keeps 4 queries for one post. */
    private PostResponseDTO enrichPostResponse(PostResponseDTO dto, Long currentUserId) {
        if (dto == null) return null;

        List<MediaFileResponseDTO> media = mediaFileRepository
                .findByEntityTypeAndEntityIdAndIsDeletedFalse("POST", dto.getId())
                .stream()
                .map(mf -> MediaFileResponseDTO.builder()
                        .id(mf.getId()).url(mf.getUrl()).thumbnailUrl(mf.getThumbnailUrl())
                        .type(mf.getType()).mimeType(mf.getMimeType())
                        .width(mf.getWidth()).height(mf.getHeight()).size(mf.getSize()).build())
                .collect(Collectors.toList());

        List<ReactionSummaryDTO> reactions = postLikeRepository
                .countReactionsByPostId(dto.getId())
                .stream()
                .map(row -> ReactionSummaryDTO.builder()
                        .reactionType((String) row[0])
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());

        boolean isLiked = false;
        boolean isSaved = false;
        String  myReaction = null;
        if (currentUserId != null) {
            var myLike = postLikeRepository.findByPostIdAndLikedById(dto.getId(), currentUserId);
            isLiked    = myLike.isPresent();
            myReaction = myLike.map(PostLike::getReactionType).orElse(null);
            isSaved    = savedPostRepository.existsByUserIdAndPostId(currentUserId, dto.getId());
        }

        UserSummaryDTO author = Boolean.TRUE.equals(dto.getAnonymous()) ? null : dto.getCreatedBy();

        return PostResponseDTO.builder()
                .id(dto.getId())
                .postType(dto.getPostType())
                .content(dto.getContent())
                .status(dto.getStatus())
                .visibilityRadius(dto.getVisibilityRadius())
                .anonymous(dto.getAnonymous())
                .edited(dto.getEdited())
                .likeCount(dto.getLikeCount())
                .commentCount(dto.getCommentCount())
                .shareCount(dto.getShareCount())
                .hashtagString(dto.getHashtagString())
                .thumbnailUrl(dto.getThumbnailUrl())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .address(dto.getAddress())
                .createdBy(author)
                .community(dto.getCommunity())
                .neighborhood(dto.getNeighborhood())
                .media(media)
                .reactions(reactions)
                .isLiked(isLiked)
                .isSaved(isSaved)
                .myReactionType(myReaction)
                .createdAt(dto.getCreatedAt())
                .updatedAt(dto.getUpdatedAt())
                .build();
    }

    private void saveHashtags(Long postId, List<String> hashtags) {
        if (hashtags == null || hashtags.isEmpty()) return;
        Post ref = postRepository.getReferenceById(postId);
        List<PostHashtag> entities = hashtags.stream()
            .filter(t -> t != null && !t.isBlank())
            .map(t -> PostHashtag.builder().post(ref).hashtag(t.toLowerCase().trim()).build())
            .collect(Collectors.toList());
        if (!entities.isEmpty()) postHashtagRepository.saveAll(entities);
    }
}