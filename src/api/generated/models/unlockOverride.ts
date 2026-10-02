/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface UnlockOverride {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  courseId: string;
  /** 稳定UUID */
  cycleId: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  confirmedAt: string;
  /** 上海时区业务日期 */
  examDateSnapshot: string;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  revokedAt: string | null;
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  revision: number;
}
