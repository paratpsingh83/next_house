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

import java.util.Optional;

@Repository
public interface ActivityMemberRepository extends JpaRepository<ActivityMember, Long> {

    Optional<ActivityMember> findByActivityIdAndUserId(Long activityId, Long userId);

    boolean existsByActivityIdAndUserId(Long activityId, Long userId);

    Page<ActivityMember> findByActivityIdAndJoinStatus(Long activityId, JoinStatus joinStatus, Pageable pageable);

    long countByActivityIdAndJoinStatus(Long activityId, JoinStatus joinStatus);

    /** Pending join requests for activities hosted by :hostUserId. */
    @Query("""
            SELECT am FROM ActivityMember am
            JOIN am.activity a
            WHERE a.hostUser.id = :hostUserId
              AND am.joinStatus = 'PENDING'
            ORDER BY am.createdAt ASC
            """)
    Page<ActivityMember> findPendingRequestsForHost(@Param("hostUserId") Long hostUserId, Pageable pageable);

    @Modifying
    @Query("""
            UPDATE ActivityMember am
            SET am.joinStatus = :status
            WHERE am.id = :id
            """)
    int updateJoinStatus(@Param("id") Long id, @Param("status") JoinStatus status);
}
