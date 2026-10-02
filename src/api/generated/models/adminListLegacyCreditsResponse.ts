/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyPracticePage } from './legacyPracticePage';
import type { AdminListLegacyCreditsResponseMessage } from './adminListLegacyCreditsResponseMessage';

export interface AdminListLegacyCreditsResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: LegacyPracticePage;
  message: AdminListLegacyCreditsResponseMessage;
}
