/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Plan } from './plan';
import type { PlanPreviewMovesItem } from './planPreviewMovesItem';
import type { PlanPreviewOptionsItem } from './planPreviewOptionsItem';

/**
 * 保存预览，不切当前指针；只将今天之前未完成段从明天填入空闲；跨午夜/输入或原revision变更必须重新预览。
 */
export interface PlanPreview {
  /** 稳定UUID */
  id: string;
  /** 稳定UUID */
  planId: string;
  /** @minimum 1 */
  baseRevision: number;
  /** 上海时区业务日期 */
  asOf: string;
  /**
   * SHA-256十六进制
   * @pattern ^[0-9a-f]{64}$
   */
  inputFingerprint: string;
  proposedPlan: Plan;
  /** @minItems 0 */
  moves: PlanPreviewMovesItem[];
  /** @minimum 0 */
  gapMinutes: number;
  /**
   * 缺口分钟/60，仅展示
   * @minimum 0
   * @maximum 100000
   */
  gapHours: number;
  /** @minItems 0 */
  options: PlanPreviewOptionsItem[];
  /** UTC事件时间（RFC3339）；客户端不可当作本地时间写入 */
  createdAt: string;
}
