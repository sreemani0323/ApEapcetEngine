package com.eapcet.backend.service;

import com.eapcet.backend.dto.MLPredictionRequestDTO;
import com.eapcet.backend.dto.MLPredictionResponseDTO;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * ML Microservice Client
 * =======================
 * Uses Spring 6.1 RestClient (replaces WebClient.block() anti-pattern).
 * Protected by Resilience4j circuit breaker for ML service outages.
 *
 * Virtual threads (enabled in Spring Boot 3.4) ensure this blocking call
 * does NOT hold platform threads — it runs on a virtual thread instead.
 */
@Service
@Slf4j
@SuppressWarnings("null")
public class MLServiceClient {

    private final RestClient restClient;

    public MLServiceClient(@Value("${ml.service.url}") String mlServiceUrl) {
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .build();
        org.springframework.http.client.JdkClientHttpRequestFactory factory =
                new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(java.time.Duration.ofSeconds(60));

        this.restClient = RestClient.builder()
                .baseUrl(mlServiceUrl)
                .requestFactory(factory)
                .build();
    }

    /**
     * Sends a batch prediction request to the Python FastAPI microservice.
     * Circuit breaker opens after 50% failure rate across 10 calls.
     */
    @CircuitBreaker(name = "mlService", fallbackMethod = "fallbackPredictions")
    public MLPredictionResponseDTO getPredictions(MLPredictionRequestDTO request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return new MLPredictionResponseDTO();
        }

        return restClient.post()
                .uri("/predict-probability")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(MLPredictionResponseDTO.class);
    }

    /**
     * Fallback when circuit breaker is open or ML service is down.
     * Returns empty results instead of crashing the entire search.
     */
    @SuppressWarnings("unused")
    private MLPredictionResponseDTO fallbackPredictions(MLPredictionRequestDTO request, Throwable t) {
        log.warn("ML service circuit breaker activated. Returning empty predictions. Cause: {}", t.getMessage());
        MLPredictionResponseDTO empty = new MLPredictionResponseDTO();
        empty.setResults(java.util.Collections.emptyList());
        return empty;
    }
}
