package com.eapcet.backend.controller;

import com.eapcet.backend.dto.BranchPackageDTO;
import com.eapcet.backend.dto.TrendingBranchDTO;
import com.eapcet.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    // Analytics data is static for the admission season — cache aggressively
    private static final CacheControl ANALYTICS_CACHE =
            CacheControl.maxAge(24, TimeUnit.HOURS).cachePublic();

    /**
     * Compare branches grouped by packages.
     * HTTP cache: 24h (browser won't even ask the server on repeat visits).
     */
    @GetMapping("/compare-branches")
    public ResponseEntity<List<BranchPackageDTO>> compareBranches() {
        List<BranchPackageDTO> dtos = analyticsService.compareBranchesByPackage();
        return ResponseEntity.ok()
                .cacheControl(ANALYTICS_CACHE)
                .body(dtos);
    }

    /**
     * Trending branches calculating historic cutoff velocity.
     * HTTP cache: 24h.
     */
    @GetMapping("/trending-branches")
    public ResponseEntity<List<TrendingBranchDTO>> trendingBranches(
            @RequestParam(value = "all", required = false, defaultValue = "false") boolean all) {
        List<TrendingBranchDTO> dtos = analyticsService.getTrendingBranches();

        List<TrendingBranchDTO> result = all ? dtos
                : dtos.subList(0, Math.min(dtos.size(), 10));

        return ResponseEntity.ok()
                .cacheControl(ANALYTICS_CACHE)
                .body(result);
    }

    /**
     * Get list of all branches — completely static, hardcoded.
     * HTTP cache: 7 days.
     */
    @GetMapping("/branches")
    public ResponseEntity<List<String>> getBranches() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .body(List.of(
                    "Aerospace Engineering",
                    "Agricultural Engineering",
                    "Artificial Intelligence",
                    "Artificial Intelligence & Data Science",
                    "Artificial Intelligence & Machine Learning",
                    "Automobile Engineering",
                    "B.Pharm",
                    "Biotechnology",
                    "Chemical Engineering",
                    "Civil Engineering",
                    "Computer Engineering (Software Engineering)",
                    "Computer Networking",
                    "Computer Science & Engineering",
                    "Computer Science and Design",
                    "Computer Science and Business Systems",
                    "Computer Science and Engineering (Artificial Intelligence)",
                    "Computer Science and Engineering (Big Data Analytics)",
                    "Computer Science and Engineering (IoT)",
                    "Computer Science and Engineering & Business Systems",
                    "Computer Science and Information Technology",
                    "Computer Science and Systems Engineering",
                    "Computer Science and Technology",
                    "CSE (AI & ML Specialization)",
                    "CSE (Artificial Intelligence & Data Science)",
                    "CSE (Business Systems)",
                    "CSE (Cyber Security)",
                    "CSE (Data Science)",
                    "CSE (IoT & Cyber Security with Block Chain Tech)",
                    "CSE (Regional Course - Telugu)",
                    "CSE with Specialization in Cloud Computing",
                    "Cyber Security",
                    "Dairy Technology",
                    "Data Science",
                    "Doctor of Pharmacy (Pharm.D)",
                    "Electrical & Electronics Engineering",
                    "Electronics & Communication Engineering",
                    "Electronics & Instrumentation Engineering",
                    "Electronics and Communication Engineering (Bio-Medical Engineering)",
                    "Electronics and Communication Engineering (Industry Integrated)",
                    "Electronics and Communication Technology",
                    "Electronics and Computer Engineering",
                    "Food Engineering",
                    "Food Technology",
                    "Geo-Informatics",
                    "Information Technology",
                    "Instrumentation Engineering and Technology",
                    "Internet of Things",
                    "Mechanical Engineering",
                    "Mechanical Engineering (Robotics)",
                    "Metallurgical Engineering",
                    "Mining Engineering",
                    "Naval Architecture and Marine Engineering",
                    "Petroleum Engineering",
                    "Robotics and Automation",
                    "Software Engineering"
                ));
    }
}
