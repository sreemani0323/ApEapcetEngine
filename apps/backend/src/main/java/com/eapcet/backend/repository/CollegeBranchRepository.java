package com.eapcet.backend.repository;

import com.eapcet.backend.model.CollegeBranch;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CollegeBranchRepository extends JpaRepository<CollegeBranch, Long>,
        JpaSpecificationExecutor<CollegeBranch> {

    /**
     * Legacy JPQL search — retained for backward compat but superseded by
     * CollegeBranchSpecification for all new code paths.
     */
    @Query("""
        SELECT cb FROM CollegeBranch cb
        JOIN FETCH cb.college c
        JOIN FETCH cb.branch b
        WHERE (:district IS NULL OR c.district = CAST(:district AS string))
          AND (:branchCode IS NULL OR b.branchCode = CAST(:branchCode AS string))
          AND (:region IS NULL OR c.instReg = CAST(:region AS string))
          AND (:collegeType IS NULL OR c.type = CAST(:collegeType AS string))
          AND (:collegeName IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:collegeName AS string), '%')))
    """)
    List<CollegeBranch> searchFlexible(
            @Param("district") String district,
            @Param("branchCode") String branchCode,
            @Param("region") String region,
            @Param("collegeType") String collegeType,
            @Param("collegeName") String collegeName,
            Pageable pageable
    );

    @Query("""
        SELECT cb FROM CollegeBranch cb
        JOIN FETCH cb.college c
        JOIN FETCH cb.branch b
        WHERE LOWER(c.instcode) = LOWER(:instcode)
          AND b.branchCode = :branchCode
    """)
    Optional<CollegeBranch> findByInstcodeAndBranchCode(
            @Param("instcode") String instcode,
            @Param("branchCode") String branchCode
    );

    @Query("""
        SELECT cb FROM CollegeBranch cb
        JOIN FETCH cb.branch b
        WHERE cb.avgPackage IS NOT NULL OR cb.highestPackage IS NOT NULL
    """)
    List<CollegeBranch> findAllWithPackageData();

    /** Direct instcode lookup — O(log N) via index */
    @Query("""
        SELECT cb FROM CollegeBranch cb
        JOIN FETCH cb.college c
        JOIN FETCH cb.branch b
        WHERE LOWER(c.instcode) = LOWER(:instcode)
    """)
    List<CollegeBranch> findByCollegeInstcode(@Param("instcode") String instcode);

    /** Aggregate district summary via SQL GROUP BY */
    @Query("""
        SELECT c.district, COUNT(DISTINCT c.collegeId), COUNT(cb)
        FROM CollegeBranch cb JOIN cb.college c
        GROUP BY c.district
        ORDER BY COUNT(DISTINCT c.collegeId) DESC
    """)
    List<Object[]> getDistrictSummaryAggregated();
}
