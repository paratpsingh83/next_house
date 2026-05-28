package com.NextHouse.repository;

import com.NextHouse.constant.CommunityRole;
import com.NextHouse.entity.CommunityMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityMemberRepository extends JpaRepository<CommunityMember, Long> {

    Optional<CommunityMember> findByCommunityIdAndUserId(Long communityId, Long userId);

    boolean existsByCommunityIdAndUserId(Long communityId, Long userId);

    /**
     * All approved members of a community, optionally filtered by role.
     */
    @Query("""
            SELECT cm FROM CommunityMember cm
            WHERE cm.community.id = :communityId
              AND cm.approved = true
              AND cm.isDeleted = false
              AND (:role IS NULL OR cm.role = :role)
            """)
    Page<CommunityMember> findMembers(
            @Param("communityId") Long communityId,
            @Param("role") CommunityRole role,
            Pageable pageable
    );

    /**
     * Pending join requests for a private community.
     */
    @Query("""
            SELECT cm FROM CommunityMember cm
            WHERE cm.community.id = :communityId
              AND cm.approved = false
              AND cm.isDeleted = false
            ORDER BY cm.createdAt ASC
            """)
    Page<CommunityMember> findPendingRequests(@Param("communityId") Long communityId, Pageable pageable);

    /**
     * All community IDs the user belongs to — used for feed scoping.
     */
    @Query("""
            SELECT cm.community.id FROM CommunityMember cm
            WHERE cm.user.id = :userId AND cm.approved = true AND cm.isDeleted = false
            """)
    List<Long> findCommunityIdsByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE CommunityMember cm SET cm.role = :role WHERE cm.id = :id")
    int updateRole(@Param("id") Long id, @Param("role") CommunityRole role);

    @Modifying
    @Query("UPDATE CommunityMember cm SET cm.approved = true WHERE cm.id = :id")
    int approveMember(@Param("id") Long id);
}
