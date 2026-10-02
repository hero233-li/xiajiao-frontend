/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { Formula } from './formula';
import type { KnowledgeExample } from './knowledgeExample';
import type { Resource } from './resource';
import type { KnowledgeModuleUserNote } from './knowledgeModuleUserNote';

/**
 * 正文、公式、资源不得包含需要按需获取的例题解答；例题仅题干和ID。
 */
export interface KnowledgeModule {
  /** 稳定UUID */
  id: string;
  title: string;
  /** 正文无例题答案；中文及Markdown */
  content: string;
  /**
   * @minimum 1
   * @maximum 5
   */
  difficulty: number;
  /** @minItems 0 */
  formulas: Formula[];
  /** @minItems 0 */
  examples: KnowledgeExample[];
  /** @minItems 0 */
  resources: Resource[];
  userNote: KnowledgeModuleUserNote;
}
