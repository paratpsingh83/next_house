package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.*;
import com.NextHouse.event.DomainEvents;
import com.NextHouse.event.KafkaEventPublisher;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.UserMapper;
import com.NextHouse.repository.*;
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
    private final BlockedUserRepository      blockedUserRepository;
    private final UserNeighborhoodRepository userNeighborhoodRepository;
    private final UserPresenceRepository     userPresenceRepository;
    private final NeighborhoodRepository     neighborhoodRepository;

    private final UserMapper            userMapper;
    private final GeoUtils              geoUtils;
    private final KafkaEventPublisher   eventPublisher;
    private final NotificationService   notificationService;

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "user:profile", key = "#userId")
    public UserResponseDTO getProfile(Long userId, Long requestingUserId) {
        return buildUserResponse(findUserOrThrow(userId), requestingUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getMyProfile(Long currentUserId) {
        return buildUserResponse(findUserOrThrow(currentUserId), currentUserId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "user:profile", key = "#currentUserId")
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
        List<NearbyUserResponseDTO> results = nearbyUsers.stream()
            .filter(u -> !blockedSet.contains(u.getId()))
            .map(u -> NearbyUserResponseDTO.builder()
                    .user(userMapper.toSummary(u))
                    .distanceMeters(approximateDistanceMeters(
                        dto.getLatitude(), dto.getLongitude(),
                        u.getLatitude() != null ? u.getLatitude() : 0,
                        u.getLongitude() != null ? u.getLongitude() : 0))
                    .build())
            .collect(Collectors.toList());

        int from = Math.min(page * size, results.size());
        int to   = Math.min(from + size, results.size());
        return PageResponseDTO.of(new PageImpl<>(results.subList(from, to), PageRequest.of(page, size), results.size()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> getSuggestedUsers(Long currentUserId, int page, int size) {
        return PageResponseDTO.of(
            userRepository.findSuggestedUsers(currentUserId, PageRequest.of(page, size)).map(userMapper::toSummary));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> searchUsers(String query, int page, int size) {
        return PageResponseDTO.of(
            userRepository.searchUsers(query.trim(), PageRequest.of(page, size)).map(userMapper::toSummary));
    }

    @Override
    @Transactional
    public void followUser(Long currentUserId, Long targetUserId) {
        if (currentUserId.equals(targetUserId)) throw new ConflictException("Cannot follow yourself");
        if (followRepository.existsByFollowerIdAndFollowingId(currentUserId, targetUserId))
            throw new ConflictException("Already following this user");
        if (blockedUserRepository.existsByUserIdAndBlockedUserId(targetUserId, currentUserId))
            throw new ForbiddenException("Cannot follow this user");

        User follower = findUserOrThrow(currentUserId);
        User followed = findUserOrThrow(targetUserId);

        followRepository.save(Follow.builder().follower(follower).following(followed).build());

        notificationService.notifyFollow(follower, followed);

        eventPublisher.publishUserFollowed(DomainEvents.UserFollowedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId()).occurredAt(LocalDateTime.now())
                .actorId(currentUserId).followerId(currentUserId).followedId(targetUserId).build());
    }

    @Override
    @Transactional
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
    @Transactional
    @CacheEvict(value = "user:profile", key = "#currentUserId")
    public void deleteAccount(Long currentUserId) {
        User user = findUserOrThrow(currentUserId);
        user.setIsDeleted(true);
        user.setAccountStatus("DELETED");
        userRepository.save(user);
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    /**
     * FIX: buildUserResponse() was loading UserPresence but NEVER using the values.
     * Original code:
     *   userPresenceRepository.findByUserId(user.getId()).ifPresent(presence -> {
     *       // UserResponseDTO is immutable (Lombok @Builder) so we rebuild...
     *       // Here we demonstrate the enrichment pattern:
     *       (NOTHING HAPPENED — presence values were loaded and discarded)
     *   });
     *
     * Result: online and lastSeen were ALWAYS NULL in every user profile response.
     *
     * FIX: Extract online + lastSeen from presence BEFORE building the DTO,
     *      then pass them into the UserResponseDTO.builder() call.
     */
    private UserResponseDTO buildUserResponse(User user, Long requestingUserId) {
        UserResponseDTO dto = userMapper.toResponse(user);

        // FIX: Actually extract presence values (was loaded but discarded before)
        Boolean online = null;
        LocalDateTime lastSeen = null;
        var presenceOpt = userPresenceRepository.findByUserId(user.getId());
        if (presenceOpt.isPresent()) {
            online   = presenceOpt.get().getOnline();
            lastSeen = presenceOpt.get().getLastSeen();
        }

        long followerCount  = followRepository.countByFollowingId(user.getId());
        long followingCount = followRepository.countByFollowerId(user.getId());

        boolean isFollowing  = false;
        boolean isFollowedBy = false;
        boolean isBlocked    = false;
        if (requestingUserId != null && !requestingUserId.equals(user.getId())) {
            isFollowing  = followRepository.existsByFollowerIdAndFollowingId(requestingUserId, user.getId());
            isFollowedBy = followRepository.existsByFollowerIdAndFollowingId(user.getId(), requestingUserId);
            isBlocked    = blockedUserRepository.existsByUserIdAndBlockedUserId(requestingUserId, user.getId());
        }

        return UserResponseDTO.builder()
                .id(dto.getId())
                .name(dto.getName())
                .username(dto.getUsername())
                .phoneNumber(dto.getPhoneNumber())
                .profileImage(dto.getProfileImage())
                .bio(dto.getBio())
                .gender(dto.getGender())
                .dob(dto.getDob())
                .verificationStatus(dto.getVerificationStatus())
                .accountStatus(dto.getAccountStatus())
                .trustScore(dto.getTrustScore())
                .addressVerified(dto.getAddressVerified())
                .identityVerified(dto.getIdentityVerified())
                .online(online)          // FIX: was always null
                .lastSeen(lastSeen)      // FIX: was always null
                .followerCount(followerCount)
                .followingCount(followingCount)
                .isFollowing(isFollowing)
                .isFollowedBy(isFollowedBy)
                .isBlocked(isBlocked)
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
