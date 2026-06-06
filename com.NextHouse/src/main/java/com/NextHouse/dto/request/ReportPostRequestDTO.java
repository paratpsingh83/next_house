package com.NextHouse.dto.request;

import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ReportPostRequestDTO {
    private String reason;
    private String description;
}
