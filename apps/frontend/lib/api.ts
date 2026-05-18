import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,  // 60s timeout to survive cold starts
  headers: { 'Content-Type': 'application/json' },
});

// ─── Automatic Retry for Cold Starts ───
// Render free tier sleeps after 15min of inactivity.
// First request wakes the server (~30-60s) and often times out.
// This interceptor automatically retries failed requests up to 2 times.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError & { config: AxiosRequestConfig & { _retryCount?: number } }) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    config._retryCount = config._retryCount || 0;

    // Retry on timeout, network error, or 502/503/504 (cold start responses)
    const isRetryable =
      error.code === 'ECONNABORTED' ||
      !error.response ||
      [502, 503, 504].includes(error.response?.status || 0);

    if (isRetryable && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1;
      console.log(`⏳ Server waking up... retrying (${config._retryCount}/${MAX_RETRIES})`);
      await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      return api(config);
    }

    const problem = error.response?.data as { detail?: string; message?: string; title?: string } | undefined;
    const problemDetail = problem?.detail || problem?.message;

    // ─── Error Classification (after all retries exhausted) ───
    if (error.code === 'ECONNABORTED') {
      (error as any).classified = 'timeout';
      (error as any).userMessage = 'Request timed out. The server may be waking up — please try again.';
    } else if (!error.response) {
      (error as any).classified = 'network';
      (error as any).userMessage = 'Cannot reach the server. It may be starting up — please retry in a moment.';
    } else if (error.response.status === 429) {
      (error as any).classified = 'rate_limit';
      (error as any).userMessage = 'Too many requests. Please wait a moment.';
    } else if (error.response.status === 400) {
      (error as any).classified = 'validation';
      (error as any).userMessage = problemDetail || 'Invalid input parameters.';
    } else if (error.response.status >= 500) {
      (error as any).classified = 'server';
      (error as any).userMessage = problemDetail || 'Server error. Please try again.';
    } else {
      (error as any).classified = 'unknown';
      (error as any).userMessage = 'An unexpected error occurred.';
    }
    return Promise.reject(error);
  }
);

export const getDashboardStats = () => api.get('/stats/dashboard');
export const getDistrictSummary = () => api.get('/stats/district-summary');
export const exploreColleges = (params: Record<string, string>) => api.get('/colleges/explore', { params });
export const getCollegeDetail = (instcode: string, category?: string) =>
  api.get(`/colleges/${instcode}/detail`, { params: category ? { category } : {} });
export const getCollegeBranches = (instcode: string) =>
  api.get(`/colleges/${instcode}/branches`);
export const searchColleges = (params: Record<string, any>) => api.post('/search-colleges', params);
export const reverseCalculate = (params: Record<string, any>) => api.post('/reverse-calculate', params);
export const compareBranches = () => api.get('/analytics/compare-branches');
export const trendingBranches = () => api.get('/analytics/trending-branches');
export const getCollegeNames = () => api.get('/colleges/names');

export default api;
