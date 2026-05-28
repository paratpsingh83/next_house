package com.NextHouse.repository;

import com.NextHouse.entity.Follow;
import com.NextHouse.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    Optional<Follow> findByFollowerAndFollowing(User follower, User following);

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    /**
     * Users that :userId follows.
     */
    @Query("SELECT f.following FROM Follow f WHERE f.follower.id = :userId AND f.isDeleted = false")
    Page<User> findFollowing(@Param("userId") Long userId, Pageable pageable);

    /**
     * Users that follow :userId.
     */
    @Query("SELECT f.follower FROM Follow f WHERE f.following.id = :userId AND f.isDeleted = false")
    Page<User> findFollowers(@Param("userId") Long userId, Pageable pageable);

    long countByFollowingId(Long userId);  // follower count

    long countByFollowerId(Long userId);   // following count

    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);
}
