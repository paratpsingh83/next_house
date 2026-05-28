package com.NextHouse.mapper;

import com.NextHouse.dto.request.CreateSafetyAlertRequestDTO;
import com.NextHouse.dto.response.SafetyAlertResponseDTO;
import com.NextHouse.entity.SafetyAlert;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class, NeighborhoodMapper.class},
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface SafetyAlertMapper {

    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "verified",     constant = "false")
    @Mapping(target = "resolvedAt",   ignore = true)
    @Mapping(target = "reportedBy",   ignore = true)
    @Mapping(target = "resolvedBy",   ignore = true)
    @Mapping(target = "community",    ignore = true)
    @Mapping(target = "neighborhood", ignore = true)
    @Mapping(target = "location",     ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "isDeleted",    ignore = true)
    @Mapping(target = "active",       ignore = true)
    SafetyAlert toEntity(CreateSafetyAlertRequestDTO dto);

    @Mapping(target = "distanceMeters", ignore = true)
    SafetyAlertResponseDTO toResponse(SafetyAlert alert);
}
