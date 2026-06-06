package com.NextHouse.repository;

import com.NextHouse.entity.BlockedUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlockedUserRepository extends JpaRepository<BlockedUser, Long> {

    Optional<BlockedUser> findByUserIdAndBlockedUserId(Long userId, Long blockedUserId);

    boolean existsByUserIdAndBlockedUserId(Long userId, Long blockedUserId);

    void deleteByUserIdAndBlockedUserId(Long userId, Long blockedUserId);

    /**
     * Returns blocked User entities for the given userId — used in privacy settings UI.
     */
    @Query("SELECT b.blockedUser FROM BlockedUser b WHERE b.user.id = :userId AND b.isDeleted = false ORDER BY b.createdAt DESC")
    List<com.NextHouse.entity.User> findBlockedUsers(@Param("userId") Long userId);

    /**
     * Returns all IDs of users that :userId has blocked — used for feed filtering.
     */
    @Query("SELECT b.blockedUser.id FROM BlockedUser b WHERE b.user.id = :userId AND b.isDeleted = false")
    List<Long> findBlockedUserIds(@Param("userId") Long userId);

    /**
     * Returns all IDs of users that have blocked :userId — for reverse filtering.
     */
    @Query("SELECT b.user.id FROM BlockedUser b WHERE b.blockedUser.id = :userId AND b.isDeleted = false")
    List<Long> findUsersWhoBlockedMe(@Param("userId") Long userId);
}
