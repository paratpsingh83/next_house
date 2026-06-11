package com.NextHouse.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SellerReviewResponseDTO {
    private Long            id;
    private Long            itemId;
    private String          itemTitle;
    private UserSummaryDTO  reviewer;
    private short           rating;
    private String          comment;
    private LocalDateTime   createdAt;
}
