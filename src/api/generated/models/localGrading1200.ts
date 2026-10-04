/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalGrading1200Code } from './localGrading1200Code';
import type { LocalSubmission } from './localSubmission';

export type LocalGrading1200 = {
  code: LocalGrading1200Code;
  data: LocalSubmission[];
  message: string;
};
