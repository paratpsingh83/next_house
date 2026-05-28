package com.NextHouse.mapper;

import com.NextHouse.dto.request.CreateMarketplaceItemRequestDTO;
import com.NextHouse.dto.response.MarketplaceItemResponseDTO;
import com.NextHouse.entity.MarketplaceItem;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class, CommunityMapper.class, NeighborhoodMapper.class, MediaFileMapper.class},
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface MarketplaceMapper {

    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "status",       constant = "ACTIVE")
    @Mapping(target = "available",    constant = "true")
    @Mapping(target = "featured",     constant = "false")
    @Mapping(target = "seller",       ignore = true)
    @Mapping(target = "community",    ignore = true)
    @Mapping(target = "neighborhood", ignore = true)
    @Mapping(target = "location",     ignore = true)
    @Mapping(target = "thumbnailUrl", ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "isDeleted",    ignore = true)
    @Mapping(target = "active",       ignore = true)
    MarketplaceItem toEntity(CreateMarketplaceItemRequestDTO dto);

    @Mapping(target = "distanceMeters", ignore = true)
    @Mapping(target = "media",          ignore = true)
    MarketplaceItemResponseDTO toResponse(MarketplaceItem item);
}
