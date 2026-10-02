/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { CyclePage } from './cyclePage';
import type { ListCyclesResponseMessage } from './listCyclesResponseMessage';

export interface ListCyclesResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: CyclePage;
  message: ListCyclesResponseMessage;
}
