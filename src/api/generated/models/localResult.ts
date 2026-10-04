/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalAnswer } from './localAnswer';

export interface LocalResult {
  rubricId: string;
  /**
   * @minItems 1
   * @maxItems 200
   */
  answers: LocalAnswer[];
  reviewItems: string[];
}
