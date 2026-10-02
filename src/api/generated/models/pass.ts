/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PassKind } from './passKind';
import type { PassSource } from './passSource';

export interface Pass {
  /** 稳定UUID */
  id: string;
  kind: PassKind;
  /**
   * 稳定UUID
   * @nullable
   */
  chapterId: string | null;
  /** 稳定UUID */
  releaseId: string;
  source: PassSource;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  grantedAt: string;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  invalidatedAt: string | null;
  /**
   * 稳定UUID
   * @nullable
   */
  invalidatedBy: string | null;
  /** @nullable */
  invalidationReason: string | null;
}
