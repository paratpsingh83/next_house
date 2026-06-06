package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.SearchHistory;
import com.NextHouse.mapper.*;
import com.NextHouse.repository.*;
import com.NextHouse.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final ActivityRepository activityRepository;
    private final CommunityRepository communityRepository;
    private final MarketplaceItemRepository marketplaceRepository;
    private final SearchHistoryRepository searchHistoryRepository;

    private final UserMapper userMapper;
    private final PostMapper postMapper;
    private final ActivityMapper activityMapper;
    private final CommunityMapper communityMapper;
    private final MarketplaceMapper marketplaceMapper;

    private final SearchHistoryWriter historyWriter;

    @Override
    @Transactional(readOnly = true)
    public SearchResultDTO globalSearch(String query, Long currentUserId, int page, int size) {
        String trimmed = query.trim();
        if (trimmed.length() < 2)
            throw new com.NextHouse.exception.BadRequestException("Search query must be at least 2 characters");

        Pageable pageable = PageRequest.of(page, size);

        PageResponseDTO<UserSummaryDTO> users = PageResponseDTO.of(
                userRepository.searchUsers(trimmed, pageable).map(userMapper::toSummary));
        PageResponseDTO<PostResponseDTO> posts = PageResponseDTO.of(
                postRepository.findByHashtag(trimmed, pageable).map(postMapper::toResponse));
        PageResponseDTO<ActivityResponseDTO> activities = PageResponseDTO.of(
                activityRepository.searchByQuery(trimmed, java.time.LocalDateTime.now(), pageable)
                        .map(activityMapper::toResponse));
        PageResponseDTO<CommunityResponseDTO> communities = PageResponseDTO.of(
                communityRepository.searchCommunities(trimmed, pageable).map(communityMapper::toResponse));
        PageResponseDTO<MarketplaceItemResponseDTO> marketplace = PageResponseDTO.of(
                marketplaceRepository.searchListings(trimmed, pageable).map(marketplaceMapper::toResponse));

        SearchResultDTO result = SearchResultDTO.builder()
                .users(users).posts(posts).activities(activities)
                .communities(communities).marketplaceItems(marketplace).build();
        historyWriter.record(currentUserId, trimmed, "ALL", 0);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<UserSummaryDTO> searchUsers(String query, int page, int size) {
        return PageResponseDTO.of(userRepository.searchUsers(query.trim(), PageRequest.of(page, size)).map(userMapper::toSummary));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PostResponseDTO> searchPosts(String query, Long currentUserId, int page, int size) {
        return PageResponseDTO.of(postRepository.findByHashtag(query.trim(), PageRequest.of(page, size)).map(postMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ActivityResponseDTO> searchActivities(String query, Long currentUserId, int page, int size) {
        return PageResponseDTO.of(activityRepository.searchByQuery(query.trim(), java.time.LocalDateTime.now(), PageRequest.of(page, size)).map(activityMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<CommunityResponseDTO> searchCommunities(String query, Long currentUserId, int page, int size) {
        return PageResponseDTO.of(communityRepository.searchCommunities(query.trim(), PageRequest.of(page, size)).map(communityMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<MarketplaceItemResponseDTO> searchMarketplace(String query, Long currentUserId, int page, int size) {
        return PageResponseDTO.of(marketplaceRepository.searchListings(query.trim(), PageRequest.of(page, size)).map(marketplaceMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getSearchSuggestions(String partialQuery, Long currentUserId) {
        if (partialQuery == null || partialQuery.isBlank()) return List.of();
        List<String> recent = searchHistoryRepository.findRecentSearches(currentUserId, PageRequest.of(0, 5))
                .stream().map(SearchHistory::getKeyword)
                .filter(k -> k.toLowerCase().startsWith(partialQuery.toLowerCase()))
                .limit(3).collect(Collectors.toList());
        List<String> trending = getTrendingKeywords().stream()
                .filter(k -> k.toLowerCase().startsWith(partialQuery.toLowerCase()))
                .filter(k -> !recent.contains(k)).limit(5 - recent.size()).collect(Collectors.toList());
        recent.addAll(trending);
        return recent;
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getTrendingKeywords() {
        return searchHistoryRepository.findTrendingKeywords()
                .stream().map(row -> (String) row[0]).collect(Collectors.toList());
    }

    @Override
    public void recordSearch(Long userId, String keyword, String searchType, int resultCount) {
        historyWriter.record(userId, keyword, searchType, resultCount);
    }

    @Override
    @Transactional
    public void clearSearchHistory(Long currentUserId) {
        searchHistoryRepository.clearHistoryForUser(currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<String> getRecentSearches(Long currentUserId, int page, int size) {
        return PageResponseDTO.of(searchHistoryRepository.findRecentSearches(currentUserId, PageRequest.of(page, size))
                .map(SearchHistory::getKeyword));
    }
}
