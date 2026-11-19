import { AI_THEORY_QUESTIONS } from './src/data/aiTrainer.ts';
import { AI_THEORY_EXPLAIN } from './src/data/aiTrainerExplain.ts';
const out = AI_THEORY_QUESTIONS.map((q: any, i: number) => ({
  id: q.id, type: q.type, stem: q.stem,
  options: q.options ?? null, answer: q.answer,
  explanation: AI_THEORY_EXPLAIN[q.id]?.text ?? null,
  explainAi: AI_THEORY_EXPLAIN[q.id]?.ai ? 1 : 0,
  seq: i + 1,
}));
console.log(JSON.stringify(out));
