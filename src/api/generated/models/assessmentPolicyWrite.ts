/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { MockWeight } from './mockWeight';

/**
 * 草稿可配置；floor≤cap、min≤max、权重覆盖本版参与章且和为1。ADMIN确认时保存审核人/时间，缺失权重不能申请模拟。
 */
export interface AssessmentPolicyWrite {
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
  weights: MockWeight[];
  /** 本人明确确认 */
  confirmWeightReview: boolean;
}
