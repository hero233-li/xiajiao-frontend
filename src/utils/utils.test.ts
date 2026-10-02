import { expect, it } from 'vitest';
import { safeReturnPath } from './navigation';
import { formatShanghaiDate } from './date';
it('拒绝跨域回跳和登录循环，保留合法深链接',()=>{for(const path of ['//evil.test','https://evil.test','/\\evil.test','/login?redirect=/login'])expect(safeReturnPath(path)).toBe('/health');expect(safeReturnPath('/zikao?cycleId=a#item')).toBe('/zikao?cycleId=a#item');});
it('上海时区转换跨日时间，业务日期不偏移',()=>{expect(formatShanghaiDate('2026-10-23T16:30:00Z')).toBe('10/24 00:30');expect(formatShanghaiDate('2026-10-24T14:30:00+08:00')).toBe('10/24 14:30');expect(formatShanghaiDate('2026-10-24')).toBe('10/24');expect(formatShanghaiDate('invalid')).toBe('时间格式不正确');});
