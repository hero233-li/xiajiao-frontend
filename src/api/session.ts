import type { LoginData, User } from './generated/models';
import { sessionStorageKey } from '../utils/environment';
export interface Session extends LoginData { verified: boolean; epoch: number; }
let epoch = 0;
const listeners = new Set<() => void>();
function restore(): Session | null {
  try {
    const raw = sessionStorage.getItem(sessionStorageKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) throw new Error();
    const data = value as Partial<LoginData>;
    if (typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string' || !data.user || typeof data.user.id !== 'string') throw new Error();
    return { ...data, verified: false, epoch } as Session;
  } catch { try { sessionStorage.removeItem(sessionStorageKey); } catch { /* 内存状态仍可使用。 */ } return null; }
}
let session = restore();
const publish = () => {
  try {
    if (session) { const { verified: _, epoch: __, ...data } = session; sessionStorage.setItem(sessionStorageKey, JSON.stringify(data)); }
    else sessionStorage.removeItem(sessionStorageKey);
  } catch { /* 隐私模式或存储不可用时使用内存会话。 */ }
  listeners.forEach((listener) => listener());
};
export const sessionStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => session,
  getEpoch: () => epoch,
  start(data: LoginData) { epoch += 1; session = { ...data, verified: true, epoch }; publish(); },
  rotate(data: LoginData, expectedEpoch: number) {
    if (!session || epoch !== expectedEpoch || data.user.id !== session.user.id) return false;
    session = { ...data, epoch, verified: true }; publish(); return true;
  },
  verify(user: User, expectedEpoch: number) {
    if (!session || epoch !== expectedEpoch || user.id !== session.user.id) return;
    session = { ...session, user, verified: true }; publish();
  },
  clear() { if (!session) return; epoch += 1; session = null; publish(); },
};
