/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyPassReview } from './legacyPassReview';
import type { AdminGetLegacyPassReviewResponseMessage } from './adminGetLegacyPassReviewResponseMessage';

export interface AdminGetLegacyPassReviewResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: LegacyPassReview;
  message: AdminGetLegacyPassReviewResponseMessage;
}
