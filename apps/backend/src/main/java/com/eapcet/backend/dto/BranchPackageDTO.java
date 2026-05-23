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
    
    @JsonProperty("college_count")
    private Integer collegeCount;
}
