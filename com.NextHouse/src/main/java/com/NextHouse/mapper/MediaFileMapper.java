package com.NextHouse.mapper;

import com.NextHouse.dto.response.MediaFileResponseDTO;
import com.NextHouse.entity.MediaFile;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface MediaFileMapper {

    MediaFileResponseDTO toResponse(MediaFile mediaFile);
}
