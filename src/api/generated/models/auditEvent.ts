/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface AuditEvent {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  actorId: string;
  action: string;
  targetType: string;
  /**
   * 稳定UUID
   * @nullable
   */
  targetId: string | null;
  /** @nullable */
  reason: string | null;
  /** 脱敏后的结构化详情的JSON字符串；不含密码/JWT/标准答案/存储键 */
  details: string;
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  occurredAt: string;
}
