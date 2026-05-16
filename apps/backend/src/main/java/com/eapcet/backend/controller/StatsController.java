package com.eapcet.backend.controller;

import com.eapcet.backend.dto.*;
import com.eapcet.backend.service.StatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class StatsController {

    private final StatsService statsService;

    @GetMapping("/stats/dashboard")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats() {
        log.info("Dashboard stats requested");
        return ResponseEntity.ok(statsService.getDashboardStats());
    }

    @GetMapping("/stats/district-summary")
    public ResponseEntity<List<DistrictSummaryDTO>> getDistrictSummary() {
        log.info("District summary requested");
        return ResponseEntity.ok(statsService.getDistrictSummary());
    }

    @GetMapping("/colleges/explore")
    public ResponseEntity<List<CollegeExploreDTO>> exploreColleges(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String affiliation) {
        log.info("Explore colleges: district={}, type={}, search={}, affiliation={}", district, type, search, affiliation);
        return ResponseEntity.ok(statsService.exploreColleges(district, type, search, affiliation));
    }

    @GetMapping("/colleges/{instcode}/detail")
    public ResponseEntity<?> getCollegeDetail(@PathVariable String instcode) {
        log.info("College detail requested for: {}", instcode);
        CollegeDetailDTO detail = statsService.getCollegeDetail(instcode);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(detail);
    }

    /**
     * Lightweight college names for client-side Trie autocomplete.
     * ~200 records, ~8KB gzipped. Cached aggressively.
     */
    @GetMapping("/colleges/names")
    public ResponseEntity<List<CollegeNameDTO>> getCollegeNames() {
        return ResponseEntity.ok(statsService.getAllCollegeNames());
    }
}
