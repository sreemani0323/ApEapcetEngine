package com.eapcet.backend.controller;

import com.eapcet.backend.dto.CollegeCardResponseDTO;
import com.eapcet.backend.dto.SearchRequestDTO;
import com.eapcet.backend.service.CollegeSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class CollegeSearchController {

    private final CollegeSearchService collegeSearchService;

    /**
     * Flexible Search API for Colleges
     * @param request SearchRequest containing filters and optional rank/category
     * @return List of CollegeCardResponseDTO with ML probability calculations
     */
    @PostMapping("/search-colleges")
    public ResponseEntity<List<CollegeCardResponseDTO>> searchColleges(@Valid @RequestBody SearchRequestDTO request) {
        log.info("Received Search Request: {}", request);

        // Required minimal check context (category must exist for probability math)
        if (request.getCategory() == null || request.getCategory().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<CollegeCardResponseDTO> results = collegeSearchService.searchColleges(request);

        log.info("Returning {} matched and predicted College Cards.", results.size());
        return ResponseEntity.ok(results);
    }
}
