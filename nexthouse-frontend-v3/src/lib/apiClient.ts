// src/lib/apiClient.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const ACCESS_KEY  = 'nh_access';
const REFRESH_KEY = 'nh_refresh';

// ── Token store (localStorage) ────────────────────────────────────────────────
export const tokens = {
  getAccess:  (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set: (access: string, refresh: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY,  access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  deviceId: (): string => {
    if (typeof window === 'undefined') return 'ssr';
    let id = localStorage.getItem('nh_device');
    if (!id) {
      id = `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('nh_device', id);
    }
    return id;
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokens.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Device-Id']   = tokens.deviceId();
  config.headers['X-Device-Type'] = 'WEB';
  return config;
});

// ── Response interceptor — auto token refresh ─────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const drainQueue = (err: unknown, token: string | null = null) => {
  failedQueue.forEach(p => (err ? p.reject(err) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only intercept 401 on non-auth endpoints
    if (
      error.response?.status === 401 &&
      !orig._retry &&
      !orig.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          orig.headers.Authorization = `Bearer ${token}`;
          return api(orig);
        });
      }

      orig._retry = true;
      isRefreshing = true;

      const refreshToken = tokens.getRefresh();
      if (!refreshToken) {
        drainQueue(error);
        isRefreshing = false;
        tokens.clear();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('nh:logout'));
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE}/api/v1/auth/refresh-token`, {
          refreshToken,
          deviceId: tokens.deviceId(),
        });
        const { accessToken, refreshToken: newRefresh } = data.data;
        tokens.set(accessToken, newRefresh);
        drainQueue(null, accessToken);
        orig.headers.Authorization = `Bearer ${accessToken}`;
        return api(orig);
      } catch (e) {
        drainQueue(e);
        tokens.clear();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('nh:logout'));
        }
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Typed helper functions ────────────────────────────────────────────────────
export const apiGet = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const res = await api.get<{ data: T }>(url, { params });
  return res.data.data;
};

export const apiPost = async <T>(url: string, body?: unknown): Promise<T> => {
  const res = await api.post<{ data: T }>(url, body);
  return res.data.data;
};

export const apiPut = async <T>(url: string, body?: unknown): Promise<T> => {
  const res = await api.put<{ data: T }>(url, body);
  return res.data.data;
};

export const apiPatch = async <T>(url: string, body?: unknown): Promise<T> => {
  const res = await api.patch<{ data: T }>(url, body);
  return res.data.data;
};

export const apiDelete = async <T>(url: string): Promise<T> => {
  const res = await api.delete<{ data: T }>(url);
  return res.data.data;
};

export const apiUpload = async <T>(url: string, form: FormData): Promise<T> => {
  const res = await api.post<{ data: T }>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
};
