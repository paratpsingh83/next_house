package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;

public interface MarketplaceService {
    MarketplaceItemResponseDTO createItem(Long currentUserId, CreateMarketplaceItemRequestDTO dto);
    MarketplaceItemResponseDTO getItem(Long itemId, Long currentUserId);
    MarketplaceItemResponseDTO updateItem(Long itemId, Long currentUserId, CreateMarketplaceItemRequestDTO dto);
    void deleteItem(Long itemId, Long currentUserId);
    void markAsSold(Long itemId, Long currentUserId);
    PageResponseDTO<MarketplaceItemResponseDTO> getNearbyListings(Long currentUserId, NearbySearchRequestDTO geoDto, String category, java.math.BigDecimal minPrice, java.math.BigDecimal maxPrice, String query, int page, int size);
    PageResponseDTO<MarketplaceItemResponseDTO> getMyListings(Long currentUserId, int page, int size);
    PageResponseDTO<MarketplaceItemResponseDTO> searchListings(String query, int page, int size);
}
