/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { AssessmentQuestionMode } from './assessmentQuestionMode';

/**
 * 检测题干与选项；无历史判对标记、答案、解析。
 */
export interface AssessmentQuestion {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  revisionId: string;
  /** 稳定UUID */
  releaseId: string;
  /** 稳定UUID */
  courseId: string;
  /** 稳定UUID */
  chapterId: string;
  mode: AssessmentQuestionMode;
  /** @minItems 0 */
  pointIds: string[];
  stem: string;
  /** @minItems 2 */
  options: string[];
  /**
   * @minimum 1
   * @maximum 5
   */
  difficulty: number;
  /** 公开来源名称，不包含答案位置或私有URL */
  sourceLabel: string;
}
