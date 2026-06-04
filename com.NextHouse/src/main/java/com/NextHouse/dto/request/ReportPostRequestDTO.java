package com.NextHouse.dto.request;

import lombok.*;

/**
 * FIX: This file was incorrectly placed in com.NextHouse.repository package.
 * Move it to com.NextHouse.dto.request where PostController expects to find it.
 */
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ReportPostRequestDTO {
    private String reason;
    private String description;
}
