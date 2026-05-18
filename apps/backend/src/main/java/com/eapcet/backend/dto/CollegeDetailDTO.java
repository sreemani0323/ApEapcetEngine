package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CollegeDetailDTO {
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

    @JsonProperty("affiliation")
    private String affiliation;

    @JsonProperty("region")
    private String region;

    /** Reservation category used for cutoff matrix (e.g. OC_BOYS, SC_GIRLS). */
    @JsonProperty("category")
    private String category;

    @JsonProperty("branches")
    private List<BranchDetail> branches;

    @Data
    @Builder
    public static class BranchDetail {
        @JsonProperty("branch_code")
        private String branchCode;

        @JsonProperty("cutoff_2022")
        private Integer cutoff2022;

        @JsonProperty("cutoff_2024")
        private Integer cutoff2024;

        @JsonProperty("avg_package")
        private String avgPackage;

        @JsonProperty("highest_package")
        private String highestPackage;
    }
}
