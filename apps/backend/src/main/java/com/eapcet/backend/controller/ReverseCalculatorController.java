package com.eapcet.backend.controller;

import com.eapcet.backend.dto.ReverseCalculatorRequestDTO;
import com.eapcet.backend.dto.ReverseCalculatorResponseDTO;
import com.eapcet.backend.service.ReverseCalculatorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class ReverseCalculatorController {

    private final ReverseCalculatorService reverseCalculatorService;

    /**
     * Reverse Calculator API
     * @param request target College, Branch, Category and desired probability %
     * @return Required Rank to hit exactly that probability margin.
     */
    @PostMapping("/reverse-calculate")
    public ResponseEntity<ReverseCalculatorResponseDTO> reverseCalculate(
            @Valid @RequestBody ReverseCalculatorRequestDTO request) {
        log.info("Received Reverse Calculator Request: {}", request);

        ReverseCalculatorResponseDTO res = reverseCalculatorService.reverseCalculate(request);
        log.info("Returning Reverse Calc logic gap rank: {}", res.getRequiredRank());
        return ResponseEntity.ok(res);
    }
}
