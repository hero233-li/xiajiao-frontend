/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CatalogChapter } from './catalogChapter';
import type { Progress } from './progress';

export interface Catalog {
  /** 稳定UUID */
  courseId: string;
  /** 稳定UUID */
  releaseId: string;
  /** @minItems 0 */
  chapters: CatalogChapter[];
  courseProgress: Progress;
  overallProgress: Progress;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  asOf: string;
}
