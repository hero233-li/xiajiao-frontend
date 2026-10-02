/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */

/**
 * 答案仅ADMIN内容维护操作可见，不供学习页面预加载。
 */
export interface AdminKnowledgeExample {
  /** 稳定UUID */
  id: string;
  /** @minLength 1 */
  question: string;
  /**
   * @minimum 1
   * @maximum 5
   */
  stars: number;
  /** @minLength 1 */
  answer: string;
  /** @minLength 1 */
  solution: string;
  /** @minimum 0 */
  sortOrder: number;
}
