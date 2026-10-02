/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ItemDraftResource } from './itemDraftResource';

export interface ItemDraft {
  /** 稳定UUID */
  id: string;
  /**
   * @minLength 1
   * @maxLength 200
   */
  stableKey: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  title: string;
  /** @minimum 1 */
  estimatedMinutes: number;
  /** @nullable */
  resource: ItemDraftResource;
  /** @minimum 0 */
  sortOrder: number;
}
