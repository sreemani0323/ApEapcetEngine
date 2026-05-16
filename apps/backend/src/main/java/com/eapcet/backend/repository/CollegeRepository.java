package com.eapcet.backend.repository;

import com.eapcet.backend.model.College;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface CollegeRepository extends JpaRepository<College, Long> {

    @Query("SELECT COUNT(DISTINCT c.district) FROM College c")
    long countDistinctDistricts();
}
