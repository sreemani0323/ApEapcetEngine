package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CollegeExploreDTO {
    @JsonProperty("college_id")
    private Long collegeId;

    @JsonProperty("instcode")
    private String instcode;

    @JsonProperty("name")
    private String name;

    @JsonProperty("type")
    private String type;

    @JsonProperty("district")
    private String district;

    @JsonProperty("place")
    private String place;

    @JsonProperty("coed")
    private String coed;

    @JsonProperty("estd")
    private Integer estd;

    @JsonProperty("branch_count")
    private Integer branchCount;

    @JsonProperty("avg_package")
    private String avgPackage;

    @JsonProperty("highest_package")
    private String highestPackage;
}
