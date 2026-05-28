package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatRoomResponseDTO {
    private Long id;
    private String roomType;
    private String title;
    private String avatarUrl;
    private String lastMessagePreview;
    private LocalDateTime lastMessageAt;

    private Long unreadCount; // computed per requesting user
    private String myRole;      // ADMIN | MEMBER

    private List<UserSummaryDTO> members; // populated in room detail view
    private Integer memberCount;

    private LocalDateTime createdAt;
}
