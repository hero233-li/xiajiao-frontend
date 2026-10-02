/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

export interface KnowledgeExample {
  /** 稳定UUID */
  id: string;
  question: string;
  /**
   * @minimum 1
   * @maximum 5
   */
  stars: number;
}
