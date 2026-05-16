package com.eapcet.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SearchRequestDTO {
    @Min(value = 1, message = "Rank must be a positive number")
    @Max(value = 500000, message = "Rank cannot exceed 500000")
    private Integer rank;

    @Pattern(regexp = "^[A-Z_]+$", message = "Category must be uppercase with underscores (e.g., OC_BOYS)")
    private String category;

    @Size(max = 100, message = "District name too long")
    private String district;

    @Size(max = 20, message = "Branch code too long")
    private String branchCode;

    @Size(max = 10, message = "Region code too long")
    private String region;

    @Size(max = 10, message = "College type too long")
    private String collegeType;

    @Size(max = 200, message = "College name search too long")
    private String collegeName;
}
