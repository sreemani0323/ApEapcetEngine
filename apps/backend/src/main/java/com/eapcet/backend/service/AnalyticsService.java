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
     * Compare branches grouped by college counts (branch densities).
     */
    @Cacheable("branchComparison")
    public List<BranchPackageDTO> compareBranchesByPackage() {
        log.info("Aggregating branch comparison data (college counts)");

        List<CollegeBranch> allBranches = collegeBranchRepository.findAll();

        // Group everything by branchCode with null-safety
        Map<String, List<CollegeBranch>> groupedByBranch = allBranches.stream()
                .filter(cb -> cb != null && cb.getBranch() != null && cb.getBranch().getBranchCode() != null)
                .collect(Collectors.groupingBy(cb -> cb.getBranch().getBranchCode()));

        List<BranchPackageDTO> result = new ArrayList<>();

        for (Map.Entry<String, List<CollegeBranch>> entry : groupedByBranch.entrySet()) {
            String branchCode = entry.getKey();
            List<CollegeBranch> branches = entry.getValue();

            if (branches.isEmpty())
                continue;

            String branchType = branches.get(0).getBranch().getBranchType();

            result.add(BranchPackageDTO.builder()
                    .branchCode(branchCode)
                    .branchType(branchType)
                    .collegeCount(branches.size())
                    .build());
        }

        // Return sorted by College Count
        if (!result.isEmpty()) {
            return result.stream()
                    .sorted(Comparator.comparing(BranchPackageDTO::getCollegeCount).reversed())
                    .collect(Collectors.toList());
        }

        return result;
    }

    /**
     * Compare 2022 vs 2024 cutoff ranks per branch to extract what is trending.
     * Uses efficient SQL aggregation — no findAll().
     */
    @Cacheable("trendingBranches")
    public List<TrendingBranchDTO> getTrendingBranches() {
        log.info("Calculating trending branch velocity using SQL aggregation");

        List<Object[]> rows = cutoffRepository.findMedianCutoffByBranchAndYear();

        if (rows.isEmpty()) {
            log.warn("No cutoff data found in database");
            return Collections.emptyList();
        }

        // Parse rows into: branchCode -> year -> median
        // Each row: [branch_code, branch_type, year, median_cutoff, count]
        Map<String, Map<Integer, Double>> branchYearMedian = new LinkedHashMap<>();
        Map<String, String> branchTypeMap = new HashMap<>();

        for (Object[] row : rows) {
            String branchCode = (String) row[0];
            String branchType = row[1] != null ? (String) row[1] : "Other";
            int year = ((Number) row[2]).intValue();
            double median = ((Number) row[3]).doubleValue();

            branchYearMedian.computeIfAbsent(branchCode, k -> new HashMap<>()).put(year, median);
            branchTypeMap.putIfAbsent(branchCode, branchType);
        }

        List<TrendingBranchDTO> trends = new ArrayList<>();

        for (Map.Entry<String, Map<Integer, Double>> entry : branchYearMedian.entrySet()) {
            String branch = entry.getKey();
            Map<Integer, Double> yearData = entry.getValue();

            boolean has22 = yearData.containsKey(2022);
            boolean has24 = yearData.containsKey(2024);
            Double med22 = has22 ? yearData.get(2022) : null;
            Double med24 = has24 ? yearData.get(2024) : null;

            // Positive delta = 2024 closing rank lower than 2022 = harder to get in
            double competitionIncrease = 0;
            String status = "Stable";
            if (has22 && has24) {
                competitionIncrease = med22 - med24;
                if (competitionIncrease > 8000) {
                    status = "Extremely Competitive";
                } else if (competitionIncrease > 3000) {
                    status = "Heating (Harder)";
                } else if (competitionIncrease < -3000) {
                    status = "Cooling (Easier)";
                }
            }

            trends.add(TrendingBranchDTO.builder()
                    .branchCode(branch)
                    .branchType(branchTypeMap.getOrDefault(branch, "Other"))
                    .medianCutoff2022(med22)
                    .medianCutoff2024(med24)
                    .competitionIncrease(has22 && has24 ? competitionIncrease : 0.0)
                    .trendStatus(status)
                    .build());
        }

        return trends.stream()
                .sorted(Comparator.comparing(TrendingBranchDTO::getCompetitionIncrease).reversed())
                .collect(Collectors.toList());
    }
}
