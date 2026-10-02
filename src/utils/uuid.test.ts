import { afterEach, expect, it, vi } from 'vitest';
import { createUuid } from './uuid';
import { completionUpdates } from '../api/catalog';
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
afterEach(() => vi.unstubAllGlobals());
it('可用时调用原生 UUID API，保留 Crypto 方法接收者', () => {
  const cryptoApi = { randomUUID() { expect(this).toBe(cryptoApi); return 'native-id'; } };
  vi.stubGlobal('crypto', cryptoApi);
  expect(createUuid()).toBe('native-id');
});
it('缺少 randomUUID 时使用随机字节，并设置 v4 版本与 variant 位', () => {
  const cryptoApi = { getRandomValues(array: Uint8Array) { expect(this).toBe(cryptoApi); array.fill(255); return array; } };
  vi.stubGlobal('crypto', cryptoApi);
  expect(createUuid()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
});
it('HTTP 兼容分支生成不同的合法 UUID，保存请求符合原契约', () => {
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  vi.stubGlobal('crypto', { getRandomValues });
  const ids = Array.from({length:1000}, () => createUuid());
  expect(ids.every(id => uuidV4.test(id))).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
  expect(completionUpdates([],true).clientMutationId).toMatch(uuidV4);
});
it('没有随机数 API 时显示可读说明，不生成弱随机标识', () => {
  vi.stubGlobal('crypto', undefined);
  expect(() => createUuid()).toThrow('当前浏览器无法完成此操作，请更新浏览器后重试。');
});
