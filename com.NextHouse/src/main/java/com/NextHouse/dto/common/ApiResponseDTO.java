package com.NextHouse.dto.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Universal API response envelope.
 * <p>
 * Every controller returns ApiResponseDTO<T>. This guarantees a consistent
 * payload shape regardless of the endpoint:
 * <p>
 * {
 * "success": true,
 * "message": "Post created successfully",
 * "data": { ... },
 * "timestamp": "2025-05-01T10:00:00"
 * }
 * <p>
 * Error responses use the same shape with success=false and data=null.
 * Detailed error info (field errors, stack trace) lives in GlobalExceptionHandler.
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponseDTO<T> {

    private final boolean success;
    private final String message;
    private final T data;

    @Builder.Default
    private final LocalDateTime timestamp = LocalDateTime.now();

    // ─── Static factory methods ───────────────────────────────────────────────

    public static <T> ApiResponseDTO<T> success(String message, T data) {
        return ApiResponseDTO.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponseDTO<T> success(T data) {
        return success("Success", data);
    }

    public static <T> ApiResponseDTO<T> success(String message) {
        return ApiResponseDTO.<T>builder()
                .success(true)
                .message(message)
                .build();
    }

    public static <T> ApiResponseDTO<T> error(String message) {
        return ApiResponseDTO.<T>builder()
                .success(false)
                .message(message)
                .build();
    }
}
