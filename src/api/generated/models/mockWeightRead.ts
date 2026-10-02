/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { MockWeightReadEvidence } from './mockWeightReadEvidence';

export interface MockWeightRead {
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
  evidence: MockWeightReadEvidence;
  /** 稳定UUID */
  approvedBy: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  approvedAt: string;
}
