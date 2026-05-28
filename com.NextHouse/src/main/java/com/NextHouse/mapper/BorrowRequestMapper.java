package com.NextHouse.mapper;

import com.NextHouse.dto.request.CreateBorrowRequestDTO;
import com.NextHouse.dto.response.BorrowRequestResponseDTO;
import com.NextHouse.entity.BorrowRequest;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class, NeighborhoodMapper.class},
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface BorrowRequestMapper {

    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "status",       ignore = true)
    @Mapping(target = "requester",    ignore = true)
    @Mapping(target = "respondedBy",  ignore = true)
    @Mapping(target = "community",    ignore = true)
    @Mapping(target = "neighborhood", ignore = true)
    @Mapping(target = "location",     ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "isDeleted",    ignore = true)
    @Mapping(target = "active",       ignore = true)
    BorrowRequest toEntity(CreateBorrowRequestDTO dto);

    BorrowRequestResponseDTO toResponse(BorrowRequest request);
}
