import { CanceledError } from 'axios';
import { refreshTokens } from './generated/auth/auth';
import { configureAuthRecovery } from './http';
import { ApiError } from './errors';
import { sessionStore } from './session';
let flight: { epoch: number; promise: Promise<string> } | null = null;
export function refreshAccessToken(): Promise<string> {
  const session = sessionStore.getSnapshot();
  if (!session) return Promise.reject(new ApiError('请先登录', 401, 40101));
  if (flight?.epoch === session.epoch) return flight.promise;
  const epoch = session.epoch;
  const promise = refreshTokens({ refreshToken: session.refreshToken }, { skipAuth: true, skipRefresh: true, silent: true })
    .then((response) => {
      if (!sessionStore.rotate(response.data, epoch)) throw new CanceledError('登录状态已变化');
      return response.data.accessToken;
    }).finally(() => { if (flight?.epoch === epoch) flight = null; });
  flight = { epoch, promise }; return promise;
}
export const initializeAuthRecovery = () => configureAuthRecovery(refreshAccessToken);
