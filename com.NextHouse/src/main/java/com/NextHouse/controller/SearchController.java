package com.NextHouse.controller;

import com.NextHouse.dto.common.ApiResponseDTO;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.response.SearchResultDTO;
import com.NextHouse.security.CurrentUser;
import com.NextHouse.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Global search, autocomplete, trending keywords, and search history")
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
        summary = "Global multi-entity search",
        description = """
            Searches across users, posts, activities, communities, and marketplace listings simultaneously.
            Returns typed result buckets in a single response. Min 2 characters.
            """
    )
    public ResponseEntity<ApiResponseDTO<SearchResultDTO>> globalSearch(
            @RequestParam String query,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(searchService.globalSearch(query, currentUserId, page, size)));
    }

    @GetMapping("/suggest")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Autocomplete suggestions", description = "Returns up to 5 keyword suggestions based on recent and trending searches.")
    public ResponseEntity<ApiResponseDTO<List<String>>> getSuggestions(
            @RequestParam String q,
            @CurrentUser Long currentUserId) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(searchService.getSearchSuggestions(q, currentUserId)));
    }

    @GetMapping("/trending")
    @Operation(summary = "Trending search keywords", description = "Top 20 search keywords in the last 24 hours. Public endpoint.")
    public ResponseEntity<ApiResponseDTO<List<String>>> getTrendingKeywords() {
        return ResponseEntity.ok(ApiResponseDTO.success(searchService.getTrendingKeywords()));
    }

    @GetMapping("/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get search history", description = "The current user's recent search queries.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<String>>> getSearchHistory(
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(searchService.getRecentSearches(currentUserId, page, size)));
    }

    @DeleteMapping("/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Clear search history")
    public ResponseEntity<ApiResponseDTO<Void>> clearSearchHistory(@CurrentUser Long currentUserId) {
        searchService.clearSearchHistory(currentUserId);
        return ResponseEntity.ok(ApiResponseDTO.success("Search history cleared"));
    }

    // ─── Type-specific search endpoints ──────────────────────────────────────

    @GetMapping("/users")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search users only", description = "Targeted user search by name or username.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<com.NextHouse.dto.response.UserSummaryDTO>>> searchUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(searchService.searchUsers(query, page, size)));
    }

    @GetMapping("/posts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search posts only", description = "Search posts by hashtag or content keywords.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<com.NextHouse.dto.response.PostResponseDTO>>> searchPosts(
            @RequestParam String query,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(searchService.searchPosts(query, currentUserId, page, size)));
    }

    @GetMapping("/activities")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search activities only", description = "Search local activities by title or type.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<com.NextHouse.dto.response.ActivityResponseDTO>>> searchActivities(
            @RequestParam String query,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(searchService.searchActivities(query, currentUserId, page, size)));
    }

    @GetMapping("/communities")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search communities only", description = "Search communities by name or description.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<com.NextHouse.dto.response.CommunityResponseDTO>>> searchCommunities(
            @RequestParam String query,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(searchService.searchCommunities(query, currentUserId, page, size)));
    }

    @GetMapping("/marketplace")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search marketplace listings only", description = "Search listings by title or description.")
    public ResponseEntity<ApiResponseDTO<PageResponseDTO<com.NextHouse.dto.response.MarketplaceItemResponseDTO>>> searchMarketplace(
            @RequestParam String query,
            @CurrentUser Long currentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
            ApiResponseDTO.success(searchService.searchMarketplace(query, currentUserId, page, size)));
    }
}
