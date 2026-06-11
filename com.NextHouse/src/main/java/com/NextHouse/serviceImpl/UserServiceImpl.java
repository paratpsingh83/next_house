package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.projection.UserStatsProjection;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.*;
import com.NextHouse.event.DomainEvents;
import com.NextHouse.event.KafkaEventPublisher;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.UserMapper;
import com.NextHouse.repository.*;
import com.NextHouse.entity.MediaFile;
import com.NextHouse.service.NotificationService;
import com.NextHouse.service.UserService;
import com.NextHouse.util.geo.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final int NEARBY_LIMIT = 50;

    private final UserRepository             userRepository;
    private final FollowRepository           followRepository;
    private final FollowRequestRepository    followRequestRepository;
    private final BlockedUserRepository      blockedUserRepository;
    private final UserNeighborhoodRepository userNeighborhoodRepository;
    private final NeighborhoodRepository     neighborhoodRepository;
    private final MediaFileRepository        mediaFileRepository;

    private final UserMapper            userMapper;
    private final GeoUtils              geoUtils;
    private final KafkaEventPublisher   eventPublisher;
    private final NotificationService   notificationService;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "user:profile", key = "#userId + ':' + #requestingUserId")
    public UserResponseDTO getProfile(Long userId, Long requestingUserId) {
        return buildUserResponse(findUserOrThrow(userId), requestingUserId);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "user:profile", key = "#currentUserId + ':self'")
    public UserResponseDTO getMyProfile(Long currentUserId) {
        return buildUserResponse(findUserOrThrow(currentUserId), currentUserId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "user:profile", key = "#currentUserId + ':self'")
    public UserResponseDTO updateProfile(Long currentUserId, UpdateProfileRequestDTO dto) {
        User user = findUserOrThrow(currentUserId);
        userMapper.updateFromRequest(dto, user);

        if (dto.getLatitude() != null && dto.getLongitude() != null) {
            user.setLatitude(dto.getLatitude());
            user.setLongitude(dto.getLongitude());
            user.setAddress(dto.getAddress());
            user.setCity(dto.getCity());
            user.setState(dto.getState());
            user.setCountry(dto.getCountry());
            user.setZipCode(dto.getZipCode());
            user.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));
            user.setLastLocationUpdatedAt(LocalDateTime.now());
        }

        return buildUserResponse(userRepository.save(user), currentUserId);
    }

    @Override
    @Transactional
    public void updateLocation(Long currentUserId, UpdateLocationRequestDTO dto) {
        User user = findUserOrThrow(currentUserId);
        // All these setters now work because User extends GeoBaseEntity (entity fix)
        user.setLatitude(dto.getLatitude());
        user.setLongitude(dto.getLongitude());
        user.setAddress(dto.getAddress());
        user.setCity(dto.getCity());
        user.setState(dto.getState());
        user.setZipCode(dto.getZipCode());
        user.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));
        user.setLastLocationUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        eventPublisher.publish(
            KafkaEventPublisher.TOPIC_USER_LOCATION_UPDATED,
            currentUserId.toString(),
            DomainEvents.UserLocationUpdatedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(currentUserId).userId(currentUserId)
                .latitude(dto.getLatitude()).longitude(dto.getLongitude())
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<NearbyUserResponseDTO> getNearbyUsers(
            Long currentUserId, NearbySearchRequestDTO dto, int page, int size) {

        List<Long> blockedIds = blockedUserRepository.findBlockedUserIds(currentUserId);
        blockedIds.addAll(blockedUserRepository.findUsersWhoBlockedMe(currentUserId));

        List<User> nearbyUsers = userRepository.findNearbyUsers(
            dto.getLatitude(), dto.getLongitude(), dto.getRadiusMeters(), currentUserId, NEARBY_LIMIT);

        Set<Long> blockedSet = Set.copyOf(blockedIds);
        List<User> filteredUsers = nearbyUsers.stream()
            .filter(u -> !blockedSet.contains(u.getId()))
            .collect(Collectors.toList());

        List<Long> filteredIds = filteredUsers.stream().map(User::getId).collect(Collectors.toList());
        Set<Long> followedIds  = filteredIds.isEmpty() ? Set.of() : followRepository.findFollowingIds(currentUserId, filteredIds);
        Set<Long> requestedIds = filteredIds.isEmpty() ? Set.of() : followRequestRepository.findRequestedIds(currentUserId, filteredIds);

        List<NearbyUserResponseDTO> results = filteredUsers.stream()
            .map(u -> {
                UserSummaryDTO summary = userMapper.toSummary(u);
                summary.setIsFollowing(followedIds.contains(u.getId()));
                summary.setIsRequested(requestedIds.contains(u.getId()));
                return NearbyUserResponseDTO.builder()
                    .user(summary)
                    .distanceMeters(approximateDistanceMeters(
                        dto.getLatitude(), dto.getLongitude(),
                        u.getLatitude() != null ? u.getLatitude() : 0,
                        u.getLongitude() != null ? u.getLongitude() : 0))
                    .build();
            })
            .collect(Collectors.toList());

        int from = Math.min(page * size, results.size());
        int to   = Math.min(from + size, results.size());
        return PageResponseDTO.of(new PageImpl<>(results.subList(from, to), PageRequest.of(page, size), results.size()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> getSuggestedUsers(Long currentUserId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<User> users = userRepository.findSuggestedUsers(currentUserId, pageable);
        if (users.isEmpty()) {
            users = userRepository.findPopularUsers(currentUserId, pageable);
        }
        List<Long> userIds    = users.getContent().stream().map(User::getId).collect(Collectors.toList());
        Set<Long> followedIds = userIds.isEmpty() ? Set.of() : followRepository.findFollowingIds(currentUserId, userIds);
        Set<Long> requestedIds= userIds.isEmpty() ? Set.of() : followRequestRepository.findRequestedIds(currentUserId, userIds);

        return PageResponseDTO.of(users.map(u -> {
            UserSummaryDTO dto = userMapper.toSummary(u);
            dto.setIsFollowing(followedIds.contains(u.getId()));
            dto.setIsRequested(requestedIds.contains(u.getId()));
            return dto;
        }));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> searchUsers(String query, int page, int size) {
        return PageResponseDTO.of(
            userRepository.searchUsers(query.trim(), PageRequest.of(page, size)).map(userMapper::toSummary));
    }

    @Override
    @Transactional
    @CacheEvict(value = "user:profile", allEntries = true)
    public String followUser(Long currentUserId, Long targetUserId) {
        if (currentUserId.equals(targetUserId)) throw new ConflictException("Cannot follow yourself");
        if (followRepository.existsByFollowerIdAndFollowingId(currentUserId, targetUserId))
            throw new ConflictException("Already following this user");
        if (blockedUserRepository.existsByUserIdAndBlockedUserId(targetUserId, currentUserId))
            throw new ForbiddenException("Cannot follow this user");

        User follower = findUserOrThrow(currentUserId);
        User followed = findUserOrThrow(targetUserId);

        if (Boolean.TRUE.equals(followed.getIsPrivate())) {
            if (followRequestRepository.existsByRequesterIdAndTargetId(currentUserId, targetUserId))
                throw new ConflictException("Follow request already sent");
            followRequestRepository.save(FollowRequest.builder().requester(follower).target(followed).build());
            notificationService.notifyFollowRequest(follower, followed);
            return "REQUESTED";
        }

        followRepository.save(Follow.builder().follower(follower).following(followed).build());
        notificationService.notifyFollow(follower, followed);
        eventPublisher.publishUserFollowed(DomainEvents.UserFollowedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId()).occurredAt(LocalDateTime.now())
                .actorId(currentUserId).followerId(currentUserId).followedId(targetUserId).build());
        return "FOLLOWING";
    }

    @Override
    @Transactional
    @CacheEvict(value = "user:profile", allEntries = true)
    public void unfollowUser(Long currentUserId, Long targetUserId) {
        if (!followRepository.existsByFollowerIdAndFollowingId(currentUserId, targetUserId))
            throw new NotFoundException("Follow relationship not found");
        followRepository.deleteByFollowerIdAndFollowingId(currentUserId, targetUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> getFollowers(Long userId, int page, int size) {
        return PageResponseDTO.of(followRepository.findFollowers(userId, PageRequest.of(page, size)).map(userMapper::toSummary));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> getFollowing(Long userId, int page, int size) {
        return PageResponseDTO.of(followRepository.findFollowing(userId, PageRequest.of(page, size)).map(userMapper::toSummary));
    }

    @Override
    @Transactional
    @CacheEvict(value = "user:profile", allEntries = true)
    public void acceptFollowRequest(Long requestId, Long currentUserId) {
        FollowRequest req = followRequestRepository.findById(requestId)
            .orElseThrow(() -> new NotFoundException("Follow request not found"));
        if (!req.getTarget().getId().equals(currentUserId))
            throw new ForbiddenException("Not your follow request");

        User requester = req.getRequester();
        User acceptor  = findUserOrThrow(currentUserId);

        if (!followRepository.existsByFollowerIdAndFollowingId(requester.getId(), currentUserId)) {
            followRepository.save(Follow.builder().follower(requester).following(acceptor).build());
        }
        followRequestRepository.delete(req);

        notificationService.notifyFollowRequestAccepted(acceptor, requester);
        notificationService.notifyFollow(requester, acceptor);

        eventPublisher.publishUserFollowed(DomainEvents.UserFollowedEvent.builder()
            .eventId(KafkaEventPublisher.newEventId()).occurredAt(LocalDateTime.now())
            .actorId(requester.getId()).followerId(requester.getId()).followedId(currentUserId).build());
    }

    @Override
    @Transactional
    public void rejectFollowRequest(Long requestId, Long currentUserId) {
        FollowRequest req = followRequestRepository.findById(requestId)
            .orElseThrow(() -> new NotFoundException("Follow request not found"));
        if (!req.getTarget().getId().equals(currentUserId))
            throw new ForbiddenException("Not your follow request");
        followRequestRepository.delete(req);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FollowRequestResponseDTO> getPendingFollowRequests(Long currentUserId) {
        return followRequestRepository.findPendingRequestsForUser(currentUserId).stream()
            .map(r -> {
                UserSummaryDTO requester = userMapper.toSummary(r.getRequester());
                requester.setIsFollowing(false);
                requester.setIsRequested(true);
                return FollowRequestResponseDTO.builder()
                        .requestId(r.getId())
                        .requester(requester)
                        .requestedAt(r.getCreatedAt())
                        .build();
            })
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void blockUser(Long currentUserId, Long targetUserId) {
        if (currentUserId.equals(targetUserId)) throw new ConflictException("Cannot block yourself");
        if (blockedUserRepository.existsByUserIdAndBlockedUserId(currentUserId, targetUserId))
            throw new ConflictException("User already blocked");

        blockedUserRepository.save(BlockedUser.builder()
                .user(findUserOrThrow(currentUserId)).blockedUser(findUserOrThrow(targetUserId)).build());

        if (followRepository.existsByFollowerIdAndFollowingId(currentUserId, targetUserId))
            followRepository.deleteByFollowerIdAndFollowingId(currentUserId, targetUserId);
        if (followRepository.existsByFollowerIdAndFollowingId(targetUserId, currentUserId))
            followRepository.deleteByFollowerIdAndFollowingId(targetUserId, currentUserId);
    }

    @Override
    @Transactional
    public void unblockUser(Long currentUserId, Long targetUserId) {
        if (!blockedUserRepository.existsByUserIdAndBlockedUserId(currentUserId, targetUserId))
            throw new NotFoundException("Block relationship not found");
        blockedUserRepository.deleteByUserIdAndBlockedUserId(currentUserId, targetUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSummaryDTO> getBlockedUsers(Long currentUserId) {
        return blockedUserRepository.findBlockedUsers(currentUserId)
                .stream()
                .map(userMapper::toSummary)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "user:profile", allEntries = true)
    public void deleteAccount(Long currentUserId) {
        User user = findUserOrThrow(currentUserId);
        user.setIsDeleted(true);
        user.setAccountStatus("DELETED");
        userRepository.save(user);
    }

    private static final java.util.Set<String> VALID_IDENTITY_DOC_TYPES = java.util.Set.of(
            "AADHAAR", "PASSPORT", "DRIVING_LICENSE", "NATIONAL_ID", "VOTER_ID");

    private static final java.util.Set<String> VALID_ADDRESS_DOC_TYPES = java.util.Set.of(
            "UTILITY_BILL", "RENTAL_AGREEMENT", "BANK_STATEMENT", "GOVERNMENT_LETTER", "PROPERTY_TAX");

    @Override
    @Transactional
    public void requestAddressVerification(Long currentUserId, String docType, Long mediaId) {
        User user = findUserOrThrow(currentUserId);
        if (user.getAddressVerified()) throw new BadRequestException("Address is already verified");
        if (!VALID_ADDRESS_DOC_TYPES.contains(docType))
            throw new BadRequestException("Invalid document type. Accepted: Utility Bill, Rental Agreement, Bank Statement, Government Letter, Property Tax");
        MediaFile doc = mediaFileRepository.findById(mediaId)
                .orElseThrow(() -> new BadRequestException("Document not found. Please upload the document first"));
        if (!doc.getUploadedBy().getId().equals(currentUserId))
            throw new BadRequestException("Document does not belong to you");
        user.setAddressDocType(docType);
        user.setAddressDocMediaId(mediaId);
        user.setAddressVerified(true);
        user.setTrustScore(user.getTrustScore() + 10);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void requestIdentityVerification(Long currentUserId, String docType, Long mediaId) {
        User user = findUserOrThrow(currentUserId);
        if (user.getIdentityVerified()) throw new BadRequestException("Identity is already verified");
        if (!VALID_IDENTITY_DOC_TYPES.contains(docType))
            throw new BadRequestException("Invalid document type. Accepted: Aadhaar, Passport, Driving License, National ID, Voter ID");
        MediaFile doc = mediaFileRepository.findById(mediaId)
                .orElseThrow(() -> new BadRequestException("Document not found. Please upload the document first"));
        if (!doc.getUploadedBy().getId().equals(currentUserId))
            throw new BadRequestException("Document does not belong to you");
        user.setIdentityDocType(docType);
        user.setIdentityDocMediaId(mediaId);
        user.setIdentityVerified(true);
        user.setVerificationStatus("VERIFIED");
        user.setTrustScore(user.getTrustScore() + 20);
        userRepository.save(user);
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private UserResponseDTO buildUserResponse(User user, Long requestingUserId) {
        UserResponseDTO dto = userMapper.toResponse(user);

        UserStatsProjection stats = userRepository.findUserStats(user.getId(), requestingUserId);

        long followerCount  = stats != null && stats.getFollowerCount()  != null ? stats.getFollowerCount()  : 0L;
        long followingCount = stats != null && stats.getFollowingCount() != null ? stats.getFollowingCount() : 0L;
        Boolean online      = stats != null ? stats.getOnline()   : null;
        LocalDateTime lastSeen = stats != null ? stats.getLastSeen() : null;
        boolean isFollowing  = stats != null && Boolean.TRUE.equals(stats.getIsFollowing());
        boolean isFollowedBy = stats != null && Boolean.TRUE.equals(stats.getIsFollowedBy());
        boolean isBlocked    = stats != null && Boolean.TRUE.equals(stats.getIsBlocked());
        boolean isRequested  = stats != null && Boolean.TRUE.equals(stats.getIsRequested());

        return UserResponseDTO.builder()
                .id(dto.getId())
                .name(dto.getName())
                .username(dto.getUsername())
                .phoneNumber(dto.getPhoneNumber())
                .profileImage(dto.getProfileImage())
                .bio(dto.getBio())
                .gender(dto.getGender())
                .dob(dto.getDob())
                .address(user.getAddress())
                .verificationStatus(dto.getVerificationStatus())
                .accountStatus(dto.getAccountStatus())
                .trustScore(dto.getTrustScore())
                .addressVerified(dto.getAddressVerified())
                .identityVerified(dto.getIdentityVerified())
                .online(online)
                .lastSeen(lastSeen)
                .followerCount(followerCount)
                .followingCount(followingCount)
                .isPrivate(user.getIsPrivate())
                .isFollowing(isFollowing)
                .isFollowedBy(isFollowedBy)
                .isBlocked(isBlocked)
                .isRequested(isRequested)
                .createdAt(dto.getCreatedAt())
                .build();
    }

    private double approximateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
