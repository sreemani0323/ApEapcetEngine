-- ============================================================
-- AP EAPCET Cutoff Database - 3NF Normalized Schema
-- Target: PostgreSQL 16 (Supabase)
-- ============================================================

-- ============================================================
-- 1. COLLEGES (Master dimension table)
-- ============================================================
-- One row per unique institution (identified by instcode).
-- Contains all non-cutoff metadata about the college.
-- ============================================================
CREATE TABLE IF NOT EXISTS colleges (
    college_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instcode     VARCHAR(50)  NOT NULL UNIQUE,
    name         VARCHAR(300) NOT NULL,
    type         VARCHAR(20),
    inst_reg     VARCHAR(10),
    district     VARCHAR(100) NOT NULL,
    place        VARCHAR(100),
    coed         VARCHAR(10),
    affl         VARCHAR(50),
    estd         INT,
    a_reg        VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_colleges_district ON colleges(district);
CREATE INDEX IF NOT EXISTS idx_colleges_type ON colleges(type);
CREATE INDEX IF NOT EXISTS idx_colleges_instcode ON colleges(instcode);


-- ============================================================
-- 2. BRANCHES (Master branch code dimension)
-- ============================================================
-- One row per distinct branch_code across all years.
-- branch_type is an internal ML classification.
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
    branch_code  VARCHAR(20) PRIMARY KEY,
    branch_type  VARCHAR(20) NOT NULL DEFAULT 'Other'
        CHECK (branch_type IN ('Pure_CSE', 'AI_Specialized', 'Core', 'ECE', 'Other'))
);


-- ============================================================
-- 3. COLLEGE_BRANCHES (Junction / Association table)
-- ============================================================
-- Links a college to the branches it offers.
-- Placement data (avg_package, highest_package) lives here.
-- ============================================================
CREATE TABLE IF NOT EXISTS college_branches (
    college_branch_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    college_id         BIGINT       NOT NULL REFERENCES colleges(college_id) ON DELETE CASCADE,
    branch_code        VARCHAR(20)  NOT NULL REFERENCES branches(branch_code) ON DELETE RESTRICT,

    UNIQUE (college_id, branch_code)
);


-- ============================================================
-- 4. CUTOFFS (Fact / Measure table)
-- ============================================================
-- One row per (college_branch, year, category).
-- Stores the actual last-rank cutoff value in long/melted form.
-- ============================================================
CREATE TABLE IF NOT EXISTS cutoffs (
    cutoff_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    college_branch_id  BIGINT       NOT NULL REFERENCES college_branches(college_branch_id) ON DELETE CASCADE,
    year               SMALLINT     NOT NULL,
    category           VARCHAR(20)  NOT NULL,
    cutoff_rank        INT,

    UNIQUE (college_branch_id, year, category)
);

CREATE INDEX IF NOT EXISTS idx_cutoffs_query ON cutoffs(college_branch_id, year, category);
CREATE INDEX IF NOT EXISTS idx_cutoffs_category_year ON cutoffs(category, year);
CREATE INDEX IF NOT EXISTS idx_cutoffs_year ON cutoffs(year);
