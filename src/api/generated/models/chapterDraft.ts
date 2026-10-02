/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PointDraft } from './pointDraft';
import type { ItemDraft } from './itemDraft';

export interface ChapterDraft {
  /** 稳定UUID */
  id: string;
  /**
   * @minLength 1
   * @maxLength 150
   */
  stableKey: string;
  /**
   * @minLength 1
   * @maxLength 250
   */
  title: string;
  /** @minimum 0 */
  sortOrder: number;
  participatesInAssessment: boolean;
  /**
   * @minimum 20
   * @maximum 100
   * @nullable
   */
  gateOverride: number | null;
  /** @minItems 0 */
  points: PointDraft[];
  /** @minItems 0 */
  items: ItemDraft[];
}
