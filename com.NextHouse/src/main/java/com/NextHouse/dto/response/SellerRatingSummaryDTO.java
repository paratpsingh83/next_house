package com.NextHouse.dto.response;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SellerRatingSummaryDTO {
    private double  averageRating;
    private long    totalReviews;
    private boolean reviewedByMe;
}
