package com.eapcet.backend.repository;

import com.eapcet.backend.model.Branch;
import com.eapcet.backend.model.College;
import com.eapcet.backend.model.CollegeBranch;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Type-safe JPA Specification builder for CollegeBranch dynamic search.
 * 
 * SECURITY: All predicates use parameterized Criteria API — immune to SQL injection.
 * This replaces the raw JPQL string concatenation in searchFlexible().
 */
public final class CollegeBranchSpecification {

    private CollegeBranchSpecification() {}

    public static Specification<CollegeBranch> withFilters(
            String district,
            String branchCode,
            String region,
            String collegeType,
            String collegeName
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Eager fetch joins to avoid N+1, but only for main query (not count queries)
            if (query != null && CollegeBranch.class.equals(query.getResultType())) {
                root.fetch("college", JoinType.INNER);
                root.fetch("branch", JoinType.INNER);
            }

            // Use join (not fetch) for WHERE clause predicates
            Join<CollegeBranch, College> college = root.join("college", JoinType.INNER);
            Join<CollegeBranch, Branch> branch = root.join("branch", JoinType.INNER);

            if (district != null && !district.isBlank()) {
                predicates.add(cb.equal(college.get("district"), district));
            }
            if (branchCode != null && !branchCode.isBlank()) {
                predicates.add(cb.equal(branch.get("branchCode"), branchCode));
            }
            if (region != null && !region.isBlank()) {
                predicates.add(cb.equal(college.get("instReg"), region));
            }
            if (collegeType != null && !collegeType.isBlank()) {
                predicates.add(cb.equal(college.get("type"), collegeType));
            }
            if (collegeName != null && !collegeName.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(college.get("name")),
                        "%" + collegeName.toLowerCase() + "%"
                ));
            }

            // Deduplicate (fetch joins can cause duplicates)
            if (query != null) {
                query.distinct(true);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
