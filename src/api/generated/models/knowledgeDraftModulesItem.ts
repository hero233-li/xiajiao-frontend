/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Formula } from './formula';
import type { Resource } from './resource';
import type { AdminKnowledgeExample } from './adminKnowledgeExample';

export type KnowledgeDraftModulesItem = {
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
  content: string;
  /**
   * @minimum 1
   * @maximum 5
   */
  difficulty: number;
  /** @minItems 0 */
  formulas: Formula[];
  /** @minItems 0 */
  resources: Resource[];
  /** @minItems 0 */
  examples: AdminKnowledgeExample[];
};
