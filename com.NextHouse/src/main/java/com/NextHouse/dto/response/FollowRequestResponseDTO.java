package com.NextHouse.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowRequestResponseDTO {
    private Long           requestId;
    private UserSummaryDTO requester;
    private LocalDateTime  requestedAt;
}