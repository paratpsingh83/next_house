package com.NextHouse.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponseDTO {
    private Long id;
    private String title;
    private String message;
    private String notificationType;
    private String referenceType;
    private Long referenceId;
    private Boolean read;
    private String redirectUrl;
    private UserSummaryDTO sender;
    private LocalDateTime createdAt;
}
