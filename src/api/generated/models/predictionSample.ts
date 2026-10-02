/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface PredictionSample {
  /** 稳定UUID */
  paperId: string;
  paperKey: string;
  /** 稳定UUID */
  recordId: string;
  /** 上海时区业务日期 */
  practicedOn: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  createdAt: string;
  /**
   * @minimum 0
   * @maximum 100
   */
  score: number;
  /**
   * @minimum 1
   * @maximum 5
   */
  weight: number;
}
