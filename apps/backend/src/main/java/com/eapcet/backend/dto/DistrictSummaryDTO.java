package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DistrictSummaryDTO {
    @JsonProperty("district")
    private String district;

    @JsonProperty("college_count")
    private Long collegeCount;

    @JsonProperty("branch_count")
    private Long branchCount;
}
