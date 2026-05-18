package com.eapcet.backend.util;

public final class PackageParser {

    private PackageParser() {}

    public static Double parseLpa(String pkg) {
        if (pkg == null || pkg.isBlank() || pkg.equalsIgnoreCase("unavailable")) {
            return null;
        }
        try {
            String clean = pkg.replaceAll("[^0-9.]", "").trim();
            if (clean.isEmpty()) {
                return null;
            }
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return null;
        }
    }
}
