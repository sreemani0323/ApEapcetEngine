"""
AP EAPCET Cutoff Data → PostgreSQL 3NF Normalization Pipeline
==============================================================
Reads 2022.csv and 2024.csv, cleans / normalizes, and loads into
a 4-table 3NF PostgreSQL schema (colleges → branches → college_branches → cutoffs).

Usage:
    # Set env vars first:
    set DB_USER=postgres
    set DB_PASS=localdev
    set DB_HOST=localhost
    set DB_PORT=5432
    set DB_NAME=eapcet_db

    python normalize.py

Prerequisites:
    pip install -r ../requirements.txt
"""

import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import sys
import os
import warnings

warnings.filterwarnings("ignore")

# ============================================================
# DATABASE — uses shared config (env-var driven, no hardcoding)
# ============================================================
# Add parent dir to path so we can import shared modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from shared.db_config import get_engine

# ============================================================
# DATA PATHS — relative to data-pipeline/raw/
# ============================================================
RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "raw")
SQL_DIR = os.path.join(os.path.dirname(__file__), "..", "sql")

CSV_FILES = {
    2022: os.path.join(RAW_DIR, "2022.csv"),
    2024: os.path.join(RAW_DIR, "2024.csv"),
}

CUTOFF_COLS = [
    "OC_BOYS", "OC_GIRLS", "SC_BOYS", "SC_GIRLS",
    "ST_BOYS", "ST_GIRLS", "BCA_BOYS", "BCA_GIRLS",
    "BCB_BOYS", "BCB_GIRLS", "BCC_BOYS", "BCC_GIRLS",
    "BCD_BOYS", "BCD_GIRLS", "BCE_BOYS", "BCE_GIRLS",
    "OC_EWS_BOYS", "OC_EWS_GIRLS",
]

# ============================================================
# PLACE → DISTRICT MAP (full AP district structure)
# ============================================================
PLACE_NORMALIZATIONS = {
    "TIRUPATHI": "TIRUPATI",
    "RAYCHOTI": "RAYACHOTY",
    "KANDKUR": "KANDUKUR",
    "SATTENAPALLY": "SATTENAPALLI",
    "NARSARAOPET": "NARASARAOPET",
    "SULLURPET": "SULLURPETTA",
    "RAJAMAHENDRAVARAM": "RAJAHMUNDRY",
    "ANANTAPUR": "ANANTAPURAMU",
    "G.KOTHAPALLI": "KAKINADA",
    "TALLAREVU": "KAKINADA",
}

