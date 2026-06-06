package com.NextHouse.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryResponseDTO {
    private Long            id;
    private UserSummaryDTO  author;
    private String          mediaUrl;
    private String          mediaType;
    private String          textContent;
    private String          backgroundColor;
    private LocalDateTime   expiresAt;
    private LocalDateTime   createdAt;
    private Integer         viewCount;
    private Boolean         viewedByMe;
    private Boolean         isOwn;
}