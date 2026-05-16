package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TrendingBranchDTO {
    
    @JsonProperty("branch_code")
    private String branchCode;
    
    @JsonProperty("branch_type")
    private String branchType;
    
    @JsonProperty("median_cutoff_2022")
    private Double medianCutoff2022;
    
    @JsonProperty("median_cutoff_2024")
    private Double medianCutoff2024;
    
    @JsonProperty("competition_increase")
    private Double competitionIncrease; // Difference in cutoff rank (lower = harder)
    
    @JsonProperty("trend_status")
    private String trendStatus; // "Rising Star", "Cooling", "Stable"
}
