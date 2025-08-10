import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const http = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status;
    if (status === 401) {
      const path = window.location.pathname;
      // Don't aggressively clear token or redirect during bootstrap; let AuthContext decide
      if (path !== '/login' && path !== '/register') {
        // optional: we could route to login, but defer to guards to avoid loops
      }
    } else if (status === 403) {
      if (window.location.pathname !== '/403') window.location.href = '/403';
    } else if (status === 404) {
      // Let route-based 404 handle unknown pages; only redirect for API misses when on detail pages
      const path = window.location.pathname;
      if (/\/events\//.test(path) && path !== '/404') {
        window.location.href = '/404';
      }
    } else if (status === 500) {
      if (window.location.pathname !== '/500') window.location.href = '/500';
    } else if (status === 503) {
      if (window.location.pathname !== '/503') window.location.href = '/503';
    }
    return Promise.reject(err);
  }
);

export interface ApiErrorShape {
  success?: boolean;
  message: string;
  errors?: { msg?: string; path?: string }[];
}

export function extractErrorMessage(error: any): string {
  const data: ApiErrorShape | undefined = error?.response?.data;
  if (data?.message) return data.message;
  if (data?.errors?.length) return data.errors[0].msg || 'Validation error';
  return 'Request failed';
}
