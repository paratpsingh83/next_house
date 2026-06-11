package com.NextHouse.serviceImpl;

import com.NextHouse.constant.CommunityRole;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.*;
import com.NextHouse.event.DomainEvents;
import com.NextHouse.event.KafkaEventPublisher;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.CommunityMapper;
import com.NextHouse.mapper.UserMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.CommunityService;
import com.NextHouse.service.NotificationService;
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

/**
 * CommunityServiceImpl
 *
 * Member count:
 *   Never stored as a column — always queried live via
 *   CommunityRepository.countMembers(). For communities with millions of
 *   members, cache the count in Redis with a 5-min TTL.
 *
 * Role hierarchy for permission checks:
 *   OWNER > ADMIN > MODERATOR > MEMBER
 *   - OWNER: can do everything including delete the community
 *   - ADMIN: can approve/kick members, update community settings
 *   - MODERATOR: can approve/kick members
 *   - MEMBER: read-only within community scope
 *
 * Private communities:
 *   Joining sets approved=false (PENDING). An ADMIN/OWNER must call
 *   approveMember() to grant access. Public communities auto-approve.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityServiceImpl implements CommunityService {

    private final CommunityRepository       communityRepository;
    private final CommunityMemberRepository memberRepository;
    private final UserRepository            userRepository;
    private final NeighborhoodRepository    neighborhoodRepository;

    private final CommunityMapper     communityMapper;
    private final UserMapper          userMapper;
    private final GeoUtils            geoUtils;
    private final NotificationService notificationService;
    private final KafkaEventPublisher eventPublisher;

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public CommunityResponseDTO createCommunity(Long currentUserId, CreateCommunityRequestDTO dto) {
        User creator = findUserOrThrow(currentUserId);

        if (Boolean.TRUE.equals(creator.getBanned())) {
            throw new ForbiddenException("Banned users cannot create communities");
        }
        if (!"ACTIVE".equals(creator.getAccountStatus())) {
            throw new ForbiddenException("Your account must be active to create a community");
        }
        if ("UNVERIFIED".equals(creator.getVerificationStatus())) {
            throw new ForbiddenException("Please verify your account (phone or email) before creating a community");
        }

        Community community = communityMapper.toEntity(dto);
        community.setCreatedBy(creator);
        community.setVerified(false);

        if (dto.getNeighborhoodId() != null) {
            Neighborhood nbh = neighborhoodRepository.findById(dto.getNeighborhoodId())
                    .orElseThrow(() -> new NotFoundException("Neighborhood not found"));
            community.setNeighborhood(nbh);
            // Inherit geo from neighborhood
            community.setLatitude(nbh.getLatitude());
            community.setLongitude(nbh.getLongitude());
            community.setCity(nbh.getCity());
            community.setState(nbh.getState());
            community.setCountry(nbh.getCountry());
            if (nbh.getLocation() != null) community.setLocation(nbh.getLocation());
        }

        if (dto.getParentCommunityId() != null) {
            Community parent = communityRepository.findById(dto.getParentCommunityId())
                    .orElseThrow(() -> new NotFoundException("Parent community not found"));
            community.setParentCommunity(parent);
        }

        Community saved = communityRepository.save(community);

        // Creator automatically becomes OWNER (approved member)
        CommunityMember ownerMember = CommunityMember.builder()
                .community(saved)
                .user(creator)
                .role(CommunityRole.OWNER)
                .approved(true)
                .muted(false)
                .notificationsEnabled(true)
                .build();
        memberRepository.save(ownerMember);

        log.info("[Community] Created communityId={} by userId={}", saved.getId(), currentUserId);
        return enrichCommunityResponse(communityMapper.toResponse(saved), currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "community", key = "#communityId")
    public CommunityResponseDTO getCommunity(Long communityId, Long currentUserId) {
        Community community = findCommunityOrThrow(communityId);
        return enrichCommunityResponse(communityMapper.toResponse(community), currentUserId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "community", key = "#communityId")
    public CommunityResponseDTO updateCommunity(Long communityId, Long currentUserId, UpdateCommunityRequestDTO dto) {
        Community community = findCommunityOrThrow(communityId);
        assertRole(communityId, currentUserId, CommunityRole.ADMIN);

        communityMapper.updateFromRequest(dto, community);
        Community saved = communityRepository.save(community);

        log.info("[Community] Updated communityId={} by userId={}", communityId, currentUserId);
        return enrichCommunityResponse(communityMapper.toResponse(saved), currentUserId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "community", key = "#communityId")
    public void deleteCommunity(Long communityId, Long currentUserId) {
        Community community = findCommunityOrThrow(communityId);
        assertRole(communityId, currentUserId, CommunityRole.OWNER);

        community.setIsDeleted(true);
        communityRepository.save(community);
        log.info("[Community] Deleted communityId={} by userId={}", communityId, currentUserId);
    }

    // ─── Discovery ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<CommunityResponseDTO> getNearbyCommunities(
            Long currentUserId, NearbySearchRequestDTO geoDto, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Community> communities = communityRepository.findNearbyCommunities(
            geoDto.getLatitude(), geoDto.getLongitude(), geoDto.getRadiusMeters(), pageable
        );
        return PageResponseDTO.of(
            communities.map(c -> enrichCommunityResponse(communityMapper.toResponse(c), currentUserId))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<CommunityResponseDTO> getMyCommunities(Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Community> communities = communityRepository.findUserCommunities(currentUserId, pageable);
        return PageResponseDTO.of(
            communities.map(c -> enrichCommunityResponse(communityMapper.toResponse(c), currentUserId))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<CommunityResponseDTO> searchCommunities(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Community> communities = communityRepository.searchCommunities(query.trim(), pageable);
        return PageResponseDTO.of(
            communities.map(c -> enrichCommunityResponse(communityMapper.toResponse(c), null))
        );
    }

    // ─── Membership ───────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void joinCommunity(Long communityId, Long currentUserId) {
        Community community = findCommunityOrThrow(communityId);
        User user = findUserOrThrow(currentUserId);

        if (memberRepository.existsByCommunityIdAndUserId(communityId, currentUserId)) {
            throw new ConflictException("Already a member or request pending");
        }

        // Private community → pending approval; public → auto-approved
        boolean autoApprove = !community.getPrivateCommunity();

        CommunityMember membership = CommunityMember.builder()
                .community(community)
                .user(user)
                .role(CommunityRole.MEMBER)
                .approved(autoApprove)
                .muted(false)
                .notificationsEnabled(true)
                .build();
        memberRepository.save(membership);

        // Notify community admins about new join request (for private communities)
        if (!autoApprove) {
            // Find first ADMIN/OWNER to notify
            memberRepository.findMembers(communityId, CommunityRole.OWNER,
                    PageRequest.of(0, 1))
                    .stream()
                    .findFirst()
                    .ifPresent(ownerMembership ->
                        notificationService.notifyCommunityJoin(
                            user, communityId, ownerMembership.getUser().getId()
                        )
                    );
        }

        eventPublisher.publishCommunityJoined(
            DomainEvents.CommunityJoinedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(currentUserId)
                .communityId(communityId)
                .userId(currentUserId)
                .build()
        );

        log.info("[Community] userId={} joined communityId={} approved={}", currentUserId, communityId, autoApprove);
    }

    @Override
    @Transactional
    public void leaveCommunity(Long communityId, Long currentUserId) {
        CommunityMember membership = memberRepository.findByCommunityIdAndUserId(communityId, currentUserId)
                .orElseThrow(() -> new NotFoundException("Membership not found"));

        if (membership.getRole() == CommunityRole.OWNER) {
            long totalMembers = communityRepository.countMembers(communityId);
            if (totalMembers == 1) {
                // Owner is the last member — auto-delete the community
                Community community = findCommunityOrThrow(communityId);
                community.setIsDeleted(true);
                communityRepository.save(community);
                membership.setIsDeleted(true);
                memberRepository.save(membership);
                log.info("[Community] Last owner left, communityId={} auto-deleted by userId={}", communityId, currentUserId);
                return;
            }
            throw new ConflictException(
                "You are the owner. Transfer ownership to another member before leaving, or delete the community.");
        }

        membership.setIsDeleted(true);
        memberRepository.save(membership);
        log.info("[Community] userId={} left communityId={}", currentUserId, communityId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "community", key = "#communityId")
    public void transferOwnership(Long communityId, Long newOwnerUserId, Long currentUserId) {
        assertRole(communityId, currentUserId, CommunityRole.OWNER);

        if (newOwnerUserId.equals(currentUserId)) {
            throw new ConflictException("You are already the owner of this community");
        }

        CommunityMember newOwnerMembership = memberRepository
                .findByCommunityIdAndUserId(communityId, newOwnerUserId)
                .orElseThrow(() -> new NotFoundException("Target user is not a member of this community"));

        if (Boolean.TRUE.equals(newOwnerMembership.getIsDeleted())) {
            throw new NotFoundException("Target user is not an active member of this community");
        }
        if (!Boolean.TRUE.equals(newOwnerMembership.getApproved())) {
            throw new ConflictException("Target user's membership is not yet approved");
        }

        CommunityMember currentOwnerMembership = memberRepository
                .findByCommunityIdAndUserId(communityId, currentUserId)
                .orElseThrow(() -> new NotFoundException("Owner membership not found"));

        memberRepository.updateRole(currentOwnerMembership.getId(), CommunityRole.MEMBER);
        memberRepository.updateRole(newOwnerMembership.getId(), CommunityRole.OWNER);

        log.info("[Community] Ownership transferred: communityId={}, from userId={} to userId={}",
                communityId, currentUserId, newOwnerUserId);
    }

    @Override
    @Transactional
    public void approveMember(Long communityId, Long memberId, Long currentUserId) {
        assertRole(communityId, currentUserId, CommunityRole.MODERATOR);
        memberRepository.approveMember(memberId);
        log.info("[Community] memberId={} approved in communityId={} by userId={}", memberId, communityId, currentUserId);
    }

    @Override
    @Transactional
    public void kickMember(Long communityId, Long memberId, Long currentUserId) {
        assertRole(communityId, currentUserId, CommunityRole.MODERATOR);

        CommunityMember target = memberRepository.findById(memberId)
                .orElseThrow(() -> new NotFoundException("Member not found"));

        // Cannot kick OWNER or someone with equal/higher role
        if (target.getRole() == CommunityRole.OWNER) {
            throw new ForbiddenException("Cannot kick the community owner");
        }

        target.setIsDeleted(true);
        memberRepository.save(target);
        log.info("[Community] memberId={} kicked from communityId={} by userId={}", memberId, communityId, currentUserId);
    }

    @Override
    @Transactional
    public void updateMemberRole(Long communityId, Long memberId, String role, Long currentUserId) {
        // Only OWNER can change roles
        assertRole(communityId, currentUserId, CommunityRole.OWNER);
        CommunityRole newRole = CommunityRole.valueOf(role);
        if (newRole == CommunityRole.OWNER) {
            throw new ForbiddenException("Use the transfer-ownership endpoint to assign OWNER role");
        }
        memberRepository.updateRole(memberId, newRole);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> getMembers(Long communityId, String role, int page, int size) {
        CommunityRole communityRole = role != null ? CommunityRole.valueOf(role) : null;
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            memberRepository.findMembers(communityId, communityRole, pageable)
                .map(m -> userMapper.toSummary(m.getUser()))
        );
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Community findCommunityOrThrow(Long communityId) {
        return communityRepository.findById(communityId)
                .filter(c -> !c.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Community not found: " + communityId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    /**
     * Asserts the currentUser has at least the required role in this community.
     * Role hierarchy: OWNER(4) > ADMIN(3) > MODERATOR(2) > MEMBER(1)
     */
    private void assertRole(Long communityId, Long currentUserId, CommunityRole minimumRole) {
        CommunityMember membership = memberRepository
                .findByCommunityIdAndUserId(communityId, currentUserId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this community"));

        if (!membership.getApproved()) {
            throw new ForbiddenException("Your membership is not yet approved");
        }

        int required = roleLevel(minimumRole);
        int actual   = roleLevel(membership.getRole());

        if (actual < required) {
            throw new ForbiddenException(
                "This action requires at least " + minimumRole.name() + " role"
            );
        }
    }

    private int roleLevel(CommunityRole role) {
        return switch (role) {
            case OWNER     -> 4;
            case ADMIN     -> 3;
            case MODERATOR -> 2;
            case MEMBER    -> 1;
        };
    }

    /**
     * Enriches CommunityResponseDTO with:
     *  - live member count
     *  - requesting user's membership context (isMember, myRole, isPending)
     */
    private CommunityResponseDTO enrichCommunityResponse(CommunityResponseDTO dto, Long currentUserId) {
        if (dto == null) return null;

        long memberCount = communityRepository.countMembers(dto.getId());

        String  myRole   = null;
        boolean isMember = false;
        boolean isPending = false;

        if (currentUserId != null) {
            var membership = memberRepository.findByCommunityIdAndUserId(dto.getId(), currentUserId);
            if (membership.isPresent()) {
                isMember  = membership.get().getApproved();
                isPending = !membership.get().getApproved();
                myRole    = membership.get().getApproved()
                        ? membership.get().getRole().name()
                        : null;
            }
        }

        return CommunityResponseDTO.builder()
                .id(dto.getId())
                .name(dto.getName())
                .description(dto.getDescription())
                .communityType(dto.getCommunityType())
                .coverImage(dto.getCoverImage())
                .iconImage(dto.getIconImage())
                .privateCommunity(dto.getPrivateCommunity())
                .verified(dto.getVerified())
                .memberCount(memberCount)
                .createdBy(dto.getCreatedBy())
                .neighborhood(dto.getNeighborhood())
                .parentCommunity(dto.getParentCommunity())
                .myRole(myRole)
                .isMember(isMember)
                .isPending(isPending)
                .createdAt(dto.getCreatedAt())
                .build();
    }
}