DIST_MAP = {
    # Kakinada
    "GOLLAPROLU": "Kakinada", "PEDDAPURAM": "Kakinada", "KAKINADA": "Kakinada",
    "DIVILI": "Kakinada", "SURAMPALEM": "Kakinada",
    # East Godavari
    "RAJAHMUNDRY": "East Godavari", "NALLAJERLA": "East Godavari",
    # Konaseema
    "ODALAREVU": "Konaseema", "AMALAPURAM": "Konaseema",
    "RAMACHANDRAPURAM": "Konaseema", "CHEYYERU": "Konaseema",
    # Eluru
    "JANGAREDDYGUDEM": "Eluru", "ELURU": "Eluru", "AGIRIPALLY": "Eluru", "NUZVID": "Eluru",
    # Alluri Sitharama Raju
    "RAMPACHODAVARAM": "Alluri Sitharama Raju", "YETAPAKA": "Alluri Sitharama Raju",
    # Palnadu
    "NARASARAOPET": "Palnadu", "SATTENAPALLI": "Palnadu", "MACHERLA": "Palnadu",
    "GURAZALA": "Palnadu", "AMARAVATHI": "Palnadu",
    # Guntur
    "GUNTUR": "Guntur", "MANGALAGIRI": "Guntur", "TENALI": "Guntur",
    "VADLAMUDI": "Guntur", "PONNUR": "Guntur",
    # Bapatla
    "BAPATLA": "Bapatla", "CHIRALA": "Bapatla",
    # NTR
    "VIJAYAWADA": "NTR", "PARITALA": "NTR", "MYLAVARAM": "NTR",
    "KANCHIKACHERLA": "NTR", "JAGGAIAHPETA": "NTR", "IBRAHIMPATNAM": "NTR",
    "VIJAYAWADA RURAL": "NTR", "TIRUVURU": "NTR",
    # Krishna
    "GUDLAVALLERU": "Krishna", "MACHILIPATNAM": "Krishna", "LANKAPALLI": "Krishna",
    "PEDANA": "Krishna", "TELAPROLU": "Krishna", "GUDIVADA": "Krishna",
    # Prakasam
    "KANIGIRI": "Prakasam", "PODILI": "Prakasam", "CHIMAKURTHY": "Prakasam",
    "MARKAPUR": "Prakasam", "SINGARAYAKONDA": "Prakasam", "ONGOLE": "Prakasam",
    # SPSR Nellore
    "KANDUKUR": "SPSR Nellore", "KAVALI": "SPSR Nellore", "NELLORE": "SPSR Nellore",
    "VIDYANAGAR": "SPSR Nellore", "NORTH RAJU PALEM": "SPSR Nellore",
    "ATMAKUR N": "SPSR Nellore", "GUDUR": "SPSR Nellore",
    # Srikakulam
    "TEKKALI": "Srikakulam", "SRIKAKULAM": "Srikakulam",
    # Vizianagaram
    "RAJAM": "Vizianagaram", "BHOGAPURAM": "Vizianagaram",
    "CHEEPURUPALLI": "Vizianagaram", "BOBBILI": "Vizianagaram", "VIZIANAGARAM": "Vizianagaram",
    # Visakhapatnam
    "BHEEMUNIPATNAM": "Visakhapatnam", "VISAKHAPATNAM": "Visakhapatnam",
    "DAKAMARRI VILLAGE": "Visakhapatnam", "PINAGADI": "Visakhapatnam",
    # Anakapalli
    "NARSIPATNAM": "Anakapalli", "ANAKAPALLE": "Anakapalli", "SABBAVARAM": "Anakapalli",
    # West Godavari
    "BHIMAVARAM": "West Godavari", "TADEPALLIGUDEM": "West Godavari",
    "NARSAPURAM": "West Godavari",
    # Anantapuramu
    "ANANTAPURAMU": "Anantapuramu", "TADIPATRI": "Anantapuramu", "GOOTY": "Anantapuramu",
    # Sri Sathya Sai
    "PUTAPARTHI": "Sri Sathya Sai", "MADAKASIRA": "Sri Sathya Sai",
    # Annamayya
    "MADANAPALLE": "Annamayya", "KALIKIRI": "Annamayya", "PILER": "Annamayya",
    "RAYACHOTY": "Annamayya", "RAJAMPETA": "Annamayya",
    # Tirupati
    "TIRUPATI": "Tirupati", "SULLURPETTA": "Tirupati", "PUTTUR": "Tirupati",
    "RANGAMPETA": "Tirupati",
    # Chittoor
    "KUPPAM": "Chittoor", "PALAMNER": "Chittoor", "CHITTOOR": "Chittoor",
    # YSR Kadapa
    "KADAPA": "YSR Kadapa", "BADVEL": "YSR Kadapa", "PALLAVOLU": "YSR Kadapa",
    "PRODDATUR": "YSR Kadapa", "PULIVENDULA": "YSR Kadapa",
    # Kurnool
    "KURNOOL": "Kurnool", "CHINNATEKURU VILLAGE": "Kurnool",
    "ADONI": "Kurnool", "YEMMIGANOOR": "Kurnool",
    # Nandyal
    "NANDYAL": "Nandyal",
}

# ============================================================
# BRANCH TYPE CLASSIFICATION (Removed per user request)
# ============================================================
def classify_branch(code: str) -> str:
    """Branch classifications have been removed. Defaults to Other."""
    return "Other"


# ============================================================
# DATA LOADING & CLEANING
# ============================================================
def load_csv(filepath: str, year: int) -> pd.DataFrame:
    """Load a single CSV and attach year column."""
    df = pd.read_csv(filepath, dtype=str)
    df["year"] = year

    # Normalize PLACE for district mapping
    df["PLACE"] = df["PLACE"].astype(str).str.strip().str.upper()
    df["PLACE"] = df["PLACE"].str.replace(r"\s+", " ", regex=True)
    df["PLACE"] = df["PLACE"].replace(PLACE_NORMALIZATIONS)

    # Resolve district: use our map, fallback to existing new_dist column
    df["district"] = df["PLACE"].map(DIST_MAP).fillna(df.get("new_dist", "Unknown"))

    # Clean institution name
    df["NAME OF THE INSTITUTION"] = (
        df["NAME OF THE INSTITUTION"]
        .astype(str)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )

    # Convert cutoff columns to numeric
    for col in CUTOFF_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Convert ESTD to int
    df["ESTD"] = pd.to_numeric(df["ESTD"], errors="coerce")

    return df


