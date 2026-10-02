/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CatalogItem } from './catalogItem';
import type { Progress } from './progress';

/**
 * 提交成功即返回后端最新进度；同事务同步目录关联计划任务。前端按item revision和clientMutationId对齐乐观状态，再失效dashboard/schedule缓存，禁止自行累计百分比。
 */
export interface CatalogCompletion {
  item: CatalogItem;
  courseProgress: Progress;
  overallProgress: Progress;
  /** @minItems 0 */
  affectedPlanIds: string[];
  /** 稳定UUID */
  clientMutationId: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  asOf: string;
}
