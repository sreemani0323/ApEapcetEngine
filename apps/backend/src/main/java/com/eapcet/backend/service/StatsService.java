package com.eapcet.backend.service;

import com.eapcet.backend.dto.*;
import com.eapcet.backend.model.College;
import com.eapcet.backend.model.CollegeBranch;
import com.eapcet.backend.model.Cutoff;
import com.eapcet.backend.repository.CollegeBranchRepository;
import com.eapcet.backend.repository.CollegeRepository;
import com.eapcet.backend.repository.CutoffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatsService {

    private final CollegeRepository collegeRepository;
    private final CollegeBranchRepository collegeBranchRepository;
    private final CutoffRepository cutoffRepository;

    /**
     * Dashboard stats — uses COUNT queries instead of loading entire tables into memory.
     * Before: O(N+M) where N=colleges, M=cutoffs. After: O(1) SQL aggregates.
     */
    @Cacheable("dashboardStats")
    public DashboardStatsDTO getDashboardStats() {
        log.info("Fetching dashboard stats via optimized COUNT queries");

        long totalColleges = collegeRepository.count();
        long totalBranches = collegeBranchRepository.count();
        long totalCutoffs = cutoffRepository.count();
        long districts = collegeRepository.countDistinctDistricts();
        long categories = cutoffRepository.countDistinctCategories();

        return DashboardStatsDTO.builder()
                .totalColleges(totalColleges)
                .totalBranches(totalBranches)
                .totalCutoffRecords(totalCutoffs)
                .districtsCovered(districts)
                .categoriesAvailable(categories)
                .build();
    }

    /**
     * District summary — uses SQL GROUP BY instead of loading all branches into Java.
     * Before: O(N) load all branches + in-memory HashMap grouping. After: O(1) SQL aggregate.
     */
    @Cacheable("districtSummary")
    public List<DistrictSummaryDTO> getDistrictSummary() {
        log.info("Fetching district summary via SQL GROUP BY");

        List<Object[]> rows = collegeBranchRepository.getDistrictSummaryAggregated();

        return rows.stream()
                .map(row -> DistrictSummaryDTO.builder()
                        .district((String) row[0])
                        .collegeCount((Long) row[1])
                        .branchCount((Long) row[2])
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Explore colleges — already uses searchFlexible with JOIN FETCH. No change needed.
     */
    @Cacheable(value = "exploreColleges", key = "#district + '-' + #type + '-' + #search + '-' + #affiliation")
    public List<CollegeExploreDTO> exploreColleges(String district, String type, String search, String affiliation) {
        log.info("Exploring colleges with district={}, type={}, search={}, affiliation={}", district, type, search, affiliation);

        List<CollegeBranch> allBranches = collegeBranchRepository.searchFlexible(
                district, null, null, type, search
        );

        // Group by college
        Map<Long, List<CollegeBranch>> grouped = allBranches.stream()
                .filter(cb -> affiliation == null || affiliation.isEmpty() || affiliation.equalsIgnoreCase(cb.getCollege().getAffl()))
                .collect(Collectors.groupingBy(cb -> cb.getCollege().getCollegeId()));

        return grouped.entrySet().stream()
                .map(entry -> {
                    List<CollegeBranch> branches = entry.getValue();
                    College college = branches.get(0).getCollege();

                    // Find best avg and highest package across all branches
                    String bestAvg = branches.stream()
                            .map(CollegeBranch::getAvgPackage)
                            .filter(Objects::nonNull)
                            .filter(p -> !p.equalsIgnoreCase("unavailable"))
                            .findFirst().orElse(null);
                    String bestHighest = branches.stream()
                            .map(CollegeBranch::getHighestPackage)
                            .filter(Objects::nonNull)
                            .filter(p -> !p.equalsIgnoreCase("unavailable"))
                            .findFirst().orElse(null);

                    return CollegeExploreDTO.builder()
                            .collegeId(college.getCollegeId())
                            .instcode(college.getInstcode())
                            .name(college.getName())
                            .type(college.getType())
                            .district(college.getDistrict())
                            .place(college.getPlace())
                            .coed(college.getCoed())
                            .estd(college.getEstd())
                            .branchCount(branches.size())
                            .avgPackage(bestAvg)
                            .highestPackage(bestHighest)
                            .build();
                })
                .sorted(Comparator.comparing(CollegeExploreDTO::getName))
                .collect(Collectors.toList());
    }

    /**
     * College detail — uses direct instcode-indexed lookup + batch cutoff fetch.
     * Before: O(N) full-table scan + N×2 individual cutoff queries.
     * After: O(log N) indexed lookup + 1 batch cutoff query.
     */
    @Cacheable(value = "collegeDetail", key = "#instcode")
    public CollegeDetailDTO getCollegeDetail(String instcode) {
        log.info("Fetching detail for college: {}", instcode);

        // Direct indexed lookup — no more searchFlexible(null x 6) full scan
        List<CollegeBranch> collegeBranches = collegeBranchRepository.findByCollegeInstcode(instcode);

        if (collegeBranches.isEmpty()) {
            return null;
        }

        College college = collegeBranches.get(0).getCollege();

        // Batch fetch all cutoffs for this college's branches in ONE query
        List<Long> cbIds = collegeBranches.stream()
                .map(CollegeBranch::getCollegeBranchId)
                .collect(Collectors.toList());
        List<Cutoff> allCutoffs = cutoffRepository.findBatchByCbIdsAndCategoryAndYears(
                cbIds, "OC_BOYS", List.of(2022, 2024));

        // Index cutoffs by (collegeBranchId, year) for O(1) lookup
        Map<String, Integer> cutoffIndex = new HashMap<>();
        for (Cutoff c : allCutoffs) {
            cutoffIndex.put(c.getCollegeBranch().getCollegeBranchId() + "_" + c.getYear(), c.getCutoffRank());
        }

        List<CollegeDetailDTO.BranchDetail> branchDetails = collegeBranches.stream()
                .map(cb -> CollegeDetailDTO.BranchDetail.builder()
                        .branchCode(cb.getBranch().getBranchCode())
                        .cutoff2022(cutoffIndex.get(cb.getCollegeBranchId() + "_2022"))
                        .cutoff2024(cutoffIndex.get(cb.getCollegeBranchId() + "_2024"))
                        .avgPackage(cb.getAvgPackage())
                        .highestPackage(cb.getHighestPackage())
                        .build())
                .sorted(Comparator.comparing(CollegeDetailDTO.BranchDetail::getBranchCode))
                .collect(Collectors.toList());

        return CollegeDetailDTO.builder()
                .instcode(college.getInstcode())
                .name(college.getName())
                .type(college.getType())
                .district(college.getDistrict())
                .place(college.getPlace())
                .coed(college.getCoed())
                .estd(college.getEstd())
                .affiliation(college.getAffl())
                .region(college.getAReg())
                .branches(branchDetails)
                .build();
    }

    /**
     * Lightweight college names for client-side Trie autocomplete.
     * Acronyms expanded for human readability.
     */
    @Cacheable("collegeNames")
    public List<CollegeNameDTO> getAllCollegeNames() {
        log.info("Building college name index for client-side Trie");
        return collegeRepository.findAll().stream()
                .map(c -> CollegeNameDTO.builder()
                        .instcode(c.getInstcode())
                        .name(c.getName())
                        .district(c.getDistrict())
                        .typeLabel(expandCollegeType(c.getType()))
                        .build())
                .sorted(Comparator.comparing(CollegeNameDTO::getName))
                .collect(Collectors.toList());
    }

    /** Expand cryptic college type codes to human-readable labels */
    private String expandCollegeType(String type) {
        if (type == null) return "Unknown";
        return switch (type.toUpperCase().trim()) {
            case "SF" -> "Self-Finance";
            case "UNIV" -> "University";
            case "PVT" -> "Private";
            case "PU" -> "Pharmacy University";
            case "SS" -> "State-Sponsored";
            default -> type;
        };
    }
}
