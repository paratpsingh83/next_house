package com.NextHouse.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaFileResponseDTO {
    private Long id;
    private String url;
    private String thumbnailUrl;
    private String type;
    private String mimeType;
    private Long size;
    private Integer width;
    private Integer height;
    private String originalFilename;
    private LocalDateTime createdAt;
}
