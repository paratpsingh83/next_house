package com.NextHouse.dto.response;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MessageReactionSummaryDTO {
    private String  emoji;
    private int     count;
    private boolean reactedByMe;
}
