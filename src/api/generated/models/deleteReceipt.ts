/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { DeleteReceiptState } from './deleteReceiptState';

/**
 * 逻辑删除即阻断下载；对象清理失败可重试，不删除只读旧历史原文。
 */
export interface DeleteReceipt {
  /** 稳定UUID */
  id: string;
  state: DeleteReceiptState;
  downloadAllowed: boolean;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  acceptedAt: string;
}
