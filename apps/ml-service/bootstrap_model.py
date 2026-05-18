"""
Bootstrap minimal ML artifacts when no trained model exists (local dev / fresh clone).
Uses synthetic rows that mirror the training feature schema.
"""
from __future__ import annotations

import os
import pickle
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
FEATURE_COLS = [
    "district_enc", "branch_code_enc", "type_enc", "affl_enc",
    "coed_enc", "category_enc", "a_reg_enc",
    "college_age", "is_girls", "reservation_tier", "year",
    "other_year_cutoff", "historical_trend",
    "grp_med_dist_branch_cat", "grp_med_branch_cat",
    "grp_med_dist_cat", "college_median", "oc_boys_baseline",
]


def _synthetic_frame(n: int = 800) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    districts = ["Guntur", "Visakhapatnam", "Kakinada", "NTR", "Anantapur"]
    branches = ["CSE", "ECE", "EEE", "CIV", "MEC"]
    categories = ["OC_BOYS", "OC_GIRLS", "SC_BOYS", "BCA_BOYS"]
    rows = []
    for i in range(n):
        d, b, cat = rng.choice(districts), rng.choice(branches), rng.choice(categories)
        cutoff = int(rng.integers(3000, 120000))
        rows.append({
            "district": d, "branch_code": b, "college_type": "SF", "affl": "JNTU",
            "coed": "COED", "category": cat, "a_reg": "AU",
            "estd": 2005, "year": 2024,
            "cutoff_rank": cutoff,
            "other_year_cutoff": cutoff + int(rng.integers(-5000, 5000)),
            "historical_trend": int(rng.integers(-3000, 3000)),
            "grp_med_dist_branch_cat": cutoff,
            "grp_med_branch_cat": cutoff,
            "grp_med_dist_cat": cutoff,
            "college_median": cutoff,
            "oc_boys_baseline": cutoff,
            "college_id": i % 50,
        })
    return pd.DataFrame(rows)


def build_group_lookups(df: pd.DataFrame) -> dict:
    year = 2024

    def pack(series):
        out = {}
        for key, val in series.items():
            if isinstance(key, tuple):
                parts = [str(x) for x in key]
            else:
                parts = [str(key)]
            out["|".join(parts)] = float(val)
        return out

    d = df[df["year"] == year] if "year" in df.columns else df
    return {
        "grp_med_dist_branch_cat": pack(
            d.groupby(["district", "branch_code", "category", "year"])["cutoff_rank"].median()
        ),
        "grp_med_branch_cat": pack(
            d.groupby(["branch_code", "category", "year"])["cutoff_rank"].median()
        ),
        "grp_med_dist_cat": pack(
            d.groupby(["district", "category", "year"])["cutoff_rank"].median()
        ),
        "college_median": pack(
            d.groupby(["college_id", "year"])["cutoff_rank"].median()
        ),
        "median_estd": float(pd.to_numeric(df["estd"], errors="coerce").median()) if "estd" in df.columns else 2000.0,
    }


def bootstrap() -> None:
    print("Bootstrapping minimal ML artifacts (no DB)...")
    df = _synthetic_frame()
    df["college_age"] = df["year"] - df["estd"]
    df["is_girls"] = df["category"].str.contains("GIRLS").astype(int)
    tier = {
        "OC_BOYS": 0, "OC_GIRLS": 0, "SC_BOYS": 1, "SC_GIRLS": 1,
        "BCA_BOYS": 3, "BCA_GIRLS": 3,
    }
    df["reservation_tier"] = df["category"].map(tier).fillna(9)

    label_encoders = {}
    for src, dst in [
        ("district", "district_enc"), ("branch_code", "branch_code_enc"),
        ("college_type", "type_enc"), ("affl", "affl_enc"),
        ("coed", "coed_enc"), ("category", "category_enc"), ("a_reg", "a_reg_enc"),
    ]:
        le = LabelEncoder()
        df[dst] = le.fit_transform(df[src].astype(str))
        label_encoders[src] = le

    X = df[FEATURE_COLS].fillna(-1)
    y = df["cutoff_rank"]
    model = lgb.train(
        {"objective": "regression", "verbose": -1, "seed": 42},
        lgb.Dataset(X, label=y),
        num_boost_round=50,
    )
    preds = model.predict(X)
    model_std = float(np.std(y.values - preds))

    group_stats = build_group_lookups(df)

    for name, obj in [
        ("probability_model.pkl", model),
        ("label_encoders.pkl", label_encoders),
        ("feature_cols.pkl", FEATURE_COLS),
        ("model_std.pkl", model_std),
        ("group_stats.pkl", group_stats),
    ]:
        path = os.path.join(MODEL_DIR, name)
        with open(path, "wb") as f:
            pickle.dump(obj, f)
        print(f"  wrote {path}")


if __name__ == "__main__":
    bootstrap()
