package com.eapcet.backend.service;

import com.eapcet.backend.dto.*;
import com.eapcet.backend.model.CollegeBranch;
import com.eapcet.backend.model.Cutoff;
import com.eapcet.backend.repository.CollegeBranchRepository;
import com.eapcet.backend.repository.CutoffRepository;
import com.eapcet.backend.util.AdmissionProbability;
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

        Optional<CollegeBranch> targetCb = collegeBranchRepository.findByInstcodeAndBranchCode(
                req.getInstcode(), req.getBranchCode());

        if (targetCb.isEmpty()) {
            throw new IllegalArgumentException(
                    "College or branch not found for instcode: " + req.getInstcode()
                            + " branch: " + req.getBranchCode());
        }

        CollegeBranch cb = targetCb.get();
        String category = req.getCategory() != null ? req.getCategory() : "OC_BOYS";

        Integer rank24 = cutoffRepository
                .findByCollegeBranch_CollegeBranchIdAndCategoryAndYear(
                        cb.getCollegeBranchId(), category, 2024)
                .map(Cutoff::getCutoffRank)
                .orElse(null);
        Integer rank22 = cutoffRepository
                .findByCollegeBranch_CollegeBranchIdAndCategoryAndYear(
                        cb.getCollegeBranchId(), category, 2022)
                .map(Cutoff::getCutoffRank)
                .orElse(null);

        Integer ocBoys24 = cutoffRepository
                .findByCollegeBranch_CollegeBranchIdAndCategoryAndYear(
                        cb.getCollegeBranchId(), "OC_BOYS", 2024)
                .map(Cutoff::getCutoffRank)
                .orElse(null);

        int predictedCutoff;

        try {
            MLPredictionRequestDTO mlReq = MLPredictionRequestDTO.builder()
                    .items(Collections.singletonList(
                            MLPredictionRequestDTO.MLPredictionItem.builder()
                                    .collegeBranchId(cb.getCollegeBranchId())
                                    .collegeId(cb.getCollege().getCollegeId())
                                    .userRank(10000)
                                    .category(category)
                                    .branchCode(cb.getBranch().getBranchCode())
                                    .district(cb.getCollege().getDistrict())
                                    .collegeType(cb.getCollege().getType())
                                    .coed(cb.getCollege().getCoed())
                                    .affl(cb.getCollege().getAffl())
                                    .aReg(cb.getCollege().getAReg())
                                    .estd(cb.getCollege().getEstd())
                                    .cutoffRank2024(rank24)
                                    .cutoffRank2022(rank22)
                                    .ocBoysCutoff2024(ocBoys24)
                                    .build()
                    )).build();

            MLPredictionResponseDTO mlRes = mlServiceClient.getPredictions(mlReq);
            List<MLPredictionResponseDTO.MLPredictionResult> results = mlRes.getResults();
            if (results == null || results.isEmpty()
                    || results.get(0).getPredictedCutoff() == null) {
                throw new IllegalStateException("ML returned no cutoff prediction");
            }
            predictedCutoff = results.get(0).getPredictedCutoff();
        } catch (Exception e) {
            log.warn("ML service unavailable, using historical cutoff: {}", e.getMessage());
            if (rank24 != null) {
                predictedCutoff = rank24;
            } else if (rank22 != null) {
                predictedCutoff = rank22;
            } else {
                throw new IllegalArgumentException(
                        "No cutoff data for this college, branch, and category combination.");
            }
        }

        Integer requiredRank = AdmissionProbability.probabilityToRequiredRank(
                req.getDesiredProbability(), predictedCutoff);

        if (requiredRank == null) {
            throw new IllegalArgumentException(
                    "Target probability is not achievable — try a lower percentage or a different branch.");
        }

        return ReverseCalculatorResponseDTO.builder()
                .collegeName(cb.getCollege().getName())
                .branchCode(req.getBranchCode())
                .predictedCutoff(predictedCutoff)
                .desiredProbability(req.getDesiredProbability())
                .requiredRank(requiredRank)
                .build();
    }
}
