package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReverseCalculatorResponseDTO {
    @JsonProperty("college_name")
    private String collegeName;
    
    @JsonProperty("branch_code")
    private String branchCode;
    
    @JsonProperty("predicted_cutoff")
    private Integer predictedCutoff;
    
    @JsonProperty("desired_probability")
    private Double desiredProbability;
    
    @JsonProperty("required_rank")
    private Integer requiredRank;
}
