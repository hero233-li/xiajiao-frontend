import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

/** 后端统一响应包：code=0 表示成功。 */
export interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'ADMIN' | 'USER';
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
  refreshExpiresAt: string;
  user: User;
}

/** 业务错误：把后端的 code/message 原样带出来，页面直接展示 message。 */
export class ApiError extends Error {
  readonly code: number;
  readonly status?: number;
  constructor(message: string, code: number, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const ACCESS_KEY = 'xj.token';
const REFRESH_KEY = 'xj.refresh';
const USER_KEY = 'xj.user';
const PERSIST_KEY = 'xj.persist';

/** 自动登录开关：关掉后令牌只活在本标签页（sessionStorage）。 */
let persist = (() => {
  try {
    return localStorage.getItem(PERSIST_KEY) !== '0';
  } catch {
    return true;
  }
})();

export function getPersist(): boolean {
  return persist;
}

export function setPersist(next: boolean) {
  if (persist === next) return;
  persist = next;
  try {
    localStorage.setItem(PERSIST_KEY, next ? '1' : '0');
  } catch {
    /* 隐私模式下忽略 */
  }
  publish();
}

const storage = {
  get(key: string) {
    try {
      return (persist ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      const target = persist ? localStorage : sessionStorage;
      const other = persist ? sessionStorage : localStorage;
      if (value === null) {
        target.removeItem(key);
        other.removeItem(key);
      } else {
        target.setItem(key, value);
        // 切换存储位置时清掉旧位置，避免旧令牌复活
        other.removeItem(key);
      }
    } catch {
      /* 隐私模式下退化为内存态。 */
    }
  },
};

type Listener = () => void;
const listeners = new Set<Listener>();

let session: TokenResponse | null = restore();

function restore(): TokenResponse | null {
  const accessToken = storage.get(ACCESS_KEY);
  const refreshToken = storage.get(REFRESH_KEY);
  const rawUser = storage.get(USER_KEY);
  if (!accessToken || !refreshToken || !rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as User;
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresAt: '', refreshExpiresAt: '', user };
  } catch {
    return null;
  }
}

function publish() {
  if (session) {
    storage.set(ACCESS_KEY, session.accessToken);
    storage.set(REFRESH_KEY, session.refreshToken);
    storage.set(USER_KEY, JSON.stringify(session.user));
  } else {
    storage.set(ACCESS_KEY, null);
    storage.set(REFRESH_KEY, null);
    storage.set(USER_KEY, null);
  }
  listeners.forEach((listener) => listener());
}

export const auth = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => session,
  login(next: TokenResponse) {
    session = next;
    publish();
  },
  clear() {
    session = null;
    publish();
  },
  /** 更新用户资料（如 /auth/me 返回最新角色）。 */
  patchUser(user: User) {
    if (!session || session.user.id !== user.id) return;
    session = { ...session, user };
    publish();
  },
};

/** 单例 axios：自动带 token，401 时用 refreshToken 换新令牌并重放一次。 */
export const api: AxiosInstance = axios.create({ baseURL: '/api/v1', timeout: 20_000 });

api.interceptors.request.use((config) => {
  const current = session;
  if (current) config.headers.set('Authorization', `Bearer ${current.accessToken}`);
  return config;
});

/** 解包 envelope，失败抛 ApiError。 */
function unwrap<T>(payload: unknown): T {
  const body = payload as ApiEnvelope<T> | undefined;
  if (!body || typeof body !== 'object' || typeof body.code !== 'number') {
    throw new ApiError('后端返回格式不符合约定', -1);
  }
  if (body.code !== 0) throw new ApiError(body.message || '请求失败', body.code);
  return body.data;
}

/** 免 refresh 的原始请求（登录/刷新自己用）。 */
async function raw<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await api.request<ApiEnvelope<T>>(config);
    return unwrap<T>(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as ApiEnvelope<unknown> | undefined;
      if (body && typeof body.code === 'number') throw new ApiError(body.message, body.code, error.response?.status);
      throw new ApiError(error.message || '网络异常，请稍后再试', -1, error.response?.status);
    }
    throw error;
  }
}

let refreshing: Promise<TokenResponse> | null = null;

async function refreshSession(): Promise<TokenResponse> {
  const current = session;
  if (!current) throw new ApiError('登录已失效，请重新登录', 40101, 401);
  if (!refreshing) {
    refreshing = raw<TokenResponse>({
      method: 'POST',
      url: '/auth/refresh',
      data: { refreshToken: current.refreshToken },
      headers: { Authorization: '' },
    })
      .then((next) => {
        auth.login(next);
        return next;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status as number | undefined;
    const code = (error.response?.data as ApiEnvelope<unknown> | undefined)?.code;
    const expired = status === 401 || code === 40101 || code === 40102;
    if (!expired || !config || config._retried || config.url === '/auth/refresh') {
      return Promise.reject(error);
    }
    config._retried = true;
    try {
      const next = await refreshSession();
      config.headers = { ...(config.headers as object), Authorization: `Bearer ${next.accessToken}` };
      return api.request(config);
    } catch (refreshError) {
      auth.clear();
      return Promise.reject(refreshError);
    }
  },
);

/** 业务层统一入口。 */
export const request = {
  get: <T>(url: string, params?: Record<string, unknown>) => raw<T>({ method: 'GET', url, params }),
  post: <T>(url: string, data?: unknown) => raw<T>({ method: 'POST', url, data }),
  put: <T>(url: string, data?: unknown) => raw<T>({ method: 'PUT', url, data }),
  patch: <T>(url: string, data?: unknown) => raw<T>({ method: 'PATCH', url, data }),
  delete: <T>(url: string) => raw<T>({ method: 'DELETE', url }),
};

export const authApi = {
  async signIn(identifier: string, password: string) {
    const tokens = await raw<TokenResponse>({ method: 'POST', url: '/auth/login', data: { identifier, password } });
    auth.login(tokens);
    return tokens.user;
  },
  async me() {
    const user = await request.get<User>('/auth/me');
    auth.patchUser(user);
    return user;
  },
  async signOut() {
    try {
      await request.post<void>('/auth/logout');
    } catch {
      /* 服务端撤销失败也要清本地会话。 */
    }
    auth.clear();
  },
};
