package com.NextHouse.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityMemberResponseDTO {
    private Long id;
    private String joinStatus;
    private String role;
    private LocalDateTime joinedAt;
    private UserSummaryDTO user;
    private UserSummaryDTO invitedBy;
}
