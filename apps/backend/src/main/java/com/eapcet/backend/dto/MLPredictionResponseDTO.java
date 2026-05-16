package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class MLPredictionResponseDTO {
    
    @JsonProperty("results")
    private List<MLPredictionResult> results = new java.util.ArrayList<>();
    
    @Data
    public static class MLPredictionResult {
        @JsonProperty("college_branch_id")
        private Long collegeBranchId;
        
        @JsonProperty("predicted_cutoff")
        private Integer predictedCutoff;
        
        @JsonProperty("probability_percent")
        private Double probabilityPercent;
        
        @JsonProperty("rank_gap")
        private Integer rankGap;
    }
}
