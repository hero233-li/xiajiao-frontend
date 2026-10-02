/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface OverrideRevoke {
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  expectedRevision: number;
  /** 本人明确确认 */
  confirm: boolean;
}
