package com.NextHouse.mapper;

import com.NextHouse.dto.response.NeighborhoodSummaryDTO;
import com.NextHouse.entity.Neighborhood;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface NeighborhoodMapper {

    NeighborhoodSummaryDTO toSummary(Neighborhood neighborhood);
}
