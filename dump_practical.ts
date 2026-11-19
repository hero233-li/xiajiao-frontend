import { AI_PRACTICAL_POOL } from './src/data/aiPracticalPool.ts';
console.log(JSON.stringify(AI_PRACTICAL_POOL.map((p: any, i: number) => ({
  code: p.code, seq: i + 1, group: p.group, title: p.title,
  minutes: p.minutes, score: p.score, sheet: p.sheet,
  rubric: p.rubric, ref: p.ref ?? null,
}))));
