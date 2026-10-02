/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface TaskCompletionWrite {
  completed: boolean;
  expectedCompleted: boolean;
  /**
   * @minimum 0
   * @nullable
   */
  expectedItemRevision: number | null;
  /** @minimum 1 */
  baseRevision: number;
  /** 稳定UUID */
  clientMutationId: string;
}
