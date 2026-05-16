package com.eapcet.backend.service;

import com.eapcet.backend.dto.*;
import com.eapcet.backend.model.CollegeBranch;
import com.eapcet.backend.model.Cutoff;
import com.eapcet.backend.repository.CollegeBranchRepository;
import com.eapcet.backend.repository.CutoffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReverseCalculatorService {

    private final CollegeBranchRepository collegeBranchRepository;
    private final CutoffRepository cutoffRepository;
    private final MLServiceClient mlServiceClient;

    public ReverseCalculatorResponseDTO reverseCalculate(ReverseCalculatorRequestDTO req) {
        log.info("Reverse calculating required rank for: {}", req);

        // 1. Fetch exact College + Branch matching instcode
        List<CollegeBranch> baseResults = collegeBranchRepository.searchFlexible(
                null, req.getBranchCode(), null, null, null
        );

        Optional<CollegeBranch> targetCb = baseResults.stream()
                .filter(cb -> cb.getCollege().getInstcode().equalsIgnoreCase(req.getInstcode()))
                .findFirst();

        if (targetCb.isEmpty()) {
            throw new IllegalArgumentException("College or Branch not found for instcode: " + req.getInstcode() + " branch: " + req.getBranchCode());
        }

        CollegeBranch cb = targetCb.get();

        // 2. Fetch cutoffs
        Integer rank24 = null;
        Integer rank22 = null;

        Optional<Cutoff> c24 = cutoffRepository.findByCollegeBranch_CollegeBranchIdAndCategoryAndYear(
                cb.getCollegeBranchId(), req.getCategory(), 2024);
        Optional<Cutoff> c22 = cutoffRepository.findByCollegeBranch_CollegeBranchIdAndCategoryAndYear(
                cb.getCollegeBranchId(), req.getCategory(), 2022);

        if (c24.isPresent()) rank24 = c24.get().getCutoffRank();
        if (c22.isPresent()) rank22 = c22.get().getCutoffRank();

        int predictedCutoff;

        // 3. Try ML service, fall back to direct cutoff if unavailable
        try {
            MLPredictionRequestDTO mlReq = MLPredictionRequestDTO.builder()
                    .items(Collections.singletonList(
                            MLPredictionRequestDTO.MLPredictionItem.builder()
                                    .collegeBranchId(cb.getCollegeBranchId())
                                    .userRank(10000)
                                    .category(req.getCategory())
                                    .branchCode(cb.getBranch().getBranchCode())
                                    .district(cb.getCollege().getDistrict())
                                    .collegeType(cb.getCollege().getType())
                                    .coed(cb.getCollege().getCoed())
                                    .affl(cb.getCollege().getAffl())
                                    .aReg(cb.getCollege().getAReg())
                                    .estd(cb.getCollege().getEstd())
                                    .cutoffRank2024(rank24)
                                    .cutoffRank2022(rank22)
                                    .build()
                    )).build();

            MLPredictionResponseDTO mlRes = mlServiceClient.getPredictions(mlReq);
            predictedCutoff = mlRes.getResults().get(0).getPredictedCutoff();
        } catch (Exception e) {
            log.warn("ML service unavailable, using 2024 cutoff as fallback: {}", e.getMessage());
            // Fallback: use 2024 cutoff directly, or 2022 if 2024 unavailable
            if (rank24 != null) {
                predictedCutoff = rank24;
            } else if (rank22 != null) {
                predictedCutoff = rank22;
            } else {
                throw new IllegalArgumentException("No cutoff data available for this college-branch-category combination.");
            }
        }

        // 4. Reverse sigmoid math
        double prob = req.getDesiredProbability();
        prob = Math.max(0.001, Math.min(prob, 99.999));
        
        double z = -Math.log((100.0 / prob) - 1.0);
        double scale = 1000.0;
        
        double gap = z * scale;
        int requiredRank = (int) Math.round(predictedCutoff - gap);

        return ReverseCalculatorResponseDTO.builder()
                .collegeName(cb.getCollege().getName())
                .branchCode(req.getBranchCode())
                .predictedCutoff(predictedCutoff)
                .desiredProbability(req.getDesiredProbability())
                .requiredRank(requiredRank > 0 ? requiredRank : 1)
                .build();
    }
}
