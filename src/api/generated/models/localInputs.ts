/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalInputsPractice } from './localInputsPractice';
import type { LocalInputsRubric } from './localInputsRubric';
import type { LocalPage } from './localPage';

export interface LocalInputs {
  courseId: string;
  cycleId: string;
  /** @nullable */
  practice: LocalInputsPractice;
  /** @nullable */
  rubric: LocalInputsRubric;
  pages: LocalPage[];
}
