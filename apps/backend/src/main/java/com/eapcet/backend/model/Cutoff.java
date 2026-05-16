package com.eapcet.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "cutoffs")
@Getter
@Setter
public class Cutoff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cutoff_id")
    private Long cutoffId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "college_branch_id", nullable = false)
    private CollegeBranch collegeBranch;

    @Column(nullable = false)
    private Integer year;

    @Column(length = 20, nullable = false)
    private String category;

    @Column(name = "cutoff_rank")
    private Integer cutoffRank;
}
