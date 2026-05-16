package com.eapcet.backend.repository;

import com.eapcet.backend.model.Cutoff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CutoffRepository extends JpaRepository<Cutoff, Long> {

    Optional<Cutoff> findByCollegeBranch_CollegeBranchIdAndCategoryAndYear(Long collegeBranchId, String category, Integer year);

    List<Cutoff> findByCollegeBranch_CollegeBranchIdAndCategoryInAndYearIn(Long collegeBranchId, List<String> categories, List<Integer> years);

    @Query("SELECT COUNT(DISTINCT c.category) FROM Cutoff c")
    long countDistinctCategories();

    /** Batch fetch cutoffs for multiple college_branch_ids — eliminates N+1 */
    @Query("SELECT c FROM Cutoff c WHERE c.collegeBranch.collegeBranchId IN :cbIds AND c.category = :category AND c.year IN :years")
    List<Cutoff> findBatchByCbIdsAndCategoryAndYears(
            @Param("cbIds") List<Long> cbIds,
            @Param("category") String category,
            @Param("years") List<Integer> years);
}
