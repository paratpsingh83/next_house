// ═══════════════════════════════════════════════════════════════
// FILE: src/main/java/com/NextHouse/dto/common/ErrorResponseDTO.java
// ═══════════════════════════════════════════════════════════════
package com.NextHouse.dto.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * FIX: "private final boolean success = false" is INVALID with @Builder.
 *
 * @Builder generates a builder that tries to SET every field.
 * A field declared "final" with an inline initializer cannot be set by the builder:
 *   "Cannot assign a value to final variable 'success'"
 * This causes a compile error.
 *
 * FIX: Use @Builder.Default instead:
 *   @Builder.Default
 *   private boolean success = false;
 *
 * This tells Lombok's @Builder to use false as the default value
 * while still generating a settable builder field.
 *
 * Also added: @NoArgsConstructor + @AllArgsConstructor for Jackson deserialization.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponseDTO {

    // FIX: was "private final boolean success = false" — invalid with @Builder
    @Builder.Default
    private boolean success = false;

    private String message;
    private String errorCode;
    private String path;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    private Map<String, String> fieldErrors;
}
