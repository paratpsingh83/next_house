package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateReviewRequestDTO;
import com.NextHouse.dto.response.SellerRatingSummaryDTO;
import com.NextHouse.dto.response.SellerReviewResponseDTO;

public interface SellerReviewService {

    SellerReviewResponseDTO createReview(Long itemId, CreateReviewRequestDTO dto, Long reviewerId);

    PageResponseDTO<SellerReviewResponseDTO> getReviewsForSeller(Long sellerId, int page, int size);

    SellerRatingSummaryDTO getRatingSummary(Long sellerId, Long currentUserId);

    void deleteReview(Long reviewId, Long currentUserId);
}
