package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;

public interface ActivityService {

    ActivityResponseDTO createActivity(Long currentUserId, CreateActivityRequestDTO dto);

    ActivityResponseDTO getActivity(Long activityId, Long currentUserId);

    ActivityResponseDTO updateActivity(Long activityId, Long currentUserId, UpdateActivityRequestDTO dto);

    void deleteActivity(Long activityId, Long currentUserId);

    PageResponseDTO<ActivityResponseDTO> getNearbyActivities(Long currentUserId, NearbySearchRequestDTO geoDto, String activityType, int page, int size);

    PageResponseDTO<ActivityResponseDTO> getCommunityActivities(Long communityId, int page, int size);

    PageResponseDTO<ActivityResponseDTO> getMyHostedActivities(Long currentUserId, int page, int size);

    PageResponseDTO<ActivityResponseDTO> getMyJoinedActivities(Long currentUserId, int page, int size);

    void joinActivity(Long activityId, Long currentUserId, JoinActivityRequestDTO dto);

    void leaveActivity(Long activityId, Long currentUserId);

    void approveJoinRequest(Long activityId, Long memberId, Long currentUserId);

    void rejectJoinRequest(Long activityId, Long memberId, Long currentUserId);

    PageResponseDTO<ActivityMemberResponseDTO> getActivityMembers(Long activityId, String joinStatus, int page, int size);
}
