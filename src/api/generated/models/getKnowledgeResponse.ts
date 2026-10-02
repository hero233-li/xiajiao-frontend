/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { KnowledgeModule } from './knowledgeModule';
import type { GetKnowledgeResponseMessage } from './getKnowledgeResponseMessage';

export interface GetKnowledgeResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: KnowledgeModule;
  message: GetKnowledgeResponseMessage;
}
