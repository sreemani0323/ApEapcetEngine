package com.eapcet.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

/**
 * Lightweight DTO for client-side Trie autocomplete.
 * Sent once on app boot, cached forever client-side.
 */
@Data
@Builder
public class CollegeNameDTO {
    @JsonProperty("instcode")
    private String instcode;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("district")
    private String district;
    
    @JsonProperty("type_label")
    private String typeLabel;
}
