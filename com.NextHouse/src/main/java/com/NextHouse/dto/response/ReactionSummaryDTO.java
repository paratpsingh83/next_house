package com.NextHouse.dto.response;

import lombok.*;

/**
 * Reaction count per type for a post.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionSummaryDTO {
    private String reactionType;
    private Long count;
}
