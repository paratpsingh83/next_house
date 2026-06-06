package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.NearbySearchRequestDTO;
import com.NextHouse.dto.request.UpdateLocationRequestDTO;
import com.NextHouse.dto.request.UpdateProfileRequestDTO;
import com.NextHouse.dto.response.NearbyUserResponseDTO;
import com.NextHouse.dto.response.UserResponseDTO;
import com.NextHouse.dto.response.FollowRequestResponseDTO;
import com.NextHouse.dto.response.UserSummaryDTO;
import java.util.List;

public interface UserService {

    UserResponseDTO getProfile(Long userId, Long requestingUserId);

    UserResponseDTO getMyProfile(Long currentUserId);

    UserResponseDTO updateProfile(Long currentUserId, UpdateProfileRequestDTO dto);

    void updateLocation(Long currentUserId, UpdateLocationRequestDTO dto);

    PageResponseDTO<NearbyUserResponseDTO> getNearbyUsers(Long currentUserId, NearbySearchRequestDTO dto, int page, int size);

    PageResponseDTO<UserSummaryDTO> getSuggestedUsers(Long currentUserId, int page, int size);

    PageResponseDTO<UserSummaryDTO> searchUsers(String query, int page, int size);

    /** Returns "FOLLOWING" for public accounts or "REQUESTED" for private accounts. */
    String followUser(Long currentUserId, Long targetUserId);

    void unfollowUser(Long currentUserId, Long targetUserId);

    void acceptFollowRequest(Long requestId, Long currentUserId);

    void rejectFollowRequest(Long requestId, Long currentUserId);

    List<FollowRequestResponseDTO> getPendingFollowRequests(Long currentUserId);

    PageResponseDTO<UserSummaryDTO> getFollowers(Long userId, int page, int size);

    PageResponseDTO<UserSummaryDTO> getFollowing(Long userId, int page, int size);

    void blockUser(Long currentUserId, Long targetUserId);

    void unblockUser(Long currentUserId, Long targetUserId);

    List<UserSummaryDTO> getBlockedUsers(Long currentUserId);

    void deleteAccount(Long currentUserId);

    void requestAddressVerification(Long currentUserId, String docType, Long mediaId);

    void requestIdentityVerification(Long currentUserId, String docType, Long mediaId);
}
