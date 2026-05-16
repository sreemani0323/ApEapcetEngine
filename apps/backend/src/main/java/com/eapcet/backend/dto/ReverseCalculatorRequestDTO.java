package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ReverseCalculatorRequestDTO {
    @JsonProperty("instcode")
    @NotBlank(message = "Institution code is required")
    @Size(max = 50, message = "Institution code too long")
    private String instcode;
    
    @JsonProperty("branch_code")
    @NotBlank(message = "Branch code is required")
    @Size(max = 20, message = "Branch code too long")
    private String branchCode;
    
    @JsonProperty("category")
    @NotBlank(message = "Category is required")
    @Pattern(regexp = "^[A-Z_]+$", message = "Category must be uppercase (e.g., OC_BOYS)")
    private String category;
    
    @JsonProperty("desired_probability")
    @NotNull(message = "Desired probability is required")
    @Min(value = 1, message = "Probability must be at least 1%")
    @Max(value = 99, message = "Probability cannot exceed 99%")
    private Double desiredProbability;
}
