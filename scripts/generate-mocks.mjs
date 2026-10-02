import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
const spec = parse(await readFile('../docs/openapi.yaml', 'utf8'));
const operations = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!operation.responses) continue;
    const [status, response] = Object.entries(operation.responses).find(([code]) => /^2/.test(code));
    const media = response.content?.['application/json'];
    const example = media?.example ?? Object.values(media?.examples ?? {})[0]?.value;
    if (example === undefined) throw new Error(`接口缺少成功示例：${operation.operationId}`);
    operations.push({ path, method, operationId: operation.operationId, status: Number(status), example, public: operation.security?.length === 0, errors: Object.fromEntries(Object.entries(operation.responses).filter(([code]) => /^[45]/.test(code)).map(([code, value]) => [code, value.content?.['application/json']?.example])) });
  }
}
await writeFile('src/mocks/generated.json', `${JSON.stringify(operations, null, 2)}\n`);
console.log(`从 OpenAPI 生成 ${operations.length} 个接口示例。`);
