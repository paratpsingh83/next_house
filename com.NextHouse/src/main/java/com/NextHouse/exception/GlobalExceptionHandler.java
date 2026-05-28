package com.NextHouse.exception;

import com.NextHouse.dto.common.ErrorResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.HashMap;
import java.util.Map;

/**
 * GlobalExceptionHandler
 *
 * Centralises all exception → HTTP response mapping.
 * Every handler returns an ErrorResponseDTO for consistent API contract.
 *
 * Handler priority (most specific first, Spring picks the closest match):
 *   MethodArgumentNotValidException   → 400 with fieldErrors map
 *   NotFoundException                 → 404
 *   ConflictException                 → 409
 *   ForbiddenException                → 403
 *   UnauthorizedException             → 401
 *   BadRequestException               → 400
 *   RateLimitException                → 429
 *   ExternalServiceException          → 503
 *   AccessDeniedException (Security)  → 403
 *   AuthenticationException (Security)→ 401
 *   MaxUploadSizeExceededException    → 413
 *   HttpMessageNotReadableException   → 400
 *   HttpRequestMethodNotSupportedException → 405
 *   Exception (catch-all)             → 500
 *
 * Logging strategy:
 *   4xx errors → WARN (client error, not actionable server-side)
 *   5xx errors → ERROR (server bugs, need investigation)
 *   Validation  → DEBUG (very frequent, only noisy in debug mode)
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ─── Validation (400) ─────────────────────────────────────────────────────

    /**
     * Handles @Valid / @Validated bean validation failures.
     * Builds a fieldErrors map: { "fieldName": "error message" }
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDTO> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        log.debug("[Validation] {} field errors for path={}", fieldErrors.size(), request.getRequestURI());

        return ResponseEntity.badRequest().body(
            ErrorResponseDTO.builder()
                .message("Validation failed. Please check the highlighted fields.")
                .errorCode("VALIDATION_ERROR")
                .path(request.getRequestURI())
                .fieldErrors(fieldErrors)
                .build()
        );
    }

    // ─── Business exceptions ──────────────────────────────────────────────────

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleNotFound(
            NotFoundException ex, HttpServletRequest request) {
        log.warn("[Exception] 404 Not Found: path={} message={}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            buildError("NOT_FOUND", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponseDTO> handleConflict(
            ConflictException ex, HttpServletRequest request) {
        log.warn("[Exception] 409 Conflict: path={} message={}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            buildError("CONFLICT", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponseDTO> handleForbidden(
            ForbiddenException ex, HttpServletRequest request) {
        log.warn("[Exception] 403 Forbidden: path={} message={}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            buildError("FORBIDDEN", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponseDTO> handleUnauthorized(
            UnauthorizedException ex, HttpServletRequest request) {
        log.warn("[Exception] 401 Unauthorized: path={} message={}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            buildError("UNAUTHORIZED", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponseDTO> handleBadRequest(
            BadRequestException ex, HttpServletRequest request) {
        log.warn("[Exception] 400 Bad Request: path={} message={}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.badRequest().body(
            buildError("BAD_REQUEST", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ErrorResponseDTO> handleRateLimit(
            RateLimitException ex, HttpServletRequest request) {
        log.warn("[Exception] 429 Rate Limited: path={} message={}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
            buildError("RATE_LIMIT_EXCEEDED", ex.getMessage(), request)
        );
    }

    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<ErrorResponseDTO> handleExternalService(
            ExternalServiceException ex, HttpServletRequest request) {
        log.error("[Exception] 503 External Service Error: path={} message={}", request.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
            buildError("EXTERNAL_SERVICE_ERROR", "An external service is temporarily unavailable. Please try again.", request)
        );
    }

    // ─── Spring Security exceptions ───────────────────────────────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponseDTO> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        log.warn("[Security] Access denied: path={}", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            buildError("FORBIDDEN", "You do not have permission to perform this action.", request)
        );
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponseDTO> handleAuthenticationException(
            AuthenticationException ex, HttpServletRequest request) {
        log.warn("[Security] Authentication error: path={} message={}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            buildError("UNAUTHORIZED", "Authentication failed: " + ex.getMessage(), request)
        );
    }

    // ─── HTTP / request exceptions ────────────────────────────────────────────

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponseDTO> handleMessageNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.debug("[Exception] Malformed JSON body: path={}", request.getRequestURI());
        return ResponseEntity.badRequest().body(
            buildError("MALFORMED_JSON", "Request body is malformed or missing.", request)
        );
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponseDTO> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        String msg = "Method " + ex.getMethod() + " is not supported for this endpoint.";
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(
            buildError("METHOD_NOT_ALLOWED", msg, request)
        );
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponseDTO> handleMissingParam(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        String msg = "Required query parameter '" + ex.getParameterName() + "' is missing.";
        return ResponseEntity.badRequest().body(
            buildError("MISSING_PARAMETER", msg, request)
        );
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponseDTO> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String msg = "Invalid value '" + ex.getValue() + "' for parameter '" + ex.getName() + "'.";
        return ResponseEntity.badRequest().body(
            buildError("TYPE_MISMATCH", msg, request)
        );
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponseDTO> handleMaxUploadSize(
            MaxUploadSizeExceededException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(
            buildError("FILE_TOO_LARGE", "Uploaded file exceeds the maximum allowed size of 50 MB.", request)
        );
    }

    // ─── Catch-all (500) ──────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDTO> handleGeneral(
            Exception ex, HttpServletRequest request) {
        // Log the full stack trace for investigation
        log.error("[Exception] 500 Internal Server Error: path={} type={} message={}",
                request.getRequestURI(),
                ex.getClass().getSimpleName(),
                ex.getMessage(), ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            buildError("INTERNAL_ERROR",
                "An unexpected error occurred. Please try again later.", request)
        );
    }

    // ─── Builder helper ───────────────────────────────────────────────────────

    private ErrorResponseDTO buildError(String errorCode, String message, HttpServletRequest request) {
        return ErrorResponseDTO.builder()
                .errorCode(errorCode)
                .message(message)
                .path(request.getRequestURI())
                .build();
    }
}
