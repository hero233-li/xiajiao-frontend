/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { BankAlertAlertCode } from './bankAlertAlertCode';

export interface BankAlert {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  courseId: string;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
  /** 稳定UUID */
  releaseId: string;
  alertCode: BankAlertAlertCode;
  message: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  createdAt: string;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  acknowledgedAt: string | null;
}
