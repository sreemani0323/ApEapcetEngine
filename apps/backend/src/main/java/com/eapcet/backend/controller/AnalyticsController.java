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
    public ResponseEntity<List<TrendingBranchDTO>> trendingBranches(
            @RequestParam(value = "all", required = false, defaultValue = "false") boolean all) {
        log.info("Received request for trending branches. all={}", all);
        List<TrendingBranchDTO> dtos = analyticsService.getTrendingBranches();
        
        if (all) {
            return ResponseEntity.ok(dtos);
        }
        
        // Return only top 10 trends to the frontend by default
        int limit = Math.min(dtos.size(), 10);
        return ResponseEntity.ok(dtos.subList(0, limit));
    }

    /**
     * Get list of all branches.
     */
    @GetMapping("/branches")
    public ResponseEntity<List<String>> getBranches() {
        log.info("Received request for branch listing.");
        return ResponseEntity.ok(List.of(
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
