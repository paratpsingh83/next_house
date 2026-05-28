package com.NextHouse.dto.common;

import lombok.*;
import org.springframework.data.domain.Page;
import java.util.List;

/**
 * FIX: Missing @NoArgsConstructor and @AllArgsConstructor.
 *
 * Jackson requires either:
 *   A) A no-args constructor + @JsonProperty on fields, OR
 *   B) @JsonCreator with matching constructor
 * Without these, Jackson cannot deserialize PageResponseDTO in:
 *   - Unit tests that deserialize JSON responses
 *   - REST clients using RestTemplate / WebClient
 *
 * @Builder alone is not enough — it only generates a builder,
 * not a no-args or all-args constructor that Jackson can use.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponseDTO<T> {

    private List<T> content;
    private int     page;
    private int     size;
    private long    totalElements;
    private int     totalPages;
    private boolean first;
    private boolean last;
    private boolean hasNext;
    private boolean hasPrevious;

    public static <T> PageResponseDTO<T> of(Page<T> page) {
        return PageResponseDTO.<T>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }
}
