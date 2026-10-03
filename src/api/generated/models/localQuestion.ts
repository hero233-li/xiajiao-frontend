/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalPoint } from './localPoint';

export interface LocalQuestion {
  number: string;
  stem: string;
  referenceAnswer: string;
  /**
   * @minimum 0.01
   * @maximum 100
   */
  maximum: number;
  /**
   * @minItems 1
   * @maxItems 100
   */
  points: LocalPoint[];
}
