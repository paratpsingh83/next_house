package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PostCommentResponseDTO {
    private Long id;
    private String comment;
    private Integer likeCount;
    private Boolean edited;
    private Boolean isLiked;

    private UserSummaryDTO commentedBy;

    // Nested replies (populated only for top-level comments, up to first page)
    private List<PostCommentResponseDTO> replies;
    private Integer replyCount;

    private Long parentCommentId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