# ============================================================
# CREATE TABLES (uses schema.sql)
# ============================================================
def create_tables(engine):
    """Run schema.sql to create all tables."""
    print("[1/5] Creating tables...")

    schema_path = os.path.join(SQL_DIR, "schema.sql")
    if not os.path.exists(schema_path):
        print(f"  ERROR: {schema_path} not found!")
        sys.exit(1)

    with open(schema_path, "r") as f:
        sql_content = f.read()

    with engine.connect() as conn:
        # Split by semicolons and execute each statement
        statements = [s.strip() for s in sql_content.split(";") if s.strip()]
        for stmt in statements:
            lower = stmt.lower().strip()
            # Skip CREATE DATABASE / USE statements
            if lower.startswith("create database") or lower.startswith("use "):
                continue
            try:
                conn.execute(text(stmt))
            except Exception as e:
                if "already exists" not in str(e).lower():
                    print(f"  Warning: {e}")
        conn.commit()

    print("  ✓ Tables ready.")


# ============================================================
# INSERT COLLEGES
# ============================================================
def insert_colleges(engine, df_all: pd.DataFrame) -> dict:
    """Insert unique colleges. Returns {instcode: college_id} map."""
    print("[2/5] Inserting colleges...")

    # Get unique colleges (prefer 2024 metadata, fallback to 2022)
    df_2024 = df_all[df_all["year"] == 2024]
    df_2022 = df_all[df_all["year"] == 2022]

    college_cols = ["INSTCODE", "NAME OF THE INSTITUTION", "TYPE", "INST_REG",
                    "district", "PLACE", "COED", "AFFL.", "ESTD", "A_REG"]

    colleges_2024 = df_2024[college_cols].drop_duplicates(subset=["INSTCODE"])
    colleges_2022 = df_2022[college_cols].drop_duplicates(subset=["INSTCODE"])

    # Union: 2024 takes priority
    colleges = pd.concat([colleges_2024, colleges_2022]).drop_duplicates(subset=["INSTCODE"], keep="first")

    colleges = colleges.rename(columns={
        "INSTCODE": "instcode",
        "NAME OF THE INSTITUTION": "name",
        "TYPE": "type",
        "INST_REG": "inst_reg",
        "PLACE": "place",
        "COED": "coed",
        "AFFL.": "affl",
        "ESTD": "estd",
        "A_REG": "a_reg",
    })

    colleges["estd"] = pd.to_numeric(colleges["estd"], errors="coerce").astype("Int64")

    instcode_to_id = {}
    with engine.connect() as conn:
        for _, row in colleges.iterrows():
            try:
                conn.execute(text("""
                    INSERT INTO colleges (instcode, name, type, inst_reg, district, place, coed, affl, estd, a_reg)
                    VALUES (:instcode, :name, :type, :inst_reg, :district, :place, :coed, :affl, :estd, :a_reg)
                    ON CONFLICT (instcode) DO UPDATE SET name = EXCLUDED.name
                """), {
                    "instcode": row["instcode"],
                    "name": row["name"],
                    "type": row.get("type"),
                    "inst_reg": row.get("inst_reg"),
                    "district": row["district"],
                    "place": row.get("place"),
                    "coed": row.get("coed"),
                    "affl": row.get("affl"),
                    "estd": int(row["estd"]) if pd.notna(row["estd"]) else None,
                    "a_reg": row.get("a_reg"),
                })
            except Exception as e:
                print(f"  Warning inserting college {row['instcode']}: {e}")

        conn.commit()

        # Build instcode → college_id map
        result = conn.execute(text("SELECT college_id, instcode FROM colleges"))
        for r in result:
            instcode_to_id[r[1]] = r[0]

    print(f"  ✓ {len(instcode_to_id)} colleges inserted/updated.")
    return instcode_to_id


