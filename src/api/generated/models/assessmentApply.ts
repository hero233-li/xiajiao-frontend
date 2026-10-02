/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AssessmentApplyKind } from './assessmentApplyKind';

/**
 * CHAPTER必须有chapterId，MOCK必须NULL；不接受题数、通过线、score、用户ID或客户端统计。
 */
export interface AssessmentApply {
  kind: AssessmentApplyKind;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
}
