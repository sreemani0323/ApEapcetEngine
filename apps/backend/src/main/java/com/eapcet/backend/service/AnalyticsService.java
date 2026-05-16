package com.eapcet.backend.service;

import com.eapcet.backend.dto.BranchPackageDTO;
import com.eapcet.backend.dto.TrendingBranchDTO;
import com.eapcet.backend.model.CollegeBranch;
import com.eapcet.backend.model.Cutoff;
import com.eapcet.backend.repository.CollegeBranchRepository;
import com.eapcet.backend.repository.CutoffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AnalyticsService {

    private final CollegeBranchRepository collegeBranchRepository;
    private final CutoffRepository cutoffRepository;

    /**
     * Parse package strings like "24.5 LPA" into Double.
     */
    private Double parsePackage(String pkg) {
        if (pkg == null || pkg.equalsIgnoreCase("unavailable")) return null;
        try {
            String clean = pkg.replaceAll("[^0-9.]", "").trim();
            if (clean.isEmpty()) return null;
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Compare branches by calculating their exact aggregate average LPA and Highest package drops.
     */
    @Cacheable("branchComparison")
    public List<BranchPackageDTO> compareBranchesByPackage() {
        log.info("Aggregating package data grouped by branch types");

        List<CollegeBranch> allBranches = collegeBranchRepository.findAll();

        // Group everything by branchCode
        // Group everything by branchCode with null-safety
        Map<String, List<CollegeBranch>> groupedByBranch = allBranches.stream()
                .filter(cb -> cb != null && cb.getBranch() != null && cb.getBranch().getBranchCode() != null)
                .collect(Collectors.groupingBy(cb -> cb.getBranch().getBranchCode()));

        List<BranchPackageDTO> result = new ArrayList<>();

        for (Map.Entry<String, List<CollegeBranch>> entry : groupedByBranch.entrySet()) {
            String branchCode = entry.getKey();
            List<CollegeBranch> branches = entry.getValue();
            
            if (branches.isEmpty()) continue;
            
            String branchType = branches.get(0).getBranch().getBranchType();

            // Aggregate parsed package sizes
            List<Double> avgList = new ArrayList<>();
            List<Double> maxList = new ArrayList<>();

            for (CollegeBranch cb : branches) {
                if (cb.getAvgPackage() != null) {
                    Double avgParsed = parsePackage(cb.getAvgPackage());
                    if (avgParsed != null) avgList.add(avgParsed);
                }
                
                if (cb.getHighestPackage() != null) {
                    Double maxParsed = parsePackage(cb.getHighestPackage());
                    if (maxParsed != null) maxList.add(maxParsed);
                }
            }

            if (avgList.isEmpty()) continue; // Ignore branches with no placement data across the board

            double totalAvg = avgList.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double absoluteMax = maxList.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);

            result.add(BranchPackageDTO.builder()
                    .branchCode(branchCode)
                    .branchType(branchType)
                    .avgLpaAggregate(Math.round(totalAvg * 100.0) / 100.0) // 2 decimal precision
                    .maxLpaRecorded(absoluteMax)
                    .collegeCount(branches.size())
                    .build());
        }

        // Return sorted by Average LPA
        if (!result.isEmpty()) {
            return result.stream()
                    .sorted(Comparator.comparing(BranchPackageDTO::getAvgLpaAggregate).reversed())
                    .collect(Collectors.toList());
        }

        // FALLBACK: No package data loaded. Return branch density (college count per branch).
        log.warn("No placement package data found. Returning branch density fallback.");
        for (Map.Entry<String, List<CollegeBranch>> entry : groupedByBranch.entrySet()) {
            String branchCode = entry.getKey();
            List<CollegeBranch> branches = entry.getValue();
            String branchType = branches.get(0).getBranch().getBranchType();
            result.add(BranchPackageDTO.builder()
                    .branchCode(branchCode)
                    .branchType(branchType)
                    .avgLpaAggregate(0.0)
                    .maxLpaRecorded(0.0)
                    .collegeCount(branches.size())
                    .build());
        }
        return result.stream()
                .sorted(Comparator.comparing(BranchPackageDTO::getCollegeCount).reversed())
                .limit(15)
                .collect(Collectors.toList());
    }

    /**
     * Compare 2022 vs 2024 cutoff ranks per branch to extract what is trending.
     * FIXED: Works with single-year data (2024 only) — does not require 2022.
     */
    @Cacheable("trendingBranches")
    public List<TrendingBranchDTO> getTrendingBranches() {
        log.info("Calculating trending branch velocity using Cutoff metrics");

        List<Cutoff> allCutoffs = cutoffRepository.findAll();

        if (allCutoffs.isEmpty()) {
            log.warn("No cutoff data found in database");
            return Collections.emptyList();
        }

        // 1. Split by Year -> Branch -> List of cutoffs with strict null-safety
        Map<Integer, Map<String, List<Integer>>> cutoffGraph = allCutoffs.stream()
                .filter(c -> c != null && c.getYear() != null && c.getCutoffRank() != null 
                        && c.getCollegeBranch() != null && c.getCollegeBranch().getBranch() != null 
                        && c.getCollegeBranch().getBranch().getBranchCode() != null)
                .collect(Collectors.groupingBy(
                        Cutoff::getYear,
                        Collectors.groupingBy(
                                c -> c.getCollegeBranch().getBranch().getBranchCode(),
                                Collectors.mapping(Cutoff::getCutoffRank, Collectors.toList())
                        )
                ));

        Map<String, List<Integer>> data2022 = cutoffGraph.getOrDefault(2022, Collections.emptyMap());
        Map<String, List<Integer>> data2024 = cutoffGraph.getOrDefault(2024, Collections.emptyMap());

        // If no 2024 data, try to use whatever year is available
        Map<String, List<Integer>> primaryData = data2024.isEmpty() ? 
                cutoffGraph.values().stream().findFirst().orElse(Collections.emptyMap()) : data2024;

        List<TrendingBranchDTO> trends = new ArrayList<>();

        // Build branch type cache
        Map<String, String> branchTypeCache = allCutoffs.stream()
                .filter(c -> c.getCollegeBranch() != null && c.getCollegeBranch().getBranch() != null)
                .collect(Collectors.toMap(
                        c -> c.getCollegeBranch().getBranch().getBranchCode(),
                        c -> c.getCollegeBranch().getBranch().getBranchType() != null ? c.getCollegeBranch().getBranch().getBranchType() : "Other",
                        (a, b) -> a
                ));

        // 2. Iterate all branches in primary data
        for (String branch : primaryData.keySet()) {
            List<Integer> sorted24 = primaryData.get(branch).stream().sorted().toList();
            if (sorted24.isEmpty()) continue;

            double med24 = sorted24.get(sorted24.size() / 2);
            double med22 = med24;
            double competitionIncrease = 0;

            if (data2022.containsKey(branch)) {
                List<Integer> sorted22 = data2022.get(branch).stream().sorted().toList();
                if (!sorted22.isEmpty()) {
                    med22 = sorted22.get(sorted22.size() / 2);
                    competitionIncrease = med22 - med24;
                }
            }

            String bType = branchTypeCache.getOrDefault(branch, "Other");

            String status = "Stable";
            if (competitionIncrease > 3000) status = "Rising Star (Harder)";
            if (competitionIncrease < -3000) status = "Cooling (Easier)";
            if (competitionIncrease > 8000) status = "Extremely Competitive";

            trends.add(TrendingBranchDTO.builder()
                    .branchCode(branch)
                    .branchType(bType)
                    .medianCutoff2022(med22)
                    .medianCutoff2024(med24)
                    .competitionIncrease(competitionIncrease)
                    .trendStatus(status)
                    .build());
        }

        return trends.stream()
                .sorted(Comparator.comparing(TrendingBranchDTO::getCompetitionIncrease).reversed())
                .collect(Collectors.toList());
    }
}
