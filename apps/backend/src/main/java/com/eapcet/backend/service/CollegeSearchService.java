package com.eapcet.backend.service;

import com.eapcet.backend.dto.CollegeCardResponseDTO;
import com.eapcet.backend.dto.MLPredictionRequestDTO;
import com.eapcet.backend.dto.MLPredictionResponseDTO;
import com.eapcet.backend.dto.SearchRequestDTO;
import com.eapcet.backend.model.CollegeBranch;
import com.eapcet.backend.model.Cutoff;
import com.eapcet.backend.repository.CollegeBranchRepository;
import com.eapcet.backend.repository.CutoffRepository;
import com.eapcet.backend.util.AdmissionProbability;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollegeSearchService {

    public static final int MAX_SEARCH_RESULTS = 2000;

    private final CollegeBranchRepository collegeBranchRepository;
    private final CutoffRepository cutoffRepository;
    private final MLServiceClient mlServiceClient;

    public List<CollegeCardResponseDTO> searchColleges(SearchRequestDTO req) {
        log.info("Performing flexible search: {}", req);

        boolean hasFilter = req.getDistrict() != null || req.getBranchCode() != null
                || req.getRegion() != null || req.getCollegeType() != null
                || req.getCollegeName() != null;
        boolean hasRank = req.getRank() != null && req.getRank() > 0;

        if (!hasFilter && !hasRank) {
            throw new IllegalArgumentException(
                    "Provide your EAPCET rank and/or at least one filter (district, branch, region, type, or college name).");
        }

        List<CollegeBranch> baseResults = collegeBranchRepository.searchFlexible(
                req.getDistrict(),
                req.getBranchCode(),
                req.getRegion(),
                req.getCollegeType(),
                req.getCollegeName(),
                PageRequest.of(0, MAX_SEARCH_RESULTS)
        );

        if (baseResults.isEmpty()) {
            return Collections.emptyList();
        }

        String safeCategory = (req.getCategory() != null && !req.getCategory().isBlank())
                ? req.getCategory().trim().toUpperCase()
                : "OC_BOYS";

        List<Long> cbIds = baseResults.stream()
                .map(CollegeBranch::getCollegeBranchId)
                .collect(Collectors.toList());

        List<Cutoff> batchCutoffs = cutoffRepository.findBatchByCbIdsAndCategoryAndYears(
                cbIds, safeCategory, List.of(2022, 2024));
        List<Cutoff> ocCutoffs = cutoffRepository.findBatchByCbIdsAndCategoryAndYears(
                cbIds, "OC_BOYS", List.of(2024));

        Map<String, Integer> cutoffIndex = new HashMap<>();
        for (Cutoff c : batchCutoffs) {
            cutoffIndex.put(
                    c.getCollegeBranch().getCollegeBranchId() + "_" + c.getYear(),
                    c.getCutoffRank());
        }

        Map<Long, Integer> ocBoys2024 = new HashMap<>();
        for (Cutoff c : ocCutoffs) {
            if (c.getYear() == 2024) {
                ocBoys2024.put(c.getCollegeBranch().getCollegeBranchId(), c.getCutoffRank());
            }
        }

        List<MLPredictionRequestDTO.MLPredictionItem> mlItems = new ArrayList<>();
        for (CollegeBranch cb : baseResults) {
            Long cbId = cb.getCollegeBranchId();
            mlItems.add(MLPredictionRequestDTO.MLPredictionItem.builder()
                    .collegeBranchId(cbId)
                    .collegeId(cb.getCollege().getCollegeId())
                    .userRank(req.getRank())
                    .category(safeCategory)
                    .branchCode(cb.getBranch().getBranchCode())
                    .district(cb.getCollege().getDistrict())
                    .collegeType(cb.getCollege().getType())
                    .coed(cb.getCollege().getCoed())
                    .affl(cb.getCollege().getAffl())
                    .aReg(cb.getCollege().getAReg())
                    .estd(cb.getCollege().getEstd())
                    .cutoffRank2024(cutoffIndex.get(cbId + "_2024"))
                    .cutoffRank2022(cutoffIndex.get(cbId + "_2022"))
                    .ocBoysCutoff2024(ocBoys2024.get(cbId))
                    .build());
        }

        Map<Long, MLPredictionResponseDTO.MLPredictionResult> mlResMap = new HashMap<>();
        if (!mlItems.isEmpty()) {
            MLPredictionRequestDTO mlReq = MLPredictionRequestDTO.builder().items(mlItems).build();
            MLPredictionResponseDTO mlRes = mlServiceClient.getPredictions(mlReq);
            if (mlRes != null && mlRes.getResults() != null) {
                for (MLPredictionResponseDTO.MLPredictionResult r : mlRes.getResults()) {
                    if (r != null && r.getCollegeBranchId() != null) {
                        mlResMap.putIfAbsent(r.getCollegeBranchId(), r);
                    }
                }
            }
        }

        List<CollegeCardResponseDTO> cards = new ArrayList<>();
        for (CollegeBranch cb : baseResults) {
            Long cbId = cb.getCollegeBranchId();
            MLPredictionResponseDTO.MLPredictionResult mlr = mlResMap.get(cbId);

            Integer dbCutoff24 = cutoffIndex.get(cbId + "_2024");
            Integer effectiveCutoff = (mlr != null && mlr.getPredictedCutoff() != null)
                    ? mlr.getPredictedCutoff() : dbCutoff24;

            Double effectiveProb = (mlr != null) ? mlr.getProbabilityPercent() : null;
            Integer effectiveGap = (mlr != null) ? mlr.getRankGap() : null;

            if (effectiveProb == null && effectiveCutoff != null && hasRank) {
                effectiveProb = AdmissionProbability.rankToProbability(req.getRank(), effectiveCutoff);
                effectiveGap = effectiveCutoff - req.getRank();
            }

            cards.add(CollegeCardResponseDTO.builder()
                    .collegeName(cb.getCollege().getName())
                    .instcode(cb.getCollege().getInstcode())
                    .district(cb.getCollege().getDistrict())
                    .place(cb.getCollege().getPlace())
                    .branchCode(cb.getBranch().getBranchCode())
                    .cutoffRank2024(effectiveCutoff)
                    .probabilityPercent(effectiveProb)
                    .rankGap(effectiveGap)
                    .highestPackage(cb.getHighestPackage() != null ? cb.getHighestPackage() : "unavailable")
                    .avgPackage(cb.getAvgPackage() != null ? cb.getAvgPackage() : "unavailable")
                    .build());
        }

        return cards.stream()
                .sorted(Comparator.comparing(
                        CollegeCardResponseDTO::getProbabilityPercent,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}
