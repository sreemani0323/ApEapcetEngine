package com.eapcet.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Caffeine cache configuration with per-cache TTL and size limits.
 *
 * Cache strategy:
 *  - searchResults   : 30 min TTL — search results keyed on rank+filters+category
 *  - exploreColleges : 6 h TTL   — map page college list, rarely changes
 *  - collegeDetail   : 6 h TTL   — single college detail page
 *  - collegeBranches : 6 h TTL   — branch options per college
 *  - collegeNames    : 24 h TTL  — full name index for autocomplete
 *  - dashboardStats  : 24 h TTL  — total counts, never change intra-day
 *  - districtSummary : 24 h TTL  — district aggregation
 *  - branchComparison: 24 h TTL  — analytics data, static for the season
 *  - trendingBranches: 24 h TTL  — analytics data, static for the season
 */
@Configuration
@EnableCaching
@SuppressWarnings("null")
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(

            // ── Search results: most important for latency ──
            build("searchResults",   300,  30, TimeUnit.MINUTES),

            // ── Map / explore: colleges list, changes only with new data ──
            build("exploreColleges", 100,   6, TimeUnit.HOURS),

            // ── College detail page ──
            build("collegeDetail",   500,   6, TimeUnit.HOURS),
            build("collegeBranches", 500,   6, TimeUnit.HOURS),

            // ── Completely static for the admission season ──
            build("collegeNames",      5,  24, TimeUnit.HOURS),
            build("dashboardStats",    5,  24, TimeUnit.HOURS),
            build("districtSummary",   5,  24, TimeUnit.HOURS),
            build("branchComparison",  5,  24, TimeUnit.HOURS),
            build("trendingBranches",  5,  24, TimeUnit.HOURS)
        ));
        return manager;
    }

    private CaffeineCache build(String name, int maxSize, long ttl, TimeUnit unit) {
        return new CaffeineCache(name,
            Caffeine.newBuilder()
                .maximumSize(maxSize)
                .expireAfterWrite(ttl, unit)
                .recordStats()
                .build());
    }
}
