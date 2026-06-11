package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.*;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.MarketplaceMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.MarketplaceService;
import com.NextHouse.service.MediaService;
import com.NextHouse.util.geo.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * MarketplaceServiceImpl
 *
 * View count strategy:
 *   Views are tracked in Redis (INCR marketplace:views:{itemId}).
 *   A nightly job persists the Redis count to the analytics table.
 *   The MarketplaceItem entity does NOT have a views column (removed in audit).
 *
 * Media:
 *   Client uploads images first via /api/v1/media/upload → gets mediaIds back.
 *   CreateMarketplaceItemRequestDTO carries those mediaIds.
 *   After item is saved, MediaService.attachMediaToEntity() links them.
 *   thumbnailUrl is set to the URL of the first attached image.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MarketplaceServiceImpl implements MarketplaceService {

    private final MarketplaceItemRepository itemRepository;
    private final UserRepository            userRepository;
    private final CommunityRepository       communityRepository;
    private final NeighborhoodRepository    neighborhoodRepository;
    private final MediaFileRepository       mediaFileRepository;

    private final MarketplaceMapper marketplaceMapper;
    private final MediaService      mediaService;
    private final GeoUtils          geoUtils;

    @Override
    @Transactional
    public MarketplaceItemResponseDTO createItem(Long currentUserId, CreateMarketplaceItemRequestDTO dto) {
        User seller = findUserOrThrow(currentUserId);

        MarketplaceItem item = marketplaceMapper.toEntity(dto);
        item.setSeller(seller);
        item.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));
        item.setStatus("ACTIVE");
        item.setAvailable(true);
        item.setFeatured(false);

        if (dto.getCommunityId() != null) {
            item.setCommunity(communityRepository.findById(dto.getCommunityId())
                    .orElseThrow(() -> new NotFoundException("Community not found")));
        }
        if (dto.getNeighborhoodId() != null) {
            item.setNeighborhood(neighborhoodRepository.findById(dto.getNeighborhoodId())
                    .orElseThrow(() -> new NotFoundException("Neighborhood not found")));
        }

        MarketplaceItem saved = itemRepository.save(item);

        // Attach pre-uploaded media and set thumbnail
        if (dto.getMediaIds() != null && !dto.getMediaIds().isEmpty()) {
            mediaService.attachMediaToEntity(dto.getMediaIds(), "MARKETPLACE", saved.getId());
            // Set thumbnailUrl from first image
            mediaFileRepository
                .findByEntityTypeAndEntityIdAndIsDeletedFalse("MARKETPLACE", saved.getId())
                .stream().findFirst()
                .ifPresent(mf -> {
                    saved.setThumbnailUrl(mf.getThumbnailUrl() != null ? mf.getThumbnailUrl() : mf.getUrl());
                    itemRepository.save(saved);
                });
        }

        log.info("[Marketplace] Item created: itemId={} by userId={}", saved.getId(), currentUserId);
        return enrichItemResponse(marketplaceMapper.toResponse(saved));
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceItemResponseDTO getItem(Long itemId, Long currentUserId) {
        MarketplaceItem item = findItemOrThrow(itemId);
        return enrichItemResponse(marketplaceMapper.toResponse(item));
    }

    @Override
    @Transactional
    public MarketplaceItemResponseDTO updateItem(Long itemId, Long currentUserId, CreateMarketplaceItemRequestDTO dto) {
        MarketplaceItem item = findItemOrThrow(itemId);
        assertOwner(item.getSeller().getId(), currentUserId);

        item.setTitle(dto.getTitle());
        item.setDescription(dto.getDescription());
        item.setCategory(dto.getCategory());
        item.setPrice(dto.getPrice());
        item.setConditionType(dto.getConditionType());
        item.setNegotiable(dto.getNegotiable());
        item.setLocation(geoUtils.buildPoint(dto.getLatitude(), dto.getLongitude()));
        item.setAddress(dto.getAddress());

        MarketplaceItem saved = itemRepository.save(item);

        if (dto.getMediaIds() != null && !dto.getMediaIds().isEmpty()) {
            mediaService.attachMediaToEntity(dto.getMediaIds(), "MARKETPLACE", saved.getId());
            if (saved.getThumbnailUrl() == null) {
                mediaFileRepository.findByEntityTypeAndEntityIdAndIsDeletedFalse("MARKETPLACE", saved.getId())
                        .stream().findFirst()
                        .ifPresent(mf -> { saved.setThumbnailUrl(mf.getUrl()); itemRepository.save(saved); });
            }
        }

        return enrichItemResponse(marketplaceMapper.toResponse(saved));
    }

    @Override
    @Transactional
    public void deleteItem(Long itemId, Long currentUserId) {
        MarketplaceItem item = findItemOrThrow(itemId);
        assertOwner(item.getSeller().getId(), currentUserId);
        item.setIsDeleted(true);
        item.setStatus("REMOVED");
        itemRepository.save(item);
        mediaFileRepository.softDeleteByEntity("MARKETPLACE", itemId);
    }

    @Override
    @Transactional
    public void markAsSold(Long itemId, Long currentUserId) {
        MarketplaceItem item = findItemOrThrow(itemId);
        assertOwner(item.getSeller().getId(), currentUserId);
        item.setStatus("SOLD");
        item.setAvailable(false);
        itemRepository.save(item);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<MarketplaceItemResponseDTO> getNearbyListings(
            Long currentUserId, NearbySearchRequestDTO geoDto,
            String category, BigDecimal minPrice, BigDecimal maxPrice,
            String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        String q = (query != null && !query.isBlank()) ? query.trim() : null;
        Page<MarketplaceItem> items = itemRepository.findNearbyListings(
            geoDto.getLatitude(), geoDto.getLongitude(), geoDto.getRadiusMeters(),
            category, minPrice, maxPrice, q, pageable
        );
        return PageResponseDTO.of(items.map(item -> enrichItemResponse(marketplaceMapper.toResponse(item))));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<MarketplaceItemResponseDTO> getMyListings(Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            itemRepository.findBySellerIdAndIsDeletedFalse(currentUserId, pageable)
                    .map(item -> enrichItemResponse(marketplaceMapper.toResponse(item)))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<MarketplaceItemResponseDTO> searchListings(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return PageResponseDTO.of(
            itemRepository.searchListings(query.trim(), pageable).map(item -> enrichItemResponse(marketplaceMapper.toResponse(item)))
        );
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private MarketplaceItem findItemOrThrow(Long itemId) {
        return itemRepository.findById(itemId)
                .filter(i -> !i.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Marketplace item not found: " + itemId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private void assertOwner(Long ownerId, Long currentUserId) {
        if (!ownerId.equals(currentUserId)) {
            throw new ForbiddenException("You can only modify your own listings");
        }
    }

    /** Attaches media list to the response DTO. */
    private MarketplaceItemResponseDTO enrichItemResponse(MarketplaceItemResponseDTO dto) {
        if (dto == null) return null;
        List<MediaFileResponseDTO> media = mediaFileRepository
            .findByEntityTypeAndEntityIdAndIsDeletedFalse("MARKETPLACE", dto.getId())
            .stream()
            .map(mf -> MediaFileResponseDTO.builder()
                    .id(mf.getId())
                    .url(mf.getUrl())
                    .thumbnailUrl(mf.getThumbnailUrl())
                    .type(mf.getType())
                    .mimeType(mf.getMimeType())
                    .width(mf.getWidth())
                    .height(mf.getHeight())
                    .size(mf.getSize())
                    .build())
            .collect(Collectors.toList());
        return MarketplaceItemResponseDTO.builder()
                .id(dto.getId())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .price(dto.getPrice())
                .conditionType(dto.getConditionType())
                .negotiable(dto.getNegotiable())
                .available(dto.getAvailable())
                .featured(dto.getFeatured())
                .status(dto.getStatus())
                .thumbnailUrl(dto.getThumbnailUrl())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .address(dto.getAddress())
                .seller(dto.getSeller())
                .community(dto.getCommunity())
                .neighborhood(dto.getNeighborhood())
                .media(media)
                .createdAt(dto.getCreatedAt())
                .build();
    }
}
