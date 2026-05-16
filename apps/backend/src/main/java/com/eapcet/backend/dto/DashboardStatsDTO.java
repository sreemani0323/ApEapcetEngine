package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStatsDTO {
    @JsonProperty("total_colleges")
    private Long totalColleges;

    @JsonProperty("total_branches")
    private Long totalBranches;

    @JsonProperty("total_cutoff_records")
    private Long totalCutoffRecords;

    @JsonProperty("districts_covered")
    private Long districtsCovered;

    @JsonProperty("categories_available")
    private Long categoriesAvailable;
}
