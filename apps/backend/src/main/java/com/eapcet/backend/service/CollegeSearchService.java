package com.eapcet.backend.service;

import com.eapcet.backend.dto.CollegeCardResponseDTO;
import com.eapcet.backend.dto.MLPredictionRequestDTO;
import com.eapcet.backend.dto.MLPredictionResponseDTO;
import com.eapcet.backend.dto.SearchRequestDTO;
import com.eapcet.backend.model.CollegeBranch;
import com.eapcet.backend.model.Cutoff;
import com.eapcet.backend.repository.CollegeBranchRepository;
import com.eapcet.backend.repository.CutoffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollegeSearchService {

    private final CollegeBranchRepository collegeBranchRepository;
    private final CutoffRepository cutoffRepository;
    private final MLServiceClient mlServiceClient;

    /**
     * Search colleges with ML probability prediction.
     * OPTIMIZED: Batch cutoff fetch replaces N+1 individual queries.
     * Before: 200 branches × 2 queries = 400 DB round-trips.
     * After: 1 batch query for all cutoffs.
     */
    public List<CollegeCardResponseDTO> searchColleges(SearchRequestDTO req) {
        log.info("Performing flexible search: {}", req);

        List<CollegeBranch> baseResults = collegeBranchRepository.searchFlexible(
                req.getDistrict(),
                req.getBranchCode(),
                req.getRegion(),
                req.getCollegeType(),
                req.getCollegeName()
        );

        if (baseResults.isEmpty()) {
            return Collections.emptyList();
        }

        String safeCategory = req.getCategory() != null && !req.getCategory().isEmpty()
            ? req.getCategory()
            : "OC_BOYS";

        // 2. BATCH fetch cutoffs for ALL matched branches in ONE query (was N+1)
        List<Long> cbIds = baseResults.stream()
                .map(CollegeBranch::getCollegeBranchId)
                .collect(Collectors.toList());

        List<Cutoff> batchCutoffs = cutoffRepository.findBatchByCbIdsAndCategoryAndYears(
                cbIds, safeCategory, List.of(2022, 2024));

        // Index by (cbId, year) for O(1) lookup
        Map<String, Integer> cutoffIndex = new HashMap<>();
        for (Cutoff c : batchCutoffs) {
            cutoffIndex.put(c.getCollegeBranch().getCollegeBranchId() + "_" + c.getYear(), c.getCutoffRank());
        }

        // 3. Prepare Batch Request for ML Service
        List<MLPredictionRequestDTO.MLPredictionItem> mlItems = new ArrayList<>();

        for (CollegeBranch cb : baseResults) {
            Integer rank24 = cutoffIndex.get(cb.getCollegeBranchId() + "_2024");
            Integer rank22 = cutoffIndex.get(cb.getCollegeBranchId() + "_2022");

            mlItems.add(MLPredictionRequestDTO.MLPredictionItem.builder()
                    .collegeBranchId(cb.getCollegeBranchId())
                    .userRank(req.getRank())
                    .category(safeCategory)
                    .branchCode(cb.getBranch().getBranchCode())
                    .district(cb.getCollege().getDistrict())
                    .collegeType(cb.getCollege().getType())
                    .coed(cb.getCollege().getCoed())
                    .affl(cb.getCollege().getAffl())
                    .aReg(cb.getCollege().getAReg())
                    .estd(cb.getCollege().getEstd())
                    .cutoffRank2024(rank24)
                    .cutoffRank2022(rank22)
                    .build());
        }

        // 4. Send bulk POST to Python ML microservice
        MLPredictionRequestDTO mlReq = MLPredictionRequestDTO.builder().items(mlItems).build();
        MLPredictionResponseDTO mlRes = mlServiceClient.getPredictions(mlReq);

        // 5. Merge probability with entity data
        Map<Long, MLPredictionResponseDTO.MLPredictionResult> mlResMap = mlRes.getResults().stream()
                .collect(Collectors.toMap(
                        MLPredictionResponseDTO.MLPredictionResult::getCollegeBranchId,
                        r -> r
                ));

        List<CollegeCardResponseDTO> cards = new ArrayList<>();
        for (CollegeBranch cb : baseResults) {
            MLPredictionResponseDTO.MLPredictionResult mlr = mlResMap.get(cb.getCollegeBranchId());

            // Actual cutoffs from DB (always available)
            Integer dbCutoff24 = cutoffIndex.get(cb.getCollegeBranchId() + "_2024");

            // Use ML predicted cutoff if available, otherwise fall back to DB cutoff
            Integer effectiveCutoff = (mlr != null && mlr.getPredictedCutoff() != null)
                    ? mlr.getPredictedCutoff() : dbCutoff24;

            // Use ML probability if available, otherwise compute simple fallback
            Double effectiveProb = (mlr != null) ? mlr.getProbabilityPercent() : null;
            Integer effectiveGap = (mlr != null) ? mlr.getRankGap() : null;

            if (effectiveProb == null && effectiveCutoff != null && req.getRank() != null && req.getRank() > 0) {
                // Simple fallback probability when ML is down
                int gap = effectiveCutoff - req.getRank();
                double relMargin = (double) gap / effectiveCutoff;
                double z = (relMargin + 0.05) / 0.20;
                double rawProb = 100.0 / (1.0 + Math.exp(-z * 3.0 / 3.5));
                effectiveProb = Math.round((2.0 + (rawProb / 100.0) * 93.0) * 10.0) / 10.0;
                effectiveGap = gap;
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

        // 6. Sort by probability descending
        return cards.stream()
                .sorted(Comparator.comparing(CollegeCardResponseDTO::getProbabilityPercent,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}
