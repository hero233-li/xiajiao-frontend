/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalGrading18200Code } from './localGrading18200Code';
import type { LocalWorker } from './localWorker';

export type LocalGrading18200 = {
  code: LocalGrading18200Code;
  data: LocalWorker[];
  message: string;
};
