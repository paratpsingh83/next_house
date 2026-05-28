package com.NextHouse.serviceImpl;

import com.NextHouse.constant.ActivityMemberRole;
import com.NextHouse.constant.ActivityStatus;
import com.NextHouse.constant.JoinStatus;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.*;
import com.NextHouse.event.DomainEvents;
import com.NextHouse.event.KafkaEventPublisher;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.ActivityMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.ActivityService;
import com.NextHouse.service.NotificationService;
import com.NextHouse.util.geo.GeoUtils;
import lombok.RequiredArgsConstructor; // FIX: @Builder REMOVED (see below)
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * FIX 1: @Builder annotation REMOVED from this class.
 *
 * @Builder on a @Service class causes two problems:
 *
 * Problem A — Constructor conflict:
 *   @Builder generates an ALL-ARGS constructor.
 *   @RequiredArgsConstructor generates a constructor for FINAL fields.
 *   Both try to generate constructors — Lombok can only generate one,
 *   so it produces an ambiguous/broken constructor that Spring cannot use
 *   for @Autowired dependency injection.
 *
 * Problem B — @Builder is meaningless on a Spring service class:
 *   @Builder is for creating VALUE OBJECTS via the builder pattern.
 *   Spring services are singletons created by the Spring container.
 *   You never write "ActivityServiceImpl.builder().build()" — Spring
 *   creates the bean via its constructor automatically.
 *
 * FIX: Remove @Builder. Keep only @RequiredArgsConstructor.
 *
 * FIX 2: dto.getActivityType().toString() would have caused NPE/ClassCastException
 *   if activityType was String (old DTO). After DTO fix (activityType is ActivityType enum),
 *   dto.getActivityType() returns an ActivityType enum which has .toString() returning its name.
 *   No code change needed here — the DTO fix resolves this.
 */
@Slf4j
@Service
// FIX: @Builder REMOVED — conflicts with @RequiredArgsConstructor, meaningless on @Service
@RequiredArgsConstructor
public class ActivityServiceImpl implements ActivityService {

    private final ActivityRepository       activityRepository;
    private final ActivityMemberRepository memberRepository;
    private final UserRepository           userRepository;
    private final CommunityRepository      communityRepository;
    private final NeighborhoodRepository   neighborhoodRepository;

    private final ActivityMapper      activityMapper;
    private final GeoUtils            geoUtils;
    private final NotificationService notificationService;
    private final KafkaEventPublisher eventPublisher;

