"""
Load Branch-Level Placement Data into PostgreSQL
=================================================
Reads placements.csv and updates the college_branches table
with highest_package and avg_package columns.

Usage:
    python load_placements_branch.py
"""

import pandas as pd
from sqlalchemy import text
import os
import sys

# Import shared config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from shared.db_config import get_engine

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "raw")

BRANCH_MAP = {
    'Civil Engineering': 'CIV',
    'Computer Science & Engineering': 'CSE',
    'Electronics & Communication Engineering': 'ECE',
    'Electrical & Electronics Engineering': 'EEE',
    'Mechanical Engineering': 'MEC',
    'CSE (Data Science)': 'CSD',
    'CSE (AI & ML Specialization)': 'CSM',
    'Information Technology': 'INF',
    'Artificial Intelligence & Machine Learning': 'AIM',
    'Artificial Intelligence & Data Science': 'AID',
    'CSE (Artificial Intelligence)': 'CAI',
    'CSE (Cyber Security)': 'CSC',
    'Chemical Engineering': 'CHE',
    'Doctor of Pharmacy (Pharm.D)': 'PHD',
    'B.Pharm': 'PHB',
    'Electronics & Instrumentation Engineering': 'EIE',
    'Agricultural Engineering': 'AGR',
    'Automobile Engineering': 'AUT',
    'CSE (Business Systems)': 'CSB',
    'Internet of Things': 'IOT',
    'Aerospace Engineering': 'ASE',
    'Mining Engineering': 'MIN',
    'Biotechnology': 'BIO',
    'Geo-Informatics Engineering': 'GIN',
    'Metallurgical Engineering': 'MET'
}

def main():
    engine = get_engine()
    
    with engine.connect() as conn:
        print("[1/3] Ensuring placement columns exist...")
        # PostgreSQL: ADD COLUMN IF NOT EXISTS
        conn.execute(text("""
            ALTER TABLE college_branches
            ADD COLUMN IF NOT EXISTS highest_package VARCHAR(50),
            ADD COLUMN IF NOT EXISTS avg_package VARCHAR(50)
        """))
        conn.commit()
        print("  ✓ Columns ready.")

        print("\n[2/3] Fetching colleges & branches from database...")
        result = conn.execute(text("SELECT college_id, instcode FROM colleges"))
        college_map = {row[1]: row[0] for row in result.fetchall()}
        
        result = conn.execute(text("SELECT college_branch_id, college_id, branch_code FROM college_branches"))
        cb_map = {}
        for row in result.fetchall():
            cb_id, cid, bcode = row
            cb_map[(cid, bcode)] = cb_id
        
        print(f"  Found {len(college_map)} colleges, {len(cb_map)} college-branches")

        print("\n[3/3] Loading placements.csv...")
        placements_path = os.path.join(RAW_DIR, "placements.csv")
        if not os.path.exists(placements_path):
            print(f"  ERROR: {placements_path} not found!")
            sys.exit(1)

        df = pd.read_csv(placements_path)
        
        updates = 0
        missed = 0
        
        for _, row in df.iterrows():
            instcode = row['instcode'].strip()
            raw_branch_name = row['branch_code'].strip()
            
            highest_str = f"{row['highest_package']:.2f} LPA"
            avg_str = f"{row['average_package']:.2f} LPA"
            
            branch_code = BRANCH_MAP.get(raw_branch_name)
            college_id = college_map.get(instcode)
            
            if not branch_code or not college_id:
                missed += 1
                continue
                
            cb_id = cb_map.get((college_id, branch_code))
            
            if cb_id:
                conn.execute(text("""
                    UPDATE college_branches 
                    SET highest_package = :h, avg_package = :a
                    WHERE college_branch_id = :cb_id
                """), {"h": highest_str, "a": avg_str, "cb_id": cb_id})
                updates += 1
            else:
                missed += 1
                
        conn.commit()
                
        print("\n" + "="*40)
        print(" PLACEMENT DATA LOADED ")
        print("="*40)
        print(f" Updated {updates} college-branches with package data.")
        print(f" Missed {missed} rows (unmapped branch names).")

if __name__ == "__main__":
    main()
