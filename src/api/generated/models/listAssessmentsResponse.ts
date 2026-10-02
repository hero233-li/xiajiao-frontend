/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { SessionPage } from './sessionPage';
import type { ListAssessmentsResponseMessage } from './listAssessmentsResponseMessage';

export interface ListAssessmentsResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: SessionPage;
  message: ListAssessmentsResponseMessage;
}
