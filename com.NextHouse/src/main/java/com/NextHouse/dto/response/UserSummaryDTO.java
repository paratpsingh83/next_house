package com.NextHouse.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserSummaryDTO {
    private Long id;
    private String name;
    private String username;
    private String profileImage;
    private Integer trustScore;
    private Boolean online;
    private Boolean addressVerified;
}
