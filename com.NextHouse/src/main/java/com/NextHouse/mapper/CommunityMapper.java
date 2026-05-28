package com.NextHouse.mapper;

import com.NextHouse.dto.request.CreateCommunityRequestDTO;
import com.NextHouse.dto.request.UpdateCommunityRequestDTO;
import com.NextHouse.dto.response.CommunitySummaryDTO;
import com.NextHouse.dto.response.CommunityResponseDTO;
import com.NextHouse.entity.Community;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class, NeighborhoodMapper.class},
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface CommunityMapper {

    @Mapping(target = "id",              ignore = true)
    @Mapping(target = "verified",        constant = "false")
    @Mapping(target = "createdBy",       ignore = true)
    @Mapping(target = "neighborhood",    ignore = true)
    @Mapping(target = "parentCommunity", ignore = true)
    @Mapping(target = "location",        ignore = true)
    @Mapping(target = "createdAt",       ignore = true)
    @Mapping(target = "updatedAt",       ignore = true)
    @Mapping(target = "isDeleted",       ignore = true)
    @Mapping(target = "active",          ignore = true)
    Community toEntity(CreateCommunityRequestDTO dto);

    /**
     * Community → full response.
     * memberCount, myRole, isMember, isPending set by service.
     */
    @Mapping(target = "memberCount", ignore = true)
    @Mapping(target = "myRole",      ignore = true)
    @Mapping(target = "isMember",    ignore = true)
    @Mapping(target = "isPending",   ignore = true)
    @Mapping(target = "parentCommunity", source = "parentCommunity")
    CommunityResponseDTO toResponse(Community community);

    /** Community → lightweight summary for embedding. */
    CommunitySummaryDTO toSummary(Community community);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id",          ignore = true)
    @Mapping(target = "createdBy",   ignore = true)
    @Mapping(target = "neighborhood",ignore = true)
    @Mapping(target = "verified",    ignore = true)
    void updateFromRequest(UpdateCommunityRequestDTO dto, @MappingTarget Community community);
}
