"""
AP EAPCET ML Probability Microservice
======================================
Predicts closing cutoff ranks and admission probabilities for web counseling.
"""
from __future__ import annotations

import os
import time
import pickle
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from probability_math import rank_to_probability, probability_to_required_rank, MAX_CUTOFF_RANK

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
_start = time.time()


def _load_or_bootstrap(filename: str):
    path = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(path):
        from bootstrap_model import bootstrap
        bootstrap()
    with open(path, "rb") as f:
        return pickle.load(f)


model = _load_or_bootstrap("probability_model.pkl")
label_encoders = _load_or_bootstrap("label_encoders.pkl")
feature_cols = _load_or_bootstrap("feature_cols.pkl")
model_std = _load_or_bootstrap("model_std.pkl")
group_stats = _load_or_bootstrap("group_stats.pkl")

_load_time_ms = round((time.time() - _start) * 1000)

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

UNKNOWN_ENC = -1  # distinct from any valid LabelEncoder index


app = FastAPI(
    title="AP EAPCET ML Probability Service",
    description="Predicts admission probability using LightGBM (AP web counseling)",
    version="2.1.0",
)


class PredictionItem(BaseModel):
    college_branch_id: int = Field(..., gt=0)
    college_id: Optional[int] = Field(None, gt=0)
    user_rank: Optional[int] = Field(None, gt=0, le=MAX_CUTOFF_RANK)
    category: str = Field(..., min_length=2, max_length=20)
    branch_code: str = Field(..., min_length=1, max_length=10)
    district: str = Field(..., min_length=1)
    college_type: Optional[str] = None
    coed: Optional[str] = None
    affl: Optional[str] = None
    a_reg: Optional[str] = None
    estd: Optional[int] = Field(None, ge=1900, le=2030)
    cutoff_rank_2024: Optional[int] = Field(None, ge=0)
    cutoff_rank_2022: Optional[int] = Field(None, ge=0)
    oc_boys_cutoff_2024: Optional[int] = Field(None, ge=0)


class PredictionRequest(BaseModel):
    items: List[PredictionItem] = Field(..., min_length=1, max_length=2000)


class PredictionResult(BaseModel):
    college_branch_id: int
    predicted_cutoff: int
    probability_percent: Optional[float] = None
    rank_gap: Optional[int] = None


class PredictionResponse(BaseModel):
    results: List[PredictionResult]


def _lookup(table: str, *parts: str, default: float = -1.0) -> float:
    key = "|".join(str(p) for p in parts)
    return float(group_stats.get(table, {}).get(key, default))


def safe_encode(le_key: str, value) -> int:
    le = label_encoders.get(le_key)
    if le is None:
        return UNKNOWN_ENC
    val = str(value).strip().upper() if value else "UNKNOWN"
    if val in le.classes_:
        return int(le.transform([val])[0])
    return UNKNOWN_ENC


def build_feature_row(item: PredictionItem, year: int = 2024) -> dict:
    category = item.category.strip().upper()
    branch = item.branch_code.strip().upper()
    district = str(item.district).strip() if item.district else "UNKNOWN"

    c22 = item.cutoff_rank_2022 if item.cutoff_rank_2022 and item.cutoff_rank_2022 > 0 else -1
    c24 = item.cutoff_rank_2024 if item.cutoff_rank_2024 and item.cutoff_rank_2024 > 0 else -1
    hist_trend = (c24 - c22) if (c22 > 0 and c24 > 0) else -1
    other_year = c22

    median_estd = float(group_stats.get("median_estd", 2000))
    estd = float(item.estd) if item.estd else median_estd
    college_age = int(year - estd)

    college_id = item.college_id if item.college_id else -1
    college_median = _lookup("college_median", college_id, year) if college_id > 0 else -1.0
    if college_median < 0 and c24 > 0:
        college_median = float(c24)

    oc_base = item.oc_boys_cutoff_2024 if item.oc_boys_cutoff_2024 and item.oc_boys_cutoff_2024 > 0 else -1

    return {
        "district_enc": safe_encode("district", district),
        "branch_code_enc": safe_encode("branch_code", branch),
        "type_enc": safe_encode("college_type", item.college_type),
        "affl_enc": safe_encode("affl", item.affl),
        "coed_enc": safe_encode("coed", item.coed),
        "category_enc": safe_encode("category", category),
        "a_reg_enc": safe_encode("a_reg", item.a_reg),
        "college_age": college_age,
        "is_girls": 1 if "GIRLS" in category else 0,
        "reservation_tier": TIER_MAP.get(category, 9),
        "year": year,
        "other_year_cutoff": other_year,
        "historical_trend": hist_trend,
        "grp_med_dist_branch_cat": _lookup("grp_med_dist_branch_cat", district, branch, category, year),
        "grp_med_branch_cat": _lookup("grp_med_branch_cat", branch, category, year),
        "grp_med_dist_cat": _lookup("grp_med_dist_cat", district, category, year),
        "college_median": college_median,
        "oc_boys_baseline": float(oc_base),
    }


@app.get("/")
def root():
    return {"ok": True}


@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}


@app.get("/readiness")
def readiness():
    try:
        dummy = pd.DataFrame([{col: 0 for col in feature_cols}])
        _ = model.predict(dummy)
        return {"ready": True, "model_features": len(feature_cols)}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model not ready: {str(e)}")


@app.get("/model-meta")
def model_meta():
    return {
        "model_type": "LightGBM Regressor",
        "num_features": len(feature_cols),
        "feature_names": list(feature_cols),
        "label_encoders": list(label_encoders.keys()),
        "model_std": round(float(model_std), 2),
        "load_time_ms": _load_time_ms,
        "training_years": [2022, 2024],
        "categories_supported": list(TIER_MAP.keys()),
        "version": "2.1.0",
    }


@app.post("/predict-probability", response_model=PredictionResponse)
def predict_probability(request: PredictionRequest):
    rows = [build_feature_row(item, year=2024) for item in request.items]
    df = pd.DataFrame(rows)
    for col in feature_cols:
        if col not in df.columns:
            df[col] = -1
    df = df[feature_cols]

    predicted_cutoffs = model.predict(df)
    predicted_cutoffs = np.clip(np.round(predicted_cutoffs), 1, MAX_CUTOFF_RANK).astype(int)

    results = []
    for i, item in enumerate(request.items):
        pred_cutoff = int(predicted_cutoffs[i])
        prob = None
        gap = None
        if item.user_rank is not None and item.user_rank > 0:
            prob = rank_to_probability(item.user_rank, pred_cutoff, model_std)
            gap = pred_cutoff - item.user_rank

        results.append(PredictionResult(
            college_branch_id=item.college_branch_id,
            predicted_cutoff=pred_cutoff,
            probability_percent=prob,
            rank_gap=gap,
        ))

    return PredictionResponse(results=results)


@app.get("/probability-to-rank")
def probability_to_rank(predicted_cutoff: int, probability: float):
    """Debug/helper: inverse probability curve (matches reverse calculator)."""
    rank = probability_to_required_rank(probability, predicted_cutoff)
    if rank is None:
        raise HTTPException(status_code=400, detail="Target probability not achievable for this cutoff.")
    return {"required_rank": rank, "predicted_cutoff": predicted_cutoff, "probability": probability}
