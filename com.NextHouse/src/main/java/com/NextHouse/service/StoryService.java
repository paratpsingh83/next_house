package com.NextHouse.service;

import com.NextHouse.dto.request.CreateStoryRequestDTO;
import com.NextHouse.dto.response.StoryResponseDTO;

import java.util.List;

public interface StoryService {

    StoryResponseDTO createStory(Long currentUserId, CreateStoryRequestDTO dto);

    List<StoryResponseDTO> getMyStories(Long currentUserId);

    List<StoryResponseDTO> getUserStories(Long userId, Long viewerId);

    /** Returns stories from followed users grouped into a flat list — client groups by authorId. */
    List<StoryResponseDTO> getFeedStories(Long currentUserId);

    void markViewed(Long storyId, Long viewerId);

    void deleteStory(Long storyId, Long currentUserId);
}