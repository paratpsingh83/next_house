// src/lib/apiClient.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── Token store ───────────────────────────────────────────────────────────────
// Access token is kept in sessionStorage (cleared on tab close, survives page refresh).
// It is NOT used for HTTP requests — those rely on the httpOnly nh_access cookie.
// The in-memory token is only needed for WebSocket STOMP auth headers.
// The refresh token is managed solely as an httpOnly cookie by the server.
const WS_TOKEN_KEY = 'nh_ws_token';

export const tokens = {
  // WebSocket access token (sessionStorage — survives refresh, cleared on tab close)
  getAccess: (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(WS_TOKEN_KEY);
  },
  setWsToken: (token: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(WS_TOKEN_KEY, token);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(WS_TOKEN_KEY);
  },
  // Persistent device fingerprint (localStorage — not a security token)
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
  baseURL:         `${BASE}/api/v1`,
  timeout:         30_000,
  withCredentials: true,    // send nh_access httpOnly cookie automatically
  headers:         { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
// No Authorization header — the browser sends the nh_access cookie automatically.
// Device headers are still sent for analytics / push notification targeting.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers['X-Device-Id']   = tokens.deviceId();
  config.headers['X-Device-Type'] = 'WEB';
  return config;
});

// ── Response interceptor — auto token refresh ─────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

const drainQueue = (err: unknown) => {
  failedQueue.forEach(p => (err ? p.reject(err) : p.resolve()));
  failedQueue = [];
};

api.interceptors.response.use(
  (r: AxiosResponse) => r,
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only intercept 401 on non-auth endpoints
    if (
      error.response?.status === 401 &&
      !orig._retry &&
      !orig.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(orig)),
            reject,
          });
        });
      }

      orig._retry   = true;
      isRefreshing  = true;

      try {
        // nh_refresh httpOnly cookie is sent automatically (withCredentials)
        const { data } = await axios.post(
          `${BASE}/api/v1/auth/refresh-token`,
          { deviceId: tokens.deviceId() },
          { withCredentials: true }
        );
        // Update sessionStorage ws token from the response body
        const newAccessToken: string | undefined = data?.data?.accessToken;
        if (newAccessToken) tokens.setWsToken(newAccessToken);

        drainQueue(null);
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
