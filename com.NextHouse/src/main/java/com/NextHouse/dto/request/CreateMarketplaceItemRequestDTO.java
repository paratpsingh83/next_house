package com.NextHouse.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMarketplaceItemRequestDTO {

    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

    @Size(max = 5000)
    private String description;

    @NotBlank(message = "Category is required")
    private String category;

    @DecimalMin("0.00")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal price;

    private String conditionType;
    @Builder.Default
    private Boolean negotiable = false;

    private Long communityId;
    private Long neighborhoodId;

    @NotNull
    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private Double latitude;

    @NotNull
    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private Double longitude;

    private String address;
    private java.util.List<Long> mediaIds;
}
