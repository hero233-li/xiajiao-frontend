/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ContentReleaseState } from './contentReleaseState';

export interface ContentRelease {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  courseId: string;
  /** @minimum 1 */
  versionNo: number;
  state: ContentReleaseState;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  publishedAt: string | null;
  /**
   * @maxLength 64
   * @nullable
   */
  sourceSha: string | null;
}
