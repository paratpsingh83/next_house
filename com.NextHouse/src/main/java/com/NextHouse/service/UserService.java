package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.NearbySearchRequestDTO;
import com.NextHouse.dto.request.UpdateLocationRequestDTO;
import com.NextHouse.dto.request.UpdateProfileRequestDTO;
import com.NextHouse.dto.response.NearbyUserResponseDTO;
import com.NextHouse.dto.response.UserResponseDTO;
import com.NextHouse.dto.response.UserSummaryDTO;

public interface UserService {

    UserResponseDTO getProfile(Long userId, Long requestingUserId);

    UserResponseDTO getMyProfile(Long currentUserId);

    UserResponseDTO updateProfile(Long currentUserId, UpdateProfileRequestDTO dto);

    void updateLocation(Long currentUserId, UpdateLocationRequestDTO dto);

    PageResponseDTO<NearbyUserResponseDTO> getNearbyUsers(Long currentUserId, NearbySearchRequestDTO dto, int page, int size);

    PageResponseDTO<UserSummaryDTO> getSuggestedUsers(Long currentUserId, int page, int size);

    PageResponseDTO<UserSummaryDTO> searchUsers(String query, int page, int size);

    void followUser(Long currentUserId, Long targetUserId);

    void unfollowUser(Long currentUserId, Long targetUserId);

    PageResponseDTO<UserSummaryDTO> getFollowers(Long userId, int page, int size);

    PageResponseDTO<UserSummaryDTO> getFollowing(Long userId, int page, int size);

    void blockUser(Long currentUserId, Long targetUserId);

    void unblockUser(Long currentUserId, Long targetUserId);

    void deleteAccount(Long currentUserId);
}
