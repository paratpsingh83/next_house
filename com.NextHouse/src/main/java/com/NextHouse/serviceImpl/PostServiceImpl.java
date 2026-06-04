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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostServiceImpl implements PostService {

    private final PostRepository         postRepository;
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
        } else if (author.getLatitude() != null && author.getLongitude() != null) {
            neighborhoodRepository
                    .findNeighborhoodContainingPoint(author.getLatitude(), author.getLongitude())
                    .ifPresent(post::setNeighborhood);
        }

        if (dto.getHashtags() != null && !dto.getHashtags().isEmpty()) {
            post.setHashtagString(String.join(",", dto.getHashtags()).toLowerCase());
        }

        Post saved = postRepository.save(post);

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
        return enrichPostResponse(postMapper.toResponse(postRepository.save(post)), currentUserId);
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
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(postRepository.findFollowingFeed(currentUserId, blockedIds, pageable)
                .map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    /**
     * FIX: 3-tier fallback — never throws 404 for newly registered users.
     *
     * Tier 1: Neighborhood polygon containment (normal case)
     * Tier 2: Nearest neighborhood center (GPS inside no polygon)
     * Tier 3: Pure GPS radius (no neighborhoods seeded in DB yet)
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getNearbyFeed(
            Long currentUserId, NearbySearchRequestDTO geoDto, int page, int size) {

        List<Long> blockedIds = getBlockedIds(currentUserId);
        Pageable pageable = PageRequest.of(page, size);

        // Tier 1
        Long neighborhoodId = userRepository.findById(currentUserId)
                .flatMap(u -> u.getLatitude() != null
                        ? neighborhoodRepository.findNeighborhoodContainingPoint(
                        u.getLatitude(), u.getLongitude())
                        : java.util.Optional.empty())
                .map(Neighborhood::getId)
                .orElse(null);

        // Tier 2
        if (neighborhoodId == null) {
            neighborhoodId = neighborhoodRepository
                    .findNearestNeighborhood(geoDto.getLatitude(), geoDto.getLongitude())
                    .map(Neighborhood::getId)
                    .orElse(null);
        }

        Page<Post> posts;
        if (neighborhoodId != null) {
            posts = postRepository.findNearbyFeed(
                    neighborhoodId, geoDto.getLatitude(), geoDto.getLongitude(),
                    blockedIds, pageable);
        } else {
            // Tier 3: no neighborhoods in DB at all
            posts = postRepository.findNearbyFeedByGps(
                    geoDto.getLatitude(), geoDto.getLongitude(),
                    geoDto.getRadiusMeters(), blockedIds, pageable);
        }

        return PageResponseDTO.of(posts.map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "feed:trending", key = "#neighborhoodId + ':' + #page")
    public PageResponseDTO<PostResponseDTO> getTrendingFeed(Long currentUserId, Long neighborhoodId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(postRepository.findTrendingFeed(neighborhoodId, pageable)
                .map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getCommunityFeed(Long currentUserId, Long communityId, int page, int size) {
        List<Long> blockedIds = getBlockedIds(currentUserId);
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(postRepository.findCommunityFeed(communityId, blockedIds, pageable)
                .map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getUserPosts(Long userId, Long currentUserId, int page, int size) {
        List<Long> blockedIds = getBlockedIds(currentUserId);
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(postRepository.findUserPosts(userId, blockedIds, pageable)
                .map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> getHashtagFeed(String hashtag, Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(postRepository.findByHashtag(hashtag.toLowerCase(), pageable)
                .map(p -> enrichPostResponse(postMapper.toResponse(p), currentUserId)));
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
        List<Long> blocked = blockedUserRepository.findBlockedUserIds(userId);
        blocked.addAll(blockedUserRepository.findUsersWhoBlockedMe(userId));
        return blocked;
    }

    private PostResponseDTO enrichPostResponse(PostResponseDTO dto, Long currentUserId) {
        if (dto == null) return null;

        // Media
        List<MediaFileResponseDTO> media = mediaFileRepository
                .findByEntityTypeAndEntityIdAndIsDeletedFalse("POST", dto.getId())
                .stream()
                .map(mf -> MediaFileResponseDTO.builder()
                        .id(mf.getId()).url(mf.getUrl()).thumbnailUrl(mf.getThumbnailUrl())
                        .type(mf.getType()).mimeType(mf.getMimeType())
                        .width(mf.getWidth()).height(mf.getHeight()).size(mf.getSize()).build())
                .collect(Collectors.toList());

        // Reactions
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