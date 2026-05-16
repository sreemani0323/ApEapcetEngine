"""
AP EAPCET ML Model Training Script
====================================
Connects to MySQL eapcet_db, extracts cutoff data from 2022 and 2024,
engineers features (branch_type, district, college_age, historical trends,
AI-cooling / core-recovery interactions), and trains a LightGBM model
to predict cutoff ranks.

The trained model is saved as probability_model.pkl alongside
feature metadata (feature_cols.pkl, label_encoders.pkl) so the
FastAPI server can load them at startup.

Usage:
    python train_model.py
"""

import os
import pickle
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import KFold
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import LabelEncoder
from sqlalchemy import create_engine, text
import warnings

warnings.filterwarnings("ignore")
np.random.seed(42)

# ============================================================
# CONFIGURATION
# ============================================================
DB_URL = os.environ.get("DB_URL", "postgresql+psycopg2://postgres:localdev@localhost:5432/eapcet_db")

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

def get_engine():
    return create_engine(DB_URL, echo=False)


def load_training_data(engine):
    """
    Pull a denormalized view from the 3NF schema:
      cutoffs + college_branches + colleges + branches
    One row per (college_branch_id, year, category).
    """
    query = text("""
        SELECT
            co.cutoff_id,
            co.college_branch_id,
            co.year,
            co.category,
            co.cutoff_rank,
            cb.branch_code,
            b.branch_type,
            c.college_id,
            c.instcode,
            c.name        AS college_name,
            c.district,
            c.place,
            c.type        AS college_type,
            c.coed,
            c.affl,
            c.estd,
            c.a_reg
        FROM cutoffs co
        JOIN college_branches cb ON co.college_branch_id = cb.college_branch_id
        JOIN colleges c          ON cb.college_id        = c.college_id
        JOIN branches b          ON cb.branch_code       = b.branch_code
        ORDER BY co.college_branch_id, co.year, co.category
    """)
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)
    return df


