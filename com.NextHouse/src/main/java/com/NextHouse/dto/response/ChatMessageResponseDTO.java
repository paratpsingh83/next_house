package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatMessageResponseDTO {
    private Long id;
    private String messageType;
    private String message;
    private String mediaUrl;
    private Boolean isDeleted;
    private Boolean isUnsent;
    private LocalDateTime editedAt;

    private UserSummaryDTO sender;

    // Reply context
    private Long replyToMessageId;
    private String replyToPreview;

    private List<MessageReactionSummaryDTO> reactions;

    private LocalDateTime createdAt;
}
