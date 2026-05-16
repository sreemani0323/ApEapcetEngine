package com.eapcet.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP-based rate limiter using Bucket4j.
 * SECURITY FIX: Uses remoteAddr as primary — X-Forwarded-For is untrusted
 * unless behind a verified reverse proxy.
 */
@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private final Map<String, Bucket> searchBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> readBuckets = new ConcurrentHashMap<>();

    private Bucket createSearchBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(60).refillGreedy(60, Duration.ofMinutes(1)).build())
            .build();
    }

    private Bucket createReadBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(200).refillGreedy(200, Duration.ofMinutes(1)).build())
            .build();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        String path = req.getRequestURI();

        // Only rate-limit API endpoints
        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        // SECURITY: Use remoteAddr — XFF is client-controlled and trivially spoofable
        String clientIp = req.getRemoteAddr();

        boolean isHeavy = path.contains("search") || path.contains("reverse") || path.contains("calculate");

        Bucket bucket;
        if (isHeavy) {
            bucket = searchBuckets.computeIfAbsent(clientIp, k -> createSearchBucket());
        } else {
            bucket = readBuckets.computeIfAbsent(clientIp, k -> createReadBucket());
        }

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            res.setContentType("application/json");
            res.getWriter().write("{\"error\":\"Rate limit exceeded. Try again shortly.\",\"status\":429}");
        }
    }
}
