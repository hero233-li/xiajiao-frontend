/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalGrading13200Code } from './localGrading13200Code';
import type { LocalRubric } from './localRubric';

export type LocalGrading13200 = {
  code: LocalGrading13200Code;
  data: LocalRubric[];
  message: string;
};
