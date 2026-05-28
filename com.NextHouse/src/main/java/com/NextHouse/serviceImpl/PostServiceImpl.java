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
import com.NextHouse.mapper.UserMapper;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * PostServiceImpl
 *
 * Counter update pattern:
 *   NEVER load the Post entity, increment the counter field, then save.
 *   This causes lost updates under concurrent traffic.
 *   Instead, always use repository.incrementXxxCount(id) which executes
 *   an atomic UPDATE ... SET count = count + 1.
 *
 * Feed caching:
 *   - Trending feed cached 5 min per neighborhood (changes slowly).
 *   - Individual post cached 2 min (evicted on update/delete).
 *   - Following/nearby feeds are NOT cached — they are user-specific and
 *     change every time someone the user follows posts. Cache at the
 *     CDN/reverse-proxy layer for anonymous users instead.
 *
 * Anonymous posts:
 *   createdBy is always persisted in the DB for moderation purposes.
 *   It is nulled out in toResponse() when post.anonymous = true
 *   (so the author is never exposed via the API).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostServiceImpl implements PostService {

    private final PostRepository        postRepository;
    private final PostCommentRepository commentRepository;
    private final PostLikeRepository    postLikeRepository;
    private final SavedPostRepository   savedPostRepository;
    private final UserRepository        userRepository;
    private final CommunityRepository   communityRepository;
    private final NeighborhoodRepository neighborhoodRepository;
    private final BlockedUserRepository  blockedUserRepository;
    private final MediaFileRepository    mediaFileRepository;

    private final PostMapper        postMapper;
    private final PostCommentMapper commentMapper;
    private final UserMapper        userMapper;
    private final GeoUtils          geoUtils;
    private final MediaService      mediaService;
    private final NotificationService notificationService;
    private final KafkaEventPublisher eventPublisher;

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public PostResponseDTO createPost(Long currentUserId, CreatePostRequestDTO dto) {
        User author = findUserOrThrow(currentUserId);

        Post post = postMapper.toEntity(dto);
        post.setCreatedBy(author);
        post.setStatus(PostStatus.PUBLISHED);

        // Geo enrichment
        if (dto.getLatitude() != null && dto.getLongitude() != null) {
            post.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));
        }

        // Community scope
        if (dto.getCommunityId() != null) {
            post.setCommunity(communityRepository.findById(dto.getCommunityId())
                    .orElseThrow(() -> new NotFoundException("Community not found")));
        }

        // Neighborhood scope
        if (dto.getNeighborhoodId() != null) {
            post.setNeighborhood(neighborhoodRepository.findById(dto.getNeighborhoodId())
                    .orElseThrow(() -> new NotFoundException("Neighborhood not found")));
        }

        // Hashtags: join list to comma-separated string for search
        if (dto.getHashtags() != null && !dto.getHashtags().isEmpty()) {
            post.setHashtagString(String.join(",", dto.getHashtags()).toLowerCase());
        }

        Post saved = postRepository.save(post);

        // Attach pre-uploaded media files to this post
        if (dto.getMediaIds() != null && !dto.getMediaIds().isEmpty()) {
            mediaService.attachMediaToEntity(dto.getMediaIds(), "POST", saved.getId());
        }

        // Publish domain event for feed fanout + analytics
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
        checkNotBlocked(post.getCreatedBy().getId(), currentUserId);
        return enrichPostResponse(postMapper.toResponse(post), currentUserId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "post", key = "#postId")
    public PostResponseDTO updatePost(Long postId, Long currentUserId, UpdatePostRequestDTO dto) {
        Post post = findPostOrThrow(postId);
        assertOwner(post.getCreatedBy().getId(), currentUserId, "update", "post");

        postMapper.updateFromRequest(dto, post);

        if (dto.getHashtags() != null) {
            post.setHashtagString(String.join(",", dto.getHashtags()).toLowerCase());
        }

        Post saved = postRepository.save(post);
        log.info("[Post] Updated postId={} by userId={}", postId, currentUserId);
        return enrichPostResponse(postMapper.toResponse(saved), currentUserId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "post", key = "#postId")
    public void deletePost(Long postId, Long currentUserId) {
        Post post = findPostOrThrow(postId);
        assertOwnerOrAdmin(post.getCreatedBy().getId(), currentUserId);

        post.setIsDeleted(true);
        post.setStatus(PostStatus.REMOVED);
        postRepository.save(post);

        // Soft-delete attached media
        mediaFileRepository.softDeleteByEntity("POST", postId);

        eventPublisher.publishPostDeleted(
            DomainEvents.PostDeletedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(currentUserId)
                .postId(postId)
                .authorId(post.getCreatedBy().getId())
                .build()
        );

        log.info("[Post] Deleted postId={} by userId={}", postId, currentUserId);
    }

    // ─── Feed methods ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getFollowingFeed(Long currentUserId, int page, int size) {
        List<Long> blockedIds = getBlockedIds(currentUserId);
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postRepository.findFollowingFeed(currentUserId, blockedIds, pageable);
        return PageResponseDTO.of(posts.map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getNearbyFeed(Long currentUserId, NearbySearchRequestDTO geoDto, int page, int size) {
        // Determine the user's primary neighborhood for scoping
        Long neighborhoodId = userRepository.findById(currentUserId)
                .flatMap(u -> u.getLatitude() != null
                        ? neighborhoodRepository.findNeighborhoodContainingPoint(u.getLatitude(), u.getLongitude())
                        : java.util.Optional.empty())
                .map(Neighborhood::getId)
                .orElse(null);

        if (neighborhoodId == null) {
            throw new NotFoundException("No neighborhood found for your location. Please update your location.");
        }

        List<Long> blockedIds = getBlockedIds(currentUserId);
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postRepository.findNearbyFeed(
            neighborhoodId, geoDto.getLatitude(), geoDto.getLongitude(), blockedIds, pageable
        );
        return PageResponseDTO.of(posts.map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "feed:trending", key = "#neighborhoodId + ':' + #page")
    public PageResponseDTO<PostResponseDTO> getTrendingFeed(Long currentUserId, Long neighborhoodId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postRepository.findTrendingFeed(neighborhoodId, pageable);
        return PageResponseDTO.of(posts.map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getCommunityFeed(Long currentUserId, Long communityId, int page, int size) {
        List<Long> blockedIds = getBlockedIds(currentUserId);
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postRepository.findCommunityFeed(communityId, blockedIds, pageable);
        return PageResponseDTO.of(posts.map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getUserPosts(Long userId, Long currentUserId, int page, int size) {
        checkNotBlocked(userId, currentUserId);
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postRepository.findByCreatedById(userId, pageable);
        return PageResponseDTO.of(posts.map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getHashtagFeed(String hashtag, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postRepository.findByHashtag(hashtag.toLowerCase(), pageable);
        return PageResponseDTO.of(posts.map(p -> enrichPostResponse(postMapper.toResponse(p), null)));
    }

    // ─── Reactions ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void reactToPost(Long postId, Long currentUserId, ReactPostRequestDTO dto) {
        Post post = findPostOrThrow(postId);
        checkNotBlocked(post.getCreatedBy().getId(), currentUserId);

        if (postLikeRepository.existsByPostIdAndLikedById(postId, currentUserId)) {
            // Change reaction type — update existing record
            PostLike existing = postLikeRepository.findByPostIdAndLikedById(postId, currentUserId)
                    .orElseThrow();
            existing.setReactionType(dto.getReactionType());
            postLikeRepository.save(existing);
            return;
        }

        User liker = findUserOrThrow(currentUserId);
        PostLike like = PostLike.builder()
                .post(post)
                .likedBy(liker)
                .reactionType(dto.getReactionType())
                .build();
        postLikeRepository.save(like);

        // Atomic counter increment — no entity reload needed
        postRepository.incrementLikeCount(postId);

        // Notify post owner (not self-like)
        if (!post.getCreatedBy().getId().equals(currentUserId)) {
            notificationService.notifyPostLike(liker, postId, post.getCreatedBy().getId());
        }

        eventPublisher.publishPostLiked(
            DomainEvents.PostLikedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(currentUserId)
                .postId(postId)
                .postOwnerId(post.getCreatedBy().getId())
                .likerId(currentUserId)
                .reactionType(dto.getReactionType())
                .build()
        );
    }

    @Override
    @Transactional
    public void removeReaction(Long postId, Long currentUserId) {
        if (!postLikeRepository.existsByPostIdAndLikedById(postId, currentUserId)) {
            throw new NotFoundException("Reaction not found");
        }
        postLikeRepository.deleteByPostIdAndLikedById(postId, currentUserId);
        postRepository.decrementLikeCount(postId);
    }

    // ─── Save / share ─────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void savePost(Long postId, Long currentUserId) {
        if (savedPostRepository.existsByUserIdAndPostId(currentUserId, postId)) {
            throw new ConflictException("Post already saved");
        }
        Post post = findPostOrThrow(postId);
        User user = findUserOrThrow(currentUserId);
        savedPostRepository.save(SavedPost.builder().user(user).post(post).build());
    }

    @Override
    @Transactional
    public void unsavePost(Long postId, Long currentUserId) {
        if (!savedPostRepository.existsByUserIdAndPostId(currentUserId, postId)) {
            throw new NotFoundException("Saved post not found");
        }
        savedPostRepository.deleteByUserIdAndPostId(currentUserId, postId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getSavedPosts(Long currentUserId, String collection, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            savedPostRepository.findSavedPosts(currentUserId, collection, pageable)
                .map(sp -> enrichPostResponse(postMapper.toResponse(sp.getPost()), currentUserId))
        );
    }

    @Override
    @Transactional
    public void sharePost(Long postId, Long currentUserId) {
        findPostOrThrow(postId);
        postRepository.incrementShareCount(postId);
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(value = "post", key = "#postId")
    public PostCommentResponseDTO addComment(Long postId, Long currentUserId, CreateCommentRequestDTO dto) {
        Post post = findPostOrThrow(postId);
        User commenter = findUserOrThrow(currentUserId);
        checkNotBlocked(post.getCreatedBy().getId(), currentUserId);

        PostComment comment = commentMapper.toEntity(dto);
        comment.setPost(post);
        comment.setCommentedBy(commenter);

        // Thread: link to parent comment if this is a reply
        if (dto.getParentCommentId() != null) {
            PostComment parent = commentRepository.findById(dto.getParentCommentId())
                    .orElseThrow(() -> new NotFoundException("Parent comment not found"));
            // Enforce max nesting depth = 1 (replies to replies not allowed)
            if (parent.getParentComment() != null) {
                throw new ConflictException("Nested replies beyond depth 1 are not allowed");
            }
            comment.setParentComment(parent);
        }

        PostComment saved = commentRepository.save(comment);

        // Atomic counter increment on the parent post
        postRepository.incrementCommentCount(postId);

        // Notify post owner
        if (!post.getCreatedBy().getId().equals(currentUserId)) {
            notificationService.notifyComment(commenter, postId, post.getCreatedBy().getId());
        }

        eventPublisher.publishPostCommented(
            DomainEvents.PostCommentedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(currentUserId)
                .postId(postId)
                .postOwnerId(post.getCreatedBy().getId())
                .commentId(saved.getId())
                .commenterId(currentUserId)
                .parentCommentId(dto.getParentCommentId())
                .build()
        );

        return commentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public PostCommentResponseDTO updateComment(Long commentId, Long currentUserId, CreateCommentRequestDTO dto) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        assertOwner(comment.getCommentedBy().getId(), currentUserId, "update", "comment");

        comment.setComment(dto.getComment());
        comment.setEdited(true);
        return commentMapper.toResponse(commentRepository.save(comment));
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, Long currentUserId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        assertOwnerOrAdmin(comment.getCommentedBy().getId(), currentUserId);
        comment.setIsDeleted(true);
        commentRepository.save(comment);
        postRepository.decrementCommentCount(comment.getPost().getId());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostCommentResponseDTO> getComments(Long postId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            commentRepository.findTopLevelComments(postId, pageable)
                             .map(commentMapper::toResponse)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostCommentResponseDTO> getReplies(Long commentId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            commentRepository.findReplies(commentId, pageable).map(commentMapper::toResponse)
        );
    }

    @Override
    @Transactional
    public void reactToComment(Long commentId, Long currentUserId, String reactionType) {
        commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found"));
        commentRepository.incrementLikeCount(commentId);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private Post findPostOrThrow(Long postId) {
        return postRepository.findById(postId)
                .filter(p -> !p.getIsDeleted() && p.getStatus() != PostStatus.REMOVED)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private List<Long> getBlockedIds(Long userId) {
        List<Long> blocked = blockedUserRepository.findBlockedUserIds(userId);
        blocked.addAll(blockedUserRepository.findUsersWhoBlockedMe(userId));
        return blocked;
    }

    private void checkNotBlocked(Long authorId, Long viewerId) {
        if (blockedUserRepository.existsByUserIdAndBlockedUserId(authorId, viewerId) ||
            blockedUserRepository.existsByUserIdAndBlockedUserId(viewerId, authorId)) {
            throw new ForbiddenException("Content not available");
        }
    }

    private void assertOwner(Long ownerId, Long currentUserId, String action, String entity) {
        if (!ownerId.equals(currentUserId)) {
            throw new ForbiddenException("You are not allowed to " + action + " this " + entity);
        }
    }

    private void assertOwnerOrAdmin(Long ownerId, Long currentUserId) {
        if (!ownerId.equals(currentUserId)) {
            // In production: also allow ADMIN/MODERATOR role — check via UserRepository
            throw new ForbiddenException("You do not have permission to perform this action");
        }
    }

    /**
     * Enriches a PostResponseDTO with:
     *  - isLiked / isSaved / myReactionType (per requesting user)
     *  - reaction summary breakdown
     *  - media files list
     *  - nulls out createdBy for anonymous posts
     */
    private PostResponseDTO enrichPostResponse(PostResponseDTO dto, Long currentUserId) {
        if (dto == null) return null;

        // Media
        List<MediaFileResponseDTO> media = mediaFileRepository
            .findByEntityTypeAndEntityIdAndIsDeletedFalse("POST", dto.getId())
            .stream()
            .map(mf -> MediaFileResponseDTO.builder()
                    .id(mf.getId())
                    .url(mf.getUrl())
                    .thumbnailUrl(mf.getThumbnailUrl())
                    .type(mf.getType())
                    .mimeType(mf.getMimeType())
                    .width(mf.getWidth())
                    .height(mf.getHeight())
                    .size(mf.getSize())
                    .build())
            .collect(Collectors.toList());

        // Reaction summary
        List<ReactionSummaryDTO> reactions = postLikeRepository
            .countReactionsByPostId(dto.getId())
            .stream()
            .map(row -> ReactionSummaryDTO.builder()
                    .reactionType((String) row[0])
                    .count((Long) row[1])
                    .build())
            .collect(Collectors.toList());

        // Per-user context
        boolean isLiked = false;
        boolean isSaved = false;
        String  myReaction = null;
        if (currentUserId != null) {
            var myLike = postLikeRepository.findByPostIdAndLikedById(dto.getId(), currentUserId);
            isLiked    = myLike.isPresent();
            myReaction = myLike.map(PostLike::getReactionType).orElse(null);
            isSaved    = savedPostRepository.existsByUserIdAndPostId(currentUserId, dto.getId());
        }

        // Anonymous: hide author
        UserSummaryDTO author = dto.getAnonymous() != null && dto.getAnonymous()
                ? null : dto.getCreatedBy();

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
}
