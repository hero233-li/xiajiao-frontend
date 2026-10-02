/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { MockWeightEvidence } from './mockWeightEvidence';

export interface MockWeight {
  /** 稳定UUID */
  chapterId: string;
  /**
   * @minimum 0
   * @maximum 1
   */
  scoreShare: number;
  /** 上海时区业务日期 */
  sampleFrom: string;
  /** 上海时区业务日期 */
  sampleTo: string;
  evidence: MockWeightEvidence;
}
