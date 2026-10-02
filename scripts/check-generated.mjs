import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = resolve('src/api/generated');
async function snapshot(dir = root) {
  const result = {};
  for (const item of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) Object.assign(result, await snapshot(path));
    else result[relative(root, path)] = createHash('sha256').update(await readFile(path)).digest('hex');
  }
  return result;
}
const before = await snapshot();
const run = spawnSync(process.execPath, ['node_modules/orval/dist/bin/orval.js', '--config', 'orval.config.ts'], { stdio: 'inherit' });
if (run.status !== 0) process.exit(run.status || 1);
const after = await snapshot();
if (JSON.stringify(before) !== JSON.stringify(after)) { console.error('生成文件与OpenAPI不一致，已重新生成；请检查并保存更新。'); process.exit(1); }
console.log('生成文件与OpenAPI一致，重复生成结果稳定。');
