"""
AP EAPCET ML Probability Microservice
======================================
FastAPI server that loads a pre-trained LightGBM model and serves
probability predictions for college admission.

Endpoints:
    POST /predict-probability   → Batch probability prediction
    GET  /health                → Health check
    GET  /readiness             → Readiness probe (model loaded?)
    GET  /model-meta            → Model metadata for interviews/debugging

Start:
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import time
import pickle
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

# ============================================================
# LOAD MODEL ARTIFACTS AT STARTUP
# ============================================================
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
_start = time.time()

def load_artifact(filename: str):
    path = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model artifact not found: {path}. Run train_model.py first.")
    with open(path, "rb") as f:
        return pickle.load(f)

model          = load_artifact("probability_model.pkl")
label_encoders = load_artifact("label_encoders.pkl")
feature_cols   = load_artifact("feature_cols.pkl")
model_std      = load_artifact("model_std.pkl")

_load_time_ms = round((time.time() - _start) * 1000)

# Branch classifications removed per user request

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


# ============================================================
# FASTAPI APP
# ============================================================
app = FastAPI(
    title="AP EAPCET ML Probability Service",
    description="Predicts admission probability using LightGBM",
    version="2.0.0",
)


# ============================================================
# REQUEST / RESPONSE MODELS (Pydantic v2 strict)
# ============================================================
class PredictionItem(BaseModel):
    """One college-branch combination to predict."""
    college_branch_id: int = Field(..., gt=0)
    user_rank: Optional[int] = Field(None, gt=0)
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

class PredictionRequest(BaseModel):
    """Batch prediction request."""
    items: List[PredictionItem] = Field(..., min_length=1, max_length=2000)

class PredictionResult(BaseModel):
    """Result for one college-branch combination."""
    college_branch_id: int
    predicted_cutoff: int
    probability_percent: Optional[float] = None
    rank_gap: Optional[int] = None

class PredictionResponse(BaseModel):
    """Batch prediction response."""
    results: List[PredictionResult]


# ============================================================
# PROBABILITY LOGIC
# ============================================================
def rank_to_probability(user_rank: int, predicted_cutoff: int, std: float) -> float:
    """
    Convert rank vs predicted cutoff into a realistic admission probability.

    Uses RELATIVE margin (gap as % of cutoff) instead of absolute gap.
    This ensures probabilities feel proportional regardless of cutoff magnitude.

    Calibrated benchmarks:
      Rank = cutoff exactly       → ~55%  (cutoff = last admitted, so slightly favorable)
      Rank 30% better than cutoff → ~73%  (good chance but cutoffs shift year-to-year)
      Rank 2x better than cutoff  → ~88%  (strong, but not certain — counseling rounds vary)
      Rank 3x+ better             → ~93%  (very strong — but never 99%, uncertainty exists)
      Rank 20% worse than cutoff  → ~35%  (reach — possible via later counseling rounds)
      Rank 50% worse              → ~12%  (long shot)

    Key insight: EAPCET cutoffs can swing 15-25% year-to-year due to
    difficulty changes, seat additions, and category dynamics. A student
    who is 30% "better" than last year's cutoff is NOT 95% safe.
    """
    if predicted_cutoff <= 0:
        return 50.0

    gap = predicted_cutoff - user_rank  # positive = safe margin

    # ── Relative margin: gap as fraction of cutoff ──
    # This makes the probability proportional regardless of cutoff scale
    # rank=10k, cutoff=20k → margin=0.5 (50% better)
    # rank=50k, cutoff=100k → margin=0.5 (same relative position)
    relative_margin = gap / predicted_cutoff

    # ── Year-over-year volatility damping ──
    # Cutoffs typically swing 15-25%. Even with a 30% margin,
    # there's real uncertainty. This prevents overconfident predictions.
    volatility = 0.20  # assume 20% year-over-year cutoff volatility

    # ── Sigmoid with controlled steepness ──
    # Steepness of 3.0 gives a gradual curve that doesn't saturate quickly
    # The shift of +0.05 makes "at cutoff" slightly favorable (~55%)
    z = (relative_margin + 0.05) / volatility
    steepness = 3.0
    probability = 100.0 / (1.0 + np.exp(-z * steepness / 3.5))

    # ── Compress toward center to avoid fake extremes ──
    # Map [0, 100] → [2, 95] — no result ever shows <2% or >95%
    # This reflects real uncertainty: even the "safest" pick can have
    # counseling surprises, and even a "reach" can work in spot rounds
    probability = 2.0 + (probability / 100.0) * 93.0

    return float(round(probability, 1))


def build_feature_row(item: PredictionItem, year: int = 2024) -> dict:
    """
    Build a feature dictionary matching the training schema.
    Uses the same label encoders fitted during training.
    """
    bc = item.branch_code.strip().upper()

    # Encode categoricals using the saved LabelEncoders
    def safe_encode(le_key: str, value) -> int:
        le = label_encoders.get(le_key)
        if le is None:
            return 0
        val = str(value) if value else "UNKNOWN"
        # Handle unseen labels gracefully
        if val in le.classes_:
            return int(le.transform([val])[0])
        else:
            return 0  # fallback for unseen

    # Historical trend
    c22 = item.cutoff_rank_2022 if item.cutoff_rank_2022 else -1
    c24 = item.cutoff_rank_2024 if item.cutoff_rank_2024 else -1
    hist_trend = (c24 - c22) if (c22 > 0 and c24 > 0) else -1

    other_year = c22  # For 2024 predictions, cross-ref is 2022

    is_2024 = 1 if year == 2024 else 0
    estd = item.estd if item.estd else 2010
    college_age = year - estd

    row = {
        "district_enc":      safe_encode("district", item.district),
        "branch_code_enc":   safe_encode("branch_code", item.branch_code),
        "type_enc":          safe_encode("college_type", item.college_type),
        "affl_enc":          safe_encode("affl", item.affl),
        "coed_enc":          safe_encode("coed", item.coed),
        "category_enc":      safe_encode("category", item.category),
        "a_reg_enc":         safe_encode("a_reg", item.a_reg),
        "college_age":       college_age,
        "is_girls":          1 if "GIRLS" in item.category.upper() else 0,
        "reservation_tier":  TIER_MAP.get(item.category.upper(), 9),
        "year":              year,
        "other_year_cutoff": other_year,
        "historical_trend":  hist_trend,
        # Group medians are not available at inference time → use -1 sentinel
        "grp_med_dist_branch_cat": -1,
        "grp_med_branch_cat":      -1,
        "grp_med_dist_cat":        -1,
        "college_median":          c24 if c24 > 0 else -1,
        "oc_boys_baseline":        -1,
    }
    return row


# ============================================================
# ENDPOINTS
# ============================================================
@app.get("/")
def root():
    """Root endpoint — minimal response for cron job pings."""
    return {"ok": True}


@app.get("/health")
def health():
    """Basic health check — always returns 200 if the process is running."""
    return {"status": "healthy", "model_loaded": model is not None}


@app.get("/readiness")
def readiness():
    """
    Readiness probe — confirms model artifacts are loaded and usable.
    Used by Spring Boot's circuit breaker to check ML service availability.
    """
    try:
        # Verify model can actually predict (not just loaded)
        dummy = pd.DataFrame([{col: 0 for col in feature_cols}])
        _ = model.predict(dummy)
        return {"ready": True, "model_features": len(feature_cols)}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model not ready: {str(e)}")


@app.get("/model-meta")
def model_meta():
    """
    Model metadata — useful for interviews and debugging.
    Shows what the model was trained on and its configuration.
    """
    return {
        "model_type": "LightGBM Regressor",
        "num_features": len(feature_cols),
        "feature_names": list(feature_cols),
        "label_encoders": list(label_encoders.keys()),
        "model_std": round(float(model_std), 2),
        "load_time_ms": _load_time_ms,
        "training_years": [2022, 2024],
        "categories_supported": list(TIER_MAP.keys()),
        "version": "2.0.0",
    }


@app.post("/predict-probability", response_model=PredictionResponse)
def predict_probability(request: PredictionRequest):
    """
    Accepts a batch of college-branch items and returns
    predicted cutoffs and probability percentages.
    """
    # Build feature dataframe for batch prediction
    rows = [build_feature_row(item, year=2024) for item in request.items]
    df = pd.DataFrame(rows)

    # Ensure column order matches training
    for col in feature_cols:
        if col not in df.columns:
            df[col] = -1
    df = df[feature_cols]

    # Predict cutoff ranks
    predicted_cutoffs = model.predict(df)
    predicted_cutoffs = np.clip(np.round(predicted_cutoffs), 1, None).astype(int)

    # Build results
    results = []
    for i, item in enumerate(request.items):
        pred_cutoff = int(predicted_cutoffs[i])

        prob = None
        gap = None
        if item.user_rank is not None and item.user_rank > 0:
            prob = rank_to_probability(item.user_rank, pred_cutoff, model_std)
            gap = pred_cutoff - item.user_rank  # positive = safe

        results.append(PredictionResult(
            college_branch_id=item.college_branch_id,
            predicted_cutoff=pred_cutoff,
            probability_percent=prob,
            rank_gap=gap,
        ))

    return PredictionResponse(results=results)
