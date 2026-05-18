package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MLPredictionRequestDTO {
    
    @JsonProperty("items")
    private List<MLPredictionItem> items;
    
    @Data
    @Builder
    public static class MLPredictionItem {
        @JsonProperty("college_branch_id")
        private Long collegeBranchId;

        @JsonProperty("college_id")
        private Long collegeId;
        
        @JsonProperty("user_rank")
        private Integer userRank;
        
        @JsonProperty("category")
        private String category;
        
        @JsonProperty("branch_code")
        private String branchCode;
        
        @JsonProperty("district")
        private String district;
        
        @JsonProperty("college_type")
        private String collegeType;
        
        @JsonProperty("coed")
        private String coed;
        
        @JsonProperty("affl")
        private String affl;
        
        @JsonProperty("a_reg")
        private String aReg;
        
        @JsonProperty("estd")
        private Integer estd;
        
        @JsonProperty("cutoff_rank_2024")
        private Integer cutoffRank2024;
        
        @JsonProperty("cutoff_rank_2022")
        private Integer cutoffRank2022;

        @JsonProperty("oc_boys_cutoff_2024")
        private Integer ocBoysCutoff2024;
    }
}
