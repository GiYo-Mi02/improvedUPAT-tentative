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
      localStorage.removeItem('token');
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
