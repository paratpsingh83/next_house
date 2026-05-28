package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MarketplaceItemResponseDTO {
    private Long id;
    private String title;
    private String description;
    private String category;
    private BigDecimal price;
    private String conditionType;
    private Boolean negotiable;
    private Boolean available;
    private Boolean featured;
    private String status;
    private String thumbnailUrl;

    private Double distanceMeters;
    private Double latitude;
    private Double longitude;
    private String address;

    private UserSummaryDTO seller;
    private CommunitySummaryDTO community;
    private NeighborhoodSummaryDTO neighborhood;

    private List<MediaFileResponseDTO> media;

    private LocalDateTime createdAt;
}
