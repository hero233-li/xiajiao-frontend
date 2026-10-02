/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { MockWeightRead } from './mockWeightRead';

/**
 * 草稿策略配置及ADMIN已审核的权重元数据；检测session使用创建时快照。
 */
export interface AssessmentPolicy {
  /**
   * @minimum 0
   * @maximum 1
   */
  gateRatio: number;
  /** @minimum 1 */
  gateFloor: number;
  /** @minimum 1 */
  gateCap: number;
  /** @minimum 1 */
  chapterMinQuestions: number;
  /** @minimum 1 */
  chapterMaxQuestions: number;
  /** @minimum 1 */
  chapterLimitMinutes: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  chapterPassScore: number;
  /** @minimum 1 */
  mockQuestionCount: number;
  /** @minimum 1 */
  mockLimitMinutes: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  mockPassScore: number;
  /** @minItems 0 */
  weights: MockWeightRead[];
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  courseId: string;
  /** 稳定UUID */
  releaseId: string;
}
