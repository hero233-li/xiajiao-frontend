/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface SavedAssessmentAnswer {
  /** 稳定UUID */
  sessionId: string;
  /** 稳定UUID */
  revisionId: string;
  /** @minimum 0 */
  selectedOption: number;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  savedAt: string;
  /**
   * SHA-256十六进制
   * @pattern ^[0-9a-f]{64}$
   */
  answerFingerprint: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  serverTime: string;
}
