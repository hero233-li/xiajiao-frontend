/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LocalCallbackResult } from './localCallbackResult';
import type { LocalCallbackRubric } from './localCallbackRubric';

export interface LocalCallback {
  leaseToken: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  model: string;
  /** @nullable */
  result: LocalCallbackResult;
  /** @nullable */
  rubric: LocalCallbackRubric;
}
