package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CollegeBranchOptionDTO {

    @JsonProperty("branch_code")
    private String branchCode;
}
