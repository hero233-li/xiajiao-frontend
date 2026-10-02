import axios, { AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { ApiError } from './errors';
import { sessionStore } from './session';
import { notifications } from '../utils/notifications';
declare module 'axios' {
  interface AxiosRequestConfig { skipAuth?: boolean; skipRefresh?: boolean; silent?: boolean; authEpoch?: number; retried?: boolean; }
}
export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_ORIGIN || undefined, timeout: 15_000 });
let recovery: (() => Promise<string>) | undefined;
export const configureAuthRecovery = (handler: () => Promise<string>) => { recovery = handler; };
apiClient.interceptors.request.use((config) => {
  const session = sessionStore.getSnapshot();
  config.authEpoch = sessionStore.getEpoch();
  if (config.skipAuth) config.headers.delete('Authorization');
  else if (session) config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  return config;
});
const notify = (error: ApiError, config?: AxiosRequestConfig) => { if (!config?.silent) notifications.error(error.message); return error; };
apiClient.interceptors.response.use((response) => {
  const body: unknown = response.data;
  if (typeof body !== 'object' || body === null || !('code' in body) || !('data' in body) || !('message' in body))
    throw notify(new ApiError('服务器响应格式不正确', response.status), response.config);
  const envelope = body as { code: number; message: string };
  if (envelope.code !== 0) throw notify(new ApiError(envelope.message || '请求未成功', response.status, envelope.code), response.config);
  return response;
}, async (error: unknown) => {
  if (axios.isCancel(error)) throw error;
  if (!axios.isAxiosError(error)) throw notify(new ApiError('请求失败，请稍后重试'));
  const config = error.config as InternalAxiosRequestConfig | undefined;
  const current = sessionStore.getSnapshot();
  if (config && !config.skipAuth && config.authEpoch !== sessionStore.getEpoch()) throw new axios.CanceledError('登录状态已变化');
  if (error.response?.status === 401 && config && !config.retried && !config.skipRefresh && !config.skipAuth && current && recovery) {
    config.retried = true;
    const previous = config.headers.get('Authorization');
    let access: string;
    try {
      // 较早请求的401可能晚于刷新响应：优先重用已经轮换的新访问令牌。
      access = previous !== `Bearer ${current.accessToken}` ? current.accessToken : await recovery();
      if (!sessionStore.getSnapshot() || sessionStore.getEpoch() !== config.authEpoch) throw new axios.CanceledError('登录状态已变化');
    } catch (cause) {
      if (axios.isCancel(cause)) throw cause;
      if (sessionStore.getEpoch() === config.authEpoch) sessionStore.clear();
      throw notify(new ApiError('登录已过期，请重新登录', 401, 40101), config);
    }
    config.headers = AxiosHeaders.from(config.headers); config.headers.set('Authorization', `Bearer ${access}`);
    return apiClient.request(config);
  }
  if (error.response?.status === 401 && !config?.skipAuth && current && config?.authEpoch === sessionStore.getEpoch()) sessionStore.clear();
  const body = error.response?.data as { message?: string; code?: number } | undefined;
  throw notify(new ApiError(body?.message || (error.response ? '请求未成功，请稍后重试' : '网络连接失败，请检查网络'), error.response?.status, body?.code), config);
});
export const apiRequest = async <T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> => {
  const response = await apiClient.request<T>({ ...config, ...options, headers: { ...config.headers, ...options?.headers } });
  return response.data;
};
export type ErrorType<E> = ApiError & { response?: E };
export type BodyType<B> = B;
