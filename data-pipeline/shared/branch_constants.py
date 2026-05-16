"""
Branch Classification Constants
================================
Single source of truth for branch categorization used by:
  - data-pipeline/etl/normalize.py
  - data-pipeline/retrain/train_model.py
  - apps/ml-service/app.py

These are INTERNAL ML features only. They are NOT shown in the UI.
"""

# AI/ML/Data Science specialized branches
AI_SPECIALIZED = frozenset({
    "CSD", "CSM", "CAI", "AIM", "DS", "INF", "CS", "CSC", "CSO",
    "CBA", "CIC", "CAD", "CSB", "AID", "ASE", "IOT", "CIT",
    "CSG", "CSER", "AI", "AUT", "CSS",
})

# Pure Computer Science
PURE_CSE = frozenset({"CSE"})

# Core traditional engineering
CORE_BRANCHES = frozenset({"CIV", "MEC", "EEE", "MIN", "CHE", "MET"})

# Electronics family
ECE_BRANCHES = frozenset({"ECE", "EIE"})

# Category → ordinal tier mapping (for ML feature engineering)
TIER_MAP = {
    "OC_BOYS": 0, "OC_GIRLS": 0,
    "SC_BOYS": 1, "SC_GIRLS": 1,
    "ST_BOYS": 2, "ST_GIRLS": 2,
    "BCA_BOYS": 3, "BCA_GIRLS": 3,
    "BCB_BOYS": 4, "BCB_GIRLS": 4,
    "BCC_BOYS": 5, "BCC_GIRLS": 5,
    "BCD_BOYS": 6, "BCD_GIRLS": 6,
    "BCE_BOYS": 7, "BCE_GIRLS": 7,
    "OC_EWS_BOYS": 8, "OC_EWS_GIRLS": 8,
}


def classify_branch(branch_code: str) -> str:
    """Classify a branch code into its type. Used during ETL normalization."""
    bc = branch_code.strip().upper()
    if bc in PURE_CSE:
        return "Pure_CSE"
    if bc in AI_SPECIALIZED:
        return "AI_Specialized"
    if bc in CORE_BRANCHES:
        return "Core"
    if bc in ECE_BRANCHES:
        return "ECE"
    return "Other"
