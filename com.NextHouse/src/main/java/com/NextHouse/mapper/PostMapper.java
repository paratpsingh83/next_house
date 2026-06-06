package com.NextHouse.mapper;

import com.NextHouse.dto.request.CreatePostRequestDTO;
import com.NextHouse.dto.request.UpdatePostRequestDTO;
import com.NextHouse.dto.response.PostResponseDTO;
import com.NextHouse.entity.Post;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class, CommunityMapper.class, NeighborhoodMapper.class, MediaFileMapper.class},
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface PostMapper {

    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "status",       ignore = true)  // service sets PostStatus.PUBLISHED
    @Mapping(target = "likeCount",    constant = "0")
    @Mapping(target = "commentCount", constant = "0")
    @Mapping(target = "shareCount",   constant = "0")
    @Mapping(target = "edited",       constant = "false")
    @Mapping(target = "createdBy",    ignore = true)
    @Mapping(target = "community",    ignore = true)
    @Mapping(target = "neighborhood", ignore = true)
    @Mapping(target = "location",     ignore = true)
    @Mapping(target = "version",      ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "isDeleted",    ignore = true)
    @Mapping(target = "active",       ignore = true)
    @Mapping(target = "hashtagString",ignore = true)
    Post toEntity(CreatePostRequestDTO dto);

    @Mapping(target = "isLiked",       ignore = true)
    @Mapping(target = "isSaved",       ignore = true)
    @Mapping(target = "myReactionType",ignore = true)
    @Mapping(target = "reactions",     ignore = true)
    @Mapping(target = "media",         ignore = true)
    PostResponseDTO toResponse(Post post);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "createdBy",    ignore = true)
    @Mapping(target = "status",       ignore = true)
    @Mapping(target = "likeCount",    ignore = true)
    @Mapping(target = "commentCount", ignore = true)
    @Mapping(target = "shareCount",   ignore = true)
    @Mapping(target = "edited",       constant = "true")
    @Mapping(target = "location",     ignore = true)
    @Mapping(target = "hashtagString",ignore = true)
    void updateFromRequest(UpdatePostRequestDTO dto, @MappingTarget Post post);
}
