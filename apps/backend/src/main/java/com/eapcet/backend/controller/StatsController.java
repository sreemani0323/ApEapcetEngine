package com.eapcet.backend.controller;

import com.eapcet.backend.dto.*;
import com.eapcet.backend.service.StatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class StatsController {

    private final StatsService statsService;

    // Counts/stats are static for the admission season
    private static final CacheControl STATS_CACHE =
            CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    // College names index — changes only with new data imports
    private static final CacheControl NAMES_CACHE =
            CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    // Explore / map data — relatively stable
    private static final CacheControl EXPLORE_CACHE =
            CacheControl.maxAge(6, TimeUnit.HOURS).cachePublic();

    @GetMapping("/stats/dashboard")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats() {
        return ResponseEntity.ok()
                .cacheControl(STATS_CACHE)
                .body(statsService.getDashboardStats());
    }

    @GetMapping("/stats/district-summary")
    public ResponseEntity<List<DistrictSummaryDTO>> getDistrictSummary() {
        return ResponseEntity.ok()
                .cacheControl(STATS_CACHE)
                .body(statsService.getDistrictSummary());
    }

    @GetMapping("/colleges/explore")
    public ResponseEntity<List<CollegeExploreDTO>> exploreColleges(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String affiliation) {
        return ResponseEntity.ok()
                .cacheControl(EXPLORE_CACHE)
                .body(statsService.exploreColleges(district, type, search, affiliation));
    }

    @GetMapping("/colleges/{instcode}/branches")
    public ResponseEntity<List<CollegeBranchOptionDTO>> getCollegeBranches(@PathVariable String instcode) {
        List<CollegeBranchOptionDTO> branches = statsService.getCollegeBranches(instcode);
        if (branches.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .cacheControl(EXPLORE_CACHE)
                .body(branches);
    }

    @GetMapping("/colleges/{instcode}/detail")
    public ResponseEntity<?> getCollegeDetail(
            @PathVariable String instcode,
            @RequestParam(required = false, defaultValue = "OC_BOYS") String category) {
        CollegeDetailDTO detail = statsService.getCollegeDetail(instcode, category);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .cacheControl(EXPLORE_CACHE)
                .body(detail);
    }

    /**
     * Lightweight college names for client-side Trie autocomplete.
     * ~200 records, ~8KB gzipped. Cached for 24h — changes only with new data imports.
     */
    @GetMapping("/colleges/names")
    public ResponseEntity<List<CollegeNameDTO>> getCollegeNames() {
        return ResponseEntity.ok()
                .cacheControl(NAMES_CACHE)
                .body(statsService.getAllCollegeNames());
    }
}
