import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// 10.0.2.2 is the Android emulator loopback to host; override with EXPO_PUBLIC_API_URL for real devices or production
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080';

const ACCESS_KEY  = 'nh_access';
const REFRESH_KEY = 'nh_refresh';
const DEVICE_KEY  = 'nh_device';

// ── Token store (SecureStore) ─────────────────────────────────────────────────
export const tokens = {
  getAccess:  () => SecureStore.getItemAsync(ACCESS_KEY),
  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),
  set: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync(ACCESS_KEY,  access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
  deviceId: async (): Promise<string> => {
    let id = await SecureStore.getItemAsync(DEVICE_KEY);
    if (!id) {
      id = `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await SecureStore.setItemAsync(DEVICE_KEY, id);
    }
    return id;
  },
};

// ── Logout event emitter (simple pub/sub for React Native) ────────────────────
type LogoutListener = () => void;
const logoutListeners: LogoutListener[] = [];
export const onLogout = (fn: LogoutListener) => { logoutListeners.push(fn); return () => { const i = logoutListeners.indexOf(fn); if (i > -1) logoutListeners.splice(i, 1); }; };
const emitLogout = () => logoutListeners.forEach(fn => fn());

// ── Axios instance ────────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const [token, deviceId] = await Promise.all([tokens.getAccess(), tokens.deviceId()]);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Device-Id']   = deviceId;
  config.headers['X-Device-Type'] = 'MOBILE';
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

    if (error.response?.status === 401 && !orig._retry && !orig.url?.includes('/auth/')) {
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

      const [refreshToken, deviceId] = await Promise.all([tokens.getRefresh(), tokens.deviceId()]);
      if (!refreshToken) {
        drainQueue(error);
        isRefreshing = false;
        await tokens.clear();
        emitLogout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh-token`, { refreshToken, deviceId });
        const { accessToken, refreshToken: newRefresh } = data.data;
        await tokens.set(accessToken, newRefresh);
        drainQueue(null, accessToken);
        orig.headers.Authorization = `Bearer ${accessToken}`;
        return api(orig);
      } catch (e) {
        drainQueue(e);
        await tokens.clear();
        emitLogout();
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
