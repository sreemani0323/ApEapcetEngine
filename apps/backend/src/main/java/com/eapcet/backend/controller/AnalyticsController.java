package com.eapcet.backend.controller;

import com.eapcet.backend.dto.BranchPackageDTO;
import com.eapcet.backend.dto.TrendingBranchDTO;
import com.eapcet.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Compare branches grouped by packages.
     */
    @GetMapping("/compare-branches")
    public ResponseEntity<List<BranchPackageDTO>> compareBranches() {
        log.info("Received request for branch comparison by average package.");
        List<BranchPackageDTO> dtos = analyticsService.compareBranchesByPackage();
        return ResponseEntity.ok(dtos);
    }

    /**
     * Trending branches calculating historic cutoff velocity.
     */
    @GetMapping("/trending-branches")
    public ResponseEntity<List<TrendingBranchDTO>> trendingBranches() {
        log.info("Received request for trending branches.");
        List<TrendingBranchDTO> dtos = analyticsService.getTrendingBranches();
        
        // Return only top 10 trends to the frontend to keep rendering crisp
        int limit = Math.min(dtos.size(), 10);
        return ResponseEntity.ok(dtos.subList(0, limit));
    }
}
