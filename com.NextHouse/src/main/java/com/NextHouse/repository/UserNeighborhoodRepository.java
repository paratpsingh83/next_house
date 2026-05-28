package com.NextHouse.repository;

import com.NextHouse.entity.UserNeighborhood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserNeighborhoodRepository extends JpaRepository<UserNeighborhood, Long> {

    List<UserNeighborhood> findByUserId(Long userId);

    Optional<UserNeighborhood> findByUserIdAndNeighborhoodId(Long userId, Long neighborhoodId);

    Optional<UserNeighborhood> findByUserIdAndPrimaryNeighborhoodTrue(Long userId);

    boolean existsByUserIdAndNeighborhoodId(Long userId, Long neighborhoodId);

    /** Demote all existing primary neighborhoods for a user before setting a new one. */
    @Modifying
    @Query("""
            UPDATE UserNeighborhood un
            SET un.primaryNeighborhood = false
            WHERE un.user.id = :userId
            """)
    int clearPrimaryNeighborhood(@Param("userId") Long userId);
}
