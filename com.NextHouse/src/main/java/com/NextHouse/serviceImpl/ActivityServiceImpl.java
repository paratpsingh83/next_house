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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityServiceImpl implements ActivityService {

    private final ActivityRepository       activityRepository;
    private final ActivityMemberRepository memberRepository;
    private final UserRepository           userRepository;
    private final CommunityRepository      communityRepository;
    private final NeighborhoodRepository   neighborhoodRepository;
    private final BlockedUserRepository    blockedUserRepository;

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
        List<Long> blockedIds = getBlockedIds(currentUserId);
        Page<Activity> activities = activityRepository.findNearbyActivities(
            geoDto.getLatitude(), geoDto.getLongitude(), geoDto.getRadiusMeters(),
            activityType, blockedIds, PageRequest.of(page, size));
        return enrichPage(activities, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> getCommunityActivities(Long communityId, int page, int size) {
        return enrichPage(
            activityRepository.findByCommunityId(communityId, LocalDateTime.now(), PageRequest.of(page, size)),
            null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> getMyHostedActivities(Long currentUserId, int page, int size) {
        return enrichPage(
            activityRepository.findByHostUserIdAndIsDeletedFalse(currentUserId, PageRequest.of(page, size)),
            currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> getMyJoinedActivities(Long currentUserId, int page, int size) {
        return enrichPage(
            activityRepository.findJoinedActivities(currentUserId, PageRequest.of(page, size)),
            currentUserId);
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
        memberRepository.delete(member);
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
        memberRepository.delete(member);
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

    private PageResponseDTO<ActivityResponseDTO> enrichPage(Page<Activity> page, Long currentUserId) {
        if (page.isEmpty()) return PageResponseDTO.of(page.map(a -> enrichActivityResponse(activityMapper.toResponse(a), currentUserId)));

        List<Long> ids = page.getContent().stream().map(Activity::getId).collect(Collectors.toList());

        Map<Long, Integer> countMap = new HashMap<>();
        activityRepository.countApprovedMembersForActivities(ids)
                .forEach(row -> countMap.put((Long) row[0], ((Number) row[1]).intValue()));

        Map<Long, ActivityMember> membershipMap = new HashMap<>();
        if (currentUserId != null) {
            memberRepository.findByActivityIdsAndUserId(ids, currentUserId)
                    .forEach(am -> membershipMap.put(am.getActivity().getId(), am));
        }

        return PageResponseDTO.of(page.map(a -> {
            ActivityResponseDTO dto = activityMapper.toResponse(a);
            int memberCount = countMap.getOrDefault(a.getId(), 0);
            String myJoinStatus = "NONE";
            boolean isHost = false;
            ActivityMember am = membershipMap.get(a.getId());
            if (am != null) {
                myJoinStatus = am.getJoinStatus().name();
                isHost = am.getRole() == ActivityMemberRole.HOST;
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
        }));
    }

    private List<Long> getBlockedIds(Long userId) {
        if (userId == null) return List.of(-1L);
        List<Long> blocked = new ArrayList<>(blockedUserRepository.findBlockedUserIds(userId));
        blocked.addAll(blockedUserRepository.findUsersWhoBlockedMe(userId));
        if (blocked.isEmpty()) blocked.add(-1L);
        return blocked;
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
