/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalGrading3200Code } from './localGrading3200Code';
import type { LocalSubmission } from './localSubmission';

export type LocalGrading3200 = {
  code: LocalGrading3200Code;
  data: LocalSubmission;
  message: string;
};
