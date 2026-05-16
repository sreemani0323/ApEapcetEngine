package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BranchPackageDTO {
    
    @JsonProperty("branch_code")
    private String branchCode;

    @JsonProperty("branch_type")
    private String branchType;
    
    @JsonProperty("avg_lpa_aggregate")
    private Double avgLpaAggregate;
    
    @JsonProperty("max_lpa_recorded")
    private Double maxLpaRecorded;
    
    @JsonProperty("college_count")
    private Integer collegeCount;
}
