/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { NotePage } from './notePage';
import type { ListNotesResponseMessage } from './listNotesResponseMessage';

export interface ListNotesResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: NotePage;
  message: ListNotesResponseMessage;
}
