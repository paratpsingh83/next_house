package com.NextHouse.dto.response;

import com.NextHouse.dto.common.PageResponseDTO;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

/**
 * Multi-entity search result — contains typed buckets so the client
 * can render mixed results in a unified search page.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SearchResultDTO {
    private PageResponseDTO<UserSummaryDTO> users;
    private PageResponseDTO<PostResponseDTO> posts;
    private PageResponseDTO<CommunityResponseDTO> communities;
    private PageResponseDTO<MarketplaceItemResponseDTO> marketplaceItems;
    private PageResponseDTO<ActivityResponseDTO> activities;
}
