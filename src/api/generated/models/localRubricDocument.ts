/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalQuestion } from './localQuestion';

export interface LocalRubricDocument {
  /**
   * @minItems 1
   * @maxItems 200
   */
  questions: LocalQuestion[];
}
