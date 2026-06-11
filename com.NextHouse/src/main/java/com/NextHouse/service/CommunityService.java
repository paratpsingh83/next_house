package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;

public interface CommunityService {

    CommunityResponseDTO createCommunity(Long currentUserId, CreateCommunityRequestDTO dto);

    CommunityResponseDTO getCommunity(Long communityId, Long currentUserId);

    CommunityResponseDTO updateCommunity(Long communityId, Long currentUserId, UpdateCommunityRequestDTO dto);

    void deleteCommunity(Long communityId, Long currentUserId);

    PageResponseDTO<CommunityResponseDTO> getNearbyCommunities(Long currentUserId, NearbySearchRequestDTO geoDto, int page, int size);

    PageResponseDTO<CommunityResponseDTO> getMyCommunities(Long currentUserId, int page, int size);

    PageResponseDTO<CommunityResponseDTO> searchCommunities(String query, int page, int size);

    void joinCommunity(Long communityId, Long currentUserId);

    void leaveCommunity(Long communityId, Long currentUserId);

    void approveMember(Long communityId, Long memberId, Long currentUserId);

    void kickMember(Long communityId, Long memberId, Long currentUserId);

    void updateMemberRole(Long communityId, Long memberId, String role, Long currentUserId);

    PageResponseDTO<UserSummaryDTO> getMembers(Long communityId, String role, int page, int size);

    /**
     * Transfers OWNER role to an existing approved member.
     * Current owner is demoted to MEMBER. Only the current OWNER can call this.
     */
    void transferOwnership(Long communityId, Long newOwnerUserId, Long currentUserId);
}
