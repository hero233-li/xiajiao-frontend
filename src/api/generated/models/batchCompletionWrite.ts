/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { BatchCompletionWriteUpdatesItem } from './batchCompletionWriteUpdatesItem';

/**
 * 整章/组完成使用显式条目集合；重复itemId非法，任一revision冲突整批不提交。
 */
export interface BatchCompletionWrite {
  /**
   * @minItems 1
   * @maxItems 200
   */
  updates: BatchCompletionWriteUpdatesItem[];
  /** 稳定UUID */
  clientMutationId: string;
}
