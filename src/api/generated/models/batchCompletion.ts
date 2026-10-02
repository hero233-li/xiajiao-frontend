/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CatalogItem } from './catalogItem';
import type { Progress } from './progress';

export interface BatchCompletion {
  /** @minItems 0 */
  items: CatalogItem[];
  courseProgress: Progress;
  overallProgress: Progress;
  /** @minItems 0 */
  affectedPlanIds: string[];
  /** 稳定UUID */
  clientMutationId: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  asOf: string;
}
