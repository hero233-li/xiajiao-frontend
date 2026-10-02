/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CatalogItem } from './catalogItem';

export interface CatalogChapter {
  /** 稳定UUID */
  id: string;
  title: string;
  /** @minimum 0 */
  sortOrder: number;
  participatesInAssessment: boolean;
  /** @minItems 0 */
  items: CatalogItem[];
}
