/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { PracticeOverview } from './practiceOverview';
import type { GetPracticeOverviewResponseMessage } from './getPracticeOverviewResponseMessage';

export interface GetPracticeOverviewResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: PracticeOverview;
  message: GetPracticeOverviewResponseMessage;
}
