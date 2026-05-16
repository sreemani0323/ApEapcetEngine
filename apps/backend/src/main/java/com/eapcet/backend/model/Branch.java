package com.eapcet.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "branches")
@Getter
@Setter
public class Branch {

    @Id
    @Column(name = "branch_code", length = 20)
    private String branchCode;

    @Column(name = "branch_type", nullable = false)
    private String branchType;
}
