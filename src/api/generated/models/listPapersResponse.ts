/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PaperPage } from './paperPage';
import type { ListPapersResponseMessage } from './listPapersResponseMessage';

export interface ListPapersResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: PaperPage;
  message: ListPapersResponseMessage;
}
