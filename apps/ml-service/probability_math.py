"""
AP EAPCET admission probability — shared train/serve math.

Counseling model (simplified):
  - Lower rank number = better performance (rank 1 is state topper).
  - Closing cutoff = worst (highest) rank admitted in a category pool for that
    college-branch in a counseling year (OC_BOYS, SC_GIRLS, etc. are separate pools).
  - If your rank is better (≤) than the closing cutoff, you were in range for a seat;
    spot rounds and year-to-year swings add uncertainty → never 0% or 100%.
"""
from __future__ import annotations

import math

VOLATILITY = 0.20
STEEPNESS = 3.0
PROB_FLOOR = 2.0
PROB_CEILING = 95.0
MAX_CUTOFF_RANK = 500_000


def rank_to_probability(user_rank: int, predicted_cutoff: int, _model_std: float | None = None) -> float:
    """Map (user rank, predicted closing cutoff) → admission probability %."""
    if predicted_cutoff <= 0 or user_rank <= 0:
        return 50.0

    gap = predicted_cutoff - user_rank  # positive = safer (better rank than cutoff)
    relative_margin = gap / predicted_cutoff
    z = (relative_margin + 0.05) / VOLATILITY
    raw = 100.0 / (1.0 + math.exp(-z * STEEPNESS / 3.5))
    compressed = PROB_FLOOR + (raw / 100.0) * (PROB_CEILING - PROB_FLOOR)
    return round(compressed, 1)


def probability_to_required_rank(desired_probability: float, predicted_cutoff: int) -> int | None:
    """
    Inverse of rank_to_probability: worst rank (highest number) that still achieves
    at least desired_probability. Returns None if target is not achievable (would need rank < 1).
    """
    if predicted_cutoff <= 0:
        return None

    prob = max(PROB_FLOOR + 0.1, min(desired_probability, PROB_CEILING - 0.1))
    # Uncompress [PROB_FLOOR, PROB_CEILING] → [0, 100]
    raw = ((prob - PROB_FLOOR) / (PROB_CEILING - PROB_FLOOR)) * 100.0
    raw = max(0.01, min(raw, 99.99))

    z = -math.log((100.0 / raw) - 1.0)
    relative_margin = (z * VOLATILITY / STEEPNESS) * 3.5 - 0.05
    gap = relative_margin * predicted_cutoff
    required = int(round(predicted_cutoff - gap))

    if required < 1:
        return None
    return min(required, MAX_CUTOFF_RANK)
