/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalGrading8200Code } from './localGrading8200Code';
import type { LocalTask } from './localTask';

export type LocalGrading8200 = {
  code: LocalGrading8200Code;
  data: LocalTask[];
  message: string;
};
