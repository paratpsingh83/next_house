package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;

public interface ChatService {

    ChatRoomResponseDTO getOrCreateDirectRoom(Long currentUserId, Long otherUserId);

    ChatRoomResponseDTO createGroupRoom(Long currentUserId, CreateChatRoomRequestDTO dto);

    ChatRoomResponseDTO getRoomDetails(Long roomId, Long currentUserId);

    PageResponseDTO<ChatRoomResponseDTO> getInbox(Long currentUserId, int page, int size);

    ChatMessageResponseDTO sendMessage(Long roomId, Long currentUserId, SendMessageRequestDTO dto);

    PageResponseDTO<ChatMessageResponseDTO> getHistory(Long roomId, Long currentUserId, int page, int size);

    void deleteMessage(Long messageId, Long currentUserId);

    ChatMessageResponseDTO unsendMessage(Long roomId, Long messageId, Long currentUserId);

    void markRoomAsRead(Long roomId, Long currentUserId);

    long getUnreadCount(Long roomId, Long currentUserId);

    long getTotalUnreadCount(Long currentUserId);

    void addMember(Long roomId, Long userId, Long currentUserId);

    void removeMember(Long roomId, Long userId, Long currentUserId);

    void muteRoom(Long roomId, Long currentUserId, boolean muted);

    ChatMessageResponseDTO reactToMessage(Long roomId, Long messageId, String emoji, Long currentUserId);
}
