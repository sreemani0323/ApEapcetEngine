package com.eapcet.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;

/**
 * RFC-7807 Problem Detail exception handler.
 * SECURITY: Never leak stack traces. Log internally; return typed problem details.
 */
@RestControllerAdvice
@Slf4j
@SuppressWarnings("null")
public class GlobalExceptionHandler {

    private static final URI TYPE_VALIDATION = URI.create("https://eapcet.app/errors/validation");
    private static final URI TYPE_BAD_REQUEST = URI.create("https://eapcet.app/errors/bad-request");
    private static final URI TYPE_INTERNAL    = URI.create("https://eapcet.app/errors/internal");
    private static final URI TYPE_ML_SERVICE  = URI.create("https://eapcet.app/errors/ml-service");

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        log.warn("Validation failed: {}", ex.getMessage());

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "One or more fields failed validation."
        );
        pd.setType(TYPE_VALIDATION);
        pd.setTitle("Validation Error");
        pd.setProperty("timestamp", Instant.now().toString());
        pd.setProperty("fields", ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .toList());
        return pd;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArg(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, ex.getMessage()
        );
        pd.setType(TYPE_BAD_REQUEST);
        pd.setTitle("Bad Request");
        pd.setProperty("timestamp", Instant.now().toString());
        return pd;
    }

    @ExceptionHandler(io.github.resilience4j.circuitbreaker.CallNotPermittedException.class)
    public ProblemDetail handleCircuitBreakerOpen(io.github.resilience4j.circuitbreaker.CallNotPermittedException ex) {
        log.warn("Circuit breaker is OPEN for ML service: {}", ex.getMessage());

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.SERVICE_UNAVAILABLE,
                "The prediction engine is temporarily unavailable due to repeated failures. It will recover automatically."
        );
        pd.setType(TYPE_ML_SERVICE);
        pd.setTitle("Prediction Service Circuit Open");
        pd.setProperty("timestamp", Instant.now().toString());
        return pd;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred. Please try again."
        );
        pd.setType(TYPE_INTERNAL);
        pd.setTitle("Internal Server Error");
        pd.setProperty("timestamp", Instant.now().toString());
        return pd;
    }
}
