/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface Note {
  /** 稳定UUID */
  courseId: string;
  /** 上海时区业务日期 */
  noteDate: string;
  /**
   * @minLength 1
   * @maxLength 5000
   */
  content: string;
  /** 稳定UUID */
  id: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  createdAt: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  updatedAt: string;
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  revision: number;
  /** @minItems 0 */
  tags: string[];
}
