package com.NextHouse.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BorrowRequestResponseDTO {
    private Long id;
    private String title;
    private String description;
    private String requiredDuration;
    private String status;
    private UserSummaryDTO requester;
    private UserSummaryDTO respondedBy;
    private NeighborhoodSummaryDTO neighborhood;
    private LocalDateTime createdAt;
}
