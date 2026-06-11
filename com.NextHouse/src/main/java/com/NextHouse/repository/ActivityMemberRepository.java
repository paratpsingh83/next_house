package com.NextHouse.repository;

import com.NextHouse.constant.JoinStatus;
import com.NextHouse.entity.ActivityMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ActivityMemberRepository extends JpaRepository<ActivityMember, Long> {

    @Query("SELECT am FROM ActivityMember am WHERE am.activity.id = :activityId AND am.user.id = :userId AND am.isDeleted = false")
    Optional<ActivityMember> findByActivityIdAndUserId(@Param("activityId") Long activityId, @Param("userId") Long userId);

    @Query("SELECT CASE WHEN COUNT(am) > 0 THEN TRUE ELSE FALSE END FROM ActivityMember am WHERE am.activity.id = :activityId AND am.user.id = :userId AND am.isDeleted = false")
    boolean existsByActivityIdAndUserId(@Param("activityId") Long activityId, @Param("userId") Long userId);

    @Query("SELECT am FROM ActivityMember am WHERE am.activity.id = :activityId AND am.joinStatus = :joinStatus AND am.isDeleted = false")
    Page<ActivityMember> findByActivityIdAndJoinStatus(@Param("activityId") Long activityId, @Param("joinStatus") JoinStatus joinStatus, Pageable pageable);

    long countByActivityIdAndJoinStatus(Long activityId, JoinStatus joinStatus);

    /** Pending join requests for activities hosted by :hostUserId. */
    @Query("""
            SELECT am FROM ActivityMember am
            JOIN am.activity a
            WHERE a.hostUser.id = :hostUserId
              AND am.joinStatus = com.NextHouse.constant.JoinStatus.PENDING
              AND am.isDeleted = false
            ORDER BY am.createdAt ASC
            """)
    Page<ActivityMember> findPendingRequestsForHost(@Param("hostUserId") Long hostUserId, Pageable pageable);

    /** Batch fetch memberships for a set of activities and a single user — eliminates N+1 on list pages. */
    @Query("""
            SELECT am FROM ActivityMember am
            WHERE am.activity.id IN :activityIds
              AND am.user.id = :userId
              AND am.isDeleted = false
            """)
    List<ActivityMember> findByActivityIdsAndUserId(
            @Param("activityIds") Collection<Long> activityIds,
            @Param("userId")      Long             userId
    );

    @Modifying
    @Query("""
            UPDATE ActivityMember am
            SET am.joinStatus = :status
            WHERE am.id = :id
            """)
    int updateJoinStatus(@Param("id") Long id, @Param("status") JoinStatus status);

    @Query("""
            SELECT am.user.id FROM ActivityMember am
            WHERE am.activity.id = :activityId
              AND am.joinStatus = com.NextHouse.constant.JoinStatus.APPROVED
              AND am.isDeleted = false
            """)
    List<Long> findApprovedMemberUserIds(@Param("activityId") Long activityId);
}