# ============================================================
# INSERT BRANCHES
# ============================================================
def insert_branches(engine, df_all: pd.DataFrame) -> set:
    """Insert unique branch codes with classification. Returns set of branch_codes."""
    print("[3/5] Inserting branches...")

    branch_codes = df_all["branch_code"].astype(str).str.strip().str.upper().unique()

    inserted = 0
    with engine.connect() as conn:
        for code in sorted(branch_codes):
            btype = classify_branch(code)
            try:
                conn.execute(text("""
                    INSERT INTO branches (branch_code, branch_type)
                    VALUES (:code, :btype)
                    ON CONFLICT (branch_code) DO UPDATE SET branch_type = EXCLUDED.branch_type
                """), {"code": code, "btype": btype})
                inserted += 1
            except Exception as e:
                print(f"  Warning inserting branch {code}: {e}")

        conn.commit()

    print(f"  ✓ {inserted} branches inserted/updated.")
    branch_type_counts = {}
    for code in branch_codes:
        bt = classify_branch(code)
        branch_type_counts[bt] = branch_type_counts.get(bt, 0) + 1
    for bt, cnt in sorted(branch_type_counts.items()):
        print(f"    {bt}: {cnt}")

    return set(branch_codes)


# ============================================================
# INSERT COLLEGE_BRANCHES
# ============================================================
def insert_college_branches(engine, df_all: pd.DataFrame, instcode_to_id: dict) -> dict:
    """Insert college-branch junctions. Returns {(instcode, branch_code): college_branch_id}."""
    print("[4/5] Inserting college-branch associations...")

    pairs = (
        df_all[["INSTCODE", "branch_code"]]
        .drop_duplicates()
        .copy()
    )
    pairs["branch_code"] = pairs["branch_code"].astype(str).str.strip().str.upper()

    cb_map = {}
    inserted = 0
    skipped = 0

    with engine.connect() as conn:
        values_str = []
        for _, row in pairs.iterrows():
            instcode = row["INSTCODE"]
            branch = row["branch_code"]
            cid = instcode_to_id.get(instcode)
            if cid is None:
                skipped += 1
                continue
            values_str.append(f"({cid}, '{branch}')")

        for i in range(0, len(values_str), 500):
            chunk = values_str[i:i + 500]
            sql = f"INSERT INTO college_branches (college_id, branch_code) VALUES {','.join(chunk)} ON CONFLICT DO NOTHING"
            try:
                conn.execute(text(sql))
                conn.commit()
                inserted += len(chunk)
            except Exception as e:
                conn.rollback()
                print(f"  Warning inserting batch: {e}")

        conn.commit()

        # Build the map
        result = conn.execute(text("""
            SELECT cb.college_branch_id, c.instcode, cb.branch_code
            FROM college_branches cb
            JOIN colleges c ON c.college_id = cb.college_id
        """))
        for r in result:
            cb_map[(r[1], r[2])] = r[0]

    print(f"  ✓ {inserted} college-branch associations inserted. ({skipped} skipped)")
    return cb_map


# ============================================================
# INSERT CUTOFFS (bulk — the heavy lift)
# ============================================================
def insert_cutoffs(engine, df_all: pd.DataFrame, cb_map: dict):
    """Melt cutoff columns and insert into cutoffs table."""
    print("[5/5] Inserting cutoff records...")

    total_inserted = 0
    total_skipped = 0

    for year in sorted(df_all["year"].unique()):
        df_year = df_all[df_all["year"] == year].copy()
        df_year["branch_code"] = df_year["branch_code"].astype(str).str.strip().str.upper()

        rows = []
        for _, row in df_year.iterrows():
            instcode = row["INSTCODE"]
            branch = row["branch_code"]
            key = (instcode, branch)
            cb_id = cb_map.get(key)

            if cb_id is None:
                total_skipped += 1
                continue

            for cat in CUTOFF_COLS:
                val = row.get(cat)
                cutoff_rank = int(val) if pd.notna(val) and val != "" else None
                rows.append({
                    "college_branch_id": cb_id,
                    "year": int(year),
                    "category": cat,
                    "cutoff_rank": cutoff_rank,
                })

        print(f"  Inserting {len(rows):,} cutoff records for year {year}...")
        
        # Deduplicate to prevent Postgres "cannot affect row a second time" error
        df_cutoffs = pd.DataFrame(rows).drop_duplicates(subset=["college_branch_id", "year", "category"], keep="last")
        dedup_rows = df_cutoffs.to_dict(orient="records")

        values_str = []
        for r in dedup_rows:
            cr = str(r["cutoff_rank"]) if r["cutoff_rank"] is not None else "NULL"
            values_str.append(f"({r['college_branch_id']}, {r['year']}, '{r['category']}', {cr})")

        with engine.connect() as conn:
            for i in range(0, len(values_str), 500):
                chunk = values_str[i:i + 500]
                sql = f"INSERT INTO cutoffs (college_branch_id, year, category, cutoff_rank) VALUES {','.join(chunk)} ON CONFLICT (college_branch_id, year, category) DO UPDATE SET cutoff_rank = EXCLUDED.cutoff_rank"
                try:
                    conn.execute(text(sql))
                    conn.commit()  # commit each batch
                except Exception as e:
                    conn.rollback()  # rollback on failure to save transaction
                    print(f"    Warning at batch {i}: {e}")
                    total_skipped += len(chunk)

        total_inserted += len(dedup_rows)

    print(f"  ✓ {total_inserted:,} cutoff records inserted/updated. ({total_skipped} skipped)")
    return total_inserted


