package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.*;

import java.util.List;

public interface SearchService {

    /** Multi-entity global search — returns typed buckets in one response. */
    SearchResultDTO globalSearch(String query, Long currentUserId, int page, int size);

    /** Type-specific searches. */
    PageResponseDTO<UserSummaryDTO>             searchUsers(String query, int page, int size);
    PageResponseDTO<PostResponseDTO>            searchPosts(String query, Long currentUserId, int page, int size);
    PageResponseDTO<ActivityResponseDTO>        searchActivities(String query, Long currentUserId, int page, int size);
    PageResponseDTO<CommunityResponseDTO>       searchCommunities(String query, Long currentUserId, int page, int size);
    PageResponseDTO<MarketplaceItemResponseDTO> searchMarketplace(String query, Long currentUserId, int page, int size);

    /** Autocomplete suggestions from user's recent + trending searches. */
    List<String> getSearchSuggestions(String partialQuery, Long currentUserId);

    /** Trending hashtags / keywords in the last 24 h. */
    List<String> getTrendingKeywords();

    /** Persist a search event to search_history. */
    void recordSearch(Long userId, String keyword, String searchType, int resultCount);

    /** Clear a user's search history. */
    void clearSearchHistory(Long currentUserId);

    PageResponseDTO<String> getRecentSearches(Long currentUserId, int page, int size);
}
