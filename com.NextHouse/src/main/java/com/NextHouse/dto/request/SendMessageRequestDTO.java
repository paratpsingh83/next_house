package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequestDTO {

    private String messageType = "TEXT"; // TEXT | IMAGE | VIDEO | AUDIO | FILE

    @Size(max = 10000)
    private String message;

    private Long replyToMessageId;
    private String mediaUrl;
    private Long mediaFileId;
}
