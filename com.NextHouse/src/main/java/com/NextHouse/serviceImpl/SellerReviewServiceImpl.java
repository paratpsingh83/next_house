package com.NextHouse.serviceImpl;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateReviewRequestDTO;
import com.NextHouse.dto.response.SellerRatingSummaryDTO;
import com.NextHouse.dto.response.SellerReviewResponseDTO;
import com.NextHouse.dto.response.UserSummaryDTO;
import com.NextHouse.entity.MarketplaceItem;
import com.NextHouse.entity.SellerReview;
import com.NextHouse.entity.User;
import com.NextHouse.exception.ForbiddenException;
import com.NextHouse.exception.NotFoundException;
import com.NextHouse.repository.MarketplaceItemRepository;
import com.NextHouse.repository.SellerReviewRepository;
import com.NextHouse.repository.UserRepository;
import com.NextHouse.service.SellerReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SellerReviewServiceImpl implements SellerReviewService {

    private final SellerReviewRepository  reviewRepository;
    private final MarketplaceItemRepository itemRepository;
    private final UserRepository          userRepository;

    @Override
    @Transactional
    public SellerReviewResponseDTO createReview(Long itemId, CreateReviewRequestDTO dto, Long reviewerId) {
        MarketplaceItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("Listing not found"));

        if (item.getSeller().getId().equals(reviewerId)) {
            throw new ForbiddenException("You cannot review your own listing");
        }
        if (reviewRepository.existsByItemIdAndReviewerIdAndIsDeletedFalse(itemId, reviewerId)) {
            throw new ForbiddenException("You have already reviewed this listing");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        SellerReview review = SellerReview.builder()
                .item(item)
                .seller(item.getSeller())
                .reviewer(reviewer)
                .rating(dto.getRating())
                .comment(dto.getComment())
                .build();

        return toDTO(reviewRepository.save(review));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<SellerReviewResponseDTO> getReviewsForSeller(Long sellerId, int page, int size) {
        Page<SellerReview> result = reviewRepository.findBySellerIdAndIsDeletedFalse(
                sellerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return PageResponseDTO.of(result.map(this::toDTO));
    }

    @Override
    @Transactional(readOnly = true)
    public SellerRatingSummaryDTO getRatingSummary(Long sellerId, Long currentUserId) {
        Double avg   = reviewRepository.findAverageRatingBySellerId(sellerId);
        long   count = reviewRepository.countBySellerId(sellerId);

        boolean reviewedByMe = currentUserId != null
                && reviewRepository.existsBySellerIdAndReviewerIdAndIsDeletedFalse(sellerId, currentUserId);

        return SellerRatingSummaryDTO.builder()
                .averageRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0)
                .totalReviews(count)
                .reviewedByMe(reviewedByMe)
                .build();
    }

    @Override
    @Transactional
    public void deleteReview(Long reviewId, Long currentUserId) {
        SellerReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found"));
        if (!review.getReviewer().getId().equals(currentUserId)) {
            throw new ForbiddenException("Not your review");
        }
        review.setIsDeleted(true);
        reviewRepository.save(review);
    }

    private SellerReviewResponseDTO toDTO(SellerReview r) {
        User reviewer = r.getReviewer();
        return SellerReviewResponseDTO.builder()
                .id(r.getId())
                .itemId(r.getItem().getId())
                .itemTitle(r.getItem().getTitle())
                .reviewer(UserSummaryDTO.builder()
                        .id(reviewer.getId())
                        .name(reviewer.getName())
                        .username(reviewer.getUsername())
                        .profileImage(reviewer.getProfileImage())
                        .build())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
