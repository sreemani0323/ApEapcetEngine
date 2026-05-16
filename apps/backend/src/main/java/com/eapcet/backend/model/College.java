package com.eapcet.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "colleges")
@Getter
@Setter
public class College {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long collegeId;

    @Column(nullable = false, unique = true)
    private String instcode;

    @Column(nullable = false)
    private String name;

    private String type;
    
    @Column(name = "inst_reg")
    private String instReg;

    @Column(nullable = false)
    private String district;

    private String place;
    private String coed;
    private String affl;
    private Integer estd;

    @Column(name = "a_reg")
    private String aReg;
}
