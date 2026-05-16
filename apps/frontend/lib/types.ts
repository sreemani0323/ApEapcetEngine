// ============================================================
// TypeScript Type Definitions — EAPCET Intelligence Engine
// ============================================================
// Single source of truth for all data shapes flowing between
// the Spring Boot API and the Next.js frontend.
// ============================================================

// ─── API Response Types ───

/** College card in search results */
export interface CollegeCardResponse {
  college_name: string;
  instcode: string;
  district: string;
  place: string | null;
  branch_code: string;
  cutoff_rank_2024: number | null;
  probability_percent: number | null;
  rank_gap: number | null;
  highest_package: string | null;
  avg_package: string | null;
}

/** College explore card (grid/list view) */
export interface CollegeExploreResponse {
  college_id: number;
  instcode: string;
  name: string;
  type: string | null;
  district: string;
  place: string | null;
  coed: string | null;
  estd: number | null;
  branch_count: number;
  avg_package: string | null;
  highest_package: string | null;
}

/** Branch detail row in college detail page */
export interface BranchDetail {
  branch_code: string;
  cutoff_2022: number | null;
  cutoff_2024: number | null;
  avg_package: string | null;
  highest_package: string | null;
}

/** Full college detail page */
export interface CollegeDetailResponse {
  instcode: string;
  name: string;
  type: string | null;
  district: string;
  place: string | null;
  coed: string | null;
  estd: number | null;
  affiliation: string | null;
  region: string | null;
  branches: BranchDetail[];
}

/** Dashboard stats */
export interface DashboardStats {
  total_colleges: number;
  total_branches: number;
  total_cutoff_records: number;
  districts_covered: number;
  categories_available: number;
}

/** District summary row */
export interface DistrictSummary {
  district: string;
  college_count: number;
  branch_count: number;
}

/** College name for autocomplete */
export interface CollegeName {
  instcode: string;
  name: string;
  district: string;
  type_label: string;
}

/** Reverse calculator response */
export interface ReverseCalculatorResponse {
  college_name: string;
  branch_code: string;
  predicted_cutoff: number;
  desired_probability: number;
  required_rank: number;
}

// ─── Request Types ───

/** Search request */
export interface SearchRequest {
  rank?: number;
  category?: string;
  district?: string;
  region?: string;
  branchCode?: string;
  collegeType?: string;
  collegeName?: string;
}

/** Reverse calculator request */
export interface ReverseCalculatorRequest {
  instcode: string;
  branch_code: string;
  category: string;
  desired_probability: number;
}

// ─── UI State Types ───

export type TaskState = 'idle' | 'processing' | 'complete' | 'error';
export type ProbabilityTier = 'safe' | 'moderate' | 'reach';
export type RankTier = 'elite' | 'competitive' | 'moderate' | 'broad';
export type ViewMode = 'grid' | 'list';
export type SortOption = 'probability' | 'cutoff' | 'name';
export type FilterOption = 'all' | 'safe' | 'borderline' | 'reach';