    @Override
    @Transactional
    public ActivityResponseDTO createActivity(Long currentUserId, CreateActivityRequestDTO dto) {
        User host = findUserOrThrow(currentUserId);

        Activity activity = activityMapper.toEntity(dto);
        activity.setHostUser(host);
        activity.setStatus(ActivityStatus.PUBLISHED);
        activity.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));

        if (dto.getCommunityId() != null)
            activity.setCommunity(communityRepository.findById(dto.getCommunityId())
                    .orElseThrow(() -> new NotFoundException("Community not found")));

        if (dto.getNeighborhoodId() != null)
            activity.setNeighborhood(neighborhoodRepository.findById(dto.getNeighborhoodId())
                    .orElseThrow(() -> new NotFoundException("Neighborhood not found")));

        Activity saved = activityRepository.save(activity);

        memberRepository.save(ActivityMember.builder()
                .activity(saved).user(host)
                .role(ActivityMemberRole.HOST).joinStatus(JoinStatus.APPROVED)
                .joinedAt(LocalDateTime.now()).build());

        eventPublisher.publishActivityCreated(
            DomainEvents.ActivityCreatedEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(currentUserId).activityId(saved.getId()).hostId(currentUserId)
                .neighborhoodId(dto.getNeighborhoodId()).communityId(dto.getCommunityId())
                // FIX 2: dto.getActivityType() now returns ActivityType enum (after DTO fix)
                // .toString() on an enum returns its name (e.g. "SOCIAL") — correct
                .activityType(dto.getActivityType().toString())
                .latitude(dto.getLatitude()).longitude(dto.getLongitude())
                .build());

        log.info("[Activity] Created activityId={} by userId={}", saved.getId(), currentUserId);
        return enrichActivityResponse(activityMapper.toResponse(saved), currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public ActivityResponseDTO getActivity(Long activityId, Long currentUserId) {
        return enrichActivityResponse(activityMapper.toResponse(findActivityOrThrow(activityId)), currentUserId);
    }

    @Override
    @Transactional
    public ActivityResponseDTO updateActivity(Long activityId, Long currentUserId, UpdateActivityRequestDTO dto) {
        Activity activity = findActivityOrThrow(activityId);
        assertHost(activity, currentUserId);
        activityMapper.updateFromRequest(dto, activity);
        return enrichActivityResponse(activityMapper.toResponse(activityRepository.save(activity)), currentUserId);
    }

    @Override
    @Transactional
    public void deleteActivity(Long activityId, Long currentUserId) {
        Activity activity = findActivityOrThrow(activityId);
        assertHost(activity, currentUserId);
        activity.setIsDeleted(true);
        activity.setStatus(ActivityStatus.CANCELLED);
        activityRepository.save(activity);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> getNearbyActivities(
            Long currentUserId, NearbySearchRequestDTO geoDto, String activityType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Activity> activities = activityRepository.findNearbyActivities(
            geoDto.getLatitude(), geoDto.getLongitude(), geoDto.getRadiusMeters(), activityType, pageable);
        return PageResponseDTO.of(activities.map(a -> enrichActivityResponse(activityMapper.toResponse(a), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> getCommunityActivities(Long communityId, int page, int size) {
        return PageResponseDTO.of(
            activityRepository.findByCommunityId(communityId, LocalDateTime.now(), PageRequest.of(page, size))
                .map(a -> enrichActivityResponse(activityMapper.toResponse(a), null)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> getMyHostedActivities(Long currentUserId, int page, int size) {
        return PageResponseDTO.of(
            activityRepository.findByHostUserIdAndIsDeletedFalse(currentUserId, PageRequest.of(page, size))
                .map(a -> enrichActivityResponse(activityMapper.toResponse(a), currentUserId)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> getMyJoinedActivities(Long currentUserId, int page, int size) {
        return PageResponseDTO.of(
            activityRepository.findJoinedActivities(currentUserId, PageRequest.of(page, size))
                .map(a -> enrichActivityResponse(activityMapper.toResponse(a), currentUserId)));
    }

    @Override
    @Transactional
    public void joinActivity(Long activityId, Long currentUserId, JoinActivityRequestDTO dto) {
        Activity activity = findActivityOrThrow(activityId);
        User joiner = findUserOrThrow(currentUserId);

        if (memberRepository.existsByActivityIdAndUserId(activityId, currentUserId))
            throw new ConflictException("Already a member or request pending");
        if (activity.getStatus() == ActivityStatus.FULL)
            throw new ConflictException("Activity is full");

        JoinStatus status = activity.getApprovalRequired() ? JoinStatus.PENDING : JoinStatus.APPROVED;

        if (status == JoinStatus.APPROVED && activity.getMaxMembers() != null) {
            int current = activityRepository.countApprovedMembers(activityId);
            if (current >= activity.getMaxMembers()) {
                activity.setStatus(ActivityStatus.FULL);
                activityRepository.save(activity);
                throw new ConflictException("Activity is full");
            }
        }

        memberRepository.save(ActivityMember.builder()
                .activity(activity).user(joiner).role(ActivityMemberRole.MEMBER)
                .joinStatus(status).joinedAt(status == JoinStatus.APPROVED ? LocalDateTime.now() : null).build());

        notificationService.notifyActivityJoin(joiner, activityId, activity.getHostUser().getId());
    }

    @Override
    @Transactional
    public void leaveActivity(Long activityId, Long currentUserId) {
        ActivityMember member = memberRepository.findByActivityIdAndUserId(activityId, currentUserId)
                .orElseThrow(() -> new NotFoundException("Membership not found"));
        if (member.getRole() == ActivityMemberRole.HOST)
            throw new ConflictException("Host cannot leave. Delete the activity instead.");
        member.setIsDeleted(true);
        memberRepository.save(member);
    }

    @Override
    @Transactional
    public void approveJoinRequest(Long activityId, Long memberId, Long currentUserId) {
        Activity activity = findActivityOrThrow(activityId);
        assertHost(activity, currentUserId);
        ActivityMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NotFoundException("Member request not found"));
        if (member.getJoinStatus() != JoinStatus.PENDING)
            throw new ConflictException("Request is not PENDING");
        if (activity.getMaxMembers() != null &&
            activityRepository.countApprovedMembers(activityId) >= activity.getMaxMembers()) {
            activity.setStatus(ActivityStatus.FULL);
            activityRepository.save(activity);
            throw new ConflictException("Activity is full");
        }
        memberRepository.updateJoinStatus(memberId, JoinStatus.APPROVED);
        member.setJoinedAt(LocalDateTime.now());
        memberRepository.save(member);
        notificationService.notifyActivityApproval(member.getUser().getId(), activityId, true);
    }

    @Override
    @Transactional
    public void rejectJoinRequest(Long activityId, Long memberId, Long currentUserId) {
        Activity activity = findActivityOrThrow(activityId);
        assertHost(activity, currentUserId);
        ActivityMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NotFoundException("Member request not found"));
        memberRepository.updateJoinStatus(memberId, JoinStatus.REJECTED);
        notificationService.notifyActivityApproval(member.getUser().getId(), activityId, false);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityMemberResponseDTO> getActivityMembers(
            Long activityId, String joinStatus, int page, int size) {
        JoinStatus status = joinStatus != null ? JoinStatus.valueOf(joinStatus) : JoinStatus.APPROVED;
        return PageResponseDTO.of(
            memberRepository.findByActivityIdAndJoinStatus(activityId, status, PageRequest.of(page, size))
                            .map(activityMapper::toMemberResponse));
    }

    private Activity findActivityOrThrow(Long activityId) {
        return activityRepository.findById(activityId)
                .filter(a -> !a.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Activity not found: " + activityId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private void assertHost(Activity activity, Long currentUserId) {
        if (!activity.getHostUser().getId().equals(currentUserId))
            throw new ForbiddenException("Only the host can perform this action");
    }

    private ActivityResponseDTO enrichActivityResponse(ActivityResponseDTO dto, Long currentUserId) {
        if (dto == null) return null;
        int memberCount = activityRepository.countApprovedMembers(dto.getId());
        String myJoinStatus = "NONE";
        boolean isHost = false;
        if (currentUserId != null) {
            var membership = memberRepository.findByActivityIdAndUserId(dto.getId(), currentUserId);
            if (membership.isPresent()) {
                myJoinStatus = membership.get().getJoinStatus().name();
                isHost = membership.get().getRole() == ActivityMemberRole.HOST;
            }
        }
        return ActivityResponseDTO.builder()
                .id(dto.getId()).title(dto.getTitle()).description(dto.getDescription())
                .activityType(dto.getActivityType()).status(dto.getStatus())
                .activityTime(dto.getActivityTime()).endTime(dto.getEndTime())
                .maxMembers(dto.getMaxMembers()).currentMemberCount(memberCount)
                .privateActivity(dto.getPrivateActivity()).approvalRequired(dto.getApprovalRequired())
                .coverImage(dto.getCoverImage()).latitude(dto.getLatitude())
                .longitude(dto.getLongitude()).address(dto.getAddress())
                .hostUser(dto.getHostUser()).community(dto.getCommunity())
                .neighborhood(dto.getNeighborhood()).myJoinStatus(myJoinStatus)
                .isHost(isHost).createdAt(dto.getCreatedAt()).build();
    }
}
