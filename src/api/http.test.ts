import { describe, it, expect } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import axios from 'axios';
import { apiRequest } from './http';
import { sessionStore } from './session';
import { notifications } from '../utils/notifications';
import { server } from '../mocks/server';
import { startDemoSession } from '../test/helpers';
import type { LoginData } from './generated/models';
const ok = { code: 0, data: { value: '成功' }, message: 'ok' };
const expired = () => HttpResponse.json({ code: 40101, data: null, message: '令牌已失效' }, { status: 401 });
const get = () => apiRequest<typeof ok>({ url: '/api/v1/test-resource', method: 'GET' });
describe('统一请求与认证', () => {
  it('携带访问令牌并保留统一响应', async () => {
    const tokens = await startDemoSession(); let header = '';
    server.use(http.get('/api/v1/test-resource', ({ request }) => { header = request.headers.get('Authorization') || ''; return HttpResponse.json(ok); }));
    await expect(get()).resolves.toEqual(ok); expect(header).toBe(`Bearer ${tokens.accessToken}`);
  });
  it('业务错误转换为中文提示', async () => {
    server.use(http.get('/api/v1/test-resource', () => HttpResponse.json({ code: 40902, data: null, message: '状态已改变，请重试' })));
    await expect(get()).rejects.toMatchObject({ code: 40902, message: '状态已改变，请重试' });
    expect(notifications.getSnapshot()[0].message).toBe('状态已改变，请重试');
  });
  it('并发401只刷新一次，并重试原请求', async () => {
    const old = await startDemoSession(); let refreshCount = 0;
    const fresh: LoginData = { ...old, accessToken: 'fresh-access', refreshToken: 'fresh-refresh' };
    server.use(http.get('/api/v1/test-resource', ({ request }) => request.headers.get('Authorization') === 'Bearer fresh-access' ? HttpResponse.json(ok) : expired()),
      http.post('/api/v1/auth/refresh', async () => { refreshCount += 1; await delay(50); return HttpResponse.json({ code: 0, data: fresh, message: 'ok' }); }));
    const results = await Promise.all([get(), get()]); expect(results).toEqual([ok, ok]); expect(refreshCount).toBe(1);
    expect(sessionStore.getSnapshot()?.accessToken).toBe('fresh-access');
  });
  it('刷新失败清除登录态，不无限重试', async () => {
    await startDemoSession(); let refreshCount = 0;
    server.use(http.get('/api/v1/test-resource', expired), http.post('/api/v1/auth/refresh', () => { refreshCount += 1; return expired(); }));
    await expect(get()).rejects.toMatchObject({ status: 401 }); expect(refreshCount).toBe(1); expect(sessionStore.getSnapshot()).toBeNull();
  });
  it('刷新后的普通接口错误不会错误地退出账号', async () => {
    const old = await startDemoSession(); const fresh = { ...old, accessToken: 'fresh-access' };
    server.use(http.post('/api/v1/auth/refresh', () => HttpResponse.json({ code: 0, data: fresh, message: 'ok' })),
      http.get('/api/v1/test-resource', ({ request }) => request.headers.get('Authorization') === 'Bearer fresh-access'
        ? HttpResponse.json({ code: 50001, data: null, message: '服务暂时不可用' }, { status: 500 }) : expired()));
    await expect(get()).rejects.toMatchObject({ status: 500, message: '服务暂时不可用' }); expect(sessionStore.getSnapshot()).not.toBeNull();
  });
  it('退出后迟到的刷新不会恢复旧账号', async () => {
    const old = await startDemoSession(); let release!: () => void; let announce!: () => void;
    const wait = new Promise<void>((resolve) => { release = resolve; }); const started = new Promise<void>((resolve) => { announce = resolve; });
    server.use(http.get('/api/v1/test-resource', expired), http.post('/api/v1/auth/refresh', async () => { announce(); await wait; return HttpResponse.json({ code: 0, data: { ...old, accessToken: 'late-token' }, message: 'ok' }); }));
    const result = get().catch((error: unknown) => error); await started; sessionStore.clear(); release();
    expect(axios.isCancel(await result)).toBe(true); expect(sessionStore.getSnapshot()).toBeNull();
  });
});
