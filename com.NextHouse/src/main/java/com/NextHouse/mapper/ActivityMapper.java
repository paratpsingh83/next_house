package com.NextHouse.mapper;

import com.NextHouse.dto.request.CreateActivityRequestDTO;
import com.NextHouse.dto.request.UpdateActivityRequestDTO;
import com.NextHouse.dto.response.ActivityMemberResponseDTO;
import com.NextHouse.dto.response.ActivityResponseDTO;
import com.NextHouse.entity.Activity;
import com.NextHouse.entity.ActivityMember;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class, CommunityMapper.class, NeighborhoodMapper.class},
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ActivityMapper {

    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "status",       ignore = true)  // service sets ActivityStatus.PUBLISHED
    @Mapping(target = "hostUser",     ignore = true)
    @Mapping(target = "community",    ignore = true)
    @Mapping(target = "neighborhood", ignore = true)
    @Mapping(target = "location",     ignore = true)
    @Mapping(target = "version",      ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "isDeleted",    ignore = true)
    @Mapping(target = "active",       ignore = true)
    Activity toEntity(CreateActivityRequestDTO dto);

    @Mapping(target = "currentMemberCount", ignore = true)
    @Mapping(target = "distanceMeters",     ignore = true)
    @Mapping(target = "myJoinStatus",       ignore = true)
    @Mapping(target = "isHost",             ignore = true)
    ActivityResponseDTO toResponse(Activity activity);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id",       ignore = true)
    @Mapping(target = "hostUser", ignore = true)
    @Mapping(target = "location", ignore = true)
    @Mapping(target = "version",  ignore = true)
    void updateFromRequest(UpdateActivityRequestDTO dto, @MappingTarget Activity activity);

    @Mapping(target = "joinedAt",  source = "joinedAt")
    @Mapping(target = "user",      source = "user")
    @Mapping(target = "invitedBy", source = "invitedBy")
    ActivityMemberResponseDTO toMemberResponse(ActivityMember member);
}
