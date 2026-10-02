/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CatalogItemResource } from './catalogItemResource';

export interface CatalogItem {
  /** 稳定UUID */
  id: string;
  title: string;
  /**
   * ADMIN维护的预计分钟
   * @minimum 1
   */
  estimatedMinutes: number;
  /** @nullable */
  resource: CatalogItemResource;
  completed: boolean;
  /**
   * UTC事件时间（RFC3339）；客户端不可当作本地时间写入
   * @nullable
   */
  completedAt: string | null;
  /**
   * 资源乐观锁修订号；不存在的用户状态按0；冲突返回40901
   * @minimum 0
   */
  revision: number;
}
