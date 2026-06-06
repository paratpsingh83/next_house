package com.NextHouse.mapper;

import com.NextHouse.dto.request.SendMessageRequestDTO;
import com.NextHouse.dto.response.ChatMessageResponseDTO;
import com.NextHouse.dto.response.ChatRoomResponseDTO;
import com.NextHouse.entity.ChatMessage;
import com.NextHouse.entity.ChatRoom;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {UserMapper.class},
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ChatMapper {

    /**
     * ChatRoom → inbox item response.
     * unreadCount and myRole are populated per-user in service.
     */
    @Mapping(target = "unreadCount", ignore = true)
    @Mapping(target = "myRole",      ignore = true)
    @Mapping(target = "members",     ignore = true)
    @Mapping(target = "memberCount", ignore = true)
    ChatRoomResponseDTO toRoomResponse(ChatRoom room);

    /**
     * SendMessageRequestDTO → ChatMessage entity.
     * room, sender set by service.
     */
    @Mapping(target = "id",               ignore = true)
    @Mapping(target = "room",             ignore = true)
    @Mapping(target = "sender",           ignore = true)
    @Mapping(target = "replyToMessage",   ignore = true) // looked up by service from replyToMessageId
    @Mapping(target = "editedAt",         ignore = true)
    @Mapping(target = "createdAt",        ignore = true)
    @Mapping(target = "updatedAt",        ignore = true)
    @Mapping(target = "isDeleted",        ignore = true)
    @Mapping(target = "active",           ignore = true)
    ChatMessage toMessageEntity(SendMessageRequestDTO dto);

    /**
     * ChatMessage → response DTO.
     * replyToPreview (truncated original message) populated by service.
     */
    @Mapping(target = "replyToMessageId", source = "replyToMessage.id")
    @Mapping(target = "replyToPreview",   ignore = true)
    @Mapping(target = "isDeleted",        source = "isDeleted")
    @Mapping(target = "isUnsent",         source = "isUnsent")
    ChatMessageResponseDTO toMessageResponse(ChatMessage message);
}
