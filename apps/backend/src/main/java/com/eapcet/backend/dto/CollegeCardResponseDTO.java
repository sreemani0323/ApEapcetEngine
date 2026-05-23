package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CollegeCardResponseDTO {
    
    @JsonProperty("college_name")
    private String collegeName;
    
    @JsonProperty("instcode")
    private String instcode;
    
    @JsonProperty("district")
    private String district;
    
    @JsonProperty("place")
    private String place;
    
    @JsonProperty("branch_code")
    private String branchCode;
    
    @JsonProperty("cutoff_rank_2024")
    private Integer cutoffRank2024;
    
    @JsonProperty("probability_percent")
    private Double probabilityPercent;
    
    @JsonProperty("rank_gap")
    private Integer rankGap;
    
    @JsonProperty("affl")
    private String affl;

    @JsonProperty("category")
    private String category;

    @JsonProperty("cutoff_rank_2022")
    private Integer cutoffRank2022;

    @JsonProperty("college_type")
    private String collegeType;

    @JsonProperty("estd")
    private Integer estd;

    @JsonProperty("coed")
    private String coed;
}
