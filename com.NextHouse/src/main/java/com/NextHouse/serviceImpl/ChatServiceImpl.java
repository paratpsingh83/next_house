package com.NextHouse.serviceImpl;

import com.NextHouse.constant.ChatRoomRole;
import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;
import com.NextHouse.entity.*;
import com.NextHouse.repository.ChatMessageDeletionRepository;
import com.NextHouse.event.DomainEvents;
import com.NextHouse.event.KafkaEventPublisher;
import com.NextHouse.exception.*;
import com.NextHouse.mapper.ChatMapper;
import com.NextHouse.mapper.UserMapper;
import com.NextHouse.repository.*;
import com.NextHouse.service.ChatService;
import com.NextHouse.util.geo.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ChatServiceImpl
 *
 * WebSocket delivery:
 *   This service handles the persistence layer only.
 *   Real-time delivery is handled by the WebSocketChatHandler (STOMP).
 *   Message send flow:
 *     1. Client sends via WebSocket → WebSocketChatHandler receives it.
 *     2. Handler calls ChatService.sendMessage() → persists to DB.
 *     3. Handler broadcasts to all room subscribers via SimpMessagingTemplate.
 *     4. Service publishes MessageSentEvent to Kafka for:
 *        - Push notifications to offline members
 *        - Inbox lastMessagePreview update
 *        - Analytics
 *
 * Unread count:
 *   Computed from ChatMessage.createdAt > ChatRoomMember.lastReadAt.
 *   Heavy polling path → cached in Redis per (userId, roomId) with short TTL.
 *   Redis key: "chat:unread:{userId}:{roomId}" — invalidated on markAsRead().
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatRoomRepository            roomRepository;
    private final ChatRoomMemberRepository      memberRepository;
    private final ChatMessageRepository         messageRepository;
    private final ChatMessageDeletionRepository msgDeletionRepository;
    private final MessageReactionRepository     reactionRepository;
    private final UserRepository                userRepository;
    private final BlockedUserRepository         blockedUserRepository;
    private final UserPresenceRepository        userPresenceRepository;

    private final ChatMapper   chatMapper;
    private final UserMapper   userMapper;
    private final KafkaEventPublisher eventPublisher;

    // ─── Room management ──────────────────────────────────────────────────────

    @Override
    @Transactional
    public ChatRoomResponseDTO getOrCreateDirectRoom(Long currentUserId, Long otherUserId) {
        if (currentUserId.equals(otherUserId)) {
            throw new ConflictException("Cannot create a chat with yourself");
        }
        if (blockedUserRepository.existsByUserIdAndBlockedUserId(otherUserId, currentUserId)) {
            throw new ForbiddenException("Cannot message this user");
        }

        // Return existing room if found
        return roomRepository.findDirectRoom(currentUserId, otherUserId)
                .map(room -> buildRoomResponse(room, currentUserId))
                .orElseGet(() -> {
                    User me    = findUserOrThrow(currentUserId);
                    User other = findUserOrThrow(otherUserId);

                    ChatRoom room = ChatRoom.builder()
                            .roomType("DIRECT")
                            .createdBy(me)
                            .build();
                    ChatRoom saved = roomRepository.save(room);

                    addMemberToRoom(saved, me,    ChatRoomRole.MEMBER);
                    addMemberToRoom(saved, other, ChatRoomRole.MEMBER);

                    log.info("[Chat] Created DIRECT room={} between userId={} and userId={}",
                            saved.getId(), currentUserId, otherUserId);
                    return buildRoomResponse(saved, currentUserId);
                });
    }

    @Override
    @Transactional
    public ChatRoomResponseDTO createGroupRoom(Long currentUserId, CreateChatRoomRequestDTO dto) {
        User creator = findUserOrThrow(currentUserId);

        ChatRoom room = ChatRoom.builder()
                .roomType(dto.getRoomType())
                .title(dto.getTitle())
                .avatarUrl(dto.getAvatarUrl())
                .createdBy(creator)
                .build();
        ChatRoom saved = roomRepository.save(room);

        // Add creator as ADMIN
        addMemberToRoom(saved, creator, ChatRoomRole.ADMIN);

        // Add other members
        for (Long memberId : dto.getMemberIds()) {
            if (memberId.equals(currentUserId)) continue;
            User member = findUserOrThrow(memberId);
            addMemberToRoom(saved, member, ChatRoomRole.MEMBER);
        }

        log.info("[Chat] Created GROUP room={} by userId={} with {} members",
                saved.getId(), currentUserId, dto.getMemberIds().size());
        return buildRoomResponse(saved, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public ChatRoomResponseDTO getRoomDetails(Long roomId, Long currentUserId) {
        ChatRoom room = findRoomOrThrow(roomId);
        assertMember(roomId, currentUserId);
        return buildRoomResponse(room, currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ChatRoomResponseDTO> getInbox(Long currentUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatRoom> rooms = roomRepository.findUserInbox(currentUserId, pageable);
        return PageResponseDTO.of(rooms.map(r -> buildRoomResponse(r, currentUserId)));
    }

    // ─── Messaging ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ChatMessageResponseDTO sendMessage(Long roomId, Long currentUserId, SendMessageRequestDTO dto) {
        ChatRoom room = findRoomOrThrow(roomId);
        assertMember(roomId, currentUserId);

        User sender = findUserOrThrow(currentUserId);

        ChatMessage message = chatMapper.toMessageEntity(dto);
        message.setRoom(room);
        message.setSender(sender);

        // Resolve reply-to message
        if (dto.getReplyToMessageId() != null) {
            ChatMessage replyTo = messageRepository.findById(dto.getReplyToMessageId())
                    .orElseThrow(() -> new NotFoundException("Reply-to message not found"));
            message.setReplyToMessage(replyTo);
        }

        ChatMessage saved = messageRepository.save(message);

        // Update room's lastMessage fields for inbox display
        String preview = dto.getMessage() != null
                ? dto.getMessage().substring(0, Math.min(dto.getMessage().length(), 150))
                : "[" + dto.getMessageType() + "]";

        room.setLastMessageAt(saved.getCreatedAt());
        room.setLastMessagePreview(preview);
        roomRepository.save(room);

        // Async: push to offline members + analytics
        eventPublisher.publishMessageSent(
            DomainEvents.MessageSentEvent.builder()
                .eventId(KafkaEventPublisher.newEventId())
                .occurredAt(LocalDateTime.now())
                .actorId(currentUserId)
                .roomId(roomId)
                .messageId(saved.getId())
                .senderId(currentUserId)
                .messageType(dto.getMessageType())
                .preview(preview)
                .build()
        );

        ChatMessageResponseDTO response = chatMapper.toMessageResponse(saved);

        // Populate reply-to preview for threaded display
        if (saved.getReplyToMessage() != null && saved.getReplyToMessage().getMessage() != null) {
            String replyPreview = saved.getReplyToMessage().getMessage()
                    .substring(0, Math.min(saved.getReplyToMessage().getMessage().length(), 80));
            return ChatMessageResponseDTO.builder()
                    .id(response.getId())
                    .messageType(response.getMessageType())
                    .message(response.getMessage())
                    .mediaUrl(response.getMediaUrl())
                    .isDeleted(response.getIsDeleted())
                    .editedAt(response.getEditedAt())
                    .sender(response.getSender())
                    .replyToMessageId(response.getReplyToMessageId())
                    .replyToPreview(replyPreview)
                    .createdAt(response.getCreatedAt())
                    .build();
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<ChatMessageResponseDTO> getHistory(Long roomId, Long currentUserId, int page, int size) {
        assertMember(roomId, currentUserId);
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> msgPage = messageRepository.findRoomHistory(roomId, currentUserId, pageable);

        List<Long> ids = msgPage.getContent().stream().map(ChatMessage::getId).collect(Collectors.toList());
        Map<Long, List<MessageReaction>> rxMap = ids.isEmpty() ? Map.of()
            : reactionRepository.findByMessageIdIn(ids).stream()
                .collect(Collectors.groupingBy(r -> r.getMessage().getId()));

        return PageResponseDTO.of(msgPage.map(msg -> {
            ChatMessageResponseDTO dto = chatMapper.toMessageResponse(msg);
            return dto.toBuilder().reactions(buildReactionSummaries(rxMap.getOrDefault(msg.getId(), List.of()), currentUserId)).build();
        }));
    }

    @Override
    @Transactional
    public ChatMessageResponseDTO reactToMessage(Long roomId, Long messageId, String emoji, Long currentUserId) {
        assertMember(roomId, currentUserId);
        ChatMessage msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));

        Optional<MessageReaction> existing = reactionRepository.findByMessageIdAndUserId(messageId, currentUserId);
        if (existing.isPresent()) {
            if (existing.get().getEmoji().equals(emoji)) {
                reactionRepository.delete(existing.get());
            } else {
                existing.get().setEmoji(emoji);
                reactionRepository.save(existing.get());
            }
        } else {
            User user = findUserOrThrow(currentUserId);
            reactionRepository.save(MessageReaction.builder().message(msg).user(user).emoji(emoji).build());
        }

        List<MessageReaction> reactions = reactionRepository.findByMessageId(messageId);
        return chatMapper.toMessageResponse(msg).toBuilder()
                .reactions(buildReactionSummaries(reactions, currentUserId))
                .build();
    }

    private List<MessageReactionSummaryDTO> buildReactionSummaries(List<MessageReaction> reactions, Long viewerId) {
        Map<String, List<MessageReaction>> byEmoji = reactions.stream()
                .collect(Collectors.groupingBy(MessageReaction::getEmoji));
        return byEmoji.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> MessageReactionSummaryDTO.builder()
                        .emoji(e.getKey())
                        .count(e.getValue().size())
                        .reactedByMe(e.getValue().stream().anyMatch(r -> r.getUser().getId().equals(viewerId)))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteMessage(Long messageId, Long currentUserId) {
        ChatMessage msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found: " + messageId));
        // Idempotent — skip if already deleted for this user
        if (!msgDeletionRepository.existsByMessageIdAndUserId(messageId, currentUserId)) {
            User user = findUserOrThrow(currentUserId);
            msgDeletionRepository.save(ChatMessageDeletion.builder().message(msg).user(user).build());
        }
    }

    @Override
    @Transactional
    public ChatMessageResponseDTO unsendMessage(Long roomId, Long messageId, Long currentUserId) {
        assertMember(roomId, currentUserId);
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(15);
        int rows = messageRepository.unsendMessage(messageId, currentUserId, cutoff);
        if (rows == 0) {
            throw new ForbiddenException("Cannot unsend: not your message or sent more than 1 minute ago");
        }
        ChatMessage msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));
        return chatMapper.toMessageResponse(msg);
    }

    @Override
    @Transactional
    public void markRoomAsRead(Long roomId, Long currentUserId) {
        assertMember(roomId, currentUserId);
        memberRepository.markAsRead(roomId, currentUserId, LocalDateTime.now());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long roomId, Long currentUserId) {
        ChatRoomMember membership = memberRepository.findByRoomIdAndUserId(roomId, currentUserId)
                .orElseThrow(() -> new NotFoundException("Not a member of this room"));
        return memberRepository.countUnreadMessages(roomId, currentUserId, membership.getLastReadAt());
    }

    @Override
    @Transactional(readOnly = true)
    public long getTotalUnreadCount(Long currentUserId) {
        Long count = memberRepository.countTotalUnread(currentUserId);
        return count != null ? count : 0L;
    }

    @Override
    @Transactional
    public void addMember(Long roomId, Long userId, Long currentUserId) {
        assertAdmin(roomId, currentUserId);
        ChatRoom room = findRoomOrThrow(roomId);
        if (memberRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new ConflictException("User already in this room");
        }
        User user = findUserOrThrow(userId);
        addMemberToRoom(room, user, ChatRoomRole.MEMBER);
    }

    @Override
    @Transactional
    public void removeMember(Long roomId, Long userId, Long currentUserId) {
        assertAdmin(roomId, currentUserId);
        ChatRoomMember member = memberRepository.findByRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new NotFoundException("Member not found"));
        member.setIsDeleted(true);
        memberRepository.save(member);
    }

    @Override
    @Transactional
    public void muteRoom(Long roomId, Long currentUserId, boolean muted) {
        ChatRoomMember member = memberRepository.findByRoomIdAndUserId(roomId, currentUserId)
                .orElseThrow(() -> new NotFoundException("Not a member of this room"));
        member.setMuted(muted);
        memberRepository.save(member);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private ChatRoom findRoomOrThrow(Long roomId) {
        return roomRepository.findById(roomId)
                .filter(r -> !r.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("Chat room not found: " + roomId));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }

    private void assertMember(Long roomId, Long userId) {
        if (!memberRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new ForbiddenException("You are not a member of this chat room");
        }
    }

    private void assertAdmin(Long roomId, Long userId) {
        ChatRoomMember member = memberRepository.findByRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this chat room"));
        if (member.getRole() != ChatRoomRole.ADMIN) {
            throw new ForbiddenException("Only admins can perform this action");
        }
    }

    private void addMemberToRoom(ChatRoom room, User user, ChatRoomRole role) {
        ChatRoomMember member = ChatRoomMember.builder()
                .room(room)
                .user(user)
                .role(role)
                .muted(false)
                .joinedAt(LocalDateTime.now())
                .build();
        memberRepository.save(member);
    }

    /**
     * Builds a ChatRoomResponseDTO enriched with:
     *  - unreadCount for requesting user
     *  - myRole in the room
     *  - member list (summary, populated for GROUP rooms)
     */
    private ChatRoomResponseDTO buildRoomResponse(ChatRoom room, Long currentUserId) {
        ChatRoomResponseDTO base = chatMapper.toRoomResponse(room);

        long unread = 0;
        String myRole = null;
        List<UserSummaryDTO> members = null;
        int memberCount = 0;

        if (currentUserId != null) {
            var myMembership = memberRepository.findByRoomIdAndUserId(room.getId(), currentUserId);
            if (myMembership.isPresent()) {
                myRole = myMembership.get().getRole().name();
                unread = memberRepository.countUnreadMessages(
                    room.getId(), currentUserId, myMembership.get().getLastReadAt()
                );
            }
        }

        String resolvedTitle     = base.getTitle();
        String resolvedAvatarUrl = base.getAvatarUrl();

        List<ChatRoomMember> roomMembers = memberRepository.findByRoomIdAndIsDeletedFalse(room.getId());
        memberCount = roomMembers.size();

        // Batch-load presence for all members in one query (was N queries before)
        List<Long> memberUserIds = roomMembers.stream()
                .map(m -> m.getUser().getId())
                .collect(Collectors.toList());
        Map<Long, Boolean> onlineMap = userPresenceRepository.findByUserIdIn(memberUserIds)
                .stream()
                .collect(Collectors.toMap(p -> p.getUser().getId(), p -> Boolean.TRUE.equals(p.getOnline())));

        members = roomMembers.stream()
                .map(m -> {
                    UserSummaryDTO summary = userMapper.toSummary(m.getUser());
                    summary.setOnline(onlineMap.getOrDefault(m.getUser().getId(), false));
                    return summary;
                })
                .collect(Collectors.toList());

        if ("DIRECT".equals(room.getRoomType())) {
            // For DM rooms, derive title and avatar from the other participant
            ChatRoomMember other = roomMembers.stream()
                    .filter(m -> currentUserId != null && !m.getUser().getId().equals(currentUserId))
                    .findFirst().orElse(null);
            if (other != null) {
                resolvedTitle     = other.getUser().getName();
                resolvedAvatarUrl = other.getUser().getProfileImage();
            } else {
                // Edge case: other member removed/deleted — use safe fallback
                if (resolvedTitle == null) resolvedTitle = "Direct Message";
            }
        }

        return ChatRoomResponseDTO.builder()
                .id(base.getId())
                .roomType(base.getRoomType())
                .title(resolvedTitle)
                .avatarUrl(resolvedAvatarUrl)
                .lastMessagePreview(base.getLastMessagePreview())
                .lastMessageAt(base.getLastMessageAt())
                .unreadCount(unread)
                .myRole(myRole)
                .members(members)
                .memberCount(memberCount)
                .createdAt(base.getCreatedAt())
                .build();
    }
}
