import { http, HttpResponse, delay } from 'msw';
import type { LoginData, LoginRequest, RefreshRequest } from '../api/generated/models';
import operations from './generated.json';
const loginExample = operations.find(operation => operation.operationId === 'login')!.example.data as LoginData;
const key = 'xuexizhitu.foundation.mock-server';
let pair: LoginData | null = (() => { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } })();
let expired = false; let revoked = false;
const save = () => { try { if (pair) sessionStorage.setItem(key,JSON.stringify(pair)); else sessionStorage.removeItem(key); } catch { /* 存储不可用时保留内存 Mock。 */ } };
const issue = (): LoginData => ({ ...loginExample, accessToken: `mock-access-${crypto.randomUUID()}`, refreshToken: `mock-refresh-${crypto.randomUUID()}` });
const ok = <T,>(data: T) => HttpResponse.json({ code: 0, data, message: 'ok' });
const failure = (status: number, code: number, message: string) => HttpResponse.json({ code, data: null, message },{ status });
const authorized = (request: Request) => !!pair && !expired && request.headers.get('Authorization') === `Bearer ${pair.accessToken}`;
export function resetMockSession() { pair = null; expired = false; revoked = false; save(); }
export function expireMockAccess() { expired = true; }
export function revokeMockRefresh() { expired = true; revoked = true; }
const pattern = (path: string) => `*/api/v1${path.replace(/\{([^}]+)\}/g, ':$1')}`;
export const handlers = [
  http.post(pattern('/auth/login'),async ({ request }) => {
    const body = await request.json() as LoginRequest;
    if (!['demo','demo@example.test'].includes(body.identifier) || body.password !== 'Demo12345') return failure(401,40102,'用户名、邮箱或密码不正确');
    pair = issue(); expired = false; revoked = false; save(); return ok(pair);
  }),
  http.get(pattern('/auth/me'),({ request }) => authorized(request) ? ok(pair!.user) : failure(401,40101,'请先登录或令牌已失效')),
  http.post(pattern('/auth/refresh'),async ({ request }) => {
    const body = await request.json() as RefreshRequest;
    if (!pair || revoked || body.refreshToken !== pair.refreshToken) return failure(401,40101,'刷新令牌已失效');
    const user = pair.user; pair = { ...issue(), user }; expired = false; save(); return ok(pair);
  }),
  http.post(pattern('/auth/logout'),({ request }) => { if (!authorized(request)) return failure(401,40101,'请先登录'); resetMockSession(); return ok(null); }),
  http.post(pattern('/auth/register'),() => failure(403,40301,'当前未开放注册')),
  ...operations.filter(operation => !operation.operationId.startsWith('login') && !['getCurrentUser','refreshTokens','logout','registerUser'].includes(operation.operationId)).map(operation => {
    const resolver = async ({ request }: { request: Request }) => {
      const isPublic = operation.public;
      if ((!isPublic || request.headers.has('Authorization')) && !authorized(request)) return failure(401,40101,'请先登录或令牌已失效');
      await delay(80);
      return HttpResponse.json(operation.example,{ status: operation.status });
    };
    return http[operation.method as 'get' | 'post' | 'put' | 'patch' | 'delete'](pattern(operation.path),resolver);
  }),
  http.all('*/api/v1/*',() => failure(404,40401,'接口不存在')),
];