# ============================================================
# SUMMARY REPORT
# ============================================================
def print_summary(engine):
    """Print a quick summary of what's in the database."""
    print(f"\n{'='*60}")
    print("  DATABASE SUMMARY")
    print(f"{'='*60}")

    queries = [
        ("Colleges", "SELECT COUNT(*) FROM colleges"),
        ("Branches", "SELECT COUNT(*) FROM branches"),
        ("College-Branch Links", "SELECT COUNT(*) FROM college_branches"),
        ("Cutoff Records", "SELECT COUNT(*) FROM cutoffs"),
        ("Cutoffs with rank", "SELECT COUNT(*) FROM cutoffs WHERE cutoff_rank IS NOT NULL"),
        ("Cutoffs NULL rank", "SELECT COUNT(*) FROM cutoffs WHERE cutoff_rank IS NULL"),
        ("Distinct Years", "SELECT COUNT(DISTINCT year) FROM cutoffs"),
        ("Distinct Categories", "SELECT COUNT(DISTINCT category) FROM cutoffs"),
    ]

    with engine.connect() as conn:
        for label, q in queries:
            result = conn.execute(text(q))
            val = result.scalar()
            print(f"  {label:30s}: {val:>10,}")

        # Branch type distribution
        print(f"\n  Branch Type Distribution:")
        result = conn.execute(text("""
            SELECT branch_type, COUNT(*) as cnt
            FROM branches
            GROUP BY branch_type
            ORDER BY cnt DESC
        """))
        for r in result:
            print(f"    {r[0]:20s}: {r[1]}")

        # District distribution
        print(f"\n  Top 10 Districts by Colleges:")
        result = conn.execute(text("""
            SELECT district, COUNT(*) as cnt
            FROM colleges
            GROUP BY district
            ORDER BY cnt DESC
            LIMIT 10
        """))
        for r in result:
            print(f"    {r[0]:25s}: {r[1]}")

        # Cutoffs per year
        print(f"\n  Cutoffs per Year:")
        result = conn.execute(text("""
            SELECT year, COUNT(*) as cnt
            FROM cutoffs
            WHERE cutoff_rank IS NOT NULL
            GROUP BY year
        """))
        for r in result:
            print(f"    {r[0]}: {r[1]:,}")

    print(f"{'='*60}")


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 60)
    print("  AP EAPCET → PostgreSQL 3NF Normalization Pipeline")
    print("=" * 60)

    # Step 0: Load CSVs
    print("\nLoading CSV files...")
    frames = []
    for year, path in CSV_FILES.items():
        if not os.path.exists(path):
            print(f"  ERROR: {path} not found!")
            sys.exit(1)
        df = load_csv(path, year)
        frames.append(df)
        print(f"  Loaded {path}: {len(df)} rows")

    df_all = pd.concat(frames, ignore_index=True)
    print(f"  Combined: {len(df_all)} rows\n")

    # Step 1: Create tables
    engine = get_engine()
    create_tables(engine)

    try:
        # Steps 2-5: Insert in 3NF order
        instcode_to_id = insert_colleges(engine, df_all)
        insert_branches(engine, df_all)
        cb_map = insert_college_branches(engine, df_all, instcode_to_id)
        insert_cutoffs(engine, df_all, cb_map)

        # Summary
        print_summary(engine)
    finally:
        engine.dispose()

    print("\n✓ Normalization complete!")


if __name__ == "__main__":
    main()
