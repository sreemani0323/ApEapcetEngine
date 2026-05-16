package com.eapcet.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "college_branches")
@Getter
@Setter
public class CollegeBranch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "college_branch_id")
    private Long collegeBranchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "college_id", nullable = false)
    private College college;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_code", nullable = false)
    private Branch branch;

    @Column(name = "highest_package", length = 50)
    private String highestPackage;

    @Column(name = "avg_package", length = 50)
    private String avgPackage;
}
