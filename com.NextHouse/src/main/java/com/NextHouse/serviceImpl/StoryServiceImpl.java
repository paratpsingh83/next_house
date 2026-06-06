package com.NextHouse.serviceImpl;

import com.NextHouse.dto.request.CreateStoryRequestDTO;
import com.NextHouse.dto.response.StoryResponseDTO;
import com.NextHouse.dto.response.UserSummaryDTO;
import com.NextHouse.entity.Story;
import com.NextHouse.entity.StoryView;
import com.NextHouse.entity.User;
import com.NextHouse.exception.ForbiddenException;
import com.NextHouse.exception.NotFoundException;
import com.NextHouse.mapper.UserMapper;
import com.NextHouse.repository.StoryRepository;
import com.NextHouse.repository.StoryViewRepository;
import com.NextHouse.repository.UserRepository;
import com.NextHouse.service.StoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryServiceImpl implements StoryService {

    private final StoryRepository     storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final UserRepository      userRepository;
    private final UserMapper          userMapper;

    @Override
    @Transactional
    public StoryResponseDTO createStory(Long currentUserId, CreateStoryRequestDTO dto) {
        User user = findUser(currentUserId);
        Story story = Story.builder()
                .user(user)
                .mediaUrl(dto.getMediaUrl())
                .mediaType(dto.getMediaType())
                .textContent(dto.getTextContent())
                .backgroundColor(dto.getBackgroundColor())
                .expiresAt(LocalDateTime.now().plusHours(24))
                .viewCount(0)
                .build();
        return toDto(storyRepository.save(story), false, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponseDTO> getMyStories(Long currentUserId) {
        List<Story> stories = storyRepository.findActiveByUserId(currentUserId, LocalDateTime.now());
        List<Long> ids = stories.stream().map(Story::getId).collect(Collectors.toList());
        Set<Long> viewed = ids.isEmpty() ? Set.of() : storyViewRepository.findViewedStoryIds(ids, currentUserId);
        return stories.stream().map(s -> toDto(s, viewed.contains(s.getId()), currentUserId)).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponseDTO> getUserStories(Long userId, Long viewerId) {
        List<Story> stories = storyRepository.findActiveByUserId(userId, LocalDateTime.now());
        List<Long> ids = stories.stream().map(Story::getId).collect(Collectors.toList());
        Set<Long> viewed = ids.isEmpty() ? Set.of() : storyViewRepository.findViewedStoryIds(ids, viewerId);
        return stories.stream().map(s -> toDto(s, viewed.contains(s.getId()), viewerId)).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponseDTO> getFeedStories(Long currentUserId) {
        List<Story> stories = storyRepository.findFollowingStoriesForUser(currentUserId, LocalDateTime.now());
        List<Long> ids = stories.stream().map(Story::getId).collect(Collectors.toList());
        Set<Long> viewed = ids.isEmpty() ? Set.of() : storyViewRepository.findViewedStoryIds(ids, currentUserId);
        return stories.stream()
                .map(s -> toDto(s, viewed.contains(s.getId()), currentUserId))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void markViewed(Long storyId, Long viewerId) {
        if (storyViewRepository.existsByStoryIdAndViewerId(storyId, viewerId)) return;

        Story story = storyRepository.findById(storyId)
                .filter(s -> !s.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Story not found"));

        User viewer = findUser(viewerId);
        try {
            storyViewRepository.save(StoryView.builder().story(story).viewer(viewer).build());
            story.setViewCount(story.getViewCount() + 1);
            storyRepository.save(story);
        } catch (DataIntegrityViolationException ignored) {
            // concurrent duplicate view — unique constraint prevents double-count, idempotent
        }
    }

    @Override
    @Transactional
    public void deleteStory(Long storyId, Long currentUserId) {
        Story story = storyRepository.findById(storyId)
                .filter(s -> !s.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Story not found"));
        if (!story.getUser().getId().equals(currentUserId))
            throw new ForbiddenException("Not your story");
        story.setIsDeleted(true);
        storyRepository.save(story);
    }

    private StoryResponseDTO toDto(Story s, boolean viewedByMe, Long viewerId) {
        return StoryResponseDTO.builder()
                .id(s.getId())
                .author(userMapper.toSummary(s.getUser()))
                .mediaUrl(s.getMediaUrl())
                .mediaType(s.getMediaType())
                .textContent(s.getTextContent())
                .backgroundColor(s.getBackgroundColor())
                .expiresAt(s.getExpiresAt())
                .createdAt(s.getCreatedAt())
                .viewCount(s.getViewCount())
                .viewedByMe(viewedByMe)
                .isOwn(s.getUser().getId().equals(viewerId))
                .build();
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}