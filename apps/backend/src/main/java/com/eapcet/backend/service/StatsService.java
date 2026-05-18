package com.eapcet.backend.service;

import com.eapcet.backend.dto.*;
import com.eapcet.backend.model.College;
import com.eapcet.backend.model.CollegeBranch;
import com.eapcet.backend.model.Cutoff;
import com.eapcet.backend.repository.CollegeBranchRepository;
import com.eapcet.backend.repository.CollegeRepository;
import com.eapcet.backend.repository.CutoffRepository;
import com.eapcet.backend.util.PackageParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatsService {

    private static final int EXPLORE_MAX = 5000;

    private final CollegeRepository collegeRepository;
    private final CollegeBranchRepository collegeBranchRepository;
    private final CutoffRepository cutoffRepository;

    @Cacheable("dashboardStats")
    public DashboardStatsDTO getDashboardStats() {
        log.info("Fetching dashboard stats via optimized COUNT queries");

        return DashboardStatsDTO.builder()
                .totalColleges(collegeRepository.count())
                .totalBranches(collegeBranchRepository.count())
                .totalCutoffRecords(cutoffRepository.count())
                .districtsCovered(collegeRepository.countDistinctDistricts())
                .categoriesAvailable(cutoffRepository.countDistinctCategories())
                .build();
    }

    @Cacheable("districtSummary")
    public List<DistrictSummaryDTO> getDistrictSummary() {
        log.info("Fetching district summary via SQL GROUP BY");

        return collegeBranchRepository.getDistrictSummaryAggregated().stream()
                .map(row -> DistrictSummaryDTO.builder()
                        .district((String) row[0])
                        .collegeCount((Long) row[1])
                        .branchCount((Long) row[2])
                        .build())
                .collect(Collectors.toList());
    }

    @Cacheable(value = "exploreColleges", key = "#district + '-' + #type + '-' + #search + '-' + #affiliation")
    public List<CollegeExploreDTO> exploreColleges(String district, String type, String search, String affiliation) {
        log.info("Exploring colleges with district={}, type={}, search={}, affiliation={}", district, type, search, affiliation);

        List<CollegeBranch> allBranches = collegeBranchRepository.searchFlexible(
                district, null, null, type, search, PageRequest.of(0, EXPLORE_MAX)
        );

        Map<Long, List<CollegeBranch>> grouped = allBranches.stream()
                .filter(cb -> affiliation == null || affiliation.isEmpty()
                        || affiliation.equalsIgnoreCase(cb.getCollege().getAffl()))
                .collect(Collectors.groupingBy(cb -> cb.getCollege().getCollegeId()));

        return grouped.entrySet().stream()
                .map(entry -> {
                    List<CollegeBranch> branches = entry.getValue();
                    College college = branches.get(0).getCollege();

                    String bestAvg = branches.stream()
                            .map(CollegeBranch::getAvgPackage)
                            .map(PackageParser::parseLpa)
                            .filter(Objects::nonNull)
                            .max(Double::compareTo)
                            .map(v -> String.format("%.1f LPA", v))
                            .orElse(null);

                    String bestHighest = branches.stream()
                            .map(CollegeBranch::getHighestPackage)
                            .map(PackageParser::parseLpa)
                            .filter(Objects::nonNull)
                            .max(Double::compareTo)
                            .map(v -> String.format("%.1f LPA", v))
                            .orElse(null);

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

    @Cacheable(value = "collegeDetail", key = "#instcode + '-' + #category")
    public CollegeDetailDTO getCollegeDetail(String instcode, String category) {
        log.info("Fetching detail for college: {} category: {}", instcode, category);

        String safeCategory = (category != null && !category.isBlank())
                ? category.trim().toUpperCase()
                : "OC_BOYS";

        List<CollegeBranch> collegeBranches = collegeBranchRepository.findByCollegeInstcode(instcode);
        if (collegeBranches.isEmpty()) {
            return null;
        }

        College college = collegeBranches.get(0).getCollege();

        List<Long> cbIds = collegeBranches.stream()
                .map(CollegeBranch::getCollegeBranchId)
                .collect(Collectors.toList());

        List<Cutoff> allCutoffs = cutoffRepository.findBatchByCbIdsAndCategoryAndYears(
                cbIds, safeCategory, List.of(2022, 2024));

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
                .region(college.getInstReg())
                .category(safeCategory)
                .branches(branchDetails)
                .build();
    }

    /**
     * Branch codes offered at a college — for reverse calculator / choice filling.
     */
    @Cacheable(value = "collegeBranches", key = "#instcode")
    public List<CollegeBranchOptionDTO> getCollegeBranches(String instcode) {
        return collegeBranchRepository.findByCollegeInstcode(instcode).stream()
                .map(cb -> CollegeBranchOptionDTO.builder()
                        .branchCode(cb.getBranch().getBranchCode())
                        .build())
                .sorted(Comparator.comparing(CollegeBranchOptionDTO::getBranchCode))
                .collect(Collectors.toList());
    }

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
