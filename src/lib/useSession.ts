import { useSyncExternalStore } from 'react';
import { auth, type TokenResponse, type User } from './api';

/** 会话订阅（登录/登出/换令牌都会触发重渲染）。 */
export function useSession(): TokenResponse | null {
  return useSyncExternalStore(auth.subscribe, auth.get, auth.get);
}

export function useUser(): User | null {
  return useSession()?.user ?? null;
}
