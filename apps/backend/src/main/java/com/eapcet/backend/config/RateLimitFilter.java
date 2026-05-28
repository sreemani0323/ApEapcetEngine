package com.eapcet.backend.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP-based rate limiter. Uses X-Forwarded-For when behind a trusted reverse proxy (Render).
 */
@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private static final int MAX_TRACKED_IPS = 10_000;

    private final Map<String, Bucket> searchBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> readBuckets = new ConcurrentHashMap<>();
    private final Map<String, Instant> bucketLastSeen = new ConcurrentHashMap<>();

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

    private String resolveClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    private void evictStaleBuckets() {
        if (bucketLastSeen.size() <= MAX_TRACKED_IPS) {
            return;
        }
        Instant cutoff = Instant.now().minus(Duration.ofHours(2));
        Iterator<Map.Entry<String, Instant>> it = bucketLastSeen.entrySet().iterator();
        while (it.hasNext() && bucketLastSeen.size() > MAX_TRACKED_IPS / 2) {
            Map.Entry<String, Instant> entry = it.next();
            if (entry.getValue().isBefore(cutoff)) {
                String ip = entry.getKey();
                it.remove();
                searchBuckets.remove(ip);
                readBuckets.remove(ip);
            }
        }
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        String path = req.getRequestURI();

        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(req);
        bucketLastSeen.put(clientIp, Instant.now());
        evictStaleBuckets();

        boolean isHeavy = path.contains("search") || path.contains("reverse") || path.contains("calculate");

        Bucket bucket = isHeavy
                ? searchBuckets.computeIfAbsent(clientIp, k -> createSearchBucket())
                : readBuckets.computeIfAbsent(clientIp, k -> createReadBucket());

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            res.setContentType("application/problem+json");
            ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Rate limit exceeded. Try again shortly."
            );
            res.getWriter().write(
                    "{\"type\":\"about:blank\",\"title\":\"Too Many Requests\",\"status\":429,\"detail\":\""
                            + pd.getDetail() + "\"}"
            );
        }
    }
}
