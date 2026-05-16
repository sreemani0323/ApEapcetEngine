USE eapcet_db;

CREATE TABLE IF NOT EXISTS college_metadata (
    college_id          BIGINT PRIMARY KEY,
    highest_package     VARCHAR(50) DEFAULT 'unavailable',
    avg_package         VARCHAR(50) DEFAULT 'unavailable',
    placement_percent   DECIMAL(5,2) NULL,
    hostel_available    BOOLEAN NULL,
    hostel_fee_approx   DECIMAL(10,2) NULL,
    total_fees_approx   DECIMAL(10,2) NULL,
    naac_grade          VARCHAR(10) NULL,
    last_updated        DATE DEFAULT (CURRENT_DATE),
    data_source         VARCHAR(100) NULL,
    FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE CASCADE
);
