/**
 * 由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。
 */
import type { LegacyPassReview } from './legacyPassReview';
import type { AdminDecideLegacyPassResponseMessage } from './adminDecideLegacyPassResponseMessage';

export interface AdminDecideLegacyPassResponse {
  /**
   * 成功固定0
   * @minimum 0
   * @maximum 0
   */
  code: number;
  data: LegacyPassReview;
  message: AdminDecideLegacyPassResponseMessage;
}
