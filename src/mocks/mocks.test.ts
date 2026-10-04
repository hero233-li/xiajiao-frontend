import { expect, it } from 'vitest';
import operations from './generated.json';
import { startDemoSession } from '../test/helpers';
it('132个契约接口都有示例，业务Mock逐个匹配契约响应',async()=>{
  expect(operations).toHaveLength(132); const session=await startDemoSession();
  const examples=operations.filter(item=>!['login','getCurrentUser','logout','refreshTokens','registerUser'].includes(item.operationId));
  const results=await Promise.all(examples.map(async item=>{const path=item.path.replace(/\{[^}]+\}/g,'6184a068-308c-5f8e-b4e1-4ec629bb6a24');const response=await fetch(`/api/v1${path}`,{method:item.method,headers:{Authorization:`Bearer ${session.accessToken}`}});expect(response.status,item.operationId).toBe(item.status);expect(await response.json(),item.operationId).toEqual(item.example);}));expect(results).toHaveLength(127);
});
