package com.eapcet.backend.util;

/**
 * AP EAPCET counseling probability — mirrors apps/ml-service/probability_math.py.
 *
 * Rank 1 = best. Closing cutoff = last (worst/highest) rank admitted in a category pool.
 * gap = cutoff - userRank (positive ⇒ safer).
 */
public final class AdmissionProbability {

    private static final double VOLATILITY = 0.20;
    private static final double STEEPNESS = 3.0;
    private static final double PROB_FLOOR = 2.0;
    private static final double PROB_CEILING = 95.0;
    public static final int MAX_CUTOFF_RANK = 500_000;

    private AdmissionProbability() {}

    public static double rankToProbability(int userRank, int predictedCutoff) {
        if (predictedCutoff <= 0 || userRank <= 0) {
            return 50.0;
        }
        double gap = predictedCutoff - userRank;
        double relativeMargin = gap / predictedCutoff;
        double z = (relativeMargin + 0.05) / VOLATILITY;
        double raw = 100.0 / (1.0 + Math.exp(-z * STEEPNESS / 3.5));
        double compressed = PROB_FLOOR + (raw / 100.0) * (PROB_CEILING - PROB_FLOOR);
        return Math.round(compressed * 10.0) / 10.0;
    }

    /**
     * @return worst admissible rank (highest number), or null if target probability is not achievable
     */
    public static Integer probabilityToRequiredRank(double desiredProbability, int predictedCutoff) {
        if (predictedCutoff <= 0) {
            return null;
        }
        double prob = Math.max(PROB_FLOOR + 0.1, Math.min(desiredProbability, PROB_CEILING - 0.1));
        double raw = ((prob - PROB_FLOOR) / (PROB_CEILING - PROB_FLOOR)) * 100.0;
        raw = Math.max(0.01, Math.min(raw, 99.99));

        double z = -Math.log((100.0 / raw) - 1.0);
        double relativeMargin = (z * VOLATILITY / STEEPNESS) * 3.5 - 0.05;
        double gap = relativeMargin * predictedCutoff;
        int required = (int) Math.round(predictedCutoff - gap);

        if (required < 1) {
            return null;
        }
        return Math.min(required, MAX_CUTOFF_RANK);
    }
}
