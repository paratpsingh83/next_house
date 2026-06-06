package com.NextHouse.repository;

import com.NextHouse.entity.StoryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface StoryViewRepository extends JpaRepository<StoryView, Long> {

    boolean existsByStoryIdAndViewerId(Long storyId, Long viewerId);

    /** IDs of stories (in the given list) that the viewer has already seen. */
    @Query("SELECT sv.story.id FROM StoryView sv WHERE sv.story.id IN :storyIds AND sv.viewer.id = :viewerId AND sv.isDeleted = false")
    Set<Long> findViewedStoryIds(@Param("storyIds") List<Long> storyIds, @Param("viewerId") Long viewerId);

    long countByStoryIdAndIsDeletedFalse(Long storyId);
}