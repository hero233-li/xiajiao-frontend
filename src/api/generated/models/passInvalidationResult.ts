/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Pass } from './pass';
import type { Unlock } from './unlock';

/**
 * 作废提交后立即重算受影响的周期权限；没有其他有效模拟通过/活动override即关闭下载和成绩写入，历史仍可查看。
 */
export interface PassInvalidationResult {
  pass: Pass;
  /** @minItems 0 */
  affectedUnlocks: Unlock[];
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  evaluatedAt: string;
}
