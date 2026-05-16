import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Response Interceptor: Typed Error Classification ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.classified = 'timeout';
      error.userMessage = 'Request timed out. The server may be under heavy load.';
    } else if (!error.response) {
      error.classified = 'network';
      error.userMessage = 'Cannot reach the server. Check your connection.';
    } else if (error.response.status === 429) {
      error.classified = 'rate_limit';
      error.userMessage = 'Too many requests. Please wait a moment.';
    } else if (error.response.status === 400) {
      error.classified = 'validation';
      error.userMessage = error.response.data?.message || 'Invalid input parameters.';
    } else if (error.response.status >= 500) {
      error.classified = 'server';
      error.userMessage = error.response.data?.message || 'Server error. Please try again.';
    } else {
      error.classified = 'unknown';
      error.userMessage = 'An unexpected error occurred.';
    }
    return Promise.reject(error);
  }
);

export const getDashboardStats = () => api.get('/stats/dashboard');
export const getDistrictSummary = () => api.get('/stats/district-summary');
export const exploreColleges = (params: Record<string, string>) => api.get('/colleges/explore', { params });
export const getCollegeDetail = (instcode: string) => api.get(`/colleges/${instcode}/detail`);
export const searchColleges = (params: Record<string, any>) => api.post('/search-colleges', params);
export const reverseCalculate = (params: Record<string, any>) => api.post('/reverse-calculate', params);
export const compareBranches = () => api.get('/analytics/compare-branches');
export const trendingBranches = () => api.get('/analytics/trending-branches');
export const getCollegeNames = () => api.get('/colleges/names');

export default api;
