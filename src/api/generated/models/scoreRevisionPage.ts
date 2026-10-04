/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { ScoreRevision } from './scoreRevision';

export interface ScoreRevisionPage {
  items: ScoreRevision[];
  /** @minimum 1 */
  page: number;
  /**
   * @minimum 1
   * @maximum 100
   */
  size: number;
  /** @minimum 0 */
  total: number;
}
