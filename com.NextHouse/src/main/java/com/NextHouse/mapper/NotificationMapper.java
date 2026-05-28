package com.NextHouse.mapper;

import com.NextHouse.dto.response.NotificationResponseDTO;
import com.NextHouse.entity.Notification;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class},
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface NotificationMapper {

    /**
     * Notification → response DTO.
     * `read` field in entity maps to `read` in DTO (column is_read).
     */
    @Mapping(target = "read", source = "read")
    NotificationResponseDTO toResponse(Notification notification);
}
