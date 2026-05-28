package com.NextHouse.mapper;

import com.NextHouse.dto.request.CreateCommentRequestDTO;
import com.NextHouse.dto.response.PostCommentResponseDTO;
import com.NextHouse.entity.PostComment;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class},
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface PostCommentMapper {

    @Mapping(target = "id",            ignore = true)
    @Mapping(target = "likeCount",     constant = "0")
    @Mapping(target = "edited",        constant = "false")
    @Mapping(target = "post",          ignore = true)
    @Mapping(target = "commentedBy",   ignore = true)
    @Mapping(target = "parentComment", ignore = true)
    @Mapping(target = "version",       ignore = true)
    @Mapping(target = "createdAt",     ignore = true)
    @Mapping(target = "updatedAt",     ignore = true)
    @Mapping(target = "isDeleted",     ignore = true)
    @Mapping(target = "active",        ignore = true)
    PostComment toEntity(CreateCommentRequestDTO dto);

    @Mapping(target = "isLiked",        ignore = true)
    @Mapping(target = "replies",        ignore = true)
    @Mapping(target = "replyCount",     ignore = true)
    @Mapping(target = "parentCommentId", source = "parentComment.id")
    PostCommentResponseDTO toResponse(PostComment comment);
}
