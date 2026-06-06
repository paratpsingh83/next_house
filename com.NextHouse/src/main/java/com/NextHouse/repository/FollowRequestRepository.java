package com.NextHouse.repository;

import com.NextHouse.entity.FollowRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface FollowRequestRepository extends JpaRepository<FollowRequest, Long> {

    boolean existsByRequesterIdAndTargetId(Long requesterId, Long targetId);

    Optional<FollowRequest> findByRequesterIdAndTargetId(Long requesterId, Long targetId);

    void deleteByRequesterIdAndTargetId(Long requesterId, Long targetId);

    @Query("SELECT r FROM FollowRequest r WHERE r.target.id = :targetId AND r.isDeleted = false")
    List<FollowRequest> findPendingRequestsForUser(@Param("targetId") Long targetId);

    @Query("SELECT r.target.id FROM FollowRequest r WHERE r.requester.id = :requesterId AND r.target.id IN :userIds AND r.isDeleted = false")
    Set<Long> findRequestedIds(@Param("requesterId") Long requesterId, @Param("userIds") List<Long> userIds);
}