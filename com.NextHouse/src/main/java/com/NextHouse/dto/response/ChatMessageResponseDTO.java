package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatMessageResponseDTO {
    private Long id;
    private String messageType;
    private String message;
    private String mediaUrl;
    private Boolean isDeleted;
    private LocalDateTime editedAt;

    private UserSummaryDTO sender;

    // Reply context
    private Long replyToMessageId;
    private String replyToPreview; // truncated original message text

    private LocalDateTime createdAt;
}