def engineer_features(df):
    """
    Build all ML features.  The target we predict is `cutoff_rank`.
    """

    # ---- Basic conversions ----
    df["year"] = df["year"].astype(int)
    df["estd"] = pd.to_numeric(df["estd"], errors="coerce")
    df["college_age"] = df["year"] - df["estd"]
    df["college_age"] = df["college_age"].fillna(df["college_age"].median())

    # ---- Branch code cleanup ----
    df["branch_code"] = df["branch_code"].astype(str).str.strip().str.upper()

    # ---- Gender flag from category name ----
    df["is_girls"] = df["category"].str.contains("GIRLS").astype(int)

    # ---- Reservation tier (ordinal) ----
    tier_map = {
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
    df["reservation_tier"] = df["category"].map(tier_map).fillna(9)

    # ---- Year interaction terms (domain shift signals) ----
    is_2024 = (df["year"] == 2024).astype(int)

    # ---- Cross-year cutoff (bidirectional temporal feature) ----
    # For each (college_branch_id, category) look up the other year's cutoff
    pivot = df.pivot_table(
        index=["college_branch_id", "category"],
        columns="year",
        values="cutoff_rank",
        aggfunc="first"
    ).reset_index()

    # Rename for clarity
    year_cols = [c for c in pivot.columns if isinstance(c, int)]
    rename_map = {y: f"cutoff_{y}" for y in year_cols}
    pivot = pivot.rename(columns=rename_map)

    df = df.merge(pivot, on=["college_branch_id", "category"], how="left")

    # other_year_cutoff: if this row is 2024 → use cutoff_2022, vice versa
    df["other_year_cutoff"] = np.where(
        df["year"] == 2024,
        df.get("cutoff_2022", np.nan),
        df.get("cutoff_2024", np.nan)
    )

    # Historical trend (positive = rank went up i.e. easier admission in 2024)
    c22 = df.get("cutoff_2022", pd.Series(dtype=float))
    c24 = df.get("cutoff_2024", pd.Series(dtype=float))
    df["historical_trend"] = c24 - c22  # positive = relaxed in 2024

    # ---- Group medians (hierarchical aggregations) ----
    df["grp_med_dist_branch_cat"] = df.groupby(
        ["district", "branch_code", "category", "year"]
    )["cutoff_rank"].transform("median")

    df["grp_med_branch_cat"] = df.groupby(
        ["branch_code", "category", "year"]
    )["cutoff_rank"].transform("median")

    df["grp_med_dist_cat"] = df.groupby(
        ["district", "category", "year"]
    )["cutoff_rank"].transform("median")

    df["college_median"] = df.groupby(
        ["college_id", "year"]
    )["cutoff_rank"].transform("median")

    # ---- OC_BOYS baseline for same college+branch (anchor) ----
    oc_boys = df[df["category"] == "OC_BOYS"][
        ["college_branch_id", "year", "cutoff_rank"]
    ].rename(columns={"cutoff_rank": "oc_boys_baseline"})
    df = df.merge(oc_boys, on=["college_branch_id", "year"], how="left")

    return df


def train_model(df):
    """
    Train a LightGBM regressor on all non-null cutoff rows.
    Returns the trained model, label encoders, and feature column list.
    """

    # ---- Label-encode categoricals ----
    cat_cols_map = {
        "district":    "district_enc",
        "branch_code": "branch_code_enc",
        "college_type":"type_enc",
        "affl":        "affl_enc",
        "coed":        "coed_enc",
        "category":    "category_enc",
        "a_reg":       "a_reg_enc",
    }
    label_encoders = {}
    for src, dst in cat_cols_map.items():
        le = LabelEncoder()
        df[dst] = le.fit_transform(df[src].astype(str).fillna("UNKNOWN"))
        label_encoders[src] = le

    # ---- Feature columns ----
    feature_cols = [
        "district_enc", "branch_code_enc", "type_enc", "affl_enc",
        "coed_enc", "category_enc", "a_reg_enc",
        "college_age",
        "is_girls", "reservation_tier",
        "year",
        "other_year_cutoff", "historical_trend",
        "grp_med_dist_branch_cat", "grp_med_branch_cat",
        "grp_med_dist_cat", "college_median", "oc_boys_baseline",
    ]

    # ---- Fill NaN in numeric features with -1 (LightGBM handles this) ----
    for col in feature_cols:
        if col in df.columns:
            df[col] = df[col].fillna(-1)

    # ---- Train/Test split: rows with non-null cutoff ----
    has_cutoff = df["cutoff_rank"].notna()
    train_df = df[has_cutoff].copy()

    X = train_df[feature_cols]
    y = train_df["cutoff_rank"]

    print(f"Training set: {len(X):,} rows")

    # ---- LightGBM parameters ----
    params = {
        "objective": "regression",
        "metric": "mae",
        "boosting_type": "gbdt",
        "num_leaves": 63,
        "learning_rate": 0.05,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "min_child_samples": 10,
        "verbose": -1,
        "seed": 42,
        "n_jobs": -1,
    }

    # ---- 5-Fold CV ----
    print("Running 5-fold Cross-Validation...")
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = []
    for fold, (tr_idx, vl_idx) in enumerate(kf.split(X)):
        X_tr, X_vl = X.iloc[tr_idx], X.iloc[vl_idx]
        y_tr, y_vl = y.iloc[tr_idx], y.iloc[vl_idx]

        d_tr = lgb.Dataset(X_tr, label=y_tr)
        d_vl = lgb.Dataset(X_vl, label=y_vl, reference=d_tr)

        m = lgb.train(
            params, d_tr, num_boost_round=2000,
            valid_sets=[d_vl], valid_names=["valid"],
            callbacks=[lgb.early_stopping(50), lgb.log_evaluation(0)],
        )
        p = m.predict(X_vl)
        score = mean_absolute_error(y_vl, p)
        cv_scores.append(score)
        print(f"  Fold {fold+1}: MAE = {score:,.0f}")

    print(f"  Mean CV MAE: {np.mean(cv_scores):,.0f} ± {np.std(cv_scores):,.0f}")

    # ---- Train final model on full data ----
    print("\nTraining final model on full dataset...")
    d_full = lgb.Dataset(X, label=y)
    final_model = lgb.train(params, d_full, num_boost_round=2000)

    # ---- Feature importance ----
    importance = pd.DataFrame({
        "feature": feature_cols,
        "importance": final_model.feature_importance(importance_type="gain"),
    }).sort_values("importance", ascending=False)
    print("\nTop 10 Feature Importances:")
    print(importance.head(10).to_string(index=False))

    return final_model, label_encoders, feature_cols


def save_artifacts(model, label_encoders, feature_cols):
    """Save the trained model and metadata for FastAPI to load."""
    model_path = os.path.join(MODEL_DIR, "probability_model.pkl")
    le_path    = os.path.join(MODEL_DIR, "label_encoders.pkl")
    fc_path    = os.path.join(MODEL_DIR, "feature_cols.pkl")

    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    with open(le_path, "wb") as f:
        pickle.dump(label_encoders, f)
    with open(fc_path, "wb") as f:
        pickle.dump(feature_cols, f)

    print(f"\nSaved: {model_path}")
    print(f"Saved: {le_path}")
    print(f"Saved: {fc_path}")


def compute_model_std(model, df, feature_cols):
    """
    Compute the model's residual std on training data.
    This is used by the FastAPI server to calibrate the
    probability sigmoid curve.
    """
    has_cutoff = df["cutoff_rank"].notna()
    X = df.loc[has_cutoff, feature_cols]
    y = df.loc[has_cutoff, "cutoff_rank"]
    preds = model.predict(X)
    residuals = y.values - preds
    model_std = float(np.std(residuals))

    std_path = os.path.join(MODEL_DIR, "model_std.pkl")
    with open(std_path, "wb") as f:
        pickle.dump(model_std, f)
    print(f"Saved: {std_path}  (residual std = {model_std:,.0f})")
    return model_std


def main():
    print("=" * 60)
    print("  AP EAPCET ML Model Training")
    print("=" * 60)

    engine = get_engine()

    print("\n[1/4] Loading data from PostgreSQL...")
    df = load_training_data(engine)
    print(f"  Loaded {len(df):,} cutoff rows")
    engine.dispose()

    print("[2/4] Engineering features...")
    df = engineer_features(df)

    print("[3/4] Training LightGBM model...")
    model, label_encoders, feature_cols = train_model(df)

    print("\n[4/4] Saving artifacts...")
    save_artifacts(model, label_encoders, feature_cols)
    model_std = compute_model_std(model, df, feature_cols)

    print(f"\n{'='*60}")
    print("  TRAINING COMPLETE")
    print(f"  Model residual std: {model_std:,.0f}")
    print(f"  Files saved to: {MODEL_DIR}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
